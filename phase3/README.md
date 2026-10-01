# Phase 3: LLM Reasoning, Scoring & Synthesis Engine

## Overview
Phase 3 takes the top-ranked candidates retrieved by Phase 2 and applies **LLM reasoning** using Google Gemini via the `@google/genai` SDK (`gemini-3.8-flash`).

Rather than returning plain database rows, Phase 3 transforms candidate data into a tailored culinary briefing:
- Generates personalized rationales ("Why You'll Love It") anchored in the user's specific price, cuisine, and ambience needs.
- Evaluates must-try signature dishes from the restaurant's actual popular dishes and reviews.
- Provides practical dining tips (e.g., table booking advice, budget assessment, best occasion).
- Synthesizes an overall user dining summary and alternative suggestions if preferences were tight.

## Architecture & Grounding
- **Strict Grounding Guardrails:** The LLM is strictly restricted to candidates provided in the context prompt to prevent hallucinations of non-existent venues.
- **Structured Output Enforcement:** Uses Gemini's native `responseSchema` with `responseMimeType: "application/json"` ensuring guaranteed schema conformance.
- **Resilient Fallback Mode:** When an API key is not connected or in offline/dry-run environments, the engine seamlessly provides rule-based structured rationales adhering to the exact same contract.

## Folder Structure
```
phase3/
├── README.md               # Phase 3 documentation
├── types.ts                # TypeScript interfaces for LLM inputs and structured outputs
├── schema.ts               # Gemini responseSchema definitions (Type.OBJECT, Type.ARRAY, etc.)
├── llmPrompts.ts           # System instructions, prompt templates & context packaging
├── fallbackSynthesizer.ts  # Deterministic synthesis fallback for offline/keyless mode
├── llmService.ts           # Direct @google/genai Gemini 3.8 Flash caller
├── recommendationEngine.ts # High-level orchestrator combining Phase 2 + Phase 3
└── tests/
    └── phase3.test.ts      # Automated dry-run & schema validation test suite
```

## Running Phase 3 Tests
```bash
npm run test:phase3
# or
npx tsx phase3/tests/phase3.test.ts
```
*(Live LLM API tests will automatically execute when `GEMINI_API_KEY` is present in the environment).*
