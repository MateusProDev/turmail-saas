import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const handler = require('./send-campaign.cjs')
export default handler
