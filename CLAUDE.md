# my-agent

AI chat agent with web search. Learning project built phase by phase.

## Stack
- **Frontend:** React 19 + TypeScript + Vite 8 — in `frontend/`
- **Backend:** Cloudflare Worker — in `worker/`
- **AI SDK:** Vercel AI SDK v6 (useChat, streamText, message.parts)
- **Model:** OpenAI GPT-4o-mini via `@ai-sdk/openai`
- **Planned:** Durable Objects (persistence), Tavily (web search)

## Dev commands
- `npm run dev` — starts both frontend (port 5173) and worker (port 8787)
- `npm run dev:frontend` — frontend only
- `npm run dev:worker` — worker only

## Implementation plan
See @PLAN.md for the full 5-phase plan.

**Status:**
- Phase 1 ✅ — Chat UI with mock streaming responses
- Phase 2 ✅ — Cloudflare Worker + real OpenAI streaming
- Phase 3 ✅ — Durable Objects for chat persistence
- Phase 4 ✅ — Web search tool via Tavily
- Phase 5 ⬜ — AI Evaluation (Vitest + LLM-as-judge + tool-use assertions)
- Phase 6 ⬜ — Polish and deploy

## Critical notes
- `nodejs_compat` flag in `wrangler.toml` is required — AI SDK uses Node.js APIs
- `worker/.dev.vars` holds API keys — git-ignored, never commit
- AI SDK v6 patterns: `message.parts`, `convertToModelMessages()`, `sendMessage()` (not v4's `handleSubmit`)
- Vite proxy `/api` → `http://localhost:8787` handles CORS in dev

## Key files
- `frontend/src/components/ChatWindow.tsx` — chat logic, useChat hook
- `frontend/src/components/MessageBubble.tsx` — renders message parts (extend here for tool calls in Phase 4)
- `worker/src/index.ts` — Worker entry point, POST /api/chat handler
- `worker/wrangler.toml` — Worker config (add DO bindings in Phase 3)
