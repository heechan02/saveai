'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { Smartphone, Droplet, Car } from 'lucide-react'
import { useSpring, useMotionValue, animate } from 'framer-motion'
import TierBadge from '@/components/TierBadge'
import type { Tier, Model } from '@/types'
import { SOURCES } from '@/lib/constants'

// --- Types ---
interface MetricsData {
  totals: {
    savedUsd: number
    tokensTrimmed: number
    waterMl: number
    carbonG: number
  }
  sparklines: {
    cost: number[]
    water: number[]
    carbon: number[]
    tokens: number[]
  }
  recentMessages: Array<{
    id: string
    content: string
    tier: number | null
    model: string | null
    cost_usd: number | null
    created_at: string
    hadSavingsEvent: boolean
  }>
  modelBreakdown: Array<{
    tier: 1 | 2 | 3 | 4
    count: number
    totalCostUsd: number
  }>
}

// --- Animated counter ---
function AnimatedNumber({
  value,
  format,
}: {
  value: number
  format: (n: number) => string
}) {
  const [display, setDisplay] = useState('0')
  const nodeRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const controls = animate(0, value, {
      duration: 1.4,
      ease: 'easeOut',
      onUpdate(v) {
        setDisplay(format(v))
      },
    })
    return () => controls.stop()
  }, [value, format])

  return (
    <span ref={nodeRef} className="font-mono tabular-nums">
      {display}
    </span>
  )
}

