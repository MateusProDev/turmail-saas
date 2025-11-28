export default async function handler(req, res) {
  try {
    if (req.method === 'OPTIONS') {
      res.setHeader('Access-Control-Allow-Origin', '*')
      res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS')
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization')
      return res.status(204).end()
    }
    const url = req.url || ''
    const prefix = '/api/tenant/'
    let rel = ''
    const idx = url.indexOf(prefix)
    if (idx >= 0) rel = url.slice(idx + prefix.length)
    rel = rel.split('?')[0]
    const segments = rel.split('/').filter(Boolean)
    if (segments.length === 0) return res.status(404).json({ error: 'No tenant handler specified' })

    const modulePath = `../../server/api-handlers/tenant/${segments.join('/')}.js`
    let mod
    try {
      mod = await import(modulePath)
    } catch (e) {
      try {
        const folderModule = `../../server/api-handlers/tenant/${segments.join('/')}/index.js`
        mod = await import(folderModule)
      } catch (e2) {
        console.error('[api tenant catch-all] handler import failed for', modulePath, e)
        return res.status(404).json({ error: 'Handler not found', detail: String(e) })
      }
    }
    const fn = mod && (mod.default || mod.handler || mod)
    if (typeof fn !== 'function') return res.status(500).json({ error: 'Handler malformed' })
    return await fn(req, res)
  } catch (err) {
    console.error('[api tenant catch-all] unexpected error', err)
    try { res.status(500).json({ error: 'internal error', detail: String(err) }) } catch(_) {}
  }
}
