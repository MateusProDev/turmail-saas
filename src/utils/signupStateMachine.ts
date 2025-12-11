import { useState, useEffect, useRef, useCallback } from 'react';

const SIGNUP_STATE_KEY = 'turmail_signup_state';
const STATE_EXPIRATION = 24 * 60 * 60 * 1000; // 24 horas

// Definição da máquina de estados
const STATE_MACHINE: { [key: string]: string[] } = {
  'idle': ['plan_selected'],
  'plan_selected': ['auth_processing', 'idle'],
  'auth_processing': ['creating_account', 'idle'],
  'creating_account': ['payment_processing', 'onboarding', 'idle'],
  'payment_processing': ['onboarding', 'idle'],
  'onboarding': ['complete', 'idle'],
  'complete': []
};

// Estados possíveis
export const SIGNUP_PHASES = {
  IDLE: 'idle',
  PLAN_SELECTED: 'plan_selected',
  AUTH_PROCESSING: 'auth_processing',
  CREATING_ACCOUNT: 'creating_account',
  PAYMENT_PROCESSING: 'payment_processing',
  ONBOARDING: 'onboarding',
  COMPLETE: 'complete'
};

interface SignupState {
  phase: string;
  timestamp: number;
  [key: string]: any;
}

export class SignupStateManager {
  private state: SignupState | null = null;

  constructor() {
    this.loadState();
  }
  
  loadState() {
    try {
      const stateStr = localStorage.getItem(SIGNUP_STATE_KEY);
      if (!stateStr) return this.resetState();
      
      const state = JSON.parse(stateStr);
      
      // Verificar expiração
      if (Date.now() > state.timestamp + STATE_EXPIRATION) {
        this.resetState();
        return;
      }
      
      // Validar transição
      if (this.isValidTransition(state.phase)) {
        this.state = state;
      } else {
        this.resetState();
      }
    } catch (e) {
      this.resetState();
    }
  }
  
  isValidTransition(targetPhase: string): boolean {
    if (!this.state) return true;
    return STATE_MACHINE[this.state.phase as keyof typeof STATE_MACHINE]?.includes(targetPhase) || false;
  }
  
  setState(phase: string, data: any = {}): SignupState {
    if (!STATE_MACHINE[phase as keyof typeof STATE_MACHINE]) {
      throw new Error(`Fase inválida: ${phase}`);
    }
    
    if (this.state && !this.isValidTransition(phase)) {
      throw new Error(`Transição inválida: ${this.state.phase} → ${phase}`);
    }
    
    this.state = {
      phase,
      timestamp: Date.now(),
      ...data
    };
    
    localStorage.setItem(SIGNUP_STATE_KEY, JSON.stringify(this.state));
    return this.state!;
  }
  
  getState(): SignupState | null {
    return this.state || null;
  }
  
  resetState() {
    this.state = null;
    localStorage.removeItem(SIGNUP_STATE_KEY);
    return null;
  }
  
  isExpired() {
    return this.state && Date.now() > this.state.timestamp + STATE_EXPIRATION;
  }
  
  cleanupExpired() {
    if (this.isExpired()) {
      this.resetState();
      return true;
    }
    return false;
  }
}

// Hook para uso no React
export const useSignupState = () => {
  const [state, setState] = useState<SignupState | null>(null);
  const managerRef = useRef(new SignupStateManager());
  
  useEffect(() => {
    managerRef.current.loadState();
    setState(managerRef.current.getState());
    
    const handler = () => managerRef.current.loadState();
    window.addEventListener('storage', handler);
    
    return () => window.removeEventListener('storage', handler);
  }, []);
  
  const updateState = useCallback((phase: string, data: any) => {
    const newState = managerRef.current.setState(phase, data);
    setState(newState);
    return newState;
  }, []);
  
  const resetState = useCallback(() => {
    managerRef.current.resetState();
    setState(null);
  }, []);
  
  return {
    state,
    updateState,
    resetState,
    isComplete: state?.phase === SIGNUP_PHASES.COMPLETE,
    isCreatingAccount: [
      SIGNUP_PHASES.AUTH_PROCESSING,
      SIGNUP_PHASES.CREATING_ACCOUNT
    ].includes(state?.phase as string)
  };
};