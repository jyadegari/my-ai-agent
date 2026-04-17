# AI Chat Agent with Web Search — Implementation Plan

## Context

Build a learning project: an AI chat agent with a web search tool. The frontend is React + TypeScript + Vite. The backend is a Cloudflare Worker with Durable Objects for persistence. Vercel AI SDK connects everything. OpenAI GPT provides the AI, Tavily provides web search.

Each phase produces a **runnable result** so you can see progress and understand each concept before moving on.

## Project Structure

```
my-agent/
├── package.json              ← root workspace config
├── .gitignore
├── frontend/
│   ├── package.json
│   ├── vite.config.ts
│   ├── index.html
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       └── components/
│           ├── ChatWindow.tsx
│           ├── MessageBubble.tsx
│           └── ChatInput.tsx
└── worker/
    ├── package.json
    ├── wrangler.toml
    ├── .dev.vars              ← API keys (git-ignored, never commit this)
    └── src/
        ├── index.ts           ← Worker entry point
        ├── chat-room.ts       ← Durable Object
        └── tools/
            └── web-search.ts  ← Tavily search tool
```

---

## Phase 1: Chat UI with Mock Responses

**Goal:** Working React chat interface with fake responses. No API keys needed.

**You'll learn:** Vite project setup, npm workspaces, the `useChat` hook from Vercel AI SDK, how chat message parts work.

**What you'll see:** A chat window where you type messages and get echo responses streamed back.

### Steps

1. Initialize root `package.json` with `"workspaces": ["frontend", "worker"]`
2. Scaffold frontend with `npm create vite@latest frontend -- --template react-ts`
3. Install `@ai-sdk/react` and `ai` in the frontend
4. Build components:
   - `ChatWindow.tsx` — uses `useChat` with a mock transport (returns echo responses)
   - `MessageBubble.tsx` — renders a single message by iterating `message.parts`
   - `ChatInput.tsx` — text input + send button
5. Add basic chat CSS (flexbox layout, message bubbles, scroll container)
6. `npm run dev` in frontend → open `http://localhost:5173`

### Key files

- `frontend/src/components/ChatWindow.tsx` — core chat logic
- `frontend/src/mock-transport.ts` — fake transport that echoes messages (replaced in Phase 2)

---

## Phase 2: Cloudflare Worker + Real OpenAI Streaming

**Goal:** Replace mock with a real Cloudflare Worker that calls OpenAI GPT and streams responses.

**You'll learn:** What Cloudflare Workers are, `wrangler` CLI, the backend side of AI SDK (`streamText`, `convertToModelMessages`, `toUIMessageStreamResponse`), CORS, Vite proxy.

**What you'll see:** Type a question → get a real AI response streamed word-by-word.

### Prerequisites (your action)

- Create a Cloudflare account at <https://dash.cloudflare.com/sign-up> (free)
- Get an OpenAI API key from <https://platform.openai.com/api-keys>
- Run `npx wrangler login`

### Steps

1. Create `worker/` package with dependencies: `ai`, `@ai-sdk/openai`, `zod`, `wrangler`
2. Create `worker/wrangler.toml`:
   - `compatibility_flags = ["nodejs_compat"]` (required — AI SDK uses Node APIs)
3. Create `worker/.dev.vars` with `OPENAI_API_KEY=sk-...`
4. Build `worker/src/index.ts`:
   - `POST /api/chat` — parse messages, call `streamText()` with `openai('gpt-4o-mini')`, return `toUIMessageStreamResponse()`
   - `OPTIONS /api/chat` — CORS preflight handler
   - Add CORS headers to all responses
5. Update `frontend/vite.config.ts` — add proxy: `/api` → `http://localhost:8787`
6. Replace mock transport with `DefaultChatTransport` pointing to `/api/chat`
7. Add root scripts: `dev:frontend`, `dev:worker`, `dev` (runs both)
8. `npm run dev` from root → both servers start

