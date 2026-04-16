import { createOpenAI } from '@ai-sdk/openai';
import { convertToModelMessages, streamText, type UIMessage } from 'ai';

export interface Env {
  OPENAI_API_KEY: string;
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Handle CORS preflight — browsers send this before the real POST
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    if (request.method === 'POST' && new URL(request.url).pathname === '/api/chat') {
      const { messages } = (await request.json()) as { messages: UIMessage[] };

      const openai = createOpenAI({ apiKey: env.OPENAI_API_KEY });
      const result = streamText({
        model: openai('gpt-4o-mini'),
        system: 'You are a helpful assistant.',
        messages: await convertToModelMessages(messages),
      });

      const response = result.toUIMessageStreamResponse();

      // Attach CORS headers to the streaming response
      const headers = new Headers(response.headers);
      Object.entries(CORS_HEADERS).forEach(([k, v]) => headers.set(k, v));

      return new Response(response.body, {
        status: response.status,
        headers,
      });
    }

    return new Response('Not found', { status: 404 });
  },
};