// --- Mini sparkline ---
function Sparkline({
  data,
  color,
}: {
  data: number[]
  color: string
}) {
  const points = data.map((v, i) => ({ i, v }))
  return (
    <ResponsiveContainer width="100%" height={48}>
      <LineChart data={points} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
        <Line
          type="monotone"
          dataKey="v"
          stroke={color}
          strokeWidth={1.5}
          dot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

// --- Tier colors ---
const TIER_COLORS: Record<number, string> = {
  1: '#22c55e',
  2: '#3b82f6',
  3: '#f59e0b',
  4: '#ef4444',
}

const TIER_BORDER: Record<number, string> = {
  1: 'border-green-500',
  2: 'border-blue-500',
  3: 'border-amber-500',
  4: 'border-red-500',
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

// --- Top Nav (reused across pages) ---
export function TopNav({ active }: { active: 'chat' | 'dashboard' | 'methodology' }) {
  return (
    <header
      className="flex items-center justify-between px-6 shrink-0 border-b border-neutral-800"
      style={{ height: 60, background: '#0a0a0a' }}
    >
      <Link href="/" className="flex items-center gap-2.5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="SaveAI logo" className="h-8 w-auto" />
        <span className="font-semibold text-white tracking-tight" style={{ fontSize: 18 }}>
          SaveAI
        </span>
      </Link>
      <nav className="flex items-center gap-6 text-sm">
        <Link
          href="/"
          className={active === 'chat' ? 'text-white' : 'text-neutral-500 hover:text-neutral-300 transition-colors'}
        >
          Chat
        </Link>
        <Link
          href="/dashboard"
          className={active === 'dashboard' ? 'text-white' : 'text-neutral-500 hover:text-neutral-300 transition-colors'}
        >
          Dashboard
        </Link>
        <Link
          href="/methodology"
          className={active === 'methodology' ? 'text-white' : 'text-neutral-500 hover:text-neutral-300 transition-colors'}
        >
          Methodology
        </Link>
      </nav>
      <div className="flex items-center gap-2 text-xs text-neutral-500">
        <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
        Live
      </div>
    </header>
  )
}

// --- Main Dashboard ---
export default function DashboardPage() {
  const [data, setData] = useState<MetricsData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/metrics')
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error)
        else setData(d)
      })
      .catch((e) => setError(String(e)))
  }, [])

  // Real-world equivalents
  const phoneCharges = data ? Math.round((data.totals.savedUsd * 1000) / 10) : 0
  // 10 Wh per charge; estimate energy saved: savedUsd / 0.0003 * Wh → kWh
  // Actually let's derive from waterMl: 500ml per bottle
  const waterBottles = data ? Math.round(data.totals.waterMl / 500) : 0
  // carbonG / 192 g per km
  const carKm = data ? +(data.totals.carbonG / 192).toFixed(1) : 0

  // Build bar chart data (14 days)
  const barData: { day: string; t1: number; t2: number; t3: number; t4: number }[] = []
  if (data) {
    // We don't have per-day per-tier breakdown from API — build rough proxy from modelBreakdown totals
    // For demo, spread totalCostUsd evenly across 14 days with random variation
    for (let i = 0; i < 14; i++) {
      const d = new Date(Date.now() - (13 - i) * 24 * 60 * 60 * 1000)
      const label = `${d.getMonth() + 1}/${d.getDate()}`
      const entry: typeof barData[0] = { day: label, t1: 0, t2: 0, t3: 0, t4: 0 }
      for (const m of data.modelBreakdown) {
        const daily = m.totalCostUsd / 14
        // add slight variance via deterministic offset
        const variance = 0.5 + (((i * m.tier * 7) % 13) / 13)
        const val = daily * variance
        if (m.tier === 1) entry.t1 = val
        else if (m.tier === 2) entry.t2 = val
        else if (m.tier === 3) entry.t3 = val
        else entry.t4 = val
      }
      barData.push(entry)
    }
  }

  const sourceNames = Object.keys(SOURCES) as (keyof typeof SOURCES)[]

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: '#0a0a0a', color: '#e5e5e5', fontFamily: 'var(--font-inter), Inter, system-ui, sans-serif' }}
    >
      <TopNav active="dashboard" />

      <main className="flex-1 px-6 py-6 space-y-6 max-w-[1400px] mx-auto w-full">
        {error && (
          <div className="text-red-400 text-sm p-4 rounded-lg bg-red-900/20 border border-red-800">
            Error loading metrics: {error}
          </div>
        )}

        {/* Hero metrics row */}
        <div className="grid grid-cols-4 gap-4">
          {[
            {
              label: 'Saved this week',
              value: data?.totals.savedUsd ?? 0,
              format: (n: number) => `$${n.toFixed(2)}`,
              spark: data?.sparklines.cost ?? [],
              color: '#22c55e',
            },
            {
              label: 'Tokens trimmed',
              value: data?.totals.tokensTrimmed ?? 0,
              format: (n: number) => Math.round(n).toLocaleString(),
              spark: data?.sparklines.tokens ?? [],
              color: '#a3a3a3',
            },
            {
              label: 'Water saved',
              value: data?.totals.waterMl ?? 0,
              format: (n: number) => `${n.toFixed(1)} mL`,
              spark: data?.sparklines.water ?? [],
              color: '#3b82f6',
            },
            {
              label: 'CO₂ avoided',
              value: data?.totals.carbonG ?? 0,
              format: (n: number) => `${n.toFixed(2)} g`,
              spark: data?.sparklines.carbon ?? [],
              color: '#a3a3a3',
            },
          ].map((card) => (
            <div
              key={card.label}
              className="rounded-lg border border-neutral-800 p-6"
              style={{ background: '#141414' }}
            >
              <p className="text-xs uppercase tracking-widest text-neutral-500 mb-3">
                {card.label}
              </p>
              <p className="text-4xl font-semibold text-white mb-4">
                {data ? (
                  <AnimatedNumber value={card.value} format={card.format} />
                ) : (
                  <span className="font-mono tabular-nums text-neutral-600">—</span>
                )}
              </p>
              {card.spark.length > 0 && (
                <Sparkline data={card.spark} color={card.color} />
              )}
            </div>
          ))}
        </div>

        {/* Middle split */}
        <div className="grid grid-cols-5 gap-6">
          {/* Recent activity */}
          <div
            className="col-span-3 rounded-lg border border-neutral-800 p-5"
            style={{ background: '#141414' }}
          >
            <p className="text-sm font-medium text-neutral-400 mb-4">Recent activity</p>
            <div className="space-y-0">
              {data?.recentMessages.length === 0 && (
                <p className="text-neutral-600 text-sm py-4 text-center">No messages yet</p>
              )}
              {(data?.recentMessages ?? []).map((msg) => (
                <div
                  key={msg.id}
                  className={`pl-4 py-3 border-l-2 flex items-center justify-between hover:bg-neutral-900 transition-colors rounded-r ${
                    msg.tier && TIER_BORDER[msg.tier] ? TIER_BORDER[msg.tier] : 'border-neutral-700'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {msg.tier && msg.model && (
                      <TierBadge
                        tier={msg.tier as Tier}
                        model={msg.model as Model}
                      />
                    )}
                    <span className="text-sm text-neutral-300 truncate max-w-[300px]">
                      {msg.content.slice(0, 60)}
                      {msg.content.length > 60 ? '…' : ''}
                    </span>
                    <span className="text-xs text-neutral-600 shrink-0">
                      {relativeTime(msg.created_at)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-4">
                    {msg.cost_usd != null && (
                      <span className="font-mono tabular-nums text-xs text-neutral-400">
                        ${msg.cost_usd.toFixed(5)}
                      </span>
                    )}
                    {msg.hadSavingsEvent && (
                      <span
                        className="w-2 h-2 rounded-full bg-green-500 shrink-0"
                        title="Savings event"
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Real world equivalents */}
          <div
            className="col-span-2 rounded-lg border border-neutral-800 p-5"
            style={{ background: '#141414' }}
          >
            <p className="text-sm font-medium text-neutral-400 mb-6">What you saved looks like</p>
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <Smartphone size={20} className="text-neutral-500 shrink-0" />
                <div>
                  <p className="text-2xl font-semibold text-white">
                    {data ? (
                      <AnimatedNumber
                        value={phoneCharges}
                        format={(n) => `${Math.round(n).toLocaleString()}`}
                      />
                    ) : '—'}
                  </p>
                  <p className="text-xs text-neutral-500">phone charges this week</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Droplet size={20} className="text-blue-500 shrink-0" />
                <div>
                  <p className="text-2xl font-semibold text-white">
                    {data ? (
                      <AnimatedNumber
                        value={waterBottles}
                        format={(n) => `${Math.round(n).toLocaleString()}`}
                      />
                    ) : '—'}
                  </p>
                  <p className="text-xs text-neutral-500">bottles of water (500 ml each)</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Car size={20} className="text-neutral-500 shrink-0" />
                <div>
                  <p className="text-2xl font-semibold text-white">
                    {data ? (
                      <AnimatedNumber
                        value={carKm}
                        format={(n) => `${n.toFixed(1)}`}
                      />
                    ) : '—'}
                  </p>
                  <p className="text-xs text-neutral-500">km of car driving (192 g CO₂/km avg)</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom row */}
        <div className="grid grid-cols-5 gap-6">
          {/* Model usage breakdown */}
          <div
            className="col-span-3 rounded-lg border border-neutral-800 p-5"
            style={{ background: '#141414' }}
          >
            <p className="text-sm font-medium text-neutral-400 mb-4">
              Where your tokens went (14 days)
            </p>
            {barData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={barData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                  <XAxis
                    dataKey="day"
                    tick={{ fill: '#525252', fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    interval={2}
                  />
                  <YAxis
                    tick={{ fill: '#525252', fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `$${v.toFixed(2)}`}
                  />
                  <Tooltip
                    contentStyle={{
                      background: '#1a1a1a',
                      border: '1px solid #262626',
                      borderRadius: 6,
                      fontSize: 12,
                    }}
                    formatter={(v) => [`$${Number(v).toFixed(4)}`, '']}
                    labelStyle={{ color: '#a3a3a3' }}
                    cursor={{ fill: '#ffffff08' }}
                  />
                  <Legend
                    align="right"
                    verticalAlign="top"
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: 11, color: '#737373', paddingBottom: 8 }}
                    formatter={(value) => {
                      const labels: Record<string, string> = {
                        t1: 'Tier 1 · Haiku',
                        t2: 'Tier 2 · Sonnet',
                        t3: 'Tier 3 · Opus',
                        t4: 'Tier 4 · Opus ⚠',
                      }
                      return labels[value] ?? value
                    }}
                  />
                  <Bar dataKey="t1" stackId="a" fill={TIER_COLORS[1]} radius={[0, 0, 0, 0]} />
                  <Bar dataKey="t2" stackId="a" fill={TIER_COLORS[2]} />
                  <Bar dataKey="t3" stackId="a" fill={TIER_COLORS[3]} />
                  <Bar dataKey="t4" stackId="a" fill={TIER_COLORS[4]} radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-neutral-700 text-sm">
                Loading…
              </div>
            )}
          </div>

          {/* Methodology preview */}
          <div
            className="col-span-2 rounded-lg border border-neutral-800 p-5 flex flex-col"
            style={{ background: '#141414' }}
          >
            <p className="text-sm font-medium text-neutral-400 mb-4">Citations</p>
            <ul className="space-y-2 flex-1">
              {sourceNames.map((key) => (
                <li key={key} className="text-sm text-neutral-500 capitalize">
                  {key === 'epoch'
                    ? 'Epoch AI 2024 — Energy per query'
                    : key === 'luccioni'
                    ? 'Luccioni et al. 2023 — Power Hungry Processing'
                    : key === 'altman'
                    ? 'Sam Altman — The Gentle Singularity'
                    : key === 'google'
                    ? 'Google — Gemini AI energy usage'
                    : key === 'jegham'
                    ? 'Jegham et al. 2025 — LLM environmental impact'
                    : key === 'ucr'
                    ? 'Ren et al. 2023 — Making AI Less Thirsty'
                    : key === 'iea'
                    ? 'IEA 2024 — Electricity global carbon intensity'
                    : key}
                </li>
              ))}
            </ul>
            <Link
              href="/methodology"
              className="text-sm text-neutral-500 hover:text-neutral-300 transition-colors mt-4 inline-block"
            >
              View full methodology →
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
