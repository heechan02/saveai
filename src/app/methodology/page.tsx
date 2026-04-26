import Link from 'next/link'
import { SOURCES, ENERGY_WH_PER_TOKEN, WATER_L_PER_KWH, CARBON_G_PER_KWH, PRICE_PER_MTOK } from '@/lib/constants'

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
          <img src="/logo.png" alt="SaveAI logo" className="h-8 w-auto" style={{ mixBlendMode: "screen" }} />
          <span className="font-semibold text-white tracking-tight" style={{ fontSize: 18 }}>
            SaveAI
          </span>
        </Link>
        <nav className="flex items-center gap-6 text-sm">
          <Link href="/" className="text-neutral-500 hover:text-neutral-300 transition-colors">Chat</Link>
          <Link href="/dashboard" className="text-neutral-500 hover:text-neutral-300 transition-colors">Dashboard</Link>
          <Link href="/methodology" className="text-white">Methodology</Link>
        </nav>
        <div className="flex items-center gap-2 text-xs text-neutral-500">
          <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
          Live
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12 space-y-10 w-full">
        <div>
          <h1 className="text-2xl font-semibold text-white mb-2">Methodology</h1>
          <p className="text-neutral-500 text-sm">
            All impact numbers shown in SaveAI are derived from peer-reviewed research and public
            industry data. No estimates are fabricated — every constant is cited below.
          </p>
        </div>

        <section className="space-y-4">
          <h2 className="text-sm uppercase tracking-widest text-neutral-500">Energy per token</h2>
          <div className="rounded-lg border border-neutral-800 p-5 space-y-3" style={{ background: '#141414' }}>
            <p className="text-sm text-neutral-300">
              Energy consumption is modelled per-token using hardware measurements from Luccioni et al. 2023
              (NeurIPS) and cross-referenced with Epoch AI&apos;s 2024 query-level estimates.
            </p>
            <div className="font-mono tabular-nums text-xs text-neutral-500 space-y-1">
              <div>Tier 1 · Haiku  (~7B):   {ENERGY_WH_PER_TOKEN.tier1_haiku} Wh/token</div>
              <div>Tier 2 · Sonnet (~35B):  {ENERGY_WH_PER_TOKEN.tier2_sonnet} Wh/token</div>
              <div>Tier 3 · Opus   (~70B+): {ENERGY_WH_PER_TOKEN.tier3_opus} Wh/token</div>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-sm uppercase tracking-widest text-neutral-500">Water &amp; Carbon</h2>
          <div className="rounded-lg border border-neutral-800 p-5 space-y-3" style={{ background: '#141414' }}>
            <div className="font-mono tabular-nums text-xs text-neutral-500 space-y-1">
              <div>Water:  {WATER_L_PER_KWH} L per kWh  (Ren et al. 2023, UC Riverside)</div>
              <div>Carbon: {CARBON_G_PER_KWH} g CO₂ per kWh  (IEA 2024 global average)</div>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-sm uppercase tracking-widest text-neutral-500">Model pricing</h2>
          <div className="rounded-lg border border-neutral-800 p-5 space-y-3" style={{ background: '#141414' }}>
            <div className="font-mono tabular-nums text-xs text-neutral-500 space-y-1">
              <div>Claude Haiku  — ${PRICE_PER_MTOK.claude_haiku.in} / ${PRICE_PER_MTOK.claude_haiku.out} per 1M tokens (in/out)</div>
              <div>Claude Sonnet — ${PRICE_PER_MTOK.claude_sonnet.in} / ${PRICE_PER_MTOK.claude_sonnet.out} per 1M tokens (in/out)</div>
              <div>Claude Opus   — ${PRICE_PER_MTOK.claude_opus.in} / ${PRICE_PER_MTOK.claude_opus.out} per 1M tokens (in/out)</div>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-sm uppercase tracking-widest text-neutral-500">Sources</h2>
          <ol className="space-y-3">
            {[
              { key: 'luccioni', name: 'Luccioni et al. 2023 — "Power Hungry Processing" (NeurIPS)', url: SOURCES.luccioni },
              { key: 'epoch',    name: 'Epoch AI 2024 — How much energy does ChatGPT use?', url: SOURCES.epoch },
              { key: 'ucr',      name: 'Ren et al. 2023 — Making AI Less "Thirsty" (UC Riverside)', url: SOURCES.ucr },
              { key: 'iea',      name: 'IEA 2024 — Electricity 2024 (global carbon intensity)', url: SOURCES.iea },
              { key: 'google',   name: 'Google 2024 — Gemini AI energy usage', url: SOURCES.google },
              { key: 'jegham',   name: 'Jegham et al. 2025 — LLM environmental impact survey', url: SOURCES.jegham },
            ].map((s, i) => (
              <li key={s.key} className="flex items-start gap-3 text-sm">
                <span className="font-mono tabular-nums text-neutral-600 text-xs mt-0.5 w-4 shrink-0">
                  {i + 1}.
                </span>
                <a
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-neutral-400 hover:text-neutral-200 transition-colors"
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
