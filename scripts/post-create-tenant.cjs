const http = require('http')
const { URL } = require('url')

async function main() {
  const endpoint = process.argv[2] || 'http://localhost:3001/api/tenant/create-tenant'
  const token = process.argv[3] || process.env.TENANT_TOKEN
  const name = process.argv[4] || 'Minha Empresa'

  if (!token) {
    console.error('Usage: node post-create-tenant.cjs [endpoint] <TOKEN> [name]')
    process.exit(1)
  }

  const url = new URL(endpoint)
  const body = JSON.stringify({ name })

  const opts = {
    hostname: url.hostname,
    port: url.port || 80,
    path: url.pathname + url.search,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body),
      'Authorization': `Bearer ${token}`,
    },
  }

  const req = http.request(opts, (res) => {
    let data = ''
    res.on('data', (chunk) => (data += chunk))
    res.on('end', () => {
      console.log('HTTP', res.statusCode)
      try {
        console.log(JSON.stringify(JSON.parse(data), null, 2))
      } catch (e) {
        console.log(data)
      }
    })
  })

  req.on('error', (err) => {
    console.error('Request error', err)
  })

  req.write(body)
  req.end()
}

main()
