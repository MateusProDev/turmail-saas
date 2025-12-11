import { useState, useEffect } from 'react';
import { useSignupState, SIGNUP_PHASES } from '../utils/signupStateMachine';

const CREATION_STEPS = [
  { 
    id: 'plan', 
    label: 'Plano selecionado', 
    icon: '🎯',
    phase: 'plan_selected'
  },
  { 
    id: 'auth', 
    label: 'Autenticação', 
    icon: '🔑',
    phase: 'auth_processing'
  },
  { 
    id: 'account', 
    label: 'Criando conta', 
    icon: '🏗️',
    phase: 'creating_account'
  },
  { 
    id: 'payment', 
    label: 'Processando pagamento', 
    icon: '💳',
    phase: 'payment_processing',
    condition: (state: any) => state?.planId !== 'trial'
  },
  { 
    id: 'onboarding', 
    label: 'Configurando workspace', 
    icon: '🚀',
    phase: 'onboarding',
    condition: (state: any) => !state?.requiresPayment
  }
];

const getStepStatus = (step: any, currentState: any) => {
  if (!currentState) return 'pending';
  
  const isCurrent = currentState.phase === step.phase;
  const isComplete = CREATION_STEPS.findIndex((s: any) => s.phase === currentState.phase) > 
                    CREATION_STEPS.findIndex((s: any) => s.phase === step.phase);
  
  if (isComplete) return 'complete';
  if (isCurrent) return 'active';
  return 'pending';
};

const StepIndicator = ({ step, status, onClick }: any) => {
  const statusStyles: { [key: string]: string } = {
    pending: 'border-gray-300 text-gray-400',
    active: 'border-blue-500 text-blue-500 animate-pulse',
    complete: 'border-green-500 text-green-500'
  };
  
  return (
    <div 
      className={`step flex flex-col items-center cursor-pointer ${status === 'active' ? 'z-10' : ''}`}
      onClick={onClick}
    >
      <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2
                      border-2 ${statusStyles[status]} bg-white`}>
        {status === 'complete' ? '✓' : step.icon}
      </div>
      <div className={`text-xs text-center ${statusStyles[status].split(' ')[2]}`}>
        {step.label}
      </div>
    </div>
  );
};

const CreationProgress = () => {
  const { state, resetState } = useSignupState();
  const [visible, setVisible] = useState(false);
  
  useEffect(() => {
    // Mostrar apenas durante a criação
    setVisible(
      !!state && 
      [
        SIGNUP_PHASES.PLAN_SELECTED,
        SIGNUP_PHASES.AUTH_PROCESSING,
        SIGNUP_PHASES.CREATING_ACCOUNT,
        SIGNUP_PHASES.PAYMENT_PROCESSING
      ].includes(state.phase as string)
    );
  }, [state]);
  
  if (!visible) return null;
  
  return (
    <div className="fixed top-0 left-0 right-0 bg-white border-b shadow-md z-50">
      <div className="max-w-4xl mx-auto px-4 py-3">
        <div className="flex justify-between items-center">
          <div className="text-sm font-medium text-gray-700">
            Criando sua conta...
          </div>
          <button 
            onClick={resetState}
            className="text-xs text-gray-500 hover:text-gray-700"
          >
            Cancelar
          </button>
        </div>
        
        <div className="mt-2 relative">
          {/* Linha do progresso */}
          <div className="absolute top-5 left-0 right-0 h-0.5 bg-gray-200">
            <div 
              className="h-full bg-blue-500 transition-all duration-300"
              style={{
                width: `${Math.min(
                  (CREATION_STEPS.findIndex((s: any) => s.phase === state?.phase) / 
                   (CREATION_STEPS.length - 1)) * 100, 
                  100
                )}%`
              }}
            />
          </div>
          
          {/* Etapas */}
          <div className="flex justify-between">
            {CREATION_STEPS.map((step) => (
              <StepIndicator
                key={step.id}
                step={step}
                status={getStepStatus(step, state)}
                onClick={() => {
                  if (step.phase === state?.phase) {
                    // Mostrar detalhes da etapa atual
                    console.log('Detalhes da etapa:', step);
                  }
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreationProgress;