/**
 * Cited constants for SaveAI impact calculations.
 * Do NOT hardcode these values anywhere else — always import from here.
 */

/**
 * Energy consumed per token in watt-hours (Wh/token).
 *
 * Derived from two sources cross-referenced:
 *
 *   Luccioni et al. 2023 "Power Hungry Processing" (NeurIPS) — actual GPU
 *   hardware measurements for text generation:
 *     OPT-6.7B  ≈ 0.000098 Wh/token
 *     OPT-66B   ≈ 0.00081  Wh/token
 *     BLOOM-176B ≈ 0.0029  Wh/token
 *   @see https://arxiv.org/abs/2311.16863
 *
 *   Epoch AI 2024 — GPT-4o class model ≈ 0.3 Wh per ~1000-token query
 *   → 0.0003 Wh/token at frontier scale.
 *   @see https://epoch.ai/gradient-updates/how-much-energy-does-chatgpt-use
 *
 *   tier1_haiku  (~7B equiv):   interpolated from Luccioni OPT-6.7B, adjusted for
 *                               modern H100 efficiency gains (~2×)
 *   tier2_sonnet (~35B equiv):  interpolated between OPT-6.7B and OPT-66B
 *   tier3_opus   (~70B+ equiv): aligned with Epoch AI GPT-4o measurement
 *
 * Applied as: energy_wh = ENERGY_WH_PER_TOKEN[tier] × totalTokens
 */
export const ENERGY_WH_PER_TOKEN = {
  tier1_haiku:  0.000045,  // Wh per token
  tier2_sonnet: 0.00015,   // Wh per token
  tier3_opus:   0.0003,    // Wh per token
} as const

/**
 * Datacenter water usage per kWh consumed (liters).
 * Source: Ren et al. 2023, UC Riverside — "Making AI Less 'Thirsty'"
 * @see https://arxiv.org/abs/2304.03271
 */
export const WATER_L_PER_KWH = 1.8

/**
 * Grid carbon intensity in grams of CO₂ per kWh — IEA 2024 global average.
 * @see https://www.iea.org/reports/electricity-2024
 */
export const CARBON_G_PER_KWH = 400

/**
 * USD price per 1M tokens (input / output) at provider list prices.
 * All tiers route through Pydantic AI Gateway built-in Anthropic provider.
 */
export const PRICE_PER_MTOK = {
  /** Tier 1 — Claude Haiku (Anthropic built-in via PAIG) */
  claude_haiku: { in: 0.8, out: 4.0 },
  /** Tier 2 — Claude Sonnet 4.6 (Anthropic built-in via PAIG) */
  claude_sonnet: { in: 3.0, out: 15.0 },
  /** Tier 3 — Claude Opus (Anthropic built-in via PAIG) */
  claude_opus: { in: 15.0, out: 75.0 },
} as const

/** Citation URLs for the methodology page */
export const SOURCES = {
  epoch:    'https://epoch.ai/gradient-updates/how-much-energy-does-chatgpt-use',
  luccioni: 'https://arxiv.org/abs/2311.16863',
  altman:   'https://blog.samaltman.com/the-gentle-singularity',
  google:   'https://blog.google/technology/ai/google-gemini-ai-energy',
  jegham:   'https://arxiv.org/html/2505.09598v1',
  ucr:      'https://arxiv.org/abs/2304.03271',
  iea:      'https://www.iea.org/reports/electricity-2024',
} as const
