import { serverTimestamp } from 'firebase/firestore'

export function makeInitialUserData(uid: string, email: string | null = null) {
  return {
    uid,
    email: email || null,
    displayName: null,
    photoURL: null,
    role: 'user',
    plan: 'free',
    stripeCustomerId: null,
    billing: {},
    company: {
      name: null,
      website: null,
    },
    phone: null,
    locale: 'pt-BR',
    onboardingCompleted: false,
    metadata: {},
    createdAt: serverTimestamp(),
  }
}

export default makeInitialUserData
