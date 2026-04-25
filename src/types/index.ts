export type Tier = 1 | 2 | 3 | 4

export type Model =
  | 'gemini-2.5-flash'
  | 'claude-haiku-4-5'
  | 'claude-sonnet-4-6'
  | 'claude-opus-4-7'
  | 'gemini-2.5-pro'

export type Provider = 'anthropic' | 'gemini'

export type PreflightSignal = {
  kind: 'cost_cliff' | 'context_bloat' | 'duplicate'
  severity: 'low' | 'medium' | 'high'
  message: string
  suggestedAction: Record<string, unknown>
}
