import type { ModelMessage } from 'ai';
import type { GoldenTestCase } from './types';

/**
 * Converts a test case into the ModelMessage[] shape that `runAgent` expects.
 *
 * Stage 1 covers only single-turn cases: one user message.
 * Future extensions (e.g. modify cases with seeded prior turns) would branch here.
 */
export function buildMessages(tc: GoldenTestCase): ModelMessage[] {
  return [{ role: 'user', content: tc.input }];
}
