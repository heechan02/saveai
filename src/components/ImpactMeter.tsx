"use client"

import { useEffect, useRef, useState } from "react"
import { motion, useSpring, animate } from "framer-motion"
import { SOURCES } from "@/lib/constants"
import type { Model } from "@/types"

export type Props = {
  usd: number
  water_ml: number
  carbon_g: number
  model: Model
  messageCount?: number
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────
const DOLLAR_CEILING   = 0.20
const WATER_BENCHMARK  = 1.5   // mL  — UCR study midpoint
const CARBON_BENCHMARK = 0.80  // g CO₂e — IEA 2024

const MODEL_META: Record<Model, { name: string; tier: string }> = {
  "claude-haiku-4-5":  { name: "Claude Haiku 4.5",  tier: "Fast"     },
  "claude-sonnet-4-6": { name: "Claude Sonnet 4.6",  tier: "Balanced" },
  "claude-opus-4-7":   { name: "Claude Opus 4.7",    tier: "Premium"  },
}

// log-compressed normalisation so small values still show movement
function logNorm(v: number, max: number) {
  if (v <= 0) return 0
  return Math.min(1, Math.log1p(v / max * Math.E) / Math.log1p(Math.E))
}

// ─────────────────────────────────────────────────────────────────────────────
// Animated counter
// ─────────────────────────────────────────────────────────────────────────────
function Counter({ value, fmt }: { value: number; fmt: (v: number) => string }) {
  const [display, setDisplay] = useState(value)
  const prev = useRef(value)
  useEffect(() => {
    const from = prev.current
    prev.current = value
    const ctrl = animate(from, value, { duration: 0.4, ease: "easeOut", onUpdate: setDisplay })
    return () => ctrl.stop()
  }, [value])
  return <>{fmt(display)}</>
}

// ─────────────────────────────────────────────────────────────────────────────
// Citation tooltip
// ─────────────────────────────────────────────────────────────────────────────
function Cite({ n, label, url }: { n: number; label: string; url: string }) {
  const [show, setShow] = useState(false)
  return (
    <span
      className="relative"
      style={{ fontSize: "0.6em", verticalAlign: "super", lineHeight: 1, cursor: "default" }}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      <span className="text-neutral-600 hover:text-neutral-400 transition-colors select-none">{n}</span>
      {show && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 z-50 pointer-events-none">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="pointer-events-auto block whitespace-nowrap rounded border border-neutral-700 bg-[#1c1c1e] px-2 py-1 text-[10px] text-neutral-300"
          >
            {label} ↗
          </a>
        </div>
      )}
    </span>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// DOLLARS — flat cylinder / database disk (bright top face + rim layers)
// ─────────────────────────────────────────────────────────────────────────────
// Looks like a database icon seen from slightly above:
//   • 4 ellipses stacked with Y-offset, bottom → top
//   • Bottom layers: dark green rim (gives cylinder depth)
//   • Top face: bright #10b981
//   • rx scales with log-normalised cost

function CoinStack({ usd }: { usd: number }) {
  const norm    = logNorm(usd, DOLLAR_CEILING)
  const rx      = 14 + norm * 36          // 14px (near-zero) → 50px (ceiling)
  const ry      = 6                        // half-height of each ellipse
  const layers  = 4
  const yStep   = 5                        // vertical gap between layers
  const svgW    = 50 * 2 + 8              // fixed to max width so layout is stable
  const svgH    = ry * 2 + (layers - 1) * yStep + 4
  const cx      = svgW / 2

  // colors: index 0 = bottom rim, index layers-1 = top face
  const fills = ["#064e3b", "#065f46", "#047857", "#10b981"]

  return (
    <svg
      width={svgW}
      height={svgH}
      viewBox={`0 0 ${svgW} ${svgH}`}
      fill="none"
      overflow="visible"
    >
      {fills.map((fill, i) => {
        const cy = svgH - ry - 2 - i * yStep
        return (
          <motion.ellipse
            key={i}
            cx={cx}
            cy={cy}
            ry={ry}
            fill={fill}
            initial={{ rx: 0, opacity: 0 }}
            animate={{ rx, opacity: 1 }}
            transition={{ delay: i * 0.05, duration: 0.35, ease: "easeOut" }}
          />
        )
      })}
    </svg>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// WATER — tapered cup / glass with animated fill (spring 80/15)
// ─────────────────────────────────────────────────────────────────────────────
// Trapezoid: wider at top, narrower at bottom — classic drinking glass silhouette.
// Water fill clips inside the cup walls.

function WaterGlass({ waterMl }: { waterMl: number }) {
  const target = Math.min(1, waterMl / WATER_BENCHMARK)
  const spring = useSpring(target, { stiffness: 80, damping: 15 })
  const [fill, setFill] = useState(target)
  useEffect(() => { spring.set(target) }, [target]) // eslint-disable-line
  useEffect(() => spring.on("change", setFill), [spring])

  // Cup geometry
  const W     = 36   // total SVG width
  const H     = 52   // total SVG height
  const topW  = 32   // width at rim
  const botW  = 22   // width at base
  const SW    = 1.8  // wall stroke width

  // Trapezoid corners (top-left, top-right, bottom-right, bottom-left)
  const tl = { x: (W - topW) / 2,       y: 1 }
  const tr = { x: (W + topW) / 2,       y: 1 }
  const br = { x: (W + botW) / 2,       y: H - 1 }
  const bl = { x: (W - botW) / 2,       y: H - 1 }

  const cupPath = `M ${tl.x} ${tl.y} L ${tr.x} ${tr.y} L ${br.x} ${br.y} L ${bl.x} ${bl.y} Z`
  const clipId  = "cup-clip"

  // Water fill polygon — same trapezoid, clipped to inner area
  // Water rises from bottom; top edge of water is a horizontal line at y = waterTopY
  const innerH    = H - 2 - SW
  const waterH    = fill * innerH
  const waterTopY = H - 1 - SW / 2 - waterH

  // Interpolate x at waterTopY along the left and right slanted walls
  const totalH    = (H - 2)
  const t         = (waterTopY - tl.y) / totalH          // 0=top 1=bottom
  const waterTlX  = tl.x + (bl.x - tl.x) * t + SW / 2
  const waterTrX  = tr.x + (br.x - tr.x) * t - SW / 2
  const waterBrX  = br.x - SW / 2
  const waterBlX  = bl.x + SW / 2
  const waterY2   = H - 1 - SW / 2

  const waterPath = `M ${waterTlX} ${waterTopY} L ${waterTrX} ${waterTopY} L ${waterBrX} ${waterY2} L ${waterBlX} ${waterY2} Z`

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} fill="none">
      <defs>
        <clipPath id={clipId}>
          <path d={cupPath} />
        </clipPath>
      </defs>

      {/* water fill inside cup */}
      {fill > 0.01 && (
        <motion.path
          d={waterPath}
          fill="#60a5fa"
          clipPath={`url(#${clipId})`}
          animate={{ d: waterPath }}
          transition={{ type: "spring", stiffness: 80, damping: 15 }}
        />
      )}

      {/* cup outline on top so walls cover water edges */}
      <path
        d={cupPath}
        stroke="#52525b"
        strokeWidth={SW}
        fill="none"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// CARBON — factory smokestacks with rising puff clouds
// ─────────────────────────────────────────────────────────────────────────────
// Three thin chimney stacks at the bottom.
// Five smoke puffs rise diagonally (bottom-left → top-right):
//   • larger + more opaque near the stacks (fresh smoke)
//   • smaller + more transparent as they drift up (dispersing)
// Total opacity of the scene scales with carbonG.

const SMOKE_PUFFS = [
  // { cx, cy, r } — positions in a 90×60 viewBox
  // cy=0 is top, cy=60 is where stacks end
  { cx: 18, cy: 38, r: 11 },  // fresh, large
  { cx: 30, cy: 28, r:  9 },
  { cx: 44, cy: 20, r:  8 },
  { cx: 57, cy: 13, r:  7 },
  { cx: 70, cy:  7, r:  6 },  // dispersed, small
]

const STACKS = [
  { x: 14, botY: 72, topY: 50 },
  { x: 26, botY: 72, topY: 44 },
  { x: 38, botY: 72, topY: 52 },
]

function FactorySmoke({ carbonG }: { carbonG: number }) {
  const norm = Math.min(1, carbonG / CARBON_BENCHMARK)

  return (
    <svg width={90} height={72} viewBox="0 0 90 72" fill="none">
      {/* chimney stacks */}
      {STACKS.map((s, i) => (
        <motion.rect
          key={i}
          x={s.x - 2}
          y={s.topY}
          width={4}
          height={s.botY - s.topY}
          fill="#52525b"
          animate={{ opacity: 0.4 + norm * 0.6 }}
          transition={{ duration: 0.6 }}
        />
      ))}

      {/* smoke puffs — each has its own base opacity so distant ones are always dimmer */}
      {SMOKE_PUFFS.map((p, i) => {
        // puff 0 = freshest (fully visible when norm>0), puff 4 = most dispersed
        const baseOpacity = 1 - i * 0.15          // 1.0 → 0.4 across puffs
        const opacity     = Math.max(0.05, norm * baseOpacity)
        return (
          <motion.circle
            key={i}
            cx={p.cx}
            cy={p.cy}
            r={p.r}
            fill="#71717a"
            animate={{ opacity }}
            transition={{ duration: 0.6, ease: "easeOut", delay: i * 0.04 }}
          />
        )
      })}
    </svg>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Column header icons
// ─────────────────────────────────────────────────────────────────────────────
function IconDollar() {
  return (
    <svg width={15} height={15} viewBox="0 0 15 15" fill="none">
      <circle cx="7.5" cy="7.5" r="6.5" stroke="#10b981" strokeWidth="1.4" />
      <path d="M7.5 4v7M6 5.5h2.5a1 1 0 010 2H6.5a1 1 0 000 2H9" stroke="#10b981" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}

function IconWater() {
  return (
    <svg width={15} height={15} viewBox="0 0 15 15" fill="none">
      <path
        d="M7.5 2C7.5 2 3 7 3 9.5a4.5 4.5 0 009 0C12 7 7.5 2 7.5 2z"
        stroke="#3b82f6"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function IconCarbon() {
  return (
    <svg width={15} height={15} viewBox="0 0 15 15" fill="none">
      <path d="M7.5 2a5.5 5.5 0 100 11A5.5 5.5 0 007.5 2z" stroke="#71717a" strokeWidth="1.4" />
      <path d="M5 7.5h5M7.5 5v5" stroke="#71717a" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────
export default function ImpactMeter({ usd, water_ml, carbon_g, model, messageCount = 0 }: Props) {
  const meta = MODEL_META[model] ?? { name: model, tier: "—" }

  const dollarPct = Math.round((usd / DOLLAR_CEILING) * 100)
  const waterPct  = Math.round((water_ml / WATER_BENCHMARK) * 100)
  const carbonPct = Math.round((carbon_g / CARBON_BENCHMARK) * 100)

  // fixed visual row height — coin stack is tallest
  const visualH = 52

  return (
    <div
      className="w-full overflow-hidden border border-neutral-800"
      style={{
        borderRadius: 12,
        background: "#1c1c1e",
        fontFamily: "var(--font-inter), Inter, system-ui, sans-serif",
      }}
    >
      {/* ── Card header ── */}
      <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-neutral-800">
        <div className="flex flex-col gap-0.5">
          <span
            className="text-neutral-500 uppercase"
            style={{ fontSize: 10, letterSpacing: "0.18em" }}
          >
            Impact of this chat
          </span>
          <span className="font-semibold text-white" style={{ fontSize: 20, lineHeight: 1.3 }}>
            {meta.name}
          </span>
          <span className="text-neutral-500" style={{ fontSize: 11 }}>
            {messageCount} message{messageCount !== 1 ? "s" : ""} · session total
          </span>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span
            className="flex items-center gap-1.5 border border-neutral-700 rounded text-neutral-300"
            style={{ fontSize: 11, padding: "4px 10px" }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
            Live
          </span>
          <span
            className="border border-neutral-700 rounded text-neutral-400"
            style={{ fontSize: 11, padding: "4px 10px" }}
          >
            {meta.tier}
          </span>
        </div>
      </div>

      {/* ── Three metric columns ── */}
      <div className="grid grid-cols-3 divide-x divide-neutral-800">

        {/* DOLLARS */}
        <div className="px-6 py-8 flex flex-col" style={{ gap: 20 }}>
          {/* label row */}
          <div className="flex items-center gap-1.5">
            <IconDollar />
            <span
              className="text-neutral-500 uppercase"
              style={{ fontSize: 10, letterSpacing: "0.16em", fontFamily: "var(--font-inter), Inter, sans-serif" }}
            >
              Dollars
            </span>
            <Cite n={1} label="Anthropic pricing" url={SOURCES.epoch} />
          </div>

          {/* big number */}
          <div
            className="tabular-nums text-white"
            style={{
              fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace",
              fontSize: 52,
              lineHeight: 1,
              letterSpacing: "-0.02em",
            }}
          >
            <span
              style={{
                fontSize: 24,
                color: "#71717a",
                fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace",
                marginRight: 2,
              }}
            >
              $
            </span>
            <Counter value={usd} fmt={(v) => v.toFixed(4)} />
          </div>

          {/* coin stack visual */}
          <div className="flex items-end justify-center" style={{ height: visualH }}>
            <CoinStack usd={usd} />
          </div>

          {/* benchmark */}
          <span className="text-neutral-500" style={{ fontSize: 11 }}>
            {dollarPct}% of ${DOLLAR_CEILING.toFixed(2)} ceiling
          </span>
        </div>

        {/* WATER */}
        <div className="px-6 py-8 flex flex-col" style={{ gap: 20 }}>
          <div className="flex items-center gap-1.5">
            <IconWater />
            <span
              className="text-neutral-500 uppercase"
              style={{ fontSize: 10, letterSpacing: "0.16em", fontFamily: "var(--font-inter), Inter, sans-serif" }}
            >
              Water
            </span>
            <Cite n={2} label="Ren et al. 2023 (UCR)" url={SOURCES.ucr} />
          </div>

          <div
            className="tabular-nums text-white"
            style={{
              fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace",
              fontSize: 52,
              lineHeight: 1,
              letterSpacing: "-0.02em",
            }}
          >
            <Counter value={water_ml} fmt={(v) => v.toFixed(3)} />
            <span
              style={{
                fontSize: 22,
                color: "#71717a",
                fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace",
                marginLeft: 5,
              }}
            >
              mL
            </span>
          </div>

          <div className="flex items-end justify-center" style={{ height: visualH }}>
            <WaterGlass waterMl={water_ml} />
          </div>

          <span className="text-neutral-500" style={{ fontSize: 11 }}>
            {waterPct}% of {WATER_BENCHMARK} mL benchmark
          </span>
        </div>

        {/* CARBON */}
        <div className="px-6 py-8 flex flex-col" style={{ gap: 20 }}>
          <div className="flex items-center gap-1.5">
            <IconCarbon />
            <span
              className="text-neutral-500 uppercase"
              style={{ fontSize: 10, letterSpacing: "0.16em", fontFamily: "var(--font-inter), Inter, sans-serif" }}
            >
              Carbon
            </span>
            <Cite n={3} label="IEA 2024 global avg" url={SOURCES.iea} />
          </div>

          <div
            className="tabular-nums text-white flex items-baseline"
            style={{
              fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace",
              fontSize: 52,
              lineHeight: 1,
              letterSpacing: "-0.02em",
              whiteSpace: "nowrap",
            }}
          >
            <Counter value={carbon_g} fmt={(v) => v.toFixed(3)} />
            <span
              style={{
                fontSize: 17,
                color: "#71717a",
                fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace",
                marginLeft: 5,
                flexShrink: 0,
              }}
            >
              g CO₂e
            </span>
          </div>

          <div className="flex items-end justify-center" style={{ height: visualH }}>
            <FactorySmoke carbonG={carbon_g} />
          </div>

          <span className="text-neutral-500" style={{ fontSize: 11 }}>
            {carbonPct}% of {CARBON_BENCHMARK} g benchmark
          </span>
        </div>

      </div>

      {/* ── Footer ── */}
      <div className="px-6 py-3 border-t border-neutral-800">
        <p className="text-neutral-600" style={{ fontSize: 11 }}>
          Estimates use the Patterson et al. 2024 model for inference workloads. Margins ±15%.
        </p>
      </div>
    </div>
  )
}
