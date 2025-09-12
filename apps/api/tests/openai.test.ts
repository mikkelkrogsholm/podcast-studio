import { describe, it, expect } from 'vitest'

// @live - Only runs when OPENAI_API_KEY is present
describe('OpenAI Connection Smoke Test', () => {
  it('should successfully connect to OpenAI /models endpoint', async () => {
    const apiKey = process.env.OPENAI_API_KEY
    
    // Skip if no API key is present
    if (!apiKey) {
      console.log('Skipping OpenAI test - no OPENAI_API_KEY found')
      return
    }

    // This test should fail initially because we haven't set up the OpenAI client
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    })

    expect(response.status).toBe(200)
    
    const data = await response.json()
    expect(data).toHaveProperty('data')
    expect(Array.isArray(data.data)).toBe(true)
    expect(data.data.length).toBeGreaterThan(0)
    
    // Verify we can find GPT models (specifically looking for realtime models)
    const models = data.data.map((model: any) => model.id)
    expect(models.some((id: string) => id.includes('gpt'))).toBe(true)
  })
})