import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

const audioFormatSchema = z.enum(["pcm16le", "float32le", "wav"]);
const analysisModeSchema = z.enum([
  "emotion_tone",
  "hardware_acoustics",
  "anomaly_detection",
  "code_intent",
]);
const severitySchema = z.enum(["low", "medium", "high", "critical"]);
const riskSchema = z.enum(["low", "medium", "high", "critical"]);

export const analyzeRawAudioSignalInputSchema = z
  .object({
    session_id: z.string().min(1),
    chunk_id: z.number().int().min(0),
    chunk_base64: z.string().min(1),
    format: audioFormatSchema,
    sample_rate_hz: z.number().int().min(8000).max(96000),
    channels: z.number().int().min(1).max(2),
    start_ms: z.number().int().min(0),
    duration_ms: z.number().int().min(10).max(5000),
    analysis_mode: analysisModeSchema,
    context: z.string().optional(),
    final_chunk: z.boolean().default(false),
  })
  .strict();

export const analyzeRawAudioSignalToolUseSchema = z
  .object({
    type: z.literal("tool_use"),
    id: z.string().min(1),
    name: z.literal("analyze_raw_audio_signal"),
    input: analyzeRawAudioSignalInputSchema,
  })
  .strict();

const qualitySchema = z
  .object({
    snr_db: z.number(),
    clipping_ratio: z.number(),
    is_silence: z.boolean(),
  })
  .strict();

const emotionToneSchema = z
  .object({
    valence: z.number().min(-1).max(1),
    arousal: z.number().min(0).max(1),
    stress_prob: z.number().min(0).max(1),
    anger_prob: z.number().min(0).max(1),
    frustration_prob: z.number().min(0).max(1),
  })
  .strict();

const hardwareAcousticsSchema = z
  .object({
    dominant_freq_hz: z.number(),
    spectral_centroid_hz: z.number(),
    fan_fault_prob: z.number().min(0).max(1),
    bearing_wear_prob: z.number().min(0).max(1),
    recommended_action: z.string(),
  })
  .strict();

const anomalyDetectionSchema = z
  .object({
    anomaly_score: z.number().min(0).max(1),
    event_label: z.string(),
    severity: severitySchema,
  })
  .strict();

const codeIntentSchema = z
  .object({
    action: z.enum(["refactor", "create_feature", "debug", "document"]),
    target_file: z.string(),
    intent_summary: z.string(),
    proposed_changes: z.array(z.string()),
    impact_analysis: z.string(),
  })
  .strict();

const alertSchema = z
  .object({
    code: z.string(),
    message: z.string(),
    threshold: z.number().optional(),
    observed: z.number().optional(),
  })
  .strict();

const finalSummarySchema = z
  .object({
    window_ms: z.number().int(),
    overall_risk: riskSchema,
    key_findings: z.array(z.string()),
  })
  .strict();

export const analyzeRawAudioSignalResultSchema = z
  .object({
    session_id: z.string(),
    chunk_id: z.number().int(),
    received_at_ms: z.number().int(),
    latency_ms: z.number().int(),
    quality: qualitySchema,
    emotion_tone: emotionToneSchema.optional(),
    hardware_acoustics: hardwareAcousticsSchema.optional(),
    anomaly_detection: anomalyDetectionSchema.optional(),
    code_intent: codeIntentSchema.optional(),
    alerts: z.array(alertSchema).optional(),
    final_summary: finalSummarySchema.optional(),
  })
  .strict();

const toolResultContentItemSchema = z
  .object({
    type: z.literal("json"),
    json: analyzeRawAudioSignalResultSchema,
  })
  .strict();

export const analyzeRawAudioSignalToolResultEnvelopeSchema = z
  .object({
    type: z.literal("tool_result"),
    tool_use_id: z.string().min(1),
    content: z.array(toolResultContentItemSchema).min(1),
  })
  .strict();

export type AnalyzeRawAudioSignalInput = z.infer<
  typeof analyzeRawAudioSignalInputSchema
>;
export type AnalyzeRawAudioSignalResult = z.infer<
  typeof analyzeRawAudioSignalResultSchema
>;
export type AnalyzeRawAudioSignalToolUse = z.infer<
  typeof analyzeRawAudioSignalToolUseSchema
>;
export type AnalyzeRawAudioSignalToolResultEnvelope = z.infer<
  typeof analyzeRawAudioSignalToolResultEnvelopeSchema
>;

export function validateAnalyzeRawAudioSignalInput(
  value: unknown,
): AnalyzeRawAudioSignalInput {
  return analyzeRawAudioSignalInputSchema.parse(value);
}

export function validateAnalyzeRawAudioSignalResult(
  value: unknown,
): AnalyzeRawAudioSignalResult {
  return analyzeRawAudioSignalResultSchema.parse(value);
}

export function validateAnalyzeRawAudioSignalToolUse(
  value: unknown,
): AnalyzeRawAudioSignalToolUse {
  return analyzeRawAudioSignalToolUseSchema.parse(value);
}

export function validateAnalyzeRawAudioSignalToolResultEnvelope(
  value: unknown,
): AnalyzeRawAudioSignalToolResultEnvelope {
  return analyzeRawAudioSignalToolResultEnvelopeSchema.parse(value);
}

export const analyzeRawAudioSignalToolDefinition = {
  name: "analyze_raw_audio_signal",
  description:
    "Low-latency raw audio analysis for emotional tone, hardware acoustics, anomaly detection, and code intent without requiring transcription.",
  input_schema: zodToJsonSchema(analyzeRawAudioSignalInputSchema, {
    name: "AnalyzeRawAudioSignalInput",
  }),
} as const;

export const analyzeRawAudioSignalResultJsonSchema = zodToJsonSchema(
  analyzeRawAudioSignalResultSchema,
  {
    name: "AnalyzeRawAudioSignalResult",
  },
);

export const analyzeRawAudioSignalToolUseJsonSchema = zodToJsonSchema(
  analyzeRawAudioSignalToolUseSchema,
  {
    name: "AnalyzeRawAudioSignalToolUse",
  },
);

export const analyzeRawAudioSignalToolResultEnvelopeJsonSchema =
  zodToJsonSchema(analyzeRawAudioSignalToolResultEnvelopeSchema, {
    name: "AnalyzeRawAudioSignalToolResultEnvelope",
  });
