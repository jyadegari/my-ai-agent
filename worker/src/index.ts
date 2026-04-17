import { createOpenAI } from '@ai-sdk/openai';
import { convertToModelMessages, type UIMessage } from 'ai';
import { ChatRoom } from './chat-room';
import { streamAgent } from './agent-core';

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
      const result = streamAgent({
        model: openai('gpt-4o-mini'),
        messages: await convertToModelMessages(messages),
        tavilyApiKey: env.TAVILY_API_KEY,
      });

      // ctx.waitUntil keeps the Worker alive after the stream ends so the DO write completes.
      ctx.waitUntil(
        Promise.resolve(result.text).then(async (text) => {
          const assistantMessage: UIMessage = {
            id: crypto.randomUUID(),
            role: 'assistant',
            parts: [{ type: 'text', text }],
          };
          await stub.saveMessages([...messages, assistantMessage]);
        }),
      );

      return withCors(
        result.toUIMessageStreamResponse({
          onError: (error) => {
            console.error('[stream error]', error);
            return error instanceof Error ? error.message : String(error);
          },
        }),
      );
    }

    return new Response('Not found', { status: 404 });
  },
};
