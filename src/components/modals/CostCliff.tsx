"use client"

import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import type { PreflightSignal } from '@/types'

interface Props {
  signal: PreflightSignal
  open: boolean
  onAccept: (action: Record<string, unknown>) => void
  onDismiss: () => void
}

function MiniCostCard({
  label,
  usd,
  waterMl,
  carbonG,
  borderColor,
  highlight,
}: {
  label: string
  usd: number
  waterMl: number
  carbonG: number
  borderColor: string
  highlight?: boolean
}) {
  return (
    <div
      className="flex-1 rounded-lg p-4 flex flex-col gap-2"
      style={{
        background: '#1c1c1e',
        border: `1px solid ${borderColor}`,
        opacity: highlight ? 1 : 0.65,
      }}
    >
      <span className="text-xs text-neutral-500 uppercase tracking-wider">{label}</span>
      <span
        className="tabular-nums font-semibold"
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 22,
          color: highlight ? '#10b981' : '#ef4444',
        }}
      >
        ${usd < 0.001 ? usd.toFixed(6) : usd.toFixed(4)}
      </span>
      <div className="flex flex-col gap-0.5">
        <span className="text-xs text-neutral-500">{waterMl.toFixed(4)} mL water</span>
        <span className="text-xs text-neutral-500">{carbonG.toFixed(4)} g CO₂</span>
      </div>
    </div>
  )
}

export default function CostCliff({ signal, open, onAccept, onDismiss }: Props) {
  const action = signal.suggestedAction
  const opusUsd = (action.opusUsd as number) ?? 0
  const flashUsd = (action.flashUsd as number) ?? 0
  const opusWaterMl = (action.opusWaterMl as number) ?? 0
  const flashWaterMl = (action.flashWaterMl as number) ?? 0
  const opusCarbonG = (action.opusCarbonG as number) ?? 0
  const flashCarbonG = (action.flashCarbonG as number) ?? 0

  const ratio = opusUsd > 0 && flashUsd > 0 ? Math.round(opusUsd / flashUsd) : 0

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!open) return
      if (e.key === 'Enter') { e.preventDefault(); onAccept(action) }
      if (e.key === 'Escape') { e.preventDefault(); onDismiss() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, action, onAccept, onDismiss])

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onDismiss()}>
      <DialogContent
        className="p-0 overflow-hidden"
        style={{
          maxWidth: 480,
          background: '#0f0f0f',
          border: '1px solid #262626',
          borderRadius: 16,
        }}
      >
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="p-6 flex flex-col gap-5"
            >
              {/* Header */}
              <div className="flex flex-col gap-1.5">
                <h2 className="text-2xl font-semibold text-white">
                  This is a ${opusUsd.toFixed(4)} question.
                </h2>
                <p className="text-neutral-400 text-sm leading-relaxed">
                  Claude Haiku answers it for ${flashUsd.toFixed(6)}.
                  {ratio > 1 && ` That's ${ratio.toLocaleString()}× cheaper.`}
                </p>
              </div>

              {/* Side-by-side comparison */}
              <div className="flex items-center gap-3">
                <MiniCostCard
                  label="Claude Opus"
                  usd={opusUsd}
                  waterMl={opusWaterMl}
                  carbonG={opusCarbonG}
                  borderColor="#7f1d1d"
                />

                {/* Animated arrow */}
                <motion.div
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2, duration: 0.3 }}
                  className="text-neutral-400 shrink-0"
                  style={{ fontSize: 20 }}
                >
                  →
                </motion.div>

                <MiniCostCard
                  label="Claude Haiku"
                  usd={flashUsd}
                  waterMl={flashWaterMl}
                  carbonG={flashCarbonG}
                  borderColor="#14532d"
                  highlight
                />
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-3 pt-1">
                <button
                  onClick={onDismiss}
                  className="px-4 py-2 rounded-md text-sm text-neutral-400 transition-colors hover:text-neutral-200"
                  style={{ background: 'transparent' }}
                >
                  Send anyway
                </button>
                <button
                  onClick={() => onAccept(action)}
                  className="px-4 py-2 rounded-md text-sm font-medium text-white transition-opacity hover:opacity-90"
                  style={{ background: '#16a34a' }}
                  autoFocus
                >
                  Use Claude Haiku
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  )
}
