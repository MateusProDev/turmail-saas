import { initializeApp, getApps } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  // Optional: Measurement ID for Analytics (include if you use Analytics)
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
}

if (!getApps().length) {
  // Runtime validation: warn if critical env vars are missing
  const missing: string[] = []
  if (!firebaseConfig.apiKey) missing.push('VITE_FIREBASE_API_KEY')
  if (!firebaseConfig.projectId) missing.push('VITE_FIREBASE_PROJECT_ID')
  if (!firebaseConfig.appId) missing.push('VITE_FIREBASE_APP_ID')
  if (missing.length > 0) {
    console.warn('[Firebase] Missing environment variables:', missing.join(', '))
  }

  initializeApp(firebaseConfig)
}

export const auth = getAuth()
export const db = getFirestore()
