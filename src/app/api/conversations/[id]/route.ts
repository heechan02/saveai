import { NextResponse } from 'next/server'
import { db } from '@/db'
import { messages } from '@/db/schema'
import { asc, eq } from 'drizzle-orm'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const rows = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, id))
      .orderBy(asc(messages.createdAt))

    return NextResponse.json({
      messages: rows.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        tier: m.tier,
        model: m.model,
        contextSaved: false,
      })),
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
