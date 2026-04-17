import {
  generateText,
  streamText,
  stepCountIs,
  type LanguageModel,
  type ModelMessage,
} from 'ai';
import { createWebSearchTool } from './tools/web-search';

export const SYSTEM_PROMPT = `You are a helpful assistant with access to a web_search tool.

When to use web_search:
- The user asks about current events, news, prices, weather, or anything time-sensitive
- The user asks about something you do not know or are uncertain about
- The user explicitly asks you to look something up

When NOT to use web_search:
- Simple math, definitions, or things you already know with confidence
- Conversational follow-ups that do not require new facts

CRITICAL: After you receive search results, you MUST write a clear written answer to the user's
question based on those results. Never stop after just calling the tool — always follow up with a
text response that summarizes what you found and cites the sources (mention the page titles).`;

interface AgentArgs {
  model: LanguageModel;
  messages: ModelMessage[];
  tavilyApiKey: string;
  maxSteps?: number;
}

const SHARED_CONFIG = {
  system: SYSTEM_PROMPT,
} as const;

// Streaming variant — used by the worker for live chat.
export function streamAgent({ model, messages, tavilyApiKey, maxSteps = 6 }: AgentArgs) {
  return streamText({
    model,
    ...SHARED_CONFIG,
    messages,
    tools: { web_search: createWebSearchTool(tavilyApiKey) },
    stopWhen: stepCountIs(maxSteps),
  });
}

// Non-streaming variant — used by the eval so we can collect the full result and tool trace.
export async function runAgent({ model, messages, tavilyApiKey, maxSteps = 6 }: AgentArgs) {
  const result = await generateText({
    model,
    ...SHARED_CONFIG,
    messages,
    tools: { web_search: createWebSearchTool(tavilyApiKey) },
    stopWhen: stepCountIs(maxSteps),
  });

  return {
    text: result.text,
    toolCalls: extractToolCalls(result.steps),
    steps: result.steps,
  };
}

export interface ExtractedToolCall {
  toolName: string;
  input: unknown;
  output?: unknown;
}

interface StepLike {
  toolCalls?: { toolCallId: string; toolName: string; input?: unknown; args?: unknown }[];
  toolResults?: { toolCallId: string; toolName: string; output?: unknown; result?: unknown }[];
}

export function extractToolCalls(steps: StepLike[]): ExtractedToolCall[] {
  const calls: ExtractedToolCall[] = [];
  for (const step of steps) {
    for (const call of step.toolCalls ?? []) {
      const matchingResult = step.toolResults?.find((r) => r.toolCallId === call.toolCallId);
      calls.push({
        toolName: call.toolName,
        input: call.input ?? call.args,
        output: matchingResult?.output ?? matchingResult?.result,
      });
    }
  }
  return calls;
}
