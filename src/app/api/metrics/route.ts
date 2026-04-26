import { NextResponse } from 'next/server'
import { db } from '@/db'
import { messages, savingsEvents } from '@/db/schema'
import { sql, and, gte, eq, desc, inArray } from 'drizzle-orm'

export async function GET() {
  try {
    const since14d = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)

    // --- Totals from savings_events ---
    const [totalsRow] = await db
      .select({
        savedUsd: sql<number>`coalesce(sum(${savingsEvents.amountUsd}::numeric), 0)`,
        waterMl: sql<number>`coalesce(sum(${savingsEvents.amountWaterMl}::numeric), 0)`,
        carbonG: sql<number>`coalesce(sum(${savingsEvents.amountCarbonG}::numeric), 0)`,
      })
      .from(savingsEvents)
      .where(gte(savingsEvents.createdAt, since14d))

    // Tokens trimmed: sum tokensIn from messages linked to context_trim events,
    // fall back to count * 4000 for unlinked events
    const trimEvents = await db
      .select({
        tokensIn: messages.tokensIn,
        tokensOut: messages.tokensOut,
      })
      .from(savingsEvents)
      .leftJoin(messages, eq(savingsEvents.messageId, messages.id))
      .where(
        and(
          eq(savingsEvents.kind, 'context_trim'),
          gte(savingsEvents.createdAt, since14d)
        )
      )

    const tokensTrimmed = trimEvents.reduce((sum, row) => {
      if (row.tokensIn != null) return sum + row.tokensIn + (row.tokensOut ?? 0)
      return sum + 4000
    }, 0)

    // --- Sparklines: 14 days of daily sums ---
    const savingsSparkRaw = await db
      .select({
        day: sql<string>`date_trunc('day', ${savingsEvents.createdAt})::date::text`,
        sumUsd: sql<number>`coalesce(sum(${savingsEvents.amountUsd}::numeric), 0)`,
        sumWater: sql<number>`coalesce(sum(${savingsEvents.amountWaterMl}::numeric), 0)`,
        sumCarbon: sql<number>`coalesce(sum(${savingsEvents.amountCarbonG}::numeric), 0)`,
      })
      .from(savingsEvents)
      .where(gte(savingsEvents.createdAt, since14d))
      .groupBy(sql`date_trunc('day', ${savingsEvents.createdAt})::date`)
      .orderBy(sql`date_trunc('day', ${savingsEvents.createdAt})::date`)

    const tokensSparkRaw = await db
      .select({
        day: sql<string>`date_trunc('day', ${messages.createdAt})::date::text`,
        sumTokens: sql<number>`coalesce(sum(coalesce(${messages.tokensIn}, 0) + coalesce(${messages.tokensOut}, 0)), 0)`,
      })
      .from(messages)
      .where(
        and(
          gte(messages.createdAt, since14d),
          eq(messages.role, 'assistant')
        )
      )
      .groupBy(sql`date_trunc('day', ${messages.createdAt})::date`)
      .orderBy(sql`date_trunc('day', ${messages.createdAt})::date`)

    // Build 14-slot arrays (one per day, oldest first)
    const days: string[] = []
    for (let i = 13; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
      days.push(d.toISOString().slice(0, 10))
    }

    function toSparkline(
      raw: { day: string; value: number }[],
      days: string[]
    ): number[] {
      const byDay = Object.fromEntries(raw.map((r) => [r.day, r.value]))
      return days.map((d) => Number(byDay[d] ?? 0))
    }

    const sparklines = {
      cost: toSparkline(
        savingsSparkRaw.map((r) => ({ day: r.day, value: r.sumUsd })),
        days
      ),
      water: toSparkline(
        savingsSparkRaw.map((r) => ({ day: r.day, value: r.sumWater })),
        days
      ),
      carbon: toSparkline(
        savingsSparkRaw.map((r) => ({ day: r.day, value: r.sumCarbon })),
        days
      ),
      tokens: toSparkline(
        tokensSparkRaw.map((r) => ({ day: r.day, value: r.sumTokens })),
        days
      ),
    }

    // --- Recent messages (last 10 assistant) ---
    const recentRaw = await db
      .select({
        id: messages.id,
        content: messages.content,
        tier: messages.tier,
        model: messages.model,
        costUsd: messages.costUsd,
        createdAt: messages.createdAt,
      })
      .from(messages)
      .where(eq(messages.role, 'assistant'))
      .orderBy(desc(messages.createdAt))
      .limit(10)

    // Check which messages have savings events linked
    const linkedIds = recentRaw.map((m) => m.id)
    const savingsLinked = linkedIds.length
      ? await db
          .select({ messageId: savingsEvents.messageId })
          .from(savingsEvents)
          .where(inArray(savingsEvents.messageId, linkedIds))
      : []

    const linkedSet = new Set(savingsLinked.map((s) => s.messageId))

    const recentMessages = recentRaw.map((m) => ({
      id: m.id,
      content: m.content.slice(0, 200),
      tier: m.tier,
      model: m.model,
      cost_usd: m.costUsd ? Number(m.costUsd) : null,
      created_at: m.createdAt,
      hadSavingsEvent: linkedSet.has(m.id),
    }))

    // --- Model breakdown ---
    const breakdownRaw = await db
      .select({
        tier: messages.tier,
        count: sql<number>`count(*)`,
        totalCostUsd: sql<number>`coalesce(sum(${messages.costUsd}::numeric), 0)`,
      })
      .from(messages)
      .where(
        and(
          eq(messages.role, 'assistant'),
          gte(messages.createdAt, since14d)
        )
      )
      .groupBy(messages.tier)
      .orderBy(messages.tier)

    const modelBreakdown = breakdownRaw.map((r) => ({
      tier: r.tier as 1 | 2 | 3 | 4,
      count: Number(r.count),
      totalCostUsd: Number(r.totalCostUsd),
    }))

    return NextResponse.json({
      totals: {
        savedUsd: Number(totalsRow.savedUsd),
        tokensTrimmed,
        waterMl: Number(totalsRow.waterMl),
        carbonG: Number(totalsRow.carbonG),
      },
      sparklines,
      recentMessages,
      modelBreakdown,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
