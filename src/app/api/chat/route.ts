import { NextRequest, NextResponse } from 'next/server'
import { routeMessage } from '@/services/llm'
import type { Tier } from '@/types'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { prompt, tier, conversationId, useMinimalContext } = body as {
      prompt: string
      tier: Tier
      conversationId: string
      useMinimalContext?: boolean
    }

    if (!prompt || !tier || !conversationId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const result = await routeMessage({ prompt, tier, conversationId, useMinimalContext })
    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
