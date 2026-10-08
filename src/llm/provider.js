/**
 * LLM provider interface.
 * Only this module (and the implementations it loads) should know which backend is used.
 *
 * @typedef {Object} GenerateInput
 * @property {string} system
 * @property {string} user
 * @property {number} [maxTokens]
 *
 * @typedef {Object} GenerateResult
 * @property {string} text
 * @property {number} tokensIn
 * @property {number} tokensOut
 * @property {number} costUsd
 */

import config from '../config.js';
import { mockGenerate } from './mock.js';

/**
 * @param {GenerateInput} input
 * @returns {Promise<GenerateResult>}
 */
export async function generate(input) {
  const provider = config.llm.provider;

  if (provider === 'mock') {
    return mockGenerate(input);
  }

  if (provider === 'anthropic') {
    // Real implementation will live in anthropic.js and be loaded only when needed.
    // Kept out of the critical path so development stays free.
    const { anthropicGenerate } = await import('./anthropic.js');
    return anthropicGenerate(input);
  }

  throw new Error(`Unknown LLM_PROVIDER: ${provider}. Use "mock" or "anthropic".`);
}

export default { generate };
