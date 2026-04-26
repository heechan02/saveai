import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { savingsEvents } from '@/db/schema'

export async function POST(req: NextRequest) {
  try {
    const { kind, amountUsd, amountWaterMl, amountCarbonG, messageId } = await req.json()

    await db.insert(savingsEvents).values({
      kind,
      amountUsd: String(amountUsd ?? 0),
      amountWaterMl: String(amountWaterMl ?? 0),
      amountCarbonG: String(amountCarbonG ?? 0),
      messageId: messageId ?? null,
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
