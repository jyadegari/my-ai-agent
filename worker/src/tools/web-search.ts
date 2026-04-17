import { tool } from 'ai';
import { z } from 'zod';

interface TavilyRawResult {
  title: string;
  url: string;
  content: string;
}

interface TavilyResponse {
  results: TavilyRawResult[];
}

export interface WebSearchResult {
  title: string;
  url: string;
  snippet: string;
}

export interface WebSearchOutput {
  query: string;
  results: WebSearchResult[];
}

/**
 * Returns a `web_search` tool bound to the given Tavily API key.
 *
 * The factory pattern keeps the API key out of module scope — important
 * because Cloudflare Workers must read keys from `env`, not `process.env`.
 */
export function createWebSearchTool(apiKey: string) {
  return tool({
    description:
      'Search the web for current information. Use this when the user asks about news, recent events, prices, weather, or any topic that may have changed recently or that you do not know about.',
    inputSchema: z.object({
      query: z.string().describe('The search query — keep it short and focused.'),
    }),
    execute: async ({ query }): Promise<WebSearchOutput> => {
      const response = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          query,
          max_results: 5,
          search_depth: 'basic',
        }),
      });

      if (!response.ok) {
        throw new Error(`Tavily search failed: ${response.status} ${response.statusText}`);
      }

      const data = (await response.json()) as TavilyResponse;

      return {
        query,
        results: (data.results ?? []).map((r) => ({
          title: r.title,
          url: r.url,
          snippet: r.content,
        })),
      };
    },
  });
}
