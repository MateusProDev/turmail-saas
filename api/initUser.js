export function makeInitialUserForServer({ uid = null, email = null, stripeCustomerId = null } = {}) {
  return {
    uid: uid || null,
    email: email || null,
    displayName: null,
    photoURL: null,
    role: 'user',
    plan: 'free',
    stripeCustomerId: stripeCustomerId || null,
    billing: {},
    company: {
      name: null,
      website: null,
    },
    phone: null,
    locale: 'pt-BR',
    onboardingCompleted: false,
    metadata: {},
    createdAt: new Date(),
  }
}

export default makeInitialUserForServer
