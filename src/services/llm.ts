import { callAnthropic, callGemini } from '@/lib/gateway'
import { estimateCost } from '@/lib/estimator'
import { db } from '@/db'
import { conversations, messages } from '@/db/schema'
import type { Tier, Model } from '@/types'

const TIER_MODEL: Record<Tier, { model: Model; fn: 'anthropic' | 'gemini' }> = {
  1: { model: 'gemini-2.5-flash',  fn: 'gemini'    },
  2: { model: 'claude-haiku-4-5',  fn: 'anthropic'  },
  3: { model: 'claude-sonnet-4-6', fn: 'anthropic'  },
  4: { model: 'claude-opus-4-7',   fn: 'anthropic'  },
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
}> {
  const { prompt, tier, conversationId } = args
  const { model, fn } = TIER_MODEL[tier]

  const userMessages = [{ role: 'user' as const, content: prompt }]

  const response =
    fn === 'gemini'
      ? await callGemini(model, userMessages)
      : await callAnthropic(model, userMessages)

  const { usd, water_ml, carbon_g } = estimateCost(model, response.tokensIn, response.tokensOut)

  // Persist to DB — non-fatal, don't block the response
  Promise.resolve().then(async () => {
    try {
      await db.insert(conversations).values({ id: conversationId }).onConflictDoNothing()
      await db.insert(messages).values({
        conversationId,
        role: 'user',
        content: prompt,
        model,
        tier,
      })
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
    } catch (e) {
      console.warn('DB persist failed (non-fatal):', e)
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
  }
}
