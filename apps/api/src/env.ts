import { z } from 'zod'

const envSchema = z.object({
  OPENAI_API_KEY: z.string().min(1, 'OPENAI_API_KEY is required'),
})

export function validateEnv() {
  const result = envSchema.safeParse(process.env)
  
  if (!result.success) {
    throw new Error(`Environment validation failed: ${result.error.message}`)
  }
  
  return result.data
}

export function getOpenAIApiKey(): string | null {
  return process.env.OPENAI_API_KEY || null
}