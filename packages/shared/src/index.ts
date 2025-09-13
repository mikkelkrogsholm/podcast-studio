import { z } from 'zod';

export const HealthResponseSchema = z.object({
  ok: z.boolean(),
});

export type HealthResponse = z.infer<typeof HealthResponseSchema>;

// Session schemas
export const CreateSessionRequestSchema = z.object({
  title: z.string(),
});

export const CreateSessionResponseSchema = z.object({
  sessionId: z.string(),
  mikkelAudioFile: z.string(),
});

export type CreateSessionRequest = z.infer<typeof CreateSessionRequestSchema>;
export type CreateSessionResponse = z.infer<typeof CreateSessionResponseSchema>;

// Audio file info schemas
export const AudioFileInfoResponseSchema = z.object({
  size: z.number(),
  format: z.string(),
  duration: z.number().optional(),
});

export type AudioFileInfoResponse = z.infer<typeof AudioFileInfoResponseSchema>;

// Message schemas for Step 06: Transcript
export const CreateMessageRequestSchema = z.object({
  speaker: z.enum(['mikkel', 'freja']),
  text: z.string().min(1),
  ts_ms: z.number().min(0),
  raw_json: z.record(z.any()), // Store the original OpenAI event data
});

export const MessageResponseSchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  speaker: z.enum(['mikkel', 'freja']),
  text: z.string(),
  ts_ms: z.number(),
  raw_json: z.record(z.any()),
  createdAt: z.number(),
});

export const GetMessagesResponseSchema = z.object({
  messages: z.array(MessageResponseSchema),
});

export type CreateMessageRequest = z.infer<typeof CreateMessageRequestSchema>;
export type MessageResponse = z.infer<typeof MessageResponseSchema>;
export type GetMessagesResponse = z.infer<typeof GetMessagesResponseSchema>;

// Settings schemas for Step 07: Playground Controls
export const SettingsSchema = z.object({
  model: z.literal('gpt-4o-realtime-preview'),
  voice: z.enum(['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer']),
  temperature: z.number().min(0.0).max(1.0),
  top_p: z.number().min(0.0).max(1.0),
  language: z.enum(['da-DK', 'en-US']),
  silence_ms: z.number().positive(),
});

export type Settings = z.infer<typeof SettingsSchema>;

// Updated session request schema to include settings
export const CreateSessionWithSettingsRequestSchema = z.object({
  title: z.string(),
  settings: SettingsSchema.optional(),
});

export type CreateSessionWithSettingsRequest = z.infer<typeof CreateSessionWithSettingsRequestSchema>;