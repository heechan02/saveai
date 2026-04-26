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

export default function ContextBloat({ signal, open, onAccept, onDismiss }: Props) {
  const action = signal.suggestedAction
  const totalTokens = (action.totalTokens as number) ?? 0
  const relevantTokens = (action.relevantTokens as number) ?? 800
  const relevantPct = totalTokens > 0 ? (relevantTokens / totalTokens) * 100 : 6

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
                  {totalTokens.toLocaleString()} tokens for {signal.message.split('for ')[1]}
                </h2>
                <p className="text-neutral-400 text-sm leading-relaxed">
                  {Math.round(100 - relevantPct)}% of your context is not relevant to this question. MuBit can trim it.
                </p>
              </div>

              {/* Token bar */}
              <div className="flex flex-col gap-2">
                <div
                  className="relative h-7 rounded-md overflow-hidden"
                  style={{ background: '#262626' }}
                >
                  <motion.div
                    className="absolute left-0 top-0 h-full rounded-md"
                    style={{ background: '#16a34a' }}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.max(relevantPct, 2)}%` }}
                    transition={{ duration: 0.6, ease: 'easeOut', delay: 0.2 }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-emerald-500">
                    {relevantTokens.toLocaleString()} relevant
                  </span>
                  <span className="text-neutral-600">
                    {(totalTokens - relevantTokens).toLocaleString()} noise
                  </span>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-3 pt-1">
                <button
                  onClick={onDismiss}
                  className="px-4 py-2 rounded-md text-sm text-neutral-400 transition-colors hover:text-neutral-200"
                  style={{ background: 'transparent' }}
                >
                  Send full context
                </button>
                <button
                  onClick={() => onAccept(action)}
                  className="px-4 py-2 rounded-md text-sm font-medium text-white transition-opacity hover:opacity-90"
                  style={{ background: '#16a34a' }}
                  autoFocus
                >
                  Trim with MuBit
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  )
}
