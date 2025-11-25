import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const handler = require('./webhook-stripe.cjs')
export default handler
