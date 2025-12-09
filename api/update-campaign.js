import handler from '../server/api-handlers/update-campaign.js'

export default async function (req, res) {
  try {
    return await handler(req, res)
  } catch (err) {
    console.error('Error in api/update-campaign:', err)
    res.status(500).json({ error: 'internal server error' })
  }
}
