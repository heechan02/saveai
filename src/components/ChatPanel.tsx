"use client"

import { useRef, useState, useEffect } from 'react'
import { Send } from 'lucide-react'
import ImpactMeter from '@/components/ImpactMeter'
import TierBadge from '@/components/TierBadge'
import PreflightOrchestrator from '@/components/PreflightOrchestrator'
import { estimateTokensFromText, estimateCost } from '@/lib/estimator'
import type { Tier, Model, PreflightSignal, Message } from '@/types'

const PILL_TIERS: { tier: Tier; label: string; sub: string; model: Model; warn?: boolean }[] = [
  { tier: 1, label: 'Haiku',  sub: '$0.8',  model: 'claude-haiku-4-5'  },
  { tier: 2, label: 'Sonnet', sub: '$3',    model: 'claude-sonnet-4-6' },
  { tier: 3, label: 'Opus',   sub: '$15',   model: 'claude-opus-4-7', warn: true },
]

function randomId() {
  return Math.random().toString(36).slice(2)
}

type Props = {
  conversationId: string
  messages: Message[]
  onMessagesChange: (msgs: Message[]) => void
}

export default function ChatPanel({ conversationId, messages, onMessagesChange }: Props) {
  const [input, setInput] = useState('')
  const [tier, setTier] = useState<Tier>(2)
  const [sending, setSending] = useState(false)
  const [showMeter, setShowMeter] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  // Keep a ref to current messages so async callbacks always see latest
  const messagesRef = useRef(messages)
  messagesRef.current = messages

  // Preflight state
  const [preflightSignals, setPreflightSignals] = useState<PreflightSignal[]>([])
  const pendingRef = useRef<{ text: string; tier: Tier } | null>(null)

  const selectedPill = PILL_TIERS.find((o) => o.tier === tier)!

  // Accumulate session cost from all messages
  const sessionCost = messages.reduce(
    (acc, msg) => {
      if (msg.role === 'assistant' && msg.model) {
        const tokIn = estimateTokensFromText(msg.content)
        const cost = estimateCost(msg.model as import('@/types').Model, tokIn, tokIn)
        return { usd: acc.usd + cost.usd, water_ml: acc.water_ml + cost.water_ml, carbon_g: acc.carbon_g + cost.carbon_g }
      }
      return acc
    },
    { usd: 0, water_ml: 0, carbon_g: 0 }
  )
  const assistantCount = messages.filter((m) => m.role === 'assistant').length

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function autoGrow() {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    const lineH = 24
    const maxH = lineH * 6
    el.style.height = Math.min(el.scrollHeight, maxH) + 'px'
  }

  async function fireChatRequest(text: string, effectiveTier: Tier, useMinimalContext?: boolean) {
    setSending(true)
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: text, tier: effectiveTier, conversationId, useMinimalContext }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Request failed')

      const assistantMsg: Message = {
        id: randomId(),
        role: 'assistant',
        content: data.content,
        tier: data.tier,
        model: data.model,
        contextSaved: data.contextSaved ?? false,
        savedPercent: data.savedPercent,
      }
      onMessagesChange([...messagesRef.current, assistantMsg])
      return data
    } catch (err) {
      const errMsg: Message = {
        id: randomId(),
        role: 'assistant',
        content: `Error: ${err instanceof Error ? err.message : 'Unknown error'}`,
        tier: effectiveTier,
        model: PILL_TIERS.find((o) => o.tier === effectiveTier)?.model,
      }
      onMessagesChange([...messagesRef.current, errMsg])
      return null
    } finally {
      setSending(false)
    }
  }

  async function recordSavings(
    kind: 'cost_cliff' | 'context_trim' | 'duplicate',
    amountUsd: number,
    amountWaterMl: number,
    amountCarbonG: number
  ) {
    try {
      await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind, amountUsd, amountWaterMl, amountCarbonG }),
      })
    } catch {
      // non-fatal
    }
  }

  async function handleSend() {
    const text = input.trim()
    if (!text || sending) return

    const userMsg: Message = { id: randomId(), role: 'user', content: text }
    const nextMessages = [...messages, userMsg]
    onMessagesChange(nextMessages)
    setInput('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'

    // Step 1: preflight check
    let signals: PreflightSignal[] = []
    try {
      const pfRes = await fetch('/api/preflight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: text, tier, conversationId }),
      })
      if (pfRes.ok) {
        const pfData = await pfRes.json()
        signals = pfData.signals ?? []
      }
    } catch {
      // preflight failure is non-fatal
    }

    if (signals.length > 0) {
      pendingRef.current = { text, tier }
      setPreflightSignals(signals)
      return
    }

    await fireChatRequest(text, tier)
  }

  async function handleModalAccept(signal: PreflightSignal, action: Record<string, unknown>) {
    setPreflightSignals([])
    const pending = pendingRef.current
    pendingRef.current = null
    if (!pending) return

    if (signal.kind === 'duplicate') {
      const cachedAnswer = action.previousAnswer as string | undefined
      if (cachedAnswer) {
        onMessagesChange([
          ...messages,
          {
            id: randomId(),
            role: 'assistant',
            content: cachedAnswer,
            tier: pending.tier,
            model: selectedPill.model,
          },
        ])
      }
      await recordSavings('duplicate', 0, 0, 0)
      return
    }

    if (signal.kind === 'cost_cliff') {
      const newTier = (action.switchToTier as Tier) ?? 1
      setTier(newTier)
      const data = await fireChatRequest(pending.text, newTier)
      if (data) {
        const tokensIn = estimateTokensFromText(pending.text)
        const tokensOut = tokensIn * 2
        const opusCost = estimateCost('claude-opus-4-7', tokensIn, tokensOut)
        const flashCost = estimateCost('claude-haiku-4-5', tokensIn, tokensOut)
        await recordSavings(
          'cost_cliff',
          opusCost.usd - flashCost.usd,
          opusCost.water_ml - flashCost.water_ml,
          opusCost.carbon_g - flashCost.carbon_g
        )
      }
      return
    }

    if (signal.kind === 'context_bloat') {
      await fireChatRequest(pending.text, pending.tier, true)
      await recordSavings('context_trim', 0, 0, 0)
      return
    }
  }

  function handleModalDismiss() {
    const pending = pendingRef.current
    pendingRef.current = null
    setPreflightSignals([])
    if (!pending) return
    fireChatRequest(pending.text, pending.tier)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div
      className="flex flex-col h-full flex-1 min-w-0 relative"
      style={{ background: '#0a0a0a', fontFamily: 'var(--font-inter), Inter, system-ui, sans-serif' }}
    >
      {/* Preflight modals */}
      <PreflightOrchestrator
        signals={preflightSignals}
        onAccept={handleModalAccept}
        onDismiss={handleModalDismiss}
      />

      {/* ── Top impact bar ── */}
      <div className="shrink-0 border-b border-neutral-800" style={{ background: '#111111' }}>
        {/* Summary strip — always visible */}
        <button
          onClick={() => setShowMeter((v) => !v)}
          className="w-full flex items-center gap-4 px-6 transition-colors hover:bg-neutral-900"
          style={{ height: 40 }}
        >
          <span className="text-neutral-500 text-xs uppercase tracking-widest shrink-0">Impact</span>
          <span className="flex items-baseline gap-1">
            <span className="font-mono font-semibold text-emerald-400" style={{ fontSize: 13 }}>${sessionCost.usd.toFixed(4)}</span>
            <span className="text-neutral-600 text-xs">cost</span>
          </span>
          <span className="text-neutral-700">·</span>
          <span className="flex items-baseline gap-1">
            <span className="font-mono font-semibold text-blue-400" style={{ fontSize: 13 }}>{sessionCost.water_ml.toFixed(3)}</span>
            <span className="text-neutral-600 text-xs">mL</span>
          </span>
          <span className="text-neutral-700">·</span>
          <span className="flex items-baseline gap-1">
            <span className="font-mono font-semibold text-orange-400" style={{ fontSize: 13 }}>{sessionCost.carbon_g.toFixed(3)}</span>
            <span className="text-neutral-600 text-xs">g CO₂</span>
          </span>
          <span className="ml-auto text-neutral-500 text-xs">{showMeter ? '▲ collapse' : '▼ expand'}</span>
        </button>

        {/* Expanded full meter */}
        {showMeter && (
          <div className="px-6 pb-4 max-w-3xl mx-auto" style={{ zoom: 0.75 }}>
            <ImpactMeter
              usd={sessionCost.usd}
              water_ml={sessionCost.water_ml}
              carbon_g={sessionCost.carbon_g}
              model={selectedPill.model}
              messageCount={assistantCount}
            />
          </div>
        )}
      </div>

      {/* ── chat + composer ── */}
      <div className="flex flex-col flex-1 min-h-0 min-w-0" style={{ background: '#0a0a0a' }}>
        {/* Message history */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="max-w-3xl mx-auto w-full flex flex-col gap-4">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <span className="text-neutral-600 text-sm">Select a tier and send a message.</span>
              </div>
            )}

            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col gap-1 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
              >
                {msg.role === 'assistant' && msg.tier && msg.model && (
                  <div className="flex items-center gap-2">
                    <TierBadge tier={msg.tier} model={msg.model} />
                    {msg.contextSaved && (
                      <span
                        className="text-xs rounded px-2 py-0.5 font-medium"
                        style={{ background: '#14532d', color: '#4ade80', border: '1px solid #166534' }}
                      >
                        context saved {msg.savedPercent != null ? `${msg.savedPercent}%` : '✓'}
                      </span>
                    )}
                  </div>
                )}
                <div
                  className="rounded-lg px-4 py-3 text-sm leading-relaxed"
                  style={{
                    maxWidth: '75%',
                    background: msg.role === 'user' ? '#262626' : 'transparent',
                    color: msg.role === 'user' ? '#e5e5e5' : '#d4d4d4',
                    border: msg.role === 'assistant' ? '1px solid #262626' : 'none',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {sending && (
              <div className="flex items-start">
                <div className="rounded-lg px-4 py-3 border border-neutral-800">
                  <div className="flex gap-1 items-center h-4">
                    <span className="w-1.5 h-1.5 rounded-full bg-neutral-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-neutral-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-neutral-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>
        </div>

        {/* Composer */}
        <div className="border-t border-neutral-800 px-6 py-4" style={{ background: '#141414' }}>
          <div className="max-w-3xl mx-auto flex flex-col gap-3">
            {/* Pill tier selector */}
            <div className="flex items-center gap-3">
              <label className="text-neutral-500 text-xs shrink-0">Model</label>
              <div className="flex gap-1">
                {PILL_TIERS.map((o) => {
                  const isActive = tier === o.tier
                  return (
                    <button
                      key={o.tier}
                      onClick={() => setTier(o.tier)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs transition-colors"
                      style={{
                        background: isActive ? '#ffffff' : '#262626',
                        color: isActive ? '#0a0a0a' : '#a3a3a3',
                        border: isActive && o.warn ? '1px solid #f59e0b' : '1px solid transparent',
                        fontWeight: isActive ? 600 : 400,
                      }}
                    >
                      {o.label}
                      <span style={{ opacity: 0.6, fontSize: 10 }}>{o.sub}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Textarea + send row */}
            <div className="flex gap-2 items-end">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => { setInput(e.target.value); autoGrow() }}
                onKeyDown={handleKeyDown}
                placeholder="Type a message… (Enter to send, Shift+Enter for newline)"
                rows={1}
                className="flex-1 resize-none rounded-md px-4 py-3 text-sm outline-none placeholder-neutral-600"
                style={{
                  background: '#1c1c1e',
                  border: '1px solid #3f3f46',
                  color: '#e5e5e5',
                  fontFamily: 'var(--font-inter), Inter, sans-serif',
                  lineHeight: '24px',
                  minHeight: '48px',
                }}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || sending}
                className="flex items-center gap-2 px-4 py-3 rounded-md text-sm font-medium transition-opacity disabled:opacity-40 shrink-0"
                style={{
                  background: '#16a34a',
                  color: '#ffffff',
                  cursor: input.trim() && !sending ? 'pointer' : 'not-allowed',
                }}
              >
                <Send size={14} strokeWidth={1.5} />
                Send
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
