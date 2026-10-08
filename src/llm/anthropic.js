/**
 * Anthropic provider (real Claude API).
 * Only loaded when LLM_PROVIDER=anthropic.
 * Intentionally minimal stub so the rest of the codebase can be developed for free.
 * Implement when there is budget and an API key.
 */

import config from '../config.js';

/**
 * @param {{ system: string, user: string, maxTokens?: number }} input
 * @returns {Promise<{ text: string, tokensIn: number, tokensOut: number, costUsd: number }>}
 */
export async function anthropicGenerate(input) {
  if (!config.llm.anthropicApiKey) {
    throw new Error('ANTHROPIC_API_KEY is not set. Use LLM_PROVIDER=mock until you have budget.');
  }
  if (!config.llm.model) {
    throw new Error('LLM_MODEL is not set. Check current Anthropic model names in the official docs.');
  }

  // TODO: implement with the official Anthropic SDK when budget is available.
  // Do not hardcode model names or prices.
  // Remember: register tokensIn / tokensOut / costUsd and respect monthly_token_cap.
  throw new Error(
    'anthropicGenerate is not implemented yet. Keep LLM_PROVIDER=mock during development.'
  );
}
