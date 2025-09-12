import express from 'express'
import { realtimeRouter } from './routes/realtime.js'

export const app = express()
export const PORT = 4201

app.use(express.json())

// Health endpoint
app.get('/health', (req, res) => {
  res.json({ ok: true })
})

// API routes
app.use('/api/realtime', realtimeRouter)

// Only start server if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  app.listen(PORT, () => {
    console.log(`API server running on http://localhost:${PORT}`)
  })
}