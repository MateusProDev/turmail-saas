export async function createCheckoutSession(priceId: string, planId?: string | null, email?: string | null) {
  // Obter token de autenticação do Firebase
  const { auth } = await import('./firebase')
  const user = auth.currentUser
  
  if (!user) {
    throw new Error('User must be authenticated to create checkout session')
  }

  const token = await user.getIdToken()

  const body: any = { priceId }
  if (planId) body.planId = planId
  if (email) body.email = email

  const res = await fetch('/api/stripe-checkout', {
    method: 'POST',
    headers: { 
      'content-type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(body),
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
