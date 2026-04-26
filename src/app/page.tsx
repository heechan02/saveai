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
        className="flex items-center justify-between px-6 py-3 border-b border-neutral-800 shrink-0"
        style={{ background: '#0a0a0a' }}
      >
        <span
          className="font-semibold text-white tracking-tight"
          style={{ fontSize: 18 }}
        >
          SaveAI
        </span>
        <Link
          href="/methodology"
          className="text-neutral-500 hover:text-neutral-300 transition-colors text-sm"
        >
          Methodology
        </Link>
      </header>

      {/* Chat takes remaining height */}
      <div className="flex-1 min-h-0">
        <ChatPanel />
      </div>
    </div>
  )
}
