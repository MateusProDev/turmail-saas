export async function createCheckoutSession(priceId: string) {
  const res = await fetch('/api/stripe-checkout', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ priceId }),
  })
  if (!res.ok) throw new Error('Failed to create checkout session')
  return res.json()
}
