import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const mod = require('./firebaseAdmin.cjs')
export const admin = mod.admin
export const db = mod.db
