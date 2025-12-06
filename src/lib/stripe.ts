export async function createCheckoutSession(priceId: string) {
  const res = await fetch('/api/stripe-checkout', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ priceId }),
  })
  if (!res.ok) {
    let text = ''
    try { text = await res.text() } catch (e) { text = 'unable to read response' }
    console.error('[createCheckoutSession] server error', res.status, text)
    throw new Error('Failed to create checkout session: ' + text)
  }
  const json = await res.json()
  if (!json) {
    console.error('[createCheckoutSession] empty json response')
    throw new Error('Failed to create checkout session: empty response')
  } 
  return json
}
