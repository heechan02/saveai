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

export default function DuplicateCheck({ signal, open, onAccept, onDismiss }: Props) {
  const action = signal.suggestedAction
  const previousQuestion = (action.previousQuestion as string) ?? ''
  const previousAnswer = (action.previousAnswer as string) ?? ''
  const minutesAgo = (action.minutesAgo as number) ?? 0

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
                  You asked this {minutesAgo} minute{minutesAgo !== 1 ? 's' : ''} ago.
                </h2>
              </div>

              {/* Previous exchange preview */}
              <div
                className="rounded-lg p-4 flex flex-col gap-3"
                style={{ background: '#1c1c1e', border: '1px solid #262626' }}
              >
                {previousQuestion && (
                  <p className="text-sm italic text-neutral-400 leading-relaxed">
                    "{previousQuestion}"
                  </p>
                )}
                {previousAnswer && (
                  <p
                    className="text-sm text-neutral-500 leading-relaxed line-clamp-4"
                    style={{ WebkitLineClamp: 4, display: '-webkit-box', WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
                  >
                    {previousAnswer}
                  </p>
                )}
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-3 pt-1">
                <button
                  onClick={onDismiss}
                  className="px-4 py-2 rounded-md text-sm text-neutral-400 transition-colors hover:text-neutral-200"
                  style={{ background: 'transparent' }}
                >
                  Ask fresh anyway
                </button>
                <button
                  onClick={() => onAccept(action)}
                  className="px-4 py-2 rounded-md text-sm font-medium text-white transition-opacity hover:opacity-90"
                  style={{ background: '#16a34a' }}
                  autoFocus
                >
                  Use cached answer ($0)
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  )
}
