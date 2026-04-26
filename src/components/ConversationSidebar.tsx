"use client"

import { useEffect, useState, useCallback } from 'react'
import { Plus } from 'lucide-react'

type ConversationItem = {
  id: string
  createdAt: string
  preview: string
  model: string | null
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'now'
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h`
  const days = Math.floor(hrs / 24)
  return `${days}d`
}

type Props = {
  activeId: string
  onSelect: (id: string) => void
  onNew: () => void
  refreshTrigger?: number
}

export default function ConversationSidebar({ activeId, onSelect, onNew, refreshTrigger }: Props) {
  const [convos, setConvos] = useState<ConversationItem[]>([])

  const fetchConvos = useCallback(async () => {
    try {
      const res = await fetch('/api/conversations')
      if (res.ok) {
        const data = await res.json()
        setConvos(data.conversations ?? [])
      }
    } catch {
      // non-fatal
    }
  }, [])

  useEffect(() => {
    fetchConvos()
  }, [fetchConvos, refreshTrigger])

  return (
    <div
      className="flex flex-col shrink-0 border-r border-neutral-800"
      style={{ width: 220, background: '#0d0d0d' }}
    >
      {/* New chat button */}
      <div className="p-3">
        <button
          onClick={onNew}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-opacity hover:opacity-90"
          style={{ background: '#16a34a', color: '#ffffff' }}
        >
          <Plus size={14} strokeWidth={2} />
          New chat
        </button>
      </div>

      <div className="border-t border-neutral-800 mx-3" />

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto py-2">
        {convos.length === 0 && (
          <p className="text-neutral-600 text-xs px-3 py-4">No past chats yet.</p>
        )}
        {convos.map((c) => (
          <button
            key={c.id}
            onClick={() => onSelect(c.id)}
            className="w-full text-left px-3 py-2.5 flex items-start justify-between gap-2 hover:bg-neutral-800 transition-colors"
            style={{
              background: c.id === activeId ? '#1c1c1e' : 'transparent',
              borderLeft: c.id === activeId ? '2px solid #16a34a' : '2px solid transparent',
            }}
          >
            <span
              className="text-xs leading-relaxed flex-1 min-w-0 truncate"
              style={{ color: c.id === activeId ? '#e5e5e5' : '#a3a3a3' }}
            >
              {c.preview.slice(0, 40)}
            </span>
            <span className="text-neutral-600 text-xs shrink-0">{timeAgo(c.createdAt)}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
