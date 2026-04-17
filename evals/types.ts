export type Difficulty = 'simple' | 'medium' | 'hard' | 'edge';
export type Category = 'direct-answer' | 'web-search' | 'multi-step' | 'edge';

export interface GoldenTestCase {
  id: string;
  input: string;
  expectedCharacteristics: string[];
  expectedKeywords?: string[];
  shouldUseWebSearch: boolean;
  difficulty: Difficulty;
  category: Category;
}

export interface RecordedToolCall {
  toolName: string;
  input: unknown;
  output?: unknown;
}

export interface EvalResult {
  testCaseId: string;
  input: string;
  response: string;
  toolCalls: RecordedToolCall[];
  durationMs: number;
  error?: string;
}

export interface ScoredResult extends EvalResult {
  score: 1 | 2 | 3 | 4 | 5;
  notes?: string;
}
