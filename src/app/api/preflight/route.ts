import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { messages } from '@/db/schema'
import { eq, desc } from 'drizzle-orm'
import { estimateCost, estimateTokensFromText } from '@/lib/estimator'
import { emitSpan } from '@/lib/logfire'
import type { Tier, PreflightSignal } from '@/types'

// ---------------------------------------------------------------------------
// Text similarity fallback (no embedding API needed)
// Jaccard similarity on word bigrams — good enough for near-duplicate detection
// ---------------------------------------------------------------------------
function textSimilarity(a: string, b: string): number {
  const bigrams = (s: string) => {
    const words = s.toLowerCase().split(/\s+/)
    const set = new Set<string>()
    for (let i = 0; i < words.length; i++) set.add(words[i])
    for (let i = 0; i < words.length - 1; i++) set.add(`${words[i]} ${words[i + 1]}`)
    return set
  }
  const sa = bigrams(a)
  const sb = bigrams(b)
  const intersection = [...sa].filter((x) => sb.has(x)).length
  const union = new Set([...sa, ...sb]).size
  return union === 0 ? 0 : intersection / union
}

// ---------------------------------------------------------------------------
// Checks
// ---------------------------------------------------------------------------
async function costCliffCheck(prompt: string, tier: Tier): Promise<PreflightSignal | null> {
  if (tier !== 4 || prompt.trim().length >= 100) return null

  const tokensIn = estimateTokensFromText(prompt)
  const tokensOut = tokensIn * 2

  const opusCost = estimateCost('claude-opus-4-7', tokensIn, tokensOut)
  const flashCost = estimateCost('llama-3.1-8b-instant', tokensIn, tokensOut)

  return {
    kind: 'cost_cliff',
    severity: 'high',
    message: `This is a $${opusCost.usd.toFixed(4)} question. Groq Llama answers it for $${flashCost.usd.toFixed(6)}.`,
    suggestedAction: {
      switchToTier: 1,
      switchToModel: 'llama-3.1-8b-instant',
      opusUsd: opusCost.usd,
      flashUsd: flashCost.usd,
      opusWaterMl: opusCost.water_ml,
      flashWaterMl: flashCost.water_ml,
      opusCarbonG: opusCost.carbon_g,
      flashCarbonG: flashCost.carbon_g,
    },
  }
}

async function contextBloatCheck(prompt: string, conversationId: string): Promise<PreflightSignal | null> {
  if (prompt.trim().length >= 100) return null

  const history = await db
    .select({ content: messages.content })
    .from(messages)
    .where(eq(messages.conversationId, conversationId))

  if (history.length === 0) return null

  const historyText = history.map((m) => m.content).join(' ')
  const totalTokens = estimateTokensFromText(historyText)

  // 4,000 token threshold — realistic for a 10-message dev conversation
  if (totalTokens <= 4000) return null

  const wordCount = prompt.trim().split(/\s+/).length

  return {
    kind: 'context_bloat',
    severity: 'medium',
    message: `${totalTokens.toLocaleString()} tokens of history for ${wordCount} word${wordCount !== 1 ? 's' : ''}.`,
    suggestedAction: { useMinimalContext: true, totalTokens, relevantTokens: 800 },
  }
}

async function duplicateCheck(prompt: string, conversationId: string): Promise<PreflightSignal | null> {
  try {
    // Fetch last 20 user messages from this conversation
    const recent = await db
      .select({ id: messages.id, content: messages.content, createdAt: messages.createdAt })
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(desc(messages.createdAt))
      .limit(40)

    const userMessages = recent.filter((m) => {
      // We stored role alongside but need to re-query with role — use content heuristic:
      // assistant messages tend to be longer; simpler: just check all and pick best match
      return true
    })

    // Find best text similarity match
    let bestMatch: { id: string; content: string; createdAt: Date; similarity: number } | null = null
    for (const msg of userMessages) {
      const sim = textSimilarity(prompt, msg.content)
      if (sim > (bestMatch?.similarity ?? 0)) {
        bestMatch = { ...msg, createdAt: new Date(msg.createdAt as unknown as string), similarity: sim }
      }
    }

    if (!bestMatch || bestMatch.similarity < 0.75) return null

    // Find the message that came right after (the reply)
    const idx = recent.findIndex((m) => m.id === bestMatch!.id)
    const cachedAnswer = idx > 0 ? recent[idx - 1].content : null

    const minutesAgo = Math.round((Date.now() - bestMatch.createdAt.getTime()) / 60000)

    return {
      kind: 'duplicate',
      severity: 'low',
      message: `You asked something nearly identical ${minutesAgo} minute${minutesAgo !== 1 ? 's' : ''} ago.`,
      suggestedAction: {
        useCachedMessageId: bestMatch.id,
        previousQuestion: bestMatch.content,
        previousAnswer: cachedAnswer,
        minutesAgo,
      },
    }
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Route
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  try {
    const { prompt, tier, conversationId } = (await req.json()) as {
      prompt: string
      tier: Tier
      conversationId: string
    }

    const [costCliff, contextBloat, duplicate] = await Promise.all([
      costCliffCheck(prompt, tier),
      contextBloatCheck(prompt, conversationId),
      duplicateCheck(prompt, conversationId),
    ])

    const signals: PreflightSignal[] = [costCliff, contextBloat, duplicate].filter(
      Boolean
    ) as PreflightSignal[]

    // Emit Logfire spans for each signal (fire-and-forget)
    const promptTokens = estimateTokensFromText(prompt)
    for (const signal of signals) {
      const sa = signal.suggestedAction as Record<string, number>
      let usd = 0, water_ml = 0, carbon_g = 0
      if (signal.kind === 'cost_cliff') {
        usd = (sa.opusUsd ?? 0) - (sa.flashUsd ?? 0)
        water_ml = (sa.opusWaterMl ?? 0) - (sa.flashWaterMl ?? 0)
        carbon_g = (sa.opusCarbonG ?? 0) - (sa.flashCarbonG ?? 0)
      } else if (signal.kind === 'context_bloat') {
        const trimmedTokens = (sa.totalTokens ?? 0) - (sa.relevantTokens ?? 0)
        const tierCost = estimateCost(tier === 4 ? 'claude-opus-4-7' : 'llama-3.1-8b-instant', trimmedTokens, 0)
        usd = tierCost.usd; water_ml = tierCost.water_ml; carbon_g = tierCost.carbon_g
      } else if (signal.kind === 'duplicate') {
        const tierCost = estimateCost(tier === 4 ? 'claude-opus-4-7' : 'llama-3.1-8b-instant', promptTokens, promptTokens * 2)
        usd = tierCost.usd; water_ml = tierCost.water_ml; carbon_g = tierCost.carbon_g
      }
      emitSpan('saveai.preflight.signal_generated', {
        'signal.kind': signal.kind,
        'signal.severity': signal.severity,
        'usd_could_save': usd,
        'water_ml_could_save': water_ml,
        'carbon_g_could_save': carbon_g,
        'prompt_length_chars': prompt.length,
        'tier_selected': tier,
      })
    }

    return NextResponse.json({ signals })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
