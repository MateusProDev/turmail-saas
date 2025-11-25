export function makeInitialUserForServer({ uid = null, email = null, stripeCustomerId = null } = {}) {
  return {
    uid: uid || null,
    email: email || '',
    displayName: '',
    photoURL: '',
    role: 'user',
    plan: 'free',
    stripeCustomerId: stripeCustomerId || '',
    billing: {},
    company: {
      name: '',
      website: '',
    },
    phone: '',
    locale: 'pt-BR',
    onboardingCompleted: false,
    metadata: {},
    createdAt: new Date(),
  }
}

export default makeInitialUserForServer
