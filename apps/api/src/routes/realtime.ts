import { Router, Request, Response } from 'express'
import { getOpenAIApiKey } from '../env.js'

export const realtimeRouter = Router()

realtimeRouter.post('/token', async (req: Request, res: Response) => {
  const apiKey = getOpenAIApiKey()
  
  if (!apiKey) {
    return res.status(401).json({ error: 'OPENAI_API_KEY not configured' })
  }
  
  try {
    const response = await fetch('https://api.openai.com/v1/realtime/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    })
    
    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`)
    }
    
    const data = await response.json()
    
    if (!data.client_secret) {
      throw new Error('No client_secret in OpenAI response')
    }
    
    res.json({ token: data.client_secret })
  } catch (error) {
    console.error('Error creating realtime session:', error)
    res.status(500).json({ error: 'Failed to create realtime session' })
  }
})