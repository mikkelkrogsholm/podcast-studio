import express from 'express'
import cors from 'cors'

export const app = express()
export const PORT = 4201

app.use(cors())
app.use(express.json())

// Get OpenAI API key from environment
const OPENAI_API_KEY = process.env.OPENAI_API_KEY

// Health endpoint
app.get('/health', (req, res) => {
  res.json({ ok: true })
})

// Token endpoint for OpenAI Realtime API
app.post('/api/realtime/token', async (req, res) => {
  if (!OPENAI_API_KEY) {
    return res.status(401).json({ 
      error: 'OPENAI_API_KEY environment variable is required' 
    })
  }

  try {
    const response = await fetch('https://api.openai.com/v1/realtime/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-realtime-preview-2024-12-17',
        voice: 'alloy'
      })
    })

    if (!response.ok) {
      console.error('OpenAI API error:', response.status, await response.text())
      return res.status(response.status).json({ error: 'Failed to create session' })
    }

    const data = await response.json()
    res.json(data)
  } catch (error) {
    console.error('Token endpoint error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Only start server if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  app.listen(PORT, () => {
    console.log(`API server running on http://localhost:${PORT}`)
  })
}