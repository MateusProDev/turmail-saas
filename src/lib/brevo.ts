/**
 * Client helper that proxies requests to the server endpoint which holds the Brevo API key.
 * Do NOT store or use your Brevo API key in client code. Use the server endpoint `/api/send-campaign`.
 */
export async function sendCampaign(body: any) {
  const resp = await fetch('/api/send-campaign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!resp.ok) throw new Error(`Send failed: ${resp.status}`)
  return resp.json()
}

export async function testBrevo() {
  const resp = await fetch('/api/send-campaign', { method: 'OPTIONS' })
  return resp
}
