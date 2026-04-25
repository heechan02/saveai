import OpenAI from 'openai'

/** OpenAI-compatible client pointed at Pydantic AI Gateway root */
export const gateway = new OpenAI({
  apiKey: process.env.PYDANTIC_GATEWAY_KEY!,
  baseURL: 'https://gateway-eu.pydantic.dev/proxy',
})

/** Separate client for Gemini's OpenAI-compatible endpoint via PAIG */
const geminiGateway = new OpenAI({
  apiKey: process.env.PYDANTIC_GATEWAY_KEY!,
  baseURL: 'https://gateway-eu.pydantic.dev/proxy/gemini/v1beta/openai',
})

export interface GatewayResponse {
  content: string
  tokensIn: number
  tokensOut: number
  model: string
  finishReason: string | null
}

type MessageParam = { role: 'user' | 'assistant' | 'system'; content: string }

/**
 * Call an Anthropic Claude model via PAIG's native Anthropic Messages API proxy.
 * Uses fetch + Anthropic Messages API format (not OpenAI chat completions).
 */
export async function callAnthropic(
  model: string,
  messages: MessageParam[]
): Promise<GatewayResponse> {
  const apiKey = process.env.PYDANTIC_GATEWAY_KEY
  if (!apiKey) throw new Error('PYDANTIC_GATEWAY_KEY is not set')

  // Separate system prompt from conversation messages (Anthropic API requirement)
  const systemMessages = messages.filter((m) => m.role === 'system')
  const chatMessages = messages.filter((m) => m.role !== 'system')

  const body: Record<string, unknown> = {
    model,
    max_tokens: 4096,
    messages: chatMessages,
  }
  if (systemMessages.length > 0) {
    body.system = systemMessages.map((m) => m.content).join('\n')
  }

  const res = await fetch('https://gateway-eu.pydantic.dev/proxy/anthropic/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Anthropic gateway error ${res.status}: ${text}`)
  }

  const data = await res.json()

  const content =
    data.content
      ?.filter((b: { type: string }) => b.type === 'text')
      .map((b: { text: string }) => b.text)
      .join('') ?? ''

  return {
    content,
    tokensIn: data.usage?.input_tokens ?? 0,
    tokensOut: data.usage?.output_tokens ?? 0,
    model: data.model ?? model,
    finishReason: data.stop_reason ?? null,
  }
}

/**
 * Call a Gemini model via PAIG's OpenAI-compatible Gemini proxy.
 */
export async function callGemini(
  model: string,
  messages: MessageParam[]
): Promise<GatewayResponse> {
  const res = await geminiGateway.chat.completions.create({
    model,
    messages,
  })

  const choice = res.choices[0]
  return {
    content: choice?.message?.content ?? '',
    tokensIn: res.usage?.prompt_tokens ?? 0,
    tokensOut: res.usage?.completion_tokens ?? 0,
    model: res.model,
    finishReason: choice?.finish_reason ?? null,
  }
}
