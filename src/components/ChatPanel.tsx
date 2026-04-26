"use client"

import { useRef, useState, useEffect } from 'react'
import { Send } from 'lucide-react'
import ImpactMeter from '@/components/ImpactMeter'
import TierBadge from '@/components/TierBadge'
import PreflightOrchestrator from '@/components/PreflightOrchestrator'
import { estimateTokensFromText, estimateCost } from '@/lib/estimator'
import type { Tier, Model, PreflightSignal } from '@/types'

const TIER_OPTIONS: { tier: Tier; label: string; model: Model; priceIn: number; warn?: boolean }[] = [
  { tier: 1, label: 'Tier 1 — Claude Haiku',  model: 'claude-haiku-4-5',  priceIn: 0.80  },
  { tier: 2, label: 'Tier 2 — Claude Sonnet', model: 'claude-sonnet-4-6', priceIn: 3.00  },
  { tier: 3, label: 'Tier 3 — Claude Opus',   model: 'claude-opus-4-7',   priceIn: 15.00 },
  { tier: 4, label: 'Tier 4 — Claude Opus ⚠', model: 'claude-opus-4-7',   priceIn: 15.00, warn: true },
]

type Message = {
  id: string
  role: 'user' | 'assistant'
  content: string
  tier?: Tier
  model?: Model
  contextSaved?: boolean
  savedPercent?: number
}

function randomId() {
  return Math.random().toString(36).slice(2)
}

export default function ChatPanel() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [tier, setTier] = useState<Tier>(2)
  const [sending, setSending] = useState(false)
  const [conversationId] = useState(() => crypto.randomUUID())
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Preflight state
  const [preflightSignals, setPreflightSignals] = useState<PreflightSignal[]>([])
  const pendingRef = useRef<{ text: string; tier: Tier } | null>(null)

  const selectedOption = TIER_OPTIONS.find((o) => o.tier === tier)!
  const tokensIn = estimateTokensFromText(input)
  const tokensOut = tokensIn * 2

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
      setMessages((m) => [...m, assistantMsg])
      return data
    } catch (err) {
      const errMsg: Message = {
        id: randomId(),
        role: 'assistant',
        content: `Error: ${err instanceof Error ? err.message : 'Unknown error'}`,
        tier: effectiveTier,
        model: TIER_OPTIONS.find((o) => o.tier === effectiveTier)?.model,
      }
      setMessages((m) => [...m, errMsg])
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
    setMessages((m) => [...m, userMsg])
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
      // preflight failure is non-fatal — proceed without signals
    }

    if (signals.length > 0) {
      // Store pending request; wait for modal resolution
      pendingRef.current = { text, tier }
      setPreflightSignals(signals)
      return
    }

    // No signals — send directly
    await fireChatRequest(text, tier)
  }

  async function handleModalAccept(signal: PreflightSignal, action: Record<string, unknown>) {
    setPreflightSignals([])
    const pending = pendingRef.current
    pendingRef.current = null
    if (!pending) return

    if (signal.kind === 'duplicate') {
      // Show cached answer inline, record $0 savings
      const cachedAnswer = action.previousAnswer as string | undefined
      if (cachedAnswer) {
        setMessages((m) => [
          ...m,
          {
            id: randomId(),
            role: 'assistant',
            content: cachedAnswer,
            tier: pending.tier,
            model: selectedOption.model,
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
        // Compute savings: opus cost - actual cost
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
    // Send original request unchanged
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
      className="flex flex-col h-full"
      style={{ background: '#0a0a0a', fontFamily: 'var(--font-inter), Inter, system-ui, sans-serif' }}
    >
      {/* Preflight modals */}
      <PreflightOrchestrator
        signals={preflightSignals}
        onAccept={handleModalAccept}
        onDismiss={handleModalDismiss}
      />

      {/* Message history */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-3xl mx-auto flex flex-col gap-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 gap-3">
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
                  maxWidth: '80%',
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
            <div className="flex items-start gap-2">
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
      <div
        className="border-t border-neutral-800 px-4 py-4"
        style={{ background: '#141414' }}
      >
        <div className="max-w-3xl mx-auto flex flex-col gap-3">
          {/* Tier selector */}
          <div className="flex items-center gap-3">
            <label className="text-neutral-500 text-xs shrink-0">Model</label>
            <select
              value={tier}
              onChange={(e) => setTier(Number(e.target.value) as Tier)}
              className="flex-1 rounded-md text-sm px-3 py-1.5 outline-none appearance-none cursor-pointer"
              style={{
                background: '#1c1c1e',
                border: '1px solid #3f3f46',
                color: '#e5e5e5',
                fontFamily: 'var(--font-inter), Inter, sans-serif',
              }}
            >
              {TIER_OPTIONS.map((o) => (
                <option key={o.tier} value={o.tier}>
                  {o.label}{o.warn ? '  ⚠' : ''}    ${o.priceIn}/Mtok in
                </option>
              ))}
            </select>
          </div>

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => { setInput(e.target.value); autoGrow() }}
            onKeyDown={handleKeyDown}
            placeholder="Type a message… (Enter to send, Shift+Enter for newline)"
            rows={1}
            className="w-full resize-none rounded-md px-4 py-3 text-sm outline-none placeholder-neutral-600"
            style={{
              background: '#1c1c1e',
              border: '1px solid #3f3f46',
              color: '#e5e5e5',
              fontFamily: 'var(--font-inter), Inter, sans-serif',
              lineHeight: '24px',
              minHeight: '48px',
            }}
          />

          {/* Impact Meter */}
          <ImpactMeter
            tokensIn={tokensIn}
            tokensOut={tokensOut}
            model={selectedOption.model}
          />

          {/* Send button */}
          <div className="flex justify-end">
            <button
              onClick={handleSend}
              disabled={!input.trim() || sending}
              className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-opacity disabled:opacity-40"
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
  )
}
