export default async function handler(req, res) {
  try {
    // respond to CORS preflight at the catch-all level to cover all handlers
    if (req.method === 'OPTIONS') {
      res.setHeader('Access-Control-Allow-Origin', '*')
      res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS')
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization')
      return res.status(204).end()
    }
    const url = req.url || ''
    // find part after /api/
    const apiIndex = url.indexOf('/api/')
    let rel = apiIndex >= 0 ? url.slice(apiIndex + 5) : url.replace(/^\//, '')
    rel = rel.split('?')[0]
    const segments = rel.split('/').filter(Boolean)

    if (segments.length === 0) {
      return res.status(404).json({ error: 'No handler specified' })
    }

    // Build possible module path in server/api-handlers
    // e.g. /api/tenant/set-brevo-key -> server/api-handlers/tenant/set-brevo-key.js
    const modulePath = `../../server/api-handlers/${segments.join('/')}.js`

    let mod
    try {
      mod = await import(modulePath)
    } catch (e) {
      // try fallback to index.js in the folder
      try {
        const folderModule = `../../server/api-handlers/${segments.join('/')}/index.js`
        mod = await import(folderModule)
      } catch (e2) {
        console.error('[api catch-all] handler import failed for', modulePath, e)
        return res.status(404).json({ error: 'Handler not found', detail: String(e) })
      }
    }

    const fn = mod && (mod.default || mod.handler || mod)
    if (typeof fn !== 'function') {
      console.error('[api catch-all] exported value is not a function for', modulePath)
      return res.status(500).json({ error: 'Handler malformed' })
    }

    // delegate to the handler
    return await fn(req, res)
  } catch (err) {
    console.error('[api catch-all] unexpected error', err)
    try { res.status(500).json({ error: 'internal error', detail: String(err) }) } catch(_) {}
  }
}
