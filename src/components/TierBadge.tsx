"use client"

import { AlertTriangle } from 'lucide-react'
import type { Tier, Model } from '@/types'

const TIER_CONFIG: Record<Tier, {
  label: string
  model: Model
  color: string
  priceIn: number
  warn?: boolean
}> = {
  1: { label: 'Tier 1', model: 'gemini-2.5-flash',  color: '#22c55e', priceIn: 0.075 },
  2: { label: 'Tier 2', model: 'claude-haiku-4-5',  color: '#3b82f6', priceIn: 0.80  },
  3: { label: 'Tier 3', model: 'claude-sonnet-4-6', color: '#f59e0b', priceIn: 3.00  },
  4: { label: 'Tier 4', model: 'claude-opus-4-7',   color: '#ef4444', priceIn: 15.00, warn: true },
}

const MODEL_DISPLAY: Record<Model, string> = {
  'gemini-2.5-flash':  'Gemini 2.5 Flash',
  'claude-haiku-4-5':  'Claude Haiku 4.5',
  'claude-sonnet-4-6': 'Claude Sonnet 4.6',
  'claude-opus-4-7':   'Claude Opus 4.7',
  'gemini-2.5-pro':    'Gemini 2.5 Pro',
}

export default function TierBadge({ tier, model }: { tier: Tier; model?: Model }) {
  const cfg = TIER_CONFIG[tier]
  const displayModel = model ? MODEL_DISPLAY[model] : MODEL_DISPLAY[cfg.model]

  return (
    <div className="flex items-center gap-1.5">
      <span
        className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium"
        style={{
          background: `${cfg.color}18`,
          border: `1px solid ${cfg.color}40`,
          color: cfg.color,
        }}
      >
        {cfg.warn && (
          <AlertTriangle size={11} strokeWidth={1.5} className="shrink-0" />
        )}
        {displayModel}
      </span>
      <span className="text-neutral-600 text-xs">
        ${cfg.priceIn}/Mtok in
      </span>
    </div>
  )
}
