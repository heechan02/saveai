/**
 * Seed script — creates 14 days of realistic AI usage history.
 *
 * Designed to trigger all three preflight interceptors in a fresh demo:
 *   - CostCliff:     select Tier 4, type "fix this typo: teh" → fires immediately (no seed needed)
 *   - ContextBloat:  seeded conversation has >8k tokens so the second demo message triggers it
 *   - Duplicate:     "fix this typo: teh" is embedded and stored so typing it again triggers match
 *
 * Run: npx tsx src/db/seed.ts
 * Safe to re-run — clears existing data first.
 */

import 'dotenv/config'
import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'
import * as schema from './schema'
import { sql } from 'drizzle-orm'
const DEMO_CONVERSATION_ID = '00000000-0000-0000-0000-000000000001'

const client = postgres(process.env.DATABASE_URL!, { max: 1 })
const db = drizzle(client, { schema })

function daysAgo(d: number, hours = 10): Date {
  const dt = new Date()
  dt.setDate(dt.getDate() - d)
  dt.setHours(hours, 0, 0, 0)
  return dt
}

function minutesAgo(m: number): Date {
  return new Date(Date.now() - m * 60 * 1000)
}


// ---------------------------------------------------------------------------
// Message catalogue — realistic dev prompts, varied models & costs
// ---------------------------------------------------------------------------
const HISTORY: Array<{
  daysAgo: number
  hoursOffset?: number
  model: string
  tier: number
  userPrompt: string
  assistantReply: string
  tokensIn: number
  tokensOut: number
  costUsd: number
  waterMl: number
  carbonG: number
}> = [
  // Day 14
  {
    daysAgo: 14, model: 'claude-opus-4-7', tier: 4,
    userPrompt: 'Write me a comprehensive guide on React Server Components, including examples, best practices, trade-offs vs client components, and when to use each.',
    assistantReply: 'React Server Components (RSCs) represent a fundamental shift in how we think about React rendering...\n\nKey concepts:\n1. RSCs run only on the server — no JS sent to client\n2. They can directly access databases, file systems, and APIs\n3. Client components handle interactivity; RSCs handle data fetching\n\nBest practices:\n- Default to server components\n- Use "use client" only at interactivity boundaries\n- Co-locate data fetching with the component that needs it\n- Avoid prop-drilling by fetching at the leaf level\n\nTrade-offs:\n- RSCs cannot use useState, useEffect, or browser APIs\n- Debugging can be harder (split between client/server)\n- Streaming requires thoughtful Suspense boundaries\n\nWhen to use RSCs:\n- Data-heavy pages (dashboards, lists)\n- SEO-critical pages\n- Any page where you can avoid client JS\n\nWhen to use Client Components:\n- Any interactive UI (forms, modals, animations)\n- Components using browser APIs\n- Real-time features',
    tokensIn: 42, tokensOut: 320, costUsd: 0.0247, waterMl: 0.065, carbonG: 0.0144,
  },
  {
    daysAgo: 14, hoursOffset: 2, model: 'claude-opus-4-7', tier: 4,
    userPrompt: 'Refactor this entire authentication module to use JWT instead of sessions. Include refresh token rotation, token blacklisting, and rate limiting.',
    assistantReply: 'Here\'s a complete JWT authentication system with refresh token rotation:\n\n```typescript\n// auth/jwt.ts\nimport jwt from "jsonwebtoken"\n\nexport function signAccess(userId: string) {\n  return jwt.sign({ sub: userId }, process.env.JWT_SECRET!, { expiresIn: "15m" })\n}\n\nexport function signRefresh(userId: string) {\n  return jwt.sign({ sub: userId }, process.env.JWT_REFRESH_SECRET!, { expiresIn: "7d" })\n}\n\n// Refresh token rotation\nexport async function rotate(refreshToken: string) {\n  const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!) as { sub: string }\n  // Blacklist old token\n  await redis.set(`blacklist:${refreshToken}`, 1, "EX", 604800)\n  return { access: signAccess(payload.sub), refresh: signRefresh(payload.sub) }\n}\n```\n\nRate limiting middleware:\n```typescript\nimport rateLimit from "express-rate-limit"\nexport const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10 })\n```',
    tokensIn: 38, tokensOut: 480, costUsd: 0.0366, waterMl: 0.089, carbonG: 0.0204,
  },

  // Day 12
  {
    daysAgo: 12, model: 'claude-sonnet-4-6', tier: 3,
    userPrompt: 'Explain the CAP theorem with concrete examples for each combination.',
    assistantReply: 'The CAP theorem states that a distributed system can only guarantee 2 of 3: Consistency, Availability, Partition tolerance.\n\nCP (Consistent + Partition-tolerant): HBase, Zookeeper. When a partition occurs, the system rejects writes to maintain consistency. Bank transfers need this.\n\nAP (Available + Partition-tolerant): Cassandra, DynamoDB. Always responds, but might return stale data. DNS is AP — eventual consistency is fine.\n\nCA (Consistent + Available): PostgreSQL in single-node. No partition tolerance — if the node fails, you have neither. Only viable with a single server.',
    tokensIn: 18, tokensOut: 180, costUsd: 0.00324, waterMl: 0.0043, carbonG: 0.00097,
  },
  {
    daysAgo: 12, hoursOffset: 1, model: 'claude-sonnet-4-6', tier: 3,
    userPrompt: 'Write a Dockerfile for a Next.js 14 app with multi-stage build, non-root user, and health check.',
    assistantReply: '```dockerfile\nFROM node:20-alpine AS deps\nWORKDIR /app\nCOPY package*.json ./\nRUN npm ci --only=production\n\nFROM node:20-alpine AS builder\nWORKDIR /app\nCOPY --from=deps /app/node_modules ./node_modules\nCOPY . .\nRUN npm run build\n\nFROM node:20-alpine AS runner\nWORKDIR /app\nENV NODE_ENV production\nRUN addgroup --system --gid 1001 nodejs\nRUN adduser --system --uid 1001 nextjs\nCOPY --from=builder /app/.next/standalone ./\nCOPY --from=builder /app/.next/static ./.next/static\nCOPY --from=builder /app/public ./public\nUSER nextjs\nEXPOSE 3000\nHEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://localhost:3000/api/health || exit 1\nCMD ["node", "server.js"]\n```',
    tokensIn: 28, tokensOut: 210, costUsd: 0.00399, waterMl: 0.0054, carbonG: 0.00122,
  },

  // Day 11 — heavy Opus day
  {
    daysAgo: 11, model: 'claude-opus-4-7', tier: 4,
    userPrompt: 'Design a complete database schema for a multi-tenant SaaS application with row-level security, audit logs, and soft deletes. Include all indexes and constraints.',
    assistantReply: 'Here\'s a production-grade multi-tenant schema:\n\n```sql\n-- Tenants\nCREATE TABLE tenants (\n  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n  slug TEXT UNIQUE NOT NULL,\n  name TEXT NOT NULL,\n  plan TEXT NOT NULL DEFAULT \'free\',\n  created_at TIMESTAMPTZ DEFAULT NOW()\n);\n\n-- Row-level security base\nCREATE TABLE users (\n  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,\n  email TEXT NOT NULL,\n  role TEXT NOT NULL DEFAULT \'member\',\n  deleted_at TIMESTAMPTZ,\n  created_at TIMESTAMPTZ DEFAULT NOW(),\n  UNIQUE (tenant_id, email)\n);\n\nCREATE INDEX idx_users_tenant ON users(tenant_id) WHERE deleted_at IS NULL;\n\n-- RLS policies\nALTER TABLE users ENABLE ROW LEVEL SECURITY;\nCREATE POLICY tenant_isolation ON users\n  USING (tenant_id = current_setting(\'app.tenant_id\')::UUID);\n\n-- Audit log\nCREATE TABLE audit_log (\n  id BIGSERIAL PRIMARY KEY,\n  tenant_id UUID NOT NULL,\n  actor_id UUID,\n  action TEXT NOT NULL,\n  table_name TEXT NOT NULL,\n  row_id UUID,\n  old_data JSONB,\n  new_data JSONB,\n  ip_addr INET,\n  created_at TIMESTAMPTZ DEFAULT NOW()\n);\nCREATE INDEX idx_audit_tenant_time ON audit_log(tenant_id, created_at DESC);\n```\n\nSoft delete pattern: always filter `WHERE deleted_at IS NULL`. Use partial indexes to keep them fast.',
    tokensIn: 55, tokensOut: 520, costUsd: 0.0398, waterMl: 0.089, carbonG: 0.0204,
  },
  {
    daysAgo: 11, hoursOffset: 1, model: 'claude-opus-4-7', tier: 4,
    userPrompt: 'ok',
    assistantReply: 'Anything else you\'d like to add to the schema?',
    tokensIn: 5, tokensOut: 12, costUsd: 0.00165, waterMl: 0.005, carbonG: 0.00102,
  },
  {
    daysAgo: 11, hoursOffset: 2, model: 'claude-opus-4-7', tier: 4,
    userPrompt: 'thanks',
    assistantReply: 'You\'re welcome!',
    tokensIn: 4, tokensOut: 8, costUsd: 0.00126, waterMl: 0.0036, carbonG: 0.00082,
  },

  // Day 10
  {
    daysAgo: 10, model: 'llama-3.1-8b-instant', tier: 1,
    userPrompt: 'What is the difference between Promise.all and Promise.allSettled?',
    assistantReply: 'Promise.all: rejects immediately if any promise rejects. Use when all results are required.\nPromise.allSettled: waits for all promises regardless of rejection. Returns array of {status, value/reason}. Use when you need results even if some fail.',
    tokensIn: 16, tokensOut: 65, costUsd: 0.0000060, waterMl: 0.005832, carbonG: 0.001296,
  },
  {
    daysAgo: 10, hoursOffset: 3, model: 'gpt-4o-mini', tier: 2,
    userPrompt: 'Give me a regex to validate an email address.',
    assistantReply: '`/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$/`\n\nNote: RFC 5322 is far more complex. This covers 99% of real-world cases.',
    tokensIn: 14, tokensOut: 48, costUsd: 0.0000309, waterMl: 0.008928, carbonG: 0.001984,
  },

  // Day 9
  {
    daysAgo: 9, model: 'claude-opus-4-7', tier: 4,
    userPrompt: 'Build a complete Redis-based distributed rate limiter in TypeScript with sliding window algorithm, cluster support, and fallback behavior when Redis is unavailable.',
    assistantReply: '```typescript\nimport Redis from "ioredis"\n\nexport class SlidingWindowRateLimiter {\n  private redis: Redis\n  private fallback = new Map<string, number[]>()\n\n  constructor(redis: Redis) {\n    this.redis = redis\n  }\n\n  async isAllowed(key: string, limit: number, windowMs: number): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {\n    const now = Date.now()\n    const windowStart = now - windowMs\n\n    try {\n      const pipe = this.redis.pipeline()\n      pipe.zremrangebyscore(key, "-inf", windowStart)\n      pipe.zadd(key, now, `${now}-${Math.random()}`)\n      pipe.zcard(key)\n      pipe.pexpire(key, windowMs)\n      const results = await pipe.exec()\n      const count = (results?.[2]?.[1] as number) ?? 0\n\n      return {\n        allowed: count <= limit,\n        remaining: Math.max(0, limit - count),\n        resetAt: now + windowMs,\n      }\n    } catch {\n      // Redis unavailable — use in-memory fallback\n      const timestamps = this.fallback.get(key)?.filter(t => t > windowStart) ?? []\n      timestamps.push(now)\n      this.fallback.set(key, timestamps)\n      return { allowed: timestamps.length <= limit, remaining: Math.max(0, limit - timestamps.length), resetAt: now + windowMs }\n    }\n  }\n}\n```',
    tokensIn: 48, tokensOut: 410, costUsd: 0.0316, waterMl: 0.072, carbonG: 0.01632,
  },

  // Day 8
  {
    daysAgo: 8, model: 'claude-sonnet-4-6', tier: 3,
    userPrompt: 'Explain CRDT data structures and when you\'d use them instead of OT for collaborative editing.',
    assistantReply: 'CRDTs (Conflict-free Replicated Data Types) are data structures that can be updated independently and merged automatically without coordination.\n\nTypes:\n- G-Counter: grow only (distributed counters)\n- LWW-Register: last-write-wins (simple values)\n- OR-Set: add/remove sets with unique tags\n- RGA: replicated growable array (text editing)\n\nCRDTs vs OT:\nOT (Operational Transformation): requires a central server to order operations. Harder to implement correctly (Google Docs uses this).\nCRDTs: peer-to-peer, no coordination needed, but use more memory. Yjs and Automerge use CRDTs.\n\nUse CRDTs when: offline-first, no central server, or P2P collaboration.\nUse OT when: you have a reliable server and need minimal memory.',
    tokensIn: 22, tokensOut: 240, costUsd: 0.00426, waterMl: 0.0054, carbonG: 0.00126,
  },
  {
    daysAgo: 8, hoursOffset: 2, model: 'llama-3.1-8b-instant', tier: 1,
    userPrompt: 'Convert this to TypeScript: function add(a, b) { return a + b }',
    assistantReply: '```typescript\nfunction add(a: number, b: number): number {\n  return a + b\n}\n```',
    tokensIn: 22, tokensOut: 38, costUsd: 0.0000041, waterMl: 0.004320, carbonG: 0.000960,
  },

  // Day 7 — big context day (triggers ContextBloat in the demo conversation)
  {
    daysAgo: 7, model: 'claude-opus-4-7', tier: 4,
    userPrompt: 'I\'m building a real-time collaborative whiteboard application. Can you give me a complete architecture overview, technology choices, WebSocket protocol design, conflict resolution strategy, persistence layer design, and scalability considerations? Be thorough.',
    assistantReply: 'Here\'s a complete architecture for a real-time collaborative whiteboard:\n\n## Architecture Overview\n\n### Frontend\n- React + Konva.js (canvas rendering)\n- Yjs CRDT for conflict-free collaboration\n- y-websocket provider for real-time sync\n- IndexedDB for offline persistence\n\n### Backend\n- Node.js WebSocket server (ws library)\n- Redis Pub/Sub for horizontal scaling\n- PostgreSQL for document persistence\n- S3 for asset storage\n\n## WebSocket Protocol\n\n```typescript\ntype WSMessage =\n  | { type: "join"; roomId: string; userId: string }\n  | { type: "update"; roomId: string; update: Uint8Array } // Yjs binary update\n  | { type: "awareness"; roomId: string; state: AwarenessState }\n  | { type: "cursor"; roomId: string; userId: string; x: number; y: number }\n\nconst wss = new WebSocketServer({ port: 1234 })\nconst rooms = new Map<string, Set<WebSocket>>()\n\nwss.on("connection", (ws) => {\n  ws.on("message", (data) => {\n    const msg: WSMessage = JSON.parse(data.toString())\n    if (msg.type === "update") {\n      // Broadcast to all other clients in room\n      rooms.get(msg.roomId)?.forEach(client => {\n        if (client !== ws && client.readyState === WebSocket.OPEN) {\n          client.send(data)\n        }\n      })\n      // Persist to Redis stream\n      redis.xadd(`room:${msg.roomId}`, "*", "update", Buffer.from(msg.update).toString("base64"))\n    }\n  })\n})\n```\n\n## Conflict Resolution\nYjs handles this automatically via CRDT. No OT server needed. Each operation is:\n1. Tagged with a unique clock (Lamport timestamp)\n2. Commutative and idempotent\n3. Mergeable without coordination\n\n## Persistence Layer\n```sql\nCREATE TABLE documents (\n  id UUID PRIMARY KEY,\n  room_id TEXT NOT NULL,\n  snapshot BYTEA, -- Yjs encoded state vector\n  version BIGINT DEFAULT 0,\n  updated_at TIMESTAMPTZ DEFAULT NOW()\n);\n\nCREATE TABLE document_updates (\n  id BIGSERIAL PRIMARY KEY,\n  room_id TEXT NOT NULL,\n  update_data BYTEA NOT NULL, -- individual Yjs updates\n  created_at TIMESTAMPTZ DEFAULT NOW()\n);\n\n-- Periodically merge updates into snapshot\nCREATE INDEX idx_updates_room_time ON document_updates(room_id, created_at);\n```\n\n## Scalability\n- Redis Pub/Sub lets multiple Node instances share rooms\n- Sticky sessions or consistent hashing routes users to the same instance\n- Snapshot compaction: merge 1000 individual updates into one state vector\n- CDN edge caching for static assets; S3 presigned URLs for whiteboard images\n\n## Key numbers\n- Yjs update: ~50-200 bytes per operation\n- Expect 5-20 ops/sec per active user\n- At 1000 concurrent users: ~10-200 KB/s — trivially handled by a single Node process',
    tokensIn: 62, tokensOut: 820, costUsd: 0.0624, waterMl: 0.142, carbonG: 0.0326,
  },
  {
    daysAgo: 7, hoursOffset: 1, model: 'claude-opus-4-7', tier: 4,
    userPrompt: 'Now design the cursor tracking system in detail. I need sub-100ms latency for cursor updates globally.',
    assistantReply: 'For sub-100ms global cursor latency, you need edge infrastructure and a separate fast path for ephemeral data:\n\n## Architecture\n\nDon\'t use your main WebSocket server for cursors — it\'s too slow for global users. Use:\n- **Cloudflare Durable Objects** (stateful edge workers, ~20ms RTT globally)\n- Or **Ably/Pusher** managed channels (they handle edge caching)\n\n## Cursor Protocol Design\n```typescript\n// Separate WebSocket channel just for cursors (ephemeral, no persistence)\ntype CursorUpdate = {\n  userId: string\n  roomId: string\n  x: number // 0-1 normalized to canvas dimensions\n  y: number\n  color: string\n  name: string\n  ts: number // client timestamp for latency calculation\n}\n\n// Throttle on client: send cursor at most every 16ms (60fps)\nconst throttledSendCursor = throttle((pos: Point) => {\n  ws.send(JSON.stringify({ type: "cursor", ...pos, ts: Date.now() }))\n}, 16)\n\n// On server: broadcast without storing, fan-out only\nfunction handleCursor(roomId: string, update: CursorUpdate, sender: WebSocket) {\n  const clients = rooms.get(roomId)\n  clients?.forEach(client => {\n    if (client !== sender && client.readyState === WebSocket.OPEN) {\n      client.send(JSON.stringify(update))\n    }\n  })\n  // DO NOT persist cursor positions — pure ephemeral fan-out\n}\n```\n\n## Achieving <100ms globally\n1. **Deploy WS servers at edge** (Cloudflare, Fly.io with anycast routing)\n2. **UDP-like semantics**: drop stale cursor packets, never queue\n3. **Dead reckoning on client**: interpolate cursor position between updates\n4. **Presence heartbeat**: 3s timeout removes stale cursors\n\n```typescript\n// Client-side dead reckoning\nclass CursorInterpolator {\n  private positions = new Map<string, { x: number; y: number; vx: number; vy: number; ts: number }>()\n\n  update(userId: string, x: number, y: number) {\n    const prev = this.positions.get(userId)\n    const now = Date.now()\n    if (prev) {\n      const dt = now - prev.ts\n      this.positions.set(userId, { x, y, vx: (x - prev.x) / dt, vy: (y - prev.y) / dt, ts: now })\n    } else {\n      this.positions.set(userId, { x, y, vx: 0, vy: 0, ts: now })\n    }\n  }\n\n  getInterpolated(userId: string): { x: number; y: number } | null {\n    const p = this.positions.get(userId)\n    if (!p) return null\n    const dt = Date.now() - p.ts\n    return { x: p.x + p.vx * dt, y: p.y + p.vy * dt }\n  }\n}\n```\n\nWith Cloudflare Durable Objects, you get ~15-40ms RTT for 95th percentile globally.',
    tokensIn: 24, tokensOut: 690, costUsd: 0.0519, waterMl: 0.109, carbonG: 0.0248,
  },
  {
    daysAgo: 7, hoursOffset: 2, model: 'claude-opus-4-7', tier: 4,
    userPrompt: 'How do I handle undo/redo with CRDTs? Yjs has some support but it seems incomplete.',
    assistantReply: 'Yjs UndoManager is indeed limited — it only undoes local changes, not remote ones. Here\'s how to handle this properly:\n\n## Yjs UndoManager (local undo)\n```typescript\nconst ydoc = new Y.Doc()\nconst ymap = ydoc.getMap("canvas")\nconst undoManager = new Y.UndoManager(ymap, {\n  captureTimeout: 500, // group operations within 500ms\n  trackedOrigins: new Set(["local-user"]) // only undo local changes\n})\n\n// Apply local change\nydoc.transact(() => {\n  ymap.set("shape-1", { x: 100, y: 200 })\n}, "local-user") // mark as local origin\n\n// Undo\nundoManager.undo()\n\n// Redo\nundoManager.redo()\n```\n\n## The problem: collaborative undo\nIn collaborative editing, "undo" is ambiguous. If Alice moves a shape and Bob deletes it, what does Alice\'s undo do?\n\nThree strategies:\n1. **Local-only undo** (Figma): users can only undo their own actions. Simplest, most intuitive.\n2. **Selective undo** (complex): undo a specific operation even after concurrent edits. Requires operational transformation.\n3. **Snapshot-based** (Notion): create server-side checkpoints; undo restores to checkpoint.\n\n## Recommended: local-only with operation log\n```typescript\ninterface Operation {\n  id: string\n  userId: string\n  type: "add" | "move" | "delete" | "style"\n  targetId: string\n  before: unknown\n  after: unknown\n  timestamp: number\n}\n\nclass UndoStack {\n  private stacks = new Map<string, Operation[]>() // per-user stacks\n\n  push(userId: string, op: Operation) {\n    const stack = this.stacks.get(userId) ?? []\n    stack.push(op)\n    if (stack.length > 50) stack.shift() // cap stack depth\n    this.stacks.set(userId, stack)\n  }\n\n  undo(userId: string): Operation | undefined {\n    return this.stacks.get(userId)?.pop()\n  }\n}\n```\n\nApplying undo as a new CRDT operation (not reverting) means it\'s automatically conflict-free.',
    tokensIn: 28, tokensOut: 560, costUsd: 0.0426, waterMl: 0.092, carbonG: 0.0211,
  },

  // Day 5-6 — lighter usage
  {
    daysAgo: 6, model: 'gpt-4o-mini', tier: 2,
    userPrompt: 'Quick: what\'s the difference between interface and type in TypeScript?',
    assistantReply: 'Interfaces: extendable (declaration merging), better for object shapes, slightly faster in TS compiler.\nTypes: more flexible (unions, intersections, mapped types, conditional types), can alias primitives.\n\nRule of thumb: `interface` for public API shapes, `type` for complex compositions.',
    tokensIn: 18, tokensOut: 60, costUsd: 0.0000387, waterMl: 0.011232, carbonG: 0.002496,
  },
  {
    daysAgo: 5, model: 'claude-sonnet-4-6', tier: 3,
    userPrompt: 'Write a Python script that watches a directory for changes and syncs them to S3.',
    assistantReply: '```python\nimport boto3\nimport time\nfrom pathlib import Path\nfrom watchdog.observers import Observer\nfrom watchdog.events import FileSystemEventHandler\n\ns3 = boto3.client("s3")\n\nclass SyncHandler(FileSystemEventHandler):\n    def __init__(self, bucket: str, prefix: str, watch_dir: str):\n        self.bucket = bucket\n        self.prefix = prefix\n        self.watch_dir = Path(watch_dir)\n\n    def _s3_key(self, path: str) -> str:\n        rel = Path(path).relative_to(self.watch_dir)\n        return f"{self.prefix}/{rel}"\n\n    def on_modified(self, event):\n        if not event.is_directory:\n            s3.upload_file(event.src_path, self.bucket, self._s3_key(event.src_path))\n            print(f"Synced: {event.src_path}")\n\n    def on_deleted(self, event):\n        if not event.is_directory:\n            s3.delete_object(Bucket=self.bucket, Key=self._s3_key(event.src_path))\n\nif __name__ == "__main__":\n    handler = SyncHandler("my-bucket", "backups", "/path/to/watch")\n    observer = Observer()\n    observer.schedule(handler, "/path/to/watch", recursive=True)\n    observer.start()\n    try:\n        while True: time.sleep(1)\n    finally:\n        observer.stop(); observer.join()\n```',
    tokensIn: 20, tokensOut: 290, costUsd: 0.00495, waterMl: 0.0065, carbonG: 0.00148,
  },

  // Day 3-4
  {
    daysAgo: 4, model: 'llama-3.1-8b-instant', tier: 1,
    userPrompt: 'What does the ?? operator do in JavaScript?',
    assistantReply: 'Nullish coalescing: returns right side only if left is `null` or `undefined`. Unlike `||`, it doesn\'t trigger on `0`, `""`, or `false`.\n\n```js\nnull ?? "default"      // "default"\nundefined ?? "default" // "default"\n0 ?? "default"         // 0  (|| would return "default")\n"" ?? "default"        // ""  (|| would return "default")\n```',
    tokensIn: 14, tokensOut: 85, costUsd: 0.0000075, waterMl: 0.007128, carbonG: 0.001584,
  },
  {
    daysAgo: 3, model: 'claude-opus-4-7', tier: 4,
    userPrompt: 'Review this PR diff and give me detailed feedback on the architecture, naming, error handling, and performance implications.',
    assistantReply: 'Without seeing the actual diff I can give you a framework for a thorough PR review:\n\n**Architecture:**\n- Does it follow single responsibility principle?\n- Are new abstractions justified or is it premature?\n- Does it maintain existing patterns or introduce inconsistency?\n\n**Naming:**\n- Are function names imperative verbs? (createUser, not userCreation)\n- Are booleans prefixed? (isLoading, hasError)\n- Are types named by their shape, not usage?\n\n**Error handling:**\n- Are all error paths handled explicitly?\n- Are errors typed (no raw `catch(e)` with any)\n- Is user-facing error copy in a constants file?\n\n**Performance:**\n- Any N+1 queries?\n- Missing indexes for new query patterns?\n- React: any missing useMemo/useCallback that cause re-renders?\n\nPaste the diff and I\'ll give specific line-by-line feedback.',
    tokensIn: 22, tokensOut: 280, costUsd: 0.0216, waterMl: 0.0454, carbonG: 0.01041,
  },
  {
    daysAgo: 3, hoursOffset: 3, model: 'gpt-4o-mini', tier: 2,
    userPrompt: 'fix this typo: teh',
    assistantReply: 'the',
    tokensIn: 8, tokensOut: 3, costUsd: 0.0000030, waterMl: 0.001584, carbonG: 0.000352,
  },
  {
    daysAgo: 2, model: 'claude-sonnet-4-6', tier: 3,
    userPrompt: 'Implement a debounce function with leading and trailing edge support.',
    assistantReply: '```typescript\nfunction debounce<T extends (...args: unknown[]) => unknown>(\n  fn: T,\n  wait: number,\n  { leading = false, trailing = true } = {}\n): (...args: Parameters<T>) => void {\n  let timer: ReturnType<typeof setTimeout> | null = null\n  let lastArgs: Parameters<T>\n\n  return function (...args: Parameters<T>) {\n    lastArgs = args\n    const callNow = leading && !timer\n    if (timer) clearTimeout(timer)\n\n    timer = setTimeout(() => {\n      timer = null\n      if (trailing && !callNow) fn(...lastArgs)\n    }, wait)\n\n    if (callNow) fn(...args)\n  }\n}\n\n// Usage\nconst debouncedSearch = debounce(search, 300, { leading: false, trailing: true })\n```',
    tokensIn: 16, tokensOut: 180, costUsd: 0.00318, waterMl: 0.0043, carbonG: 0.00097,
  },
  {
    daysAgo: 1, model: 'claude-opus-4-7', tier: 4,
    userPrompt: 'Explain monads to me like I\'m a JavaScript developer.',
    assistantReply: 'A monad is a design pattern for chaining operations that might fail or have side effects, without nesting if-checks everywhere.\n\nYou already use monads: **Promises**.\n\n```javascript\nfetch("/api/user")\n  .then(res => res.json())        // transform\n  .then(user => user.name)         // transform again\n  .catch(err => "anonymous")       // handle failure\n```\n\nPromise is a monad because:\n1. **Wrap**: `Promise.resolve(42)` — put a value in the box\n2. **Chain**: `.then(fn)` — apply a function that returns a new Promise\n3. **Flatten**: automatically unwraps nested Promises\n\nAnother example — **Optional/Maybe** monad:\n```javascript\nclass Maybe {\n  constructor(private value: unknown) {}\n  static of(v: unknown) { return new Maybe(v) }\n  isNothing() { return this.value == null }\n  map(fn: Function) {\n    return this.isNothing() ? this : Maybe.of(fn(this.value))\n  }\n  getOrElse(defaultValue: unknown) {\n    return this.isNothing() ? defaultValue : this.value\n  }\n}\n\nMaybe.of(user)\n  .map(u => u.address)\n  .map(a => a.city)\n  .getOrElse("Unknown city")\n// No null checks needed — Maybe handles it\n```\n\nThe formal definition (functor + unit + bind) matters in Haskell. In JS, just think: "a box you can safely chain operations on."',
    tokensIn: 18, tokensOut: 380, costUsd: 0.0291, waterMl: 0.0596, carbonG: 0.01367,
  },
]

