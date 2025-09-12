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