export type Tier = 1 | 2 | 3 | 4

export type Model =
  | 'llama-3.1-8b-instant'
  | 'gpt-4o-mini'
  | 'claude-haiku-4-5'
  | 'claude-sonnet-4-6'
  | 'claude-opus-4-7'

export type Provider = 'anthropic' | 'openai' | 'groq'

export type Message = {
  id: string
  role: 'user' | 'assistant'
  content: string
  tier?: Tier
  model?: Model
  contextSaved?: boolean
  savedPercent?: number
}

export type PreflightSignal = {
  kind: 'cost_cliff' | 'context_bloat' | 'duplicate'
  severity: 'low' | 'medium' | 'high'
  message: string
  suggestedAction: Record<string, unknown>
}
