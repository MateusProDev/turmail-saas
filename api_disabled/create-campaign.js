// Archived wrapper moved from `api/create-campaign.js` on 2025-12-09
// Active routing is handled by `api/[...slug].js` which dynamically imports
// handlers from `server/api-handlers/*`. Keeping this file for history.

import handler from '../server/api-handlers/create-campaign.js'

export default async function (req, res) {
  try {
    return await handler(req, res)
  } catch (err) {
    console.error('Error in archived api/create-campaign:', err)
    res.status(500).json({ error: 'internal server error (archived wrapper)' })
  }
}
