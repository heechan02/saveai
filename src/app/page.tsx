import Link from 'next/link'
import ChatPanel from '@/components/ChatPanel'

export default function Home() {
  return (
    <div
      className="h-screen flex flex-col"
      style={{ background: '#0a0a0a', fontFamily: 'var(--font-inter), Inter, system-ui, sans-serif' }}
    >
      {/* Nav */}
      <header
        className="flex items-center justify-between px-6 shrink-0 border-b border-neutral-800"
        style={{ background: '#0a0a0a', height: 60 }}
      >
        <Link href="/" className="flex items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="SaveAI logo" className="h-8 w-auto" />
          <span className="font-semibold text-white tracking-tight" style={{ fontSize: 18 }}>
            SaveAI
          </span>
        </Link>
        <nav className="flex items-center gap-6 text-sm">
          <Link href="/" className="text-white">Chat</Link>
          <Link href="/dashboard" className="text-neutral-500 hover:text-neutral-300 transition-colors">Dashboard</Link>
          <Link href="/methodology" className="text-neutral-500 hover:text-neutral-300 transition-colors">Methodology</Link>
        </nav>
        <div className="flex items-center gap-2 text-xs text-neutral-500">
          <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
          Live
        </div>
      </header>

      {/* Chat takes remaining height */}
      <div className="flex-1 min-h-0">
        <ChatPanel />
      </div>
    </div>
  )
}
