import handler from '../server/api-handlers/create-campaign.js'

export default async function (req, res) {
  try {
    return await handler(req, res)
  } catch (err) {
    console.error('Error in api/create-campaign:', err)
    // Mirror other api wrappers: return 500 on unexpected errors
    res.status(500).json({ error: 'internal server error' })
  }
}
