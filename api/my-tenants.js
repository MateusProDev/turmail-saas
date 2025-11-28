import handler from '../server/api-handlers/my-tenants.js'

export default async function(req, res) {
  return handler(req, res)
}
