// server/api-handlers/ai-analyst-local.js
// Active AI handler has been disabled and archived. This is a stub that returns
// HTTP 410 Gone to indicate the AI feature is removed from the active codebase.
import express from 'express'

const router = express.Router()

router.all('/', (req, res) => {
  res.status(410).json({ error: 'AI feature disabled and archived. See server/api-handlers_disabled for history.' })
})

export default router
