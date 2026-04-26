import Link from 'next/link'
import { DollarSign, Droplets, Wind } from 'lucide-react'

export default function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#050a05', color: '#fff', fontFamily: 'var(--font-inter), Inter, system-ui, sans-serif' }}>
      {/* Aurora blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute -bottom-32 -left-32 w-[700px] h-[700px] rounded-full opacity-30"
          style={{ background: 'radial-gradient(circle, #16a34a 0%, transparent 70%)', filter: 'blur(120px)' }}
        />
        <div
          className="absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full opacity-30"
          style={{ background: 'radial-gradient(circle, #14532d 0%, transparent 70%)', filter: 'blur(120px)' }}
        />
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, #052e16 0%, transparent 70%)', filter: 'blur(120px)' }}
        />
      </div>

      {/* Header */}
      <header
        className="relative z-10 flex items-center justify-between px-6 shrink-0 border-b border-neutral-800"
        style={{ background: '#0a0a0a', height: 60 }}
      >
        <Link href="/" className="flex items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="SaveAI logo" className="h-7 w-auto" />
          <span className="font-semibold text-white tracking-tight" style={{ fontSize: 16 }}>SaveAI</span>
        </Link>
        <nav className="flex items-center gap-10 text-sm">
          <Link href="/about" className="text-white">About</Link>
          <Link href="/" className="text-neutral-500 hover:text-neutral-300 transition-colors">Chat</Link>
          <Link href="/dashboard" className="text-neutral-500 hover:text-neutral-300 transition-colors">Dashboard</Link>
          <Link href="/methodology" className="text-neutral-500 hover:text-neutral-300 transition-colors">Methodology</Link>
        </nav>
        <div className="flex items-center gap-2 text-xs text-neutral-500">
          <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
          Live
        </div>
      </header>

      {/* Hero */}
      <section className="relative z-10 flex flex-col items-center justify-center text-center px-8 pt-32 pb-24">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-neutral-700 text-neutral-300 text-sm mb-10">
          AI is the fastest growing energy consumer on Earth
        </div>
        <h1 className="text-7xl font-light leading-tight mb-4">
          Every prompt has a{' '}
          <em className="text-green-400 font-semibold">price.</em>
        </h1>
        <p className="text-2xl text-neutral-400 font-light mb-4">Most people never see it.</p>
        <p className="text-neutral-500 text-base max-w-xl mb-10">
          SaveAI tracks the real-world cost, water usage, and carbon footprint of every AI query — so you can make smarter choices about when and how you use AI.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-green-600 hover:bg-green-500 transition-colors text-white font-medium"
        >
          See Your Impact →
        </Link>
      </section>

      {/* Stats Bar */}
      <section className="relative z-10 border-y border-neutral-800/60 px-8 py-16">
        <div className="max-w-5xl mx-auto grid grid-cols-3 divide-x divide-neutral-800">
          <div className="flex flex-col items-center px-8">
            <span className="text-6xl font-semibold italic text-white">460 TWh</span>
            <span className="text-xs tracking-widest uppercase text-neutral-500 mt-2">AI datacenter energy in 2022</span>
            <span className="text-xs text-neutral-600 mt-1">IEA 2024</span>
          </div>
          <div className="flex flex-col items-center px-8">
            <span className="text-6xl font-semibold italic text-white">500 ml</span>
            <span className="text-xs tracking-widest uppercase text-neutral-500 mt-2">Water per ChatGPT conversation</span>
            <span className="text-xs text-neutral-600 mt-1">Ren et al. 2023</span>
          </div>
          <div className="flex flex-col items-center px-8">
            <span className="text-6xl font-semibold italic text-white">10×</span>
            <span className="text-xs tracking-widest uppercase text-neutral-500 mt-2">More energy than a Google search</span>
            <span className="text-xs text-neutral-600 mt-1">Epoch AI 2024</span>
          </div>
        </div>
      </section>

      {/* Impact Cards */}
      <section className="relative z-10 px-8 py-24">
        <div className="max-w-5xl mx-auto grid grid-cols-3 gap-6">
          {/* Cost */}
          <div className="bg-[#0d0d0d] border border-neutral-800 rounded-2xl p-8">
            <div className="w-10 h-10 rounded-full bg-green-950 flex items-center justify-center mb-6">
              <DollarSign className="w-5 h-5 text-green-400" />
            </div>
            <h3 className="text-lg font-medium text-white mb-3">You&apos;re paying, blindly</h3>
            <p className="text-neutral-400 text-sm leading-relaxed">
              The average developer spends £150–300/mo across AI tools with zero visibility into per-query cost.
            </p>
          </div>
          {/* Water */}
          <div className="bg-[#0d0d0d] border border-neutral-800 rounded-2xl p-8">
            <div className="w-10 h-10 rounded-full bg-blue-950 flex items-center justify-center mb-6">
              <Droplets className="w-5 h-5 text-blue-400" />
            </div>
            <h3 className="text-lg font-medium text-white mb-3">Every token drinks water</h3>
            <p className="text-neutral-400 text-sm leading-relaxed">
              Data centres use 1.8 L of water per kWh of compute. A single Opus conversation can use a full glass.
            </p>
          </div>
          {/* Carbon */}
          <div className="bg-[#0d0d0d] border border-neutral-800 rounded-2xl p-8">
            <div className="w-10 h-10 rounded-full bg-amber-950 flex items-center justify-center mb-6">
              <Wind className="w-5 h-5 text-amber-400" />
            </div>
            <h3 className="text-lg font-medium text-white mb-3">Carbon you can&apos;t see</h3>
            <p className="text-neutral-400 text-sm leading-relaxed">
              Global AI energy emits ~400g CO₂/kWh. Your AI habit has a carbon footprint — SaveAI shows it per message.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Footer Strip */}
      <section className="relative z-10 mt-auto border-t border-neutral-800/60 bg-[#080d08] px-8 py-20 text-center">
        <p className="text-3xl font-light text-white mb-8">Start measuring. Stop wasting.</p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-green-600 hover:bg-green-500 transition-colors text-white font-medium"
        >
          Open SaveAI →
        </Link>
      </section>
    </div>
  )
}
