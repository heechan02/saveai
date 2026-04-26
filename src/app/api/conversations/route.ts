import { NextResponse } from 'next/server'
import { db } from '@/db'
import { conversations, messages } from '@/db/schema'
import { desc, sql } from 'drizzle-orm'

export async function GET() {
  try {
    const rows = await db
      .select({
        id: conversations.id,
        createdAt: conversations.createdAt,
        title: conversations.title,
        preview: sql<string>`(
          SELECT content FROM messages
          WHERE conversation_id = ${conversations.id} AND role = 'user'
          ORDER BY created_at ASC LIMIT 1
        )`,
        model: sql<string>`(
          SELECT model FROM messages
          WHERE conversation_id = ${conversations.id} AND role = 'assistant'
          ORDER BY created_at ASC LIMIT 1
        )`,
      })
      .from(conversations)
      .orderBy(desc(conversations.createdAt))
      .limit(20)

    return NextResponse.json({
      conversations: rows.map((r) => ({
        id: r.id,
        createdAt: r.createdAt,
        preview: r.title ?? (r.preview ? r.preview.slice(0, 60) : 'New conversation'),
        model: r.model,
      })),
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
