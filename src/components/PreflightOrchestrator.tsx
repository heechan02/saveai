"use client"

import CostCliff from '@/components/modals/CostCliff'
import ContextBloat from '@/components/modals/ContextBloat'
import DuplicateCheck from '@/components/modals/DuplicateCheck'
import type { PreflightSignal } from '@/types'

interface Props {
  signals: PreflightSignal[]
  onAccept: (signal: PreflightSignal, action: Record<string, unknown>) => void
  onDismiss: () => void
}

const SEVERITY_ORDER = { high: 0, medium: 1, low: 2 }

export default function PreflightOrchestrator({ signals, onAccept, onDismiss }: Props) {
  if (signals.length === 0) return null

  // Show highest-severity signal first
  const sorted = [...signals].sort(
    (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]
  )
  const active = sorted[0]

  const handleAccept = (action: Record<string, unknown>) => onAccept(active, action)

  if (active.kind === 'cost_cliff') {
    return (
      <CostCliff
        signal={active}
        open
        onAccept={handleAccept}
        onDismiss={onDismiss}
      />
    )
  }

  if (active.kind === 'context_bloat') {
    return (
      <ContextBloat
        signal={active}
        open
        onAccept={handleAccept}
        onDismiss={onDismiss}
      />
    )
  }

  if (active.kind === 'duplicate') {
    return (
      <DuplicateCheck
        signal={active}
        open
        onAccept={handleAccept}
        onDismiss={onDismiss}
      />
    )
  }

  return null
}
