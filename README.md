# SaveAI

**MyFitnessPal for AI tokens.** SaveAI makes your LLM spend legible in real time — dollars, water, and CO₂ per query — then intercepts waste before it happens via pre-flight cost cliff detection, context trimming, and duplicate caching. Built at the To The Americas Hackathon (April 2026) using Pydantic AI Gateway, MuBit, and Render.

**Live:** https://saveai.onrender.com

## Stack

- Next.js 14 App Router + TypeScript + Tailwind CSS + shadcn/ui
- Pydantic AI Gateway (all LLM routing — Claude Haiku / Sonnet / Opus via built-in Anthropic provider)
- MuBit (associative memory + token-budgeted context assembly)
- Drizzle ORM + Postgres + pgvector (Render)
- Framer Motion (Impact Meter animation)

## Run locally

```bash
cp .env.example .env  # fill in PYDANTIC_GATEWAY_KEY and DATABASE_URL
npm install
npm run dev
```
