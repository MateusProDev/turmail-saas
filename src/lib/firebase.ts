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
  // Runtime validation: warn if critical env vars are missing to help debugging
  console.log('[Firebase Debug] Firebase Config:', {
    apiKey: firebaseConfig.apiKey ? '✅ Configurado' : '❌ FALTANDO',
    authDomain: firebaseConfig.authDomain || '❌ FALTANDO',
    projectId: firebaseConfig.projectId || '❌ FALTANDO',
    storageBucket: firebaseConfig.storageBucket || '❌ FALTANDO',
    messagingSenderId: firebaseConfig.messagingSenderId || '❌ FALTANDO',
    appId: firebaseConfig.appId ? '✅ Configurado' : '❌ FALTANDO',
    measurementId: firebaseConfig.measurementId || '❌ FALTANDO',
  })
  
  const missing: string[] = []
  if (!firebaseConfig.apiKey) missing.push('VITE_FIREBASE_API_KEY')
  if (!firebaseConfig.projectId) missing.push('VITE_FIREBASE_PROJECT_ID')
  if (!firebaseConfig.appId) missing.push('VITE_FIREBASE_APP_ID')
  if (missing.length > 0) {
    // Keep this as a non-breaking warning so dev builds continue to run
    // but surface clearly which envs need setting.
    // eslint-disable-next-line no-console
    console.error('❌ [Firebase] VARIÁVEIS FALTANDO:', missing.join(', '))
    console.error('🔧 Verifique seu .env ou Vercel Environment Variables')
  } else {
    console.log('✅ [Firebase] Todas as variáveis configuradas corretamente')
  }

  initializeApp(firebaseConfig)
  console.log('✅ [Firebase] App inicializado com sucesso')
}

export const auth = getAuth()
export const db = getFirestore()
