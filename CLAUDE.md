# SaveAI — Claude Code Operating Manual

> Read this file FIRST in every session. Then read `CONTEXT.md` for product spec.

## What this is

A 19-hour hackathon build. Submission deadline: **2026-04-26 13:00 BST**. Goal: win 1st place at To The Americas Hackathon (Unicorn Mafia, 120 builders) + 4× £500 sponsor bounties.

This is **not** a production codebase. Optimize for demo quality, not maintainability.

## Tech Stack (locked — do not change)

- Next.js 14 App Router, TypeScript strict
- Tailwind CSS + shadcn/ui
- Framer Motion (Impact Meter only)
- Drizzle ORM + Postgres (Render) + pgvector
- OpenAI Node SDK pointed at Pydantic AI Gateway
- MuBit TypeScript SDK
- Pydantic Logfire (auto via gateway)
- Deployed on Render (Frankfurt region)

## CRITICAL Rules

- **CRITICAL**: All LLM calls go through Pydantic AI Gateway base URL. Never call provider SDKs directly. Reference: https://ai.pydantic.dev/gateway/
- **CRITICAL**: All LLM API logic lives in `src/app/api/` route handlers. Never call LLMs from client components.
- **CRITICAL**: Cost / water / carbon numbers shown to users must come from `src/lib/constants.ts`. Never hardcode magic numbers in components.
- **CRITICAL**: Read `/CONTEXT.md`, `/pitch.md`, `/BLOCKERS.md` before any task to understand state.
- **CRITICAL**: Once `src/components/ImpactMeter.tsx` is locked (H6), do not modify unless explicitly asked. It is the signature visual.
- **CRITICAL**: Skip tests. This is a demo build. Visual correctness > unit correctness.
- **CRITICAL**: When touching MuBit / Pydantic Gateway code, WebFetch the live docs at task start. The SDKs are new and your training data is stale.

## File / folder conventions

```
src/
├── app/
│   ├── page.tsx              # main split: chat left, dashboard right
│   ├── methodology/page.tsx  # citations page
│   └── api/
│       ├── chat/route.ts     # main LLM proxy through PAIG
│       ├── preflight/route.ts # cost cliff / bloat / duplicate checks
│       └── metrics/route.ts  # dashboard data
├── components/
│   ├── ImpactMeter.tsx       # SIGNATURE — do not freelance on this
│   ├── ChatPanel.tsx
│   ├── Dashboard.tsx
│   ├── modals/
│   │   ├── CostCliff.tsx
│   │   ├── ContextBloat.tsx
│   │   └── DuplicateCheck.tsx
│   └── ui/                   # shadcn primitives only
├── lib/
│   ├── constants.ts          # cited numbers — see CONTEXT.md
│   ├── estimator.ts          # cost / water / carbon math
│   ├── gateway.ts            # PAIG client
│   └── mubit.ts              # MuBit client
├── services/
│   ├── llm.ts                # tier router
│   └── memory.ts             # MuBit wrapper
├── types/
│   └── index.ts
└── db/
    ├── schema.ts             # Drizzle
    └── migrate.ts
```

## Sponsor doc URLs — WebFetch at task start

- MuBit: https://docs.mubit.ai/
- Pydantic AI Gateway: https://ai.pydantic.dev/gateway/
- Pydantic Logfire: https://pydantic.dev/docs/logfire/get-started/
- Render: https://render.com/docs

## Commands

```bash
npm run dev       # dev server
npm run build     # prod build (verify before push)
```

No `npm test`. No `npm run lint`. Don't add them.

## Commit style

Conventional commits: `feat:`, `fix:`, `refactor:`, `chore:`. One-liner subjects. No body unless decisions matter.

## When stuck

Update `BLOCKERS.md` with timestamp + what's broken + what you tried. Don't loop on the same approach more than 3 times — escalate to user (the human) instead.
