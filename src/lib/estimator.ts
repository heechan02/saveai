import { ENERGY_WH, WATER_L_PER_KWH, CARBON_G_PER_KWH, PRICE_PER_MTOK } from './constants'
import type { Model } from '../types'

const MODEL_ENERGY: Record<Model, number> = {
  'claude-haiku-4-5':  ENERGY_WH.tier1_haiku,
  'claude-sonnet-4-6': ENERGY_WH.tier2_sonnet,
  'claude-opus-4-7':   ENERGY_WH.tier3_opus,
  // Gemini estimates (same energy ballpark as equivalent Claude tiers)
  'gemini-2.5-flash':  ENERGY_WH.tier1_haiku,
  'gemini-2.5-pro':    ENERGY_WH.tier2_sonnet,
}

const MODEL_PRICE: Record<Model, { in: number; out: number }> = {
  'claude-haiku-4-5':  PRICE_PER_MTOK.claude_haiku,
  'claude-sonnet-4-6': PRICE_PER_MTOK.claude_sonnet,
  'claude-opus-4-7':   PRICE_PER_MTOK.claude_opus,
  'gemini-2.5-flash':  { in: 0.075, out: 0.3 },  // Gemini 2.5 Flash list price
  'gemini-2.5-pro':    { in: 1.25,  out: 10.0 },  // Gemini 2.5 Pro list price
}

export function estimateCost(
  model: Model,
  tokensIn: number,
  tokensOut: number
): { usd: number; water_ml: number; carbon_g: number; energy_wh: number } {
  if (tokensIn === 0 && tokensOut === 0) {
    return { usd: 0, water_ml: 0, carbon_g: 0, energy_wh: 0 }
  }

  const price = MODEL_PRICE[model]
  const usd = (tokensIn / 1_000_000) * price.in + (tokensOut / 1_000_000) * price.out

  const energy_wh = MODEL_ENERGY[model]
  const energy_kwh = energy_wh / 1000
  const water_ml = energy_kwh * WATER_L_PER_KWH * 1000  // L → ml
  const carbon_g = energy_kwh * CARBON_G_PER_KWH

  return { usd, water_ml, carbon_g, energy_wh }
}

/** Rough token count estimate: chars / 4 heuristic */
export function estimateTokensFromText(text: string): number {
  return Math.ceil(text.length / 4)
}