### Key files

- `worker/src/index.ts` — Worker entry point with OpenAI streaming
- `worker/wrangler.toml` — Worker configuration
- `worker/.dev.vars` — local secrets (git-ignored)
- `frontend/vite.config.ts` — proxy config

---

## Phase 3: Durable Objects for Chat Persistence

**Goal:** Chat history survives page reloads. Multiple conversations with a sidebar.

**You'll learn:** What Durable Objects are (stateful actors), `ctx.storage` for persistence, DO bindings and migrations, `getByName()` for getting DO stubs.

**What you'll see:** Sidebar with conversations, "New Chat" button, refresh the page and messages are still there.

### Steps

1. Update `worker/wrangler.toml` — add DO binding (`CHAT_ROOM` → `ChatRoom`) and migration
2. Create `worker/src/chat-room.ts` — `ChatRoom` class extending `DurableObject`:
   - `getMessages()` — reads from `ctx.storage`
   - `saveMessages(messages)` — writes to `ctx.storage`
3. Update `worker/src/index.ts`:
   - Add `Env` interface with `CHAT_ROOM: DurableObjectNamespace<ChatRoom>`
   - `POST /api/chat` accepts `conversationId`, gets DO stub, saves after stream finishes (via `onFinish`)
   - `GET /api/chat/:id` — loads history from DO
   - `GET /api/conversations` — lists conversation IDs
4. Update frontend:
   - `ChatWindow.tsx` — loads initial messages from API, passes `conversationId`
   - `App.tsx` — add sidebar layout with conversation list
   - New `Sidebar.tsx` component
5. Test: send messages, refresh page, verify they persist

### Key files

- `worker/src/chat-room.ts` — Durable Object class
- `worker/wrangler.toml` — DO bindings and migrations
- `frontend/src/components/Sidebar.tsx` — conversation list

---

## Phase 4: Web Search Tool via Tavily

**Goal:** The AI can search the web when it needs current information. This is what makes it an "agent."

**You'll learn:** What tool calling is (LLM outputs structured function calls), the `tool()` function with Zod schemas, `maxSteps` for multi-step reasoning, rendering tool states in the UI.

**What you'll see:** Ask "What's in the news today?" → AI shows "Searching..." → search results appear as cards → AI synthesizes an answer.

### Prerequisites (your action)

- Get a Tavily API key from <https://tavily.com> (free tier)
- Add `TAVILY_API_KEY=tvly-...` to `worker/.dev.vars`

### Steps

1. Create `worker/src/tools/web-search.ts`:
   - Uses `tool()` from `ai` with Zod input schema
   - `execute` calls Tavily REST API, returns structured results
2. Update `worker/src/index.ts`:
   - Add `web_search` tool to `streamText()` call
   - Add `maxSteps: 3` (allows AI to call tools and continue)
   - Add system prompt instructing AI when to use search
3. Update frontend:
   - `MessageBubble.tsx` — handle `tool-invocation` parts:
     - `"call"` state → show "Searching: {query}..." with spinner
     - `"result"` state → show search result cards with titles, snippets, URLs
   - New `SearchResultCard.tsx` component
4. Test: ask time-sensitive questions (news, prices, weather) and verify tool use

### Key files

- `worker/src/tools/web-search.ts` — Tavily tool definition
- `frontend/src/components/MessageBubble.tsx` — tool state rendering
- `frontend/src/components/SearchResultCard.tsx` — search result display

---

## Phase 5: AI Evaluation

**Goal:** Systematically test whether the agent behaves correctly — does it answer well, call tools when it should, and avoid mistakes?

**You'll learn:** What AI evals are and why they matter, the three types of evals (deterministic, LLM-as-judge, tool-use trajectory), how to write test cases, how `MockLanguageModelV1` from the AI SDK lets you test without real API calls.

