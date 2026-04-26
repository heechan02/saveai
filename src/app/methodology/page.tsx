import Link from 'next/link'
import { SOURCES, ENERGY_WH_PER_TOKEN, WATER_L_PER_KWH, CARBON_G_PER_KWH } from '@/lib/constants'

const metrics: {
  name: string
  value: string
  source: string
  url: string
  note: React.ReactNode
}[] = [
  {
    name: 'Energy · Groq Llama 3.1 8B (Tier 1 — Fast)',
    value: `${ENERGY_WH_PER_TOKEN.tier1_llama} Wh / token`,
    source: 'Luccioni et al. 2023 — "Power Hungry Processing" (NeurIPS)',
    url: SOURCES.luccioni,
    note: (
      <>
        Interpolated from <em>OPT-6.7B hardware measurements</em> (~0.000098 Wh/token), adjusted
        for modern H100 efficiency on Groq LPU (~2×). Groq&apos;s custom silicon achieves the
        highest tokens/sec of any provider — making this tier{' '}
        <strong className="text-neutral-400">the lowest-energy option</strong>.
      </>
    ),
  },
  {
    name: 'Energy · GPT-4o mini (Tier 2 — Efficient)',
    value: `${ENERGY_WH_PER_TOKEN.tier2_gpt4o_mini} Wh / token`,
    source: 'Luccioni et al. 2023 (NeurIPS) + Epoch AI 2024',
    url: SOURCES.epoch,
    note: (
      <>
        Interpolated for an estimated ~20B parameter equivalent, between OPT-6.7B and OPT-66B
        measurements. Cross-referenced with Epoch AI query-level estimates.{' '}
        <strong className="text-neutral-400">Uncertainty band: ±50%.</strong>
      </>
    ),
  },
  {
    name: 'Energy · Claude Sonnet (Tier 3 — Balanced)',
    value: `${ENERGY_WH_PER_TOKEN.tier2_sonnet} Wh / token`,
    source: 'Luccioni et al. 2023 (NeurIPS) + Epoch AI 2024',
    url: SOURCES.epoch,
    note: (
      <>
        Interpolated between <em>OPT-6.7B and OPT-66B</em> measurements for a ~35B parameter
        equivalent. Cross-referenced with Epoch AI&apos;s query-level estimates.{' '}
        <strong className="text-neutral-400">Uncertainty band: ±50%.</strong>
      </>
    ),
  },
  {
    name: 'Energy · Claude Opus (Tier 4 — Powerful)',
    value: `${ENERGY_WH_PER_TOKEN.tier3_opus} Wh / token`,
    source: 'Epoch AI 2024 — How much energy does ChatGPT use?',
    url: SOURCES.epoch,
    note: (
      <>
        Aligned with Epoch AI&apos;s <em>GPT-4o class estimate</em> of ~0.3 Wh per 1000-token
        query. Frontier models vary significantly by prompt complexity — actual range is roughly{' '}
        <strong className="text-neutral-400">0.1–0.8 Wh per 1000 tokens</strong>.
      </>
    ),
  },
  {
    name: 'Datacenter water usage',
    value: `${WATER_L_PER_KWH} L / kWh`,
    source: 'Ren et al. 2023 — "Making AI Less Thirsty" (UC Riverside)',
    url: SOURCES.ucr,
    note: (
      <>
        Median across large US hyperscale datacenters.{' '}
        <strong className="text-neutral-400">Regional variation is substantial</strong> — facilities
        in water-stressed areas can use <em>3–5× more</em>; coastal or cooler climates may use
        significantly less.
      </>
    ),
  },
  {
    name: 'Grid carbon intensity',
    value: `${CARBON_G_PER_KWH} g CO₂ / kWh`,
    source: 'IEA Electricity 2024 — global average grid intensity',
    url: SOURCES.iea,
    note: (
      <>
        IEA 2024 <em>global average</em>. Actual intensity varies by{' '}
        <strong className="text-neutral-400">10× across grids</strong> — Norway runs near zero
        (hydro); Poland exceeds 700 g/kWh (coal). Datacenter-specific renewable sourcing is not
        factored in.
      </>
    ),
  },
]

import type React from 'react'

