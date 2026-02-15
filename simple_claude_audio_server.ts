import "dotenv/config";
import express from "express";
import Anthropic from "@anthropic-ai/sdk";
import {
  analyzeRawAudioSignalToolDefinition,
  validateAnalyzeRawAudioSignalToolResultEnvelope,
  validateAnalyzeRawAudioSignalToolUse,
  type AnalyzeRawAudioSignalInput,
} from "./audio_tool_validators";

const app = express();
app.use(express.json({ limit: "10mb" }));

const MOCK_MODE = process.env.MOCK_MODE === "true";

const anthropic = MOCK_MODE
  ? (null as unknown as Anthropic)
  : new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function runAudioAnalysis(input: AnalyzeRawAudioSignalInput) {
  // Replace this with your actual DSP/ML inference.
  const isLikelySilent = input.chunk_base64.length < 24;

  return {
    session_id: input.session_id,
    chunk_id: input.chunk_id,
    received_at_ms: Date.now(),
    latency_ms: 25,
    quality: {
      snr_db: isLikelySilent ? 5 : 22,
      clipping_ratio: 0.01,
      is_silence: isLikelySilent,
    },
    ...(input.analysis_mode === "emotion_tone"
      ? {
          emotion_tone: {
            valence: 0.1,
            arousal: 0.6,
            stress_prob: 0.7,
            anger_prob: 0.2,
            frustration_prob: 0.4,
          },
        }
      : {}),
    ...(input.analysis_mode === "hardware_acoustics"
      ? {
          hardware_acoustics: {
            dominant_freq_hz: 280.5,
            spectral_centroid_hz: 1100.2,
            fan_fault_prob: 0.25,
            bearing_wear_prob: 0.18,
            recommended_action: "No immediate action required.",
          },
        }
      : {}),
    ...(input.analysis_mode === "anomaly_detection"
      ? {
          anomaly_detection: {
            anomaly_score: 0.22,
            event_label: "normal_operation",
            severity: "low",
          },
        }
      : {}),
    ...(input.analysis_mode === "code_intent"
      ? {
          code_intent: {
            action: "debug",
            target_file: "simple_claude_audio_server.ts",
            intent_summary:
              "Add cleanup for session-scoped audio buffers to prevent leaks.",
            proposed_changes: [
              "Track buffers in a Map keyed by session_id.",
              "Clear and delete session buffer when final_chunk is true.",
              "Add timeout-based cleanup for abandoned sessions.",
            ],
            impact_analysis:
              "Reduces memory growth over long-lived sessions with low behavioral risk.",
          },
        }
      : {}),
    ...(input.final_chunk
      ? {
          final_summary: {
            window_ms: input.start_ms + input.duration_ms,
            overall_risk: "low",
            key_findings: ["No critical anomalies detected."],
          },
        }
      : {}),
  };
}

app.post("/analyze", async (req, res) => {
  try {
    const toolInput = req.body;

    if (MOCK_MODE) {
      // Synthetic tool_use block — same shape Claude would return
      const mockToolUseBlock = {
        type: "tool_use" as const,
        id: `mock_toolu_${Date.now()}`,
        name: "analyze_raw_audio_signal" as const,
        input: toolInput,
      };

      const validatedToolUse =
        validateAnalyzeRawAudioSignalToolUse(mockToolUseBlock);
      const analysisJson = runAudioAnalysis(validatedToolUse.input);

      const toolResultEnvelope = {
        type: "tool_result" as const,
        tool_use_id: validatedToolUse.id,
        content: [{ type: "json" as const, json: analysisJson }],
      };

      validateAnalyzeRawAudioSignalToolResultEnvelope(toolResultEnvelope);

      return res.json({
        mock: true,
        tool_use: validatedToolUse,
        tool_result_json: analysisJson,
        claude_final: [
          {
            type: "text",
            text: "[mock] Analysis complete. All validation passed.",
          },
        ],
      });
    }

    const messages: Anthropic.MessageParam[] = [
      {
        role: "user",
        content: [
          {
            type: "text",
            text:
              "Call analyze_raw_audio_signal with this exact JSON input:\n" +
              JSON.stringify(toolInput),
          },
        ],
      },
    ];

    const first = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 500,
      tools: [analyzeRawAudioSignalToolDefinition],
      tool_choice: {
        type: "tool",
        name: "analyze_raw_audio_signal",
      },
      messages,
    });

    const toolUseBlock = first.content.find((b) => b.type === "tool_use");
    if (!toolUseBlock || toolUseBlock.type !== "tool_use") {
      return res.status(400).json({
        error: "Claude did not emit tool_use",
        content: first.content,
      });
    }

    const validatedToolUse = validateAnalyzeRawAudioSignalToolUse(toolUseBlock);
    const analysisJson = runAudioAnalysis(validatedToolUse.input);

    const toolResultEnvelope = {
      type: "tool_result" as const,
      tool_use_id: validatedToolUse.id,
      content: [{ type: "json" as const, json: analysisJson }],
    };

    validateAnalyzeRawAudioSignalToolResultEnvelope(toolResultEnvelope);

    const secondMessages: Anthropic.MessageParam[] = [
      ...messages,
      { role: "assistant", content: first.content },
      { role: "user", content: [toolResultEnvelope] },
    ];

    const second = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 500,
      tools: [analyzeRawAudioSignalToolDefinition],
      messages: secondMessages,
    });

    return res.json({
      tool_use: validatedToolUse,
      tool_result_json: analysisJson,
      claude_final: second.content,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return res.status(500).json({ error: message });
  }
});

const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => {
  console.log(
    `Server running at http://localhost:${port}${MOCK_MODE ? " (MOCK MODE)" : ""}`,
  );
});
