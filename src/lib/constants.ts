/**
 * Cited constants for SaveAI impact calculations.
 * Do NOT hardcode these values anywhere else — always import from here.
 */

/**
 * Energy consumed per AI query in watt-hours (Wh).
 * Sources:
 *   tier1_haiku: Epoch AI estimate for small models, proxy from GPT-4o measurement
 *     @see https://epoch.ai/gradient-updates/how-much-energy-does-chatgpt-use
 *   tier2_sonnet: Mid-tier flagship range; Llama-3-70B ≈ 1.7 Wh, Sonnet smaller
 *     @see https://epoch.ai/gradient-updates/how-much-energy-does-chatgpt-use
 *   tier3_opus: Jegham et al. 2025, measured range 3–30 Wh for frontier models
 *     @see https://arxiv.org/html/2505.09598v1
 */
export const ENERGY_WH = {
  tier1_haiku: 0.3,
  tier2_sonnet: 1.0,
  tier3_opus: 15.0,
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
  epoch: 'https://epoch.ai/gradient-updates/how-much-energy-does-chatgpt-use',
  altman: 'https://blog.samaltman.com/the-gentle-singularity',
  google: 'https://blog.google/technology/ai/google-gemini-ai-energy',
  jegham: 'https://arxiv.org/html/2505.09598v1',
  ucr: 'https://arxiv.org/abs/2304.03271',
  iea: 'https://www.iea.org/reports/electricity-2024',
} as const
