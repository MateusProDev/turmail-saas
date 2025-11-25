import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const handler = require('./stripe-checkout.cjs')
export default handler
