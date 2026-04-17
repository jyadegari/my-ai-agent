import { createOpenAI } from '@ai-sdk/openai';
import { convertToModelMessages, stepCountIs, streamText, type UIMessage } from 'ai';
import { ChatRoom } from './chat-room';
import { createWebSearchTool } from './tools/web-search';

export { ChatRoom };

export interface Env {
  OPENAI_API_KEY: string;
  TAVILY_API_KEY: string;
  CHAT_ROOM: DurableObjectNamespace<ChatRoom>;
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const SYSTEM_PROMPT = `You are a helpful assistant with access to a web_search tool.

When to use web_search:
- The user asks about current events, news, prices, weather, or anything time-sensitive
- The user asks about something you do not know or are uncertain about
- The user explicitly asks you to look something up

When NOT to use web_search:
- Simple math, definitions, or things you already know with confidence
- Conversational follow-ups that do not require new facts

After using web_search, cite the sources you used (mention the page titles).`;

function withCors(response: Response): Response {
  const headers = new Headers(response.headers);
  Object.entries(CORS_HEADERS).forEach(([k, v]) => headers.set(k, v));
  return new Response(response.body, { status: response.status, headers });
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    const url = new URL(request.url);

    // GET /api/chat/:id — load conversation history from Durable Object
    if (request.method === 'GET' && url.pathname.startsWith('/api/chat/')) {
      const conversationId = url.pathname.slice('/api/chat/'.length);
      const stub = env.CHAT_ROOM.get(env.CHAT_ROOM.idFromName(conversationId));
      const messages = await stub.getMessages();
      return withCors(
        new Response(JSON.stringify({ messages }), {
          headers: { 'Content-Type': 'application/json' },
        }),
      );
    }

    // POST /api/chat — stream a response and save to Durable Object on finish
    if (request.method === 'POST' && url.pathname === '/api/chat') {
      const { messages, conversationId } = (await request.json()) as {
        messages: UIMessage[];
        conversationId: string;
      };

      const stub = env.CHAT_ROOM.get(env.CHAT_ROOM.idFromName(conversationId));

      const openai = createOpenAI({ apiKey: env.OPENAI_API_KEY });
      const result = streamText({
        model: openai('gpt-4o-mini'),
        system: SYSTEM_PROMPT,
        messages: await convertToModelMessages(messages),
        tools: {
          web_search: createWebSearchTool(env.TAVILY_API_KEY),
        },
        // stopWhen lets the model take a tool call → see the result → write a final
        // answer in a follow-up step. Without it the stream stops right after the tool call.
        stopWhen: stepCountIs(3),
      });

      // ctx.waitUntil keeps the Worker alive after the stream ends so the DO write completes.
      ctx.waitUntil(
        result.text.then(async (text) => {
          const assistantMessage: UIMessage = {
            id: crypto.randomUUID(),
            role: 'assistant',
            parts: [{ type: 'text', text }],
          };
          await stub.saveMessages([...messages, assistantMessage]);
        }),
      );

      return withCors(result.toUIMessageStreamResponse());
    }

    return new Response('Not found', { status: 404 });
  },
};
