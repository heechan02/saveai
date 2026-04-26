/**
 * MuBit memory service — wraps @mubit-ai/sdk Client.
 * Falls back to empty context on any failure so the demo stays stable.
 */
import { Client } from '@mubit-ai/sdk'
import { estimateTokensFromText } from '@/lib/estimator'

let _client: Client | null = null

function getClient(): Client {
  if (!_client) {
    const apiKey = process.env.MUBIT_API_KEY
    if (!apiKey) {
      throw new Error('MUBIT_API_KEY not set')
    }
    _client = new Client({ apiKey, transport: 'http' })
  }
  return _client
}

export async function rememberMessage(args: {
  conversationId: string
  role: 'user' | 'assistant'
  content: string
}): Promise<void> {
  try {
    const client = getClient()
    await client.remember({
      session_id: args.conversationId,
      content: `[${args.role}] ${args.content}`,
    })
  } catch (err) {
    console.warn('[MuBit] rememberMessage failed (non-fatal):', err)
  }
}

type RecallEvidence = {
  content: string
  entry_type?: string
  score?: number
}

type RecallResult = {
  evidence?: RecallEvidence[]
  final_answer?: string
}

export async function getContext(args: {
  conversationId: string
  currentPrompt: string
  tokenBudget?: number
}): Promise<{
  messages: { role: string; content: string }[]
  originalTokens: number
  trimmedTokens: number
  savedPercent: number
  mubitUsed: boolean
}> {
  const fallback = { messages: [], originalTokens: 0, trimmedTokens: 0, savedPercent: 0, mubitUsed: false }

  try {
    const client = getClient()
    const budget = args.tokenBudget ?? 4000

    // getContext() returns empty context_block — use recall() which works correctly
    const result = await client.recall({
      session_id: args.conversationId,
      query: args.currentPrompt,
      limit: 20,
    }) as RecallResult

    const evidence = result?.evidence ?? []
    if (evidence.length === 0) {
      return { ...fallback, mubitUsed: true }
    }

    // Build context text from evidence, respecting token budget
    const lines: string[] = []
    let usedTokens = 0
    for (const ev of evidence) {
      const tokens = estimateTokensFromText(ev.content)
      if (usedTokens + tokens > budget) break
      lines.push(ev.content)
      usedTokens += tokens
    }

    if (lines.length === 0) {
      return { ...fallback, mubitUsed: true }
    }

    const contextText = lines.join('\n\n')
    const trimmedTokens = estimateTokensFromText(contextText)
    // originalTokens = all evidence without budget constraint
    const originalTokens = evidence.reduce((sum, ev) => sum + estimateTokensFromText(ev.content), 0)
    const savedPercent = originalTokens > trimmedTokens
      ? Math.round(((originalTokens - trimmedTokens) / originalTokens) * 100)
      : 0

    return {
      messages: [{ role: 'system', content: `Relevant context from memory:\n\n${contextText}` }],
      originalTokens,
      trimmedTokens,
      savedPercent,
      mubitUsed: true,
    }
  } catch (err) {
    console.warn('[MuBit] recall failed — using fallback context:', err)
    return fallback
  }
}
