import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const handler = require('./get-session.cjs')
export default handler
