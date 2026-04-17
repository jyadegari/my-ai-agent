import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createOpenAI } from '@ai-sdk/openai';

import { runAgent } from '../worker/src/agent-core';
import { buildMessages } from './buildMessages';
import type { GoldenTestCase, EvalResult } from './types';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// Load OPENAI_API_KEY and TAVILY_API_KEY from worker/.dev.vars so the eval
// uses the same secrets as wrangler dev — one source of truth.
function loadDevVars(): Record<string, string> {
  try {
    const content = readFileSync(join(ROOT, 'worker/.dev.vars'), 'utf-8');
    const vars: Record<string, string> = {};
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed.slice(eq + 1).trim();
      vars[key] = value;
    }
    return vars;
  } catch {
    return {};
  }
}

const env = { ...loadDevVars(), ...process.env };
const OPENAI_API_KEY = env.OPENAI_API_KEY;
const TAVILY_API_KEY = env.TAVILY_API_KEY;

if (!OPENAI_API_KEY || !TAVILY_API_KEY) {
  console.error('Missing OPENAI_API_KEY or TAVILY_API_KEY in worker/.dev.vars');
  process.exit(1);
}

const openai = createOpenAI({ apiKey: OPENAI_API_KEY });

async function runTestCase(tc: GoldenTestCase): Promise<EvalResult> {
  const start = Date.now();
  try {
    const result = await runAgent({
      model: openai('gpt-4o-mini'),
      messages: buildMessages(tc),
      tavilyApiKey: TAVILY_API_KEY,
    });

    return {
      testCaseId: tc.id,
      input: tc.input,
      response: result.text,
      toolCalls: result.toolCalls,
      durationMs: Date.now() - start,
    };
  } catch (error) {
    return {
      testCaseId: tc.id,
      input: tc.input,
      response: '',
      toolCalls: [],
      durationMs: Date.now() - start,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function main() {
  const datasetPath = join(ROOT, 'evals/datasets/golden.json');
  const testCases: GoldenTestCase[] = JSON.parse(readFileSync(datasetPath, 'utf-8'));

  console.log(`Running ${testCases.length} test cases...\n`);

  const results: EvalResult[] = [];
  for (const tc of testCases) {
    process.stdout.write(`[${tc.id}] ${tc.category.padEnd(15)} `);
    const result = await runTestCase(tc);
    results.push(result);
    if (result.error) {
      console.log(`ERROR: ${result.error}`);
    } else {
      const toolList = result.toolCalls.map((c) => c.toolName).join(',') || 'none';
      console.log(`tools:[${toolList}] ${result.durationMs}ms`);
    }
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const resultsDir = join(ROOT, 'evals/results');
  mkdirSync(resultsDir, { recursive: true });
  const outPath = join(resultsDir, `${timestamp}.json`);
  writeFileSync(outPath, JSON.stringify(results, null, 2));

  console.log(`\nResults written to ${outPath}`);
  console.log('Next: open the file, review each result, add score (1-5) and notes.\n');

  // Summary
  const total = results.length;
  const errors = results.filter((r) => r.error).length;
  const empty = results.filter((r) => !r.error && !r.response).length;
  const avg = Math.round(results.reduce((s, r) => s + r.durationMs, 0) / total);

  console.log('=== Summary ===');
  console.log(`Total:               ${total}`);
  console.log(`Errors:              ${errors}`);
  console.log(`Empty responses:     ${empty}`);
  console.log(`Average duration:    ${avg}ms`);

  // Break down tool use by category
  console.log('\n=== Tool use by category ===');
  const byCategory = new Map<string, { searched: number; total: number }>();
  for (let i = 0; i < results.length; i += 1) {
    const r = results[i];
    const tc = testCases[i];
    const entry = byCategory.get(tc.category) ?? { searched: 0, total: 0 };
    entry.total += 1;
    if (r.toolCalls.some((c) => c.toolName === 'web_search')) entry.searched += 1;
    byCategory.set(tc.category, entry);
  }
  for (const [cat, { searched, total: t }] of byCategory) {
    console.log(`${cat.padEnd(16)} ${searched}/${t} called web_search`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
