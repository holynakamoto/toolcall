# toolcall

![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-000000?logo=express&logoColor=white)
![Zod](https://img.shields.io/badge/Zod-3E67B1?logo=zod&logoColor=white)
![Claude API](https://img.shields.io/badge/Claude_API-191919?logo=anthropic&logoColor=white)

An Express server that demonstrates Claude's tool-use API with strict Zod validation. It exposes a single endpoint that orchestrates a two-turn conversation with Claude to analyze raw audio signals, validating every message boundary with Zod schemas.

## How the tool call works

The server defines one tool: `analyze_raw_audio_signal`. A single `POST /analyze` request triggers a two-turn Claude conversation:

```
Client                        Server                        Claude API
  |                             |                               |
  |  POST /analyze  {input}     |                               |
  |---------------------------->|                               |
  |                             |  Turn 1: "call the tool       |
  |                             |  with this input"             |
  |                             |  tool_choice: forced          |
  |                             |------------------------------>|
  |                             |                               |
  |                             |  tool_use block               |
  |                             |<------------------------------|
  |                             |                               |
  |                             |  Validate tool_use (Zod)      |
  |                             |  Run analysis locally         |
  |                             |  Validate result envelope     |
  |                             |                               |
  |                             |  Turn 2: pass tool_result     |
  |                             |  back to Claude               |
  |                             |------------------------------>|
  |                             |                               |
  |                             |  Final text response          |
  |                             |<------------------------------|
  |                             |                               |
  |  { tool_use,                |                               |
  |    tool_result_json,        |                               |
  |    claude_final }           |                               |
  |<----------------------------|                               |
```

### Turn 1 -- force the tool call

The server sends the client's JSON payload to Claude with `tool_choice: { type: "tool", name: "analyze_raw_audio_signal" }`, forcing Claude to emit a `tool_use` content block. The block is validated against `analyzeRawAudioSignalToolUseSchema` (Zod strict mode) before anything else happens.

### Local execution

The validated input is passed to `runAudioAnalysis()`, which runs locally on the server (no round-trip). The result is wrapped in a `tool_result` envelope and validated against `analyzeRawAudioSignalToolResultEnvelopeSchema`.

### Turn 2 -- Claude interprets the result

The full conversation (user message + assistant tool_use + user tool_result) is sent back to Claude. Claude reads the structured analysis output and responds with a natural-language summary.

### Response

The endpoint returns all three pieces:

```json
{
  "tool_use":          { ... },  // validated tool invocation
  "tool_result_json":  { ... },  // analysis output
  "claude_final":      [ ... ]   // Claude's text response
}
```

## Tool schema

The tool accepts raw audio chunks and returns mode-specific analysis:

| Field | Type | Description |
|---|---|---|
| `session_id` | `string` | Session identifier (min 1 char) |
| `chunk_id` | `int >= 0` | Sequential chunk number |
| `chunk_base64` | `string` | Base64-encoded audio data |
| `format` | `"pcm16le" \| "float32le" \| "wav"` | Audio encoding |
| `sample_rate_hz` | `int 8000-96000` | Sample rate |
| `channels` | `int 1-2` | Mono or stereo |
| `start_ms` | `int >= 0` | Chunk start time |
| `duration_ms` | `int 10-5000` | Chunk duration |
| `analysis_mode` | `"emotion_tone" \| "hardware_acoustics" \| "anomaly_detection" \| "code_intent"` | What to analyze |
| `context` | `string?` | Optional freeform context |
| `final_chunk` | `boolean` | Triggers `final_summary` in the result |

All schemas use Zod `.strict()` -- extra fields are rejected.

## Setup

```bash
npm install
```

Create a `.env` file (or export the variable):

```
ANTHROPIC_API_KEY=sk-ant-...
```

Start the server:

```bash
npx tsx simple_claude_audio_server.ts
```

## Mock mode

Set `MOCK_MODE=true` to test the entire HTTP flow without making Claude API calls:

```bash
MOCK_MODE=true npx tsx simple_claude_audio_server.ts
```

This skips both `anthropic.messages.create()` calls but still runs all Zod validation and `runAudioAnalysis()`. The response includes `"mock": true` so your client can distinguish mock from live responses.

### Example request

```bash
curl http://localhost:3000/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": "test-001",
    "chunk_id": 0,
    "chunk_base64": "SGVsbG8gV29ybGQgYXVkaW8gZGF0YSBzYW1wbGU=",
    "format": "pcm16le",
    "sample_rate_hz": 16000,
    "channels": 1,
    "start_ms": 0,
    "duration_ms": 500,
    "analysis_mode": "emotion_tone",
    "final_chunk": false
  }'
```

## Project structure

```
simple_claude_audio_server.ts   Express server, /analyze endpoint, mock mode
audio_tool_validators.ts        Zod schemas, types, validation functions, JSON schema exports
```
