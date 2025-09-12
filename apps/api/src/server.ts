import express from 'express'

export const app = express()
export const PORT = 3001

app.use(express.json())

// Health endpoint
app.get('/health', (req, res) => {
  res.json({ ok: true })
})

// Only start server if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  app.listen(PORT, () => {
    console.log(`API server running on http://localhost:${PORT}`)
  })
}