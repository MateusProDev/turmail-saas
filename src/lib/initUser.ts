import { serverTimestamp } from 'firebase/firestore'

export function makeInitialUserData(uid: string, email: string | null = null) {
  return {
    uid,
    email: email || '',
    displayName: '',
    photoURL: '',
    role: 'user',
    plan: 'free',
    stripeCustomerId: '',
    billing: {},
    company: {
      name: '',
      website: '',
    },
    phone: '',
    locale: 'pt-BR',
    onboardingCompleted: false,
    metadata: {},
    createdAt: serverTimestamp(),
  }
}

export default makeInitialUserData
