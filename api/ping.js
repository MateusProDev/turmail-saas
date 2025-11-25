export default function handler(req, res) {
  // simple health endpoint used by the frontend to verify API availability
  if (req.method !== 'GET' && req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  return res.status(200).json({ ok: true, time: Date.now() })
}
