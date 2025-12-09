import { ReactNode, useEffect, useState } from 'react'
import { useAuthState } from 'react-firebase-hooks/auth'
import { auth, db } from '../lib/firebase'
import { collection, query, where, onSnapshot } from 'firebase/firestore'
import { useLocation, useNavigate } from 'react-router-dom'

type Props = { children: ReactNode }

const ALLOWED_PATHS = ['/', '/login', '/plans', '/terms', '/privacy', '/about', '/demo', '/success']

export default function SubscriptionGuard({ children }: Props) {
  const [user] = useAuthState(auth)
  const [subscription, setSubscription] = useState<any>(null)
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    if (!user) {
      setSubscription(null)
      return
    }

    const subsRef = collection(db, 'subscriptions')
    const qByUid = query(subsRef, where('ownerUid', '==', user.uid))
    let unsubUid: any = null
    let unsubEmail: any = null

    const handleSnap = (snap: any) => {
      if (!snap.empty) {
        const doc = snap.docs[0]
        setSubscription({ id: doc.id, ...doc.data() })
        return true
      }
      return false
    }

    unsubUid = onSnapshot(qByUid, (snap) => {
      const found = handleSnap(snap)
      if (!found && user.email) {
        if (unsubEmail) unsubEmail()
        const qByEmail = query(subsRef, where('email', '==', user.email))
        unsubEmail = onSnapshot(qByEmail, (snap2) => {
          if (!snap2.empty) {
            const doc = snap2.docs[0]
            setSubscription({ id: doc.id, ...doc.data() })
          } else {
            setSubscription(null)
          }
        }, (err) => console.error('subscription-by-email snapshot error', err))
      }
    }, (err) => console.error('subscription snapshot error', err))

    return () => {
      if (unsubUid) unsubUid()
      if (unsubEmail) unsubEmail()
    }
  }, [user])

  // compute trial expired
  const trialExpired = (() => {
    try {
      if (!subscription || !subscription.trialEndsAt) return false
      const t = subscription.trialEndsAt
      const dt = typeof t.toDate === 'function' ? t.toDate() : (t.seconds ? new Date(t.seconds * 1000) : new Date(t))
      return dt.getTime() <= Date.now()
    } catch (e) {
      return false
    }
  })()

  useEffect(() => {
    // If trial expired and still on trial plan, block access to most routes
    if (user && subscription && subscription.planId === 'trial' && trialExpired) {
      const path = location.pathname
      if (!ALLOWED_PATHS.includes(path)) {
        // persist flag so Plans can show contextual message
        try { localStorage.setItem('requiresPlan', '1') } catch (e) { }
        navigate('/plans', { replace: true })
      }
    }
  }, [user, subscription, trialExpired, location.pathname, navigate])

  return <>{children}</>
}
