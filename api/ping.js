import handler from '../server/api-handlers/ping.js'

export default async function(req, res) {
  return handler(req, res)
}