**What you'll see:** A `npm run eval` command that runs a suite of test cases and reports pass/fail scores for response quality, tool use accuracy, and regressions.

### Key concepts

- **Deterministic eval**: assert exact things — did it call the right tool? Did it not call tools for simple math?
- **LLM-as-judge**: use GPT-4o to score free-text responses (helpfulness, accuracy, relevance) on a 1–10 scale
- **Regression eval**: save good responses as golden files; fail if future runs drift significantly

### Prerequisites (your action)

No new accounts needed. Uses Vitest (standard TypeScript test runner) and the AI SDK's built-in mock utilities.

### Steps

1. Install dev dependencies: `vitest`, `@ai-sdk/provider-utils` (has `MockLanguageModelV1`)
2. Create `evals/` directory at project root:
   - `evals/cases.ts` — array of test cases: `{ input, shouldUseWebSearch, description }`
   - `evals/scorers/tool-use.ts` — checks if Tavily was called when expected
   - `evals/scorers/llm-judge.ts` — calls GPT-4o to rate response quality (1–10)
   - `evals/agent.eval.ts` — the actual Vitest test file
3. Update `worker/src/index.ts` to export the core agent logic as a testable function (separate from the HTTP handler)
4. Add `"eval": "vitest run evals/"` script to root `package.json`
5. Run evals: `npm run eval` — see pass/fail for each test case

### What to test

| Test case | Eval type | Pass condition |
|-----------|-----------|----------------|
| "What's 2 + 2?" | Deterministic | No tool calls; answer contains "4" |
| "Latest AI news today?" | Tool-use | `web_search` tool was called |
| "Who is the president of France?" | LLM-as-judge | Quality score ≥ 7/10 |
| Previous good responses | Regression | Output similarity ≥ 80% |

### Key files

- `evals/cases.ts` — test case definitions
- `evals/agent.eval.ts` — Vitest test suite
- `evals/scorers/tool-use.ts` — tool call assertions
- `evals/scorers/llm-judge.ts` — GPT-4o quality scoring
- `worker/src/agent.ts` — extracted agent logic (testable without HTTP layer)

---

## Phase 6: Polish and Deploy

**Goal:** Production-ready deployment on Cloudflare's global network.

**You'll learn:** Building Vite for production, `wrangler deploy`, production secrets, serving static assets from a Worker, error handling, markdown rendering.

**What you'll see:** A live URL at `https://my-agent-worker.<your-subdomain>.workers.dev`.

### Steps

1. Add `react-markdown` for rendering AI responses with formatting
2. Add loading/streaming indicators, error display, auto-scroll
3. Add try/catch error handling in the Worker
4. Configure `wrangler.toml` to serve frontend static assets: `[assets] directory = "../frontend/dist"`
5. Set production secrets: `npx wrangler secret put OPENAI_API_KEY` (and Tavily)
6. Deploy: `npm run build:frontend && cd worker && npx wrangler deploy`
7. Test the live URL

---

## Verification Plan

After each phase, verify:

| Phase | How to test |
|-------|-------------|
| 1 | Open `localhost:5173`, type a message, see echo response |
| 2 | Type a question, get a real GPT response streamed back |
| 3 | Send messages, refresh page, verify history persists. Create multiple conversations. |
| 4 | Ask "What's the latest news about AI?" — see search tool activated, results displayed |
| 5 | Run `npm run eval` — all test cases pass, scores reported in terminal |
| 6 | Visit the deployed URL, full flow works on a live domain |

## Important Notes

- **`nodejs_compat` flag** in `wrangler.toml` is required — AI SDK uses Node.js APIs internally
- **Vite proxy** handles CORS during development; Worker CORS headers handle production
- **AI SDK v5** uses `convertToModelMessages()` (not v4's `convertToCoreMessages`), `sendMessage()` (not `handleSubmit`), and `message.parts` (not `message.content`)
- **`.dev.vars`** must be git-ignored — it contains your API keys, never commit it