export default function MethodologyPage() {
  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: '#0a0a0a', color: '#e5e5e5', fontFamily: 'var(--font-inter), Inter, system-ui, sans-serif' }}
    >
      {/* Nav */}
      <header
        className="flex items-center justify-between px-6 shrink-0 border-b border-neutral-800"
        style={{ background: '#0a0a0a', height: 60 }}
      >
        <Link href="/" className="flex items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="SaveAI logo" className="h-7 w-auto" />
          <span className="font-semibold text-white tracking-tight" style={{ fontSize: 16 }}>
            SaveAI
          </span>
        </Link>
        <nav className="flex items-center gap-10 text-sm">
          <Link href="/about" className="text-neutral-500 hover:text-neutral-300 transition-colors">About</Link>
          <Link href="/" className="text-neutral-500 hover:text-neutral-300 transition-colors">Chat</Link>
          <Link href="/dashboard" className="text-neutral-500 hover:text-neutral-300 transition-colors">Dashboard</Link>
          <Link href="/methodology" className="text-white">Methodology</Link>
        </nav>
        <div className="flex items-center gap-2 text-xs text-neutral-500">
          <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
          Live
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-16 w-full space-y-16">

        {/* Hero */}
        <div className="space-y-4">
          <p className="text-xs uppercase tracking-widest text-neutral-600 font-medium">Transparency</p>
          <h1 className="text-4xl font-semibold text-white tracking-tight leading-tight">
            How we measure
          </h1>
          <p className="text-neutral-300 leading-relaxed text-[15px]" style={{ maxWidth: '52ch' }}>
            Every number SaveAI shows you comes from a{' '}
            <strong className="text-white font-medium">public source</strong>. Here&apos;s where,
            and what we&apos;re <em>not</em> claiming.
          </p>
        </div>

        {/* Metric cards */}
        <section className="space-y-5">
          <h2 className="text-xs uppercase tracking-widest text-neutral-600 font-medium">
            Sources &amp; constants
          </h2>
          <div className="space-y-3">
            {metrics.map((m) => (
              <div
                key={m.name}
                className="rounded-xl border border-neutral-800 overflow-hidden"
                style={{ background: '#111111' }}
              >
                {/* Card header */}
                <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-neutral-800/70">
                  <p className="text-sm font-semibold text-white">{m.name}</p>
                  <span
                    className="font-mono tabular-nums text-sm font-bold shrink-0"
                    style={{ color: '#4ade80' }}
                  >
                    {m.value}
                  </span>
                </div>
                {/* Source link */}
                <div className="px-5 py-3 border-b border-neutral-800/50 flex items-center gap-2">
                  <span className="text-[10px] uppercase tracking-widest text-neutral-700 font-medium shrink-0">
                    Source
                  </span>
                  <a
                    href={m.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-neutral-500 hover:text-neutral-200 transition-colors underline underline-offset-2 decoration-neutral-700 hover:decoration-neutral-400"
                  >
                    {m.source}
                  </a>
                </div>
                {/* Honesty note */}
                <div className="px-5 py-4 flex items-start gap-3">
                  <span className="text-[10px] uppercase tracking-widest text-neutral-700 font-medium shrink-0 mt-0.5">
                    Note
                  </span>
                  <p className="text-xs text-neutral-500 leading-relaxed">{m.note}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Model Tier Rationale */}
        <section className="space-y-5">
          <h2 className="text-xs uppercase tracking-widest text-neutral-600 font-medium">
            Model tier rationale
          </h2>
          <p className="text-xs text-neutral-500 leading-relaxed">
            SaveAI is model-agnostic — we route to the best tool for the task regardless of provider.
            Tier selection is based on capability-per-cost benchmarks, not brand loyalty.
          </p>
          <div
            className="rounded-xl border border-neutral-800 divide-y divide-neutral-800"
            style={{ background: '#111111' }}
          >
            {[
              {
                tier: 'Tier 1 — Fast',
                model: 'Groq Llama 3.1 8B',
                color: '#22c55e',
                evidence: 'LMSYS Chatbot Arena ELO ~1150; Groq LPU delivers 800+ tokens/sec (fastest available). Best for autocomplete, typo fixes, simple lookups.',
              },
              {
                tier: 'Tier 2 — Efficient',
                model: 'GPT-4o mini',
                color: '#3b82f6',
                evidence: 'MMLU score 82% at $0.15/Mtok input — best capability-per-dollar for coding tasks, summarisation, and Q&A. Outperforms GPT-3.5 on most benchmarks at lower cost.',
              },
              {
                tier: 'Tier 3 — Balanced',
                model: 'Claude Sonnet 4.6',
                color: '#f59e0b',
                evidence: 'SWE-bench Verified: 49% solve rate — top of class for agentic coding and nuanced analysis. Strong instruction-following with 200k context window.',
              },
              {
                tier: 'Tier 4 — Powerful',
                model: 'Claude Opus 4.7',
                color: '#ef4444',
                evidence: 'GPQA Diamond: 74%; HumanEval: 90%+. Frontier reasoning, research synthesis, and multi-step planning. Reserve for tasks where quality justifies 300× cost vs Tier 1.',
              },
            ].map((item) => (
              <div key={item.tier} className="px-5 py-4 flex items-start gap-4">
                <span
                  className="text-xs font-bold shrink-0 mt-0.5 rounded px-1.5 py-0.5"
                  style={{ background: `${item.color}18`, color: item.color, border: `1px solid ${item.color}40` }}
                >
                  {item.tier.split(' — ')[1]}
                </span>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-neutral-300">{item.tier} · {item.model}</p>
                  <p className="text-xs text-neutral-500 leading-relaxed">{item.evidence}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* What we're NOT claiming */}
        <section className="space-y-5">
          <h2 className="text-xs uppercase tracking-widest text-neutral-600 font-medium">
            What we&apos;re not claiming
          </h2>
          <div
            className="rounded-xl border border-neutral-800 divide-y divide-neutral-800"
            style={{ background: '#111111' }}
          >
            {[
              {
                heading: 'Order-of-magnitude uncertainty',
                body: (
                  <>
                    Per-query water and carbon estimates have{' '}
                    <strong className="text-neutral-300">wide uncertainty bands</strong>. The
                    framework is sound; the individual numbers are{' '}
                    <em>indicative, not forensic</em>.
                  </>
                ),
              },
              {
                heading: 'Training cost excluded',
                body: (
                  <>
                    Provider-reported figures don&apos;t include{' '}
                    <strong className="text-neutral-300">training-amortised cost</strong>. The
                    energy to train GPT-4 dwarfs all inference — we measure{' '}
                    <em>operational inference only</em>.
                  </>
                ),
              },
              {
                heading: 'Regional carbon varies 10×',
                body: (
                  <>
                    We use a <strong className="text-neutral-300">global average</strong> of{' '}
                    {CARBON_G_PER_KWH} g CO₂/kWh. A datacenter in{' '}
                    <em>Iceland has a near-zero footprint</em>; one in Poland does not.
                  </>
                ),
              },
            ].map((item) => (
              <div key={item.heading} className="px-5 py-4 flex items-start gap-4">
                <span className="text-neutral-700 shrink-0 mt-0.5 text-sm">—</span>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-neutral-300">{item.heading}</p>
                  <p className="text-xs text-neutral-500 leading-relaxed">{item.body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Full reference list */}
        <section className="space-y-5">
          <h2 className="text-xs uppercase tracking-widest text-neutral-600 font-medium">
            Full reference list
          </h2>
          <ol className="space-y-2">
            {[
              { key: 'luccioni', name: 'Luccioni et al. 2023 — "Power Hungry Processing" (NeurIPS)', url: SOURCES.luccioni },
              { key: 'epoch',    name: 'Epoch AI 2024 — How much energy does ChatGPT use?', url: SOURCES.epoch },
              { key: 'ucr',      name: 'Ren et al. 2023 — Making AI Less "Thirsty" (UC Riverside)', url: SOURCES.ucr },
              { key: 'iea',      name: 'IEA 2024 — Electricity 2024 (global carbon intensity)', url: SOURCES.iea },
              { key: 'google',   name: 'Google 2024 — Gemini AI energy usage', url: SOURCES.google },
              { key: 'jegham',   name: 'Jegham et al. 2025 — LLM environmental impact survey', url: SOURCES.jegham },
            ].map((s, i) => (
              <li
                key={s.key}
                className="flex items-start gap-4 px-4 py-3 rounded-lg border border-neutral-800/50 hover:border-neutral-700 transition-colors"
                style={{ background: '#0f0f0f' }}
              >
                <span className="font-mono tabular-nums text-neutral-700 text-xs mt-0.5 w-4 shrink-0">
                  {i + 1}.
                </span>
                <a
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-neutral-400 hover:text-white transition-colors underline underline-offset-2 decoration-neutral-700 hover:decoration-neutral-400"
                >
                  {s.name}
                </a>
              </li>
            ))}
          </ol>
        </section>

      </main>
    </div>
  )
}
