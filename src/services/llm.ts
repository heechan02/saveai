import { callAnthropic, callOpenAI, callGroq } from '@/lib/gateway'
import { estimateCost } from '@/lib/estimator'
import { db } from '@/db'
import { conversations, messages, savingsEvents } from '@/db/schema'
import { eq, desc } from 'drizzle-orm'

import type { Tier, Model } from '@/types'
import { rememberMessage, getContext } from './memory'

const TIER_MODEL: Record<Tier, Model> = {
  1: 'llama-3.1-8b-instant',
  2: 'gpt-4o-mini',
  3: 'claude-sonnet-4-6',
  4: 'claude-opus-4-7',
}

function callGateway(model: Model, messages: { role: 'user' | 'assistant' | 'system'; content: string }[]) {
  if (model === 'llama-3.1-8b-instant') return callGroq(model, messages)
  if (model === 'gpt-4o-mini') return callOpenAI(model, messages)
  return callAnthropic(model, messages)
}

/** DB fallback: last N messages when MuBit is unavailable */
async function getDbHistory(
  conversationId: string,
  limit = 10
): Promise<{ role: 'user' | 'assistant'; content: string }[]> {
  try {
    const history = await db
      .select({ role: messages.role, content: messages.content })
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(desc(messages.createdAt))
      .limit(limit)

    return history
      .reverse()
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }))
  } catch {
    return []
  }
}

export async function routeMessage(args: {
  prompt: string
  tier: Tier
  conversationId: string
  useMinimalContext?: boolean
}): Promise<{
  content: string
  tokensIn: number
  tokensOut: number
  model: Model
  tier: Tier
  costUsd: number
  waterMl: number
  carbonG: number
  contextSaved?: boolean
  savedPercent?: number
}> {
  const { prompt, tier, conversationId, useMinimalContext } = args
  const model = TIER_MODEL[tier]

  // Token budget: tight for "Trim with MuBit", normal otherwise
  const tokenBudget = useMinimalContext ? 1000 : 4000

  // Fetch context from MuBit (falls back gracefully)
  const mubitCtx = await getContext({
    conversationId,
    currentPrompt: prompt,
    tokenBudget,
  })

  let contextMessages: { role: 'user' | 'assistant' | 'system'; content: string }[]

  if (mubitCtx.mubitUsed && mubitCtx.messages.length > 0) {
    contextMessages = mubitCtx.messages as { role: 'user' | 'assistant' | 'system'; content: string }[]
    if (process.env.NODE_ENV === 'development') {
      console.log('[MuBit] context used — trimmedTokens:', mubitCtx.trimmedTokens, 'savedPercent:', mubitCtx.savedPercent)
    }
  } else {
    const dbHistory = await getDbHistory(conversationId, useMinimalContext ? 4 : 10)
    contextMessages = dbHistory
    if (!mubitCtx.mubitUsed && process.env.NODE_ENV === 'development') {
      console.warn('[MuBit] offline — using fallback DB context')
    }
  }

  const allMessages: { role: 'user' | 'assistant' | 'system'; content: string }[] = [
    ...contextMessages,
    { role: 'user', content: prompt },
  ]

  const response = await callGateway(model, allMessages)
  const { usd, water_ml, carbon_g } = estimateCost(model, response.tokensIn, response.tokensOut)

  // contextSaved = true whenever MuBit injected context into the request
  const contextSaved = mubitCtx.mubitUsed && mubitCtx.messages.length > 0

  // Async: persist to DB + remember in MuBit + record context_trim savings
  Promise.resolve().then(async () => {
    try {
      const isNew = await db.insert(conversations).values({ id: conversationId }).onConflictDoNothing().returning({ id: conversations.id })

      const [userRow] = await db.insert(messages).values({
        conversationId,
        role: 'user',
        content: prompt,
        model,
        tier,
      }).returning({ id: messages.id })

      await db.insert(messages).values({
        conversationId,
        role: 'assistant',
        content: response.content,
        tokensIn: response.tokensIn,
        tokensOut: response.tokensOut,
        costUsd: String(usd),
        waterMl: String(water_ml),
        carbonG: String(carbon_g),
        model,
        tier,
      })

      if (mubitCtx.mubitUsed && mubitCtx.trimmedTokens < mubitCtx.originalTokens) {
        const savedTokens = mubitCtx.originalTokens - mubitCtx.trimmedTokens
        const savings = estimateCost(model, savedTokens, 0)
        await db.insert(savingsEvents).values({
          kind: 'context_trim',
          amountUsd: String(savings.usd),
          amountWaterMl: String(savings.water_ml),
          amountCarbonG: String(savings.carbon_g),
          messageId: userRow?.id ?? null,
        })
      }

      // Generate a short title for new conversations (fire-and-forget within this block)
      if (isNew.length > 0) {
        try {
          const titleRes = await callAnthropic('claude-haiku-4-5-20251001', [
            {
              role: 'user',
              content: `Generate a very short title (3-6 words max) for a chat that starts with this message. Reply with only the title, no punctuation, no quotes:\n\n${prompt.slice(0, 200)}`,
            },
          ])
          const title = titleRes.content.trim().slice(0, 60)
          if (title) {
            await db.update(conversations).set({ title }).where(eq(conversations.id, conversationId))
          }
        } catch {
          // non-fatal
        }
      }

      await rememberMessage({ conversationId, role: 'user', content: prompt })
      await rememberMessage({ conversationId, role: 'assistant', content: response.content })
    } catch (e) {
      console.warn('DB/MuBit persist failed (non-fatal):', e)
    }
  })

  return {
    content: response.content,
    tokensIn: response.tokensIn,
    tokensOut: response.tokensOut,
    model,
    tier,
    costUsd: usd,
    waterMl: water_ml,
    carbonG: carbon_g,
    contextSaved,
    savedPercent: contextSaved && mubitCtx.savedPercent > 0 ? mubitCtx.savedPercent : undefined,
  }
}
