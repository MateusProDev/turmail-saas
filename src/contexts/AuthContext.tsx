import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { User } from 'firebase/auth';

interface AuthContextType {
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true });

export function useAuth() {
  return useContext(AuthContext);
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  console.log('[AuthContext] AuthProvider initialized, loading:', loading, 'user:', !!user)

  useEffect(() => {
    console.log('[AuthContext] Setting up onAuthStateChanged listener (dynamic import)')
    let unsub: any
    let cancelled = false
    ;(async () => {
      try {
        const mod = await import('firebase/auth')
        if (cancelled) return
        const { onAuthStateChanged, getAuth } = mod
        const auth = getAuth()
        unsub = onAuthStateChanged(auth, (firebaseUser: User | null) => {
          console.log('[AuthContext] onAuthStateChanged fired - user:', !!firebaseUser, 'userId:', firebaseUser?.uid)
          setUser(firebaseUser)
          setLoading(false)
        })
      } catch (err) {
        console.warn('[AuthContext] Failed to load firebase/auth dynamically', err)
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      console.log('[AuthContext] Cleaning up auth listener')
      cancelled = true
      if (unsub) unsub()
    }
  }, []);

  console.log('[AuthContext] AuthProvider rendering - loading:', loading, 'user:', !!user)

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}
