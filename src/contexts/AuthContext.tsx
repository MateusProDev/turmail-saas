import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import type { User } from 'firebase/auth';
import { auth } from '../lib/firebase';

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
    console.log('[AuthContext] Setting up onAuthStateChanged listener')
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      console.log('[AuthContext] onAuthStateChanged fired - user:', !!firebaseUser, 'userId:', firebaseUser?.uid)
      setUser(firebaseUser);
      setLoading(false);
      console.log('[AuthContext] Auth state updated - loading set to false')
    });
    return () => {
      console.log('[AuthContext] Cleaning up auth listener')
      unsubscribe();
    }
  }, []);

  console.log('[AuthContext] AuthProvider rendering - loading:', loading, 'user:', !!user)

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}
