/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Phase 3: Gemini LLM Service Implementation
 */

import { GoogleGenAI } from '@google/genai';
import type { UserLLMRequest, LLMSynthesisOutput } from './types.ts';
import type { ScoredCandidate, LLMContextPayload } from '../phase2/types.ts';
import { SYSTEM_INSTRUCTION, constructRecommendationPrompt } from './llmPrompts.ts';
import { recommendationResponseSchema } from './schema.ts';
import { synthesizeFallbackRecommendations } from './fallbackSynthesizer.ts';

// Gemini client initialization helper
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === '' || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build'
      }
    }
  });
}

export interface GenerationResult {
  output: LLMSynthesisOutput;
  source: 'gemini-3.8-flash' | 'rule-based-fallback';
  durationMs: number;
}

export async function generateRecommendationsWithLLM(
  userRequest: UserLLMRequest,
  contextPayload: LLMContextPayload,
  rawCandidates: ScoredCandidate[]
): Promise<GenerationResult> {
  const startTime = performance.now();
  const ai = getGeminiClient();

  if (!ai) {
    const fallbackOutput = synthesizeFallbackRecommendations(userRequest, rawCandidates);
    const durationMs = Number((performance.now() - startTime).toFixed(2));
    return {
      output: fallbackOutput,
      source: 'rule-based-fallback',
      durationMs
    };
  }

  try {
    const prompt = constructRecommendationPrompt(userRequest, contextPayload);

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: 'application/json',
        responseSchema: recommendationResponseSchema,
        temperature: 0.3
      }
    });

    const responseText = response.text;
    if (!responseText) {
      throw new Error('Gemini returned an empty text response.');
    }

    const parsed: LLMSynthesisOutput = JSON.parse(responseText);

    // Verify minimum response structure
    if (!parsed || !Array.isArray(parsed.recommendations) || parsed.recommendations.length === 0) {
      throw new Error('Malformed or empty recommendations array from LLM.');
    }

    const durationMs = Number((performance.now() - startTime).toFixed(2));
    return {
      output: parsed,
      source: 'gemini-3.8-flash',
      durationMs
    };
  } catch (error) {
    console.warn('[Phase 3 LLM Service] Gemini call failed or unavailable; using fallback synthesizer:', error);
    const fallbackOutput = synthesizeFallbackRecommendations(userRequest, rawCandidates);
    const durationMs = Number((performance.now() - startTime).toFixed(2));
    return {
      output: fallbackOutput,
      source: 'rule-based-fallback',
      durationMs
    };
  }
}