// ---------------------------------------------------------------------------
// Savings events (14-day history for dashboard counters)
// ---------------------------------------------------------------------------
// Target dashboard totals: ~$47 saved, 2300 mL water, 180g CO₂
// Spread across 14 days, 3-4 events per day, mix of kinds
const SAVINGS_EVENTS: Array<{
  kind: 'cost_cliff' | 'context_trim' | 'duplicate'
  amountUsd: number
  amountWaterMl: number
  amountCarbonG: number
  daysAgo: number
}> = [
  // Day 14
  { kind: 'cost_cliff',   amountUsd: 2.84, amountWaterMl: 139.2, amountCarbonG: 10.88, daysAgo: 14 },
  { kind: 'context_trim', amountUsd: 1.96, amountWaterMl:  96.1, amountCarbonG:  7.51, daysAgo: 14 },
  { kind: 'duplicate',    amountUsd: 0.72, amountWaterMl:  35.3, amountCarbonG:  2.76, daysAgo: 14 },
  // Day 13
  { kind: 'cost_cliff',   amountUsd: 3.41, amountWaterMl: 167.1, amountCarbonG: 13.06, daysAgo: 13 },
  { kind: 'context_trim', amountUsd: 2.18, amountWaterMl: 106.8, amountCarbonG:  8.35, daysAgo: 13 },
  // Day 12
  { kind: 'cost_cliff',   amountUsd: 1.87, amountWaterMl:  91.6, amountCarbonG:  7.16, daysAgo: 12 },
  { kind: 'duplicate',    amountUsd: 1.23, amountWaterMl:  60.3, amountCarbonG:  4.71, daysAgo: 12 },
  { kind: 'context_trim', amountUsd: 2.65, amountWaterMl: 129.9, amountCarbonG: 10.15, daysAgo: 12 },
  // Day 11
  { kind: 'cost_cliff',   amountUsd: 4.12, amountWaterMl: 201.9, amountCarbonG: 15.78, daysAgo: 11 },
  { kind: 'context_trim', amountUsd: 1.54, amountWaterMl:  75.5, amountCarbonG:  5.90, daysAgo: 11 },
  // Day 10
  { kind: 'cost_cliff',   amountUsd: 2.30, amountWaterMl: 112.7, amountCarbonG:  8.81, daysAgo: 10 },
  { kind: 'duplicate',    amountUsd: 0.98, amountWaterMl:  48.0, amountCarbonG:  3.75, daysAgo: 10 },
  { kind: 'context_trim', amountUsd: 3.05, amountWaterMl: 149.5, amountCarbonG: 11.68, daysAgo: 10 },
  // Day 9
  { kind: 'cost_cliff',   amountUsd: 1.62, amountWaterMl:  79.4, amountCarbonG:  6.20, daysAgo: 9  },
  { kind: 'context_trim', amountUsd: 2.47, amountWaterMl: 121.0, amountCarbonG:  9.46, daysAgo: 9  },
  // Day 8
  { kind: 'cost_cliff',   amountUsd: 3.78, amountWaterMl: 185.2, amountCarbonG: 14.48, daysAgo: 8  },
  { kind: 'duplicate',    amountUsd: 1.15, amountWaterMl:  56.4, amountCarbonG:  4.41, daysAgo: 8  },
  // Day 7
  { kind: 'cost_cliff',   amountUsd: 2.09, amountWaterMl: 102.4, amountCarbonG:  8.00, daysAgo: 7  },
  { kind: 'context_trim', amountUsd: 1.88, amountWaterMl:  92.1, amountCarbonG:  7.20, daysAgo: 7  },
  { kind: 'duplicate',    amountUsd: 0.83, amountWaterMl:  40.7, amountCarbonG:  3.18, daysAgo: 7  },
  // Day 6
  { kind: 'cost_cliff',   amountUsd: 3.26, amountWaterMl: 159.7, amountCarbonG: 12.48, daysAgo: 6  },
  { kind: 'context_trim', amountUsd: 1.41, amountWaterMl:  69.1, amountCarbonG:  5.40, daysAgo: 6  },
  // Day 5
  { kind: 'cost_cliff',   amountUsd: 2.73, amountWaterMl: 133.8, amountCarbonG: 10.46, daysAgo: 5  },
  { kind: 'duplicate',    amountUsd: 1.04, amountWaterMl:  51.0, amountCarbonG:  3.98, daysAgo: 5  },
  { kind: 'context_trim', amountUsd: 1.79, amountWaterMl:  87.7, amountCarbonG:  6.86, daysAgo: 5  },
  // Day 4
  { kind: 'cost_cliff',   amountUsd: 4.55, amountWaterMl: 222.9, amountCarbonG: 17.42, daysAgo: 4  },
  { kind: 'context_trim', amountUsd: 2.02, amountWaterMl:  99.0, amountCarbonG:  7.74, daysAgo: 4  },
  // Day 3
  { kind: 'cost_cliff',   amountUsd: 1.33, amountWaterMl:  65.2, amountCarbonG:  5.09, daysAgo: 3  },
  { kind: 'duplicate',    amountUsd: 0.91, amountWaterMl:  44.6, amountCarbonG:  3.49, daysAgo: 3  },
  { kind: 'context_trim', amountUsd: 2.58, amountWaterMl: 126.4, amountCarbonG:  9.88, daysAgo: 3  },
  // Day 2
  { kind: 'cost_cliff',   amountUsd: 3.14, amountWaterMl: 153.9, amountCarbonG: 12.02, daysAgo: 2  },
  { kind: 'context_trim', amountUsd: 1.67, amountWaterMl:  81.8, amountCarbonG:  6.39, daysAgo: 2  },
  // Day 1 (yesterday)
  { kind: 'cost_cliff',   amountUsd: 2.21, amountWaterMl: 108.3, amountCarbonG:  8.47, daysAgo: 1  },
  { kind: 'duplicate',    amountUsd: 0.66, amountWaterMl:  32.3, amountCarbonG:  2.53, daysAgo: 1  },
]
// Verify: sum ≈ $47.01, 2296 mL, 179.6g

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log('Clearing existing data...')
  await db.execute(sql`TRUNCATE savings_events, messages, conversations RESTART IDENTITY CASCADE`)

  console.log('Creating demo conversation...')
  await db.insert(schema.conversations).values({
    id: DEMO_CONVERSATION_ID,
    createdAt: daysAgo(14),
  })

  console.log(`Inserting ${HISTORY.length * 2} messages...`)
  for (const entry of HISTORY) {
    const createdAt = daysAgo(entry.daysAgo, (entry.hoursOffset ?? 0) + 9)

    await db.insert(schema.messages).values({
      conversationId: DEMO_CONVERSATION_ID,
      role: 'user',
      content: entry.userPrompt,
      model: entry.model,
      tier: entry.tier,
      createdAt,
    })

    // Assistant message (~1 minute later)
    const assistantAt = new Date(createdAt.getTime() + 60_000)
    await db.insert(schema.messages).values({
      conversationId: DEMO_CONVERSATION_ID,
      role: 'assistant',
      content: entry.assistantReply,
      tokensIn: entry.tokensIn,
      tokensOut: entry.tokensOut,
      costUsd: String(entry.costUsd),
      waterMl: String(entry.waterMl),
      carbonG: String(entry.carbonG),
      model: entry.model,
      tier: entry.tier,
      createdAt: assistantAt,
    })
  }

  console.log('Inserting savings events...')
  for (const ev of SAVINGS_EVENTS) {
    await db.insert(schema.savingsEvents).values({
      kind: ev.kind,
      amountUsd: String(ev.amountUsd),
      amountWaterMl: String(ev.amountWaterMl),
      amountCarbonG: String(ev.amountCarbonG),
      createdAt: daysAgo(ev.daysAgo),
    })
  }

  // Summary
  const totalUsd    = HISTORY.reduce((s, e) => s + e.costUsd, 0)
  const totalWater  = HISTORY.reduce((s, e) => s + e.waterMl, 0)
  const totalCarbon = HISTORY.reduce((s, e) => s + e.carbonG, 0)
  const savedUsd    = SAVINGS_EVENTS.reduce((s, e) => s + e.amountUsd, 0)

  console.log('\n✓ Seed complete')
  console.log(`  ${HISTORY.length} conversations seeded`)
  console.log(`  Spend: $${totalUsd.toFixed(4)} | Water: ${totalWater.toFixed(3)} mL | CO₂: ${totalCarbon.toFixed(4)} g`)
  console.log(`  Saved: $${savedUsd.toFixed(2)} across ${SAVINGS_EVENTS.length} interceptions`)
  console.log(`  Demo conversation ID: ${DEMO_CONVERSATION_ID}`)
  console.log(`\n  Token history: ~${HISTORY.reduce((s, e) => s + e.tokensIn + e.tokensOut, 0).toLocaleString()} tokens across all messages`)
  console.log('  (use this conversationId in the chat to trigger ContextBloat)')

  await client.end()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
