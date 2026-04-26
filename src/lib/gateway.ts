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
 */
export async function callAnthropic(
  model: string,
  messages: MessageParam[]
): Promise<GatewayResponse> {
  const apiKey = process.env.PYDANTIC_GATEWAY_KEY
  if (!apiKey) throw new Error('PYDANTIC_GATEWAY_KEY is not set')

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
      'Authorization': `Bearer ${apiKey}`,
      'anthropic-version': '2023-06-01',
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
 * Call OpenAI-compatible model via PAIG's OpenAI proxy.
 */
export async function callOpenAI(
  model: string,
  messages: MessageParam[]
): Promise<GatewayResponse> {
  const apiKey = process.env.PYDANTIC_GATEWAY_KEY
  if (!apiKey) throw new Error('PYDANTIC_GATEWAY_KEY is not set')

  const res = await fetch('https://gateway-eu.pydantic.dev/proxy/openai/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, messages, max_tokens: 4096 }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`OpenAI gateway error ${res.status}: ${text}`)
  }

  const data = await res.json()
  const content = data.choices?.[0]?.message?.content ?? ''

  return {
    content,
    tokensIn: data.usage?.prompt_tokens ?? 0,
    tokensOut: data.usage?.completion_tokens ?? 0,
    model: data.model ?? model,
    finishReason: data.choices?.[0]?.finish_reason ?? null,
  }
}

/**
 * Call Groq model via PAIG's Groq proxy (OpenAI-compatible format).
 */
export async function callGroq(
  model: string,
  messages: MessageParam[]
): Promise<GatewayResponse> {
  const apiKey = process.env.PYDANTIC_GATEWAY_KEY
  if (!apiKey) throw new Error('PYDANTIC_GATEWAY_KEY is not set')

  const res = await fetch('https://gateway-eu.pydantic.dev/proxy/groq/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, messages, max_tokens: 4096 }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Groq gateway error ${res.status}: ${text}`)
  }

  const data = await res.json()
  const content = data.choices?.[0]?.message?.content ?? ''

  return {
    content,
    tokensIn: data.usage?.prompt_tokens ?? 0,
    tokensOut: data.usage?.completion_tokens ?? 0,
    model: data.model ?? model,
    finishReason: data.choices?.[0]?.finish_reason ?? null,
  }
}
