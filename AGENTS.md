# AGENTS.md

This file provides guidance to agents (i.e., ADAL) when working with code in this repository.

## Quick Reference

```bash
# Start server (live mode - requires ANTHROPIC_API_KEY)
npx tsx simple_claude_audio_server.ts

# Start server (mock mode - no API calls)
MOCK_MODE=true npx tsx simple_claude_audio_server.ts

# Test endpoint
curl http://localhost:3000/analyze \
  -H "Content-Type: application/json" \
  -d '{"session_id":"test","chunk_id":0,"chunk_base64":"SGVsbG8=","format":"pcm16le","sample_rate_hz":16000,"channels":1,"start_ms":0,"duration_ms":500,"analysis_mode":"emotion_tone","final_chunk":false}'
```

**Gotchas:**
- No test suite configured (`npm test` exits with error)
- Uses `tsx` for TypeScript execution (no build step needed)
- `.env` must contain `ANTHROPIC_API_KEY` for live mode
- Server runs on port 3000 by default (override with `PORT` env var)

## Architecture

### Two-Turn Claude Conversation Flow

```
POST /analyze → Turn 1 (force tool_use) → Local analysis → Turn 2 (interpret result) → Response
```

1. **Turn 1**: Server sends client payload to Claude with `tool_choice: forced`, making Claude emit a `tool_use` block
2. **Local execution**: `runAudioAnalysis()` processes the validated input (no API round-trip)
3. **Turn 2**: Server sends tool result back to Claude for natural-language summary

### File Responsibilities

| File | Purpose |
|------|---------|
| `simple_claude_audio_server.ts` | Express server, `/analyze` endpoint, mock mode logic, `runAudioAnalysis()` |
| `audio_tool_validators.ts` | All Zod schemas, TypeScript types, validation functions, JSON schema exports |

### Validation Chain

All schemas use Zod `.strict()` — extra fields are rejected:

1. `analyzeRawAudioSignalToolUseSchema` — validates Claude's tool_use block
2. `analyzeRawAudioSignalResultSchema` — validates local analysis output
3. `analyzeRawAudioSignalToolResultEnvelopeSchema` — validates the tool_result envelope sent back to Claude

### Analysis Modes

The `analysis_mode` field determines which result object is populated:

- `emotion_tone` → `emotion_tone` object (valence, arousal, stress/anger/frustration probs)
- `hardware_acoustics` → `hardware_acoustics` object (frequencies, fault probs)
- `anomaly_detection` → `anomaly_detection` object (score, label, severity)
- `code_intent` → `code_intent` object (action, target_file, proposed_changes)

Setting `final_chunk: true` adds a `final_summary` object regardless of mode.

## Entry Points

- **Server**: `simple_claude_audio_server.ts` line 1 (Express app setup)
- **Tool definition**: `audio_tool_validators.ts` → `analyzeRawAudioSignalToolDefinition` (exported for Claude API)
- **Analysis logic**: `simple_claude_audio_server.ts` → `runAudioAnalysis()` function (mock DSP/ML)

## Config Files

- `.env` — `ANTHROPIC_API_KEY` (required for live mode), `PORT` (optional), `MOCK_MODE` (optional)
- `.gitignore` — only excludes `node_modules/`

## Key Types (from audio_tool_validators.ts)

```typescript
AnalyzeRawAudioSignalInput    // Tool input schema
AnalyzeRawAudioSignalResult   // Analysis output schema
AnalyzeRawAudioSignalToolUse  // Claude's tool_use block
AnalyzeRawAudioSignalToolResultEnvelope // tool_result sent back to Claude
```
