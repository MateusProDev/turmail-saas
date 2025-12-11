import { auth, db } from './firebase';
import { 
  doc, 
  getDoc, 
  deleteDoc,
  collection,
  query,
  where,
  getDocs
} from 'firebase/firestore';

export const handleAccountCreationError = async (uid: string, error: any) => {
  console.error('[ROLLBACK] Iniciando processo de limpeza', { uid, error: error.message });
  
  try {
    const results: any = {
      userId: uid,
      error: error.message,
      steps: [],
      success: false
    };
    
    // 1. Verificar existência do usuário no Auth
    try {
      const userDoc = await getDoc(doc(db, 'users', uid));
      results.userExists = userDoc.exists();
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        
        // 2. Limpar tenant se existir
        if (userData.defaultTenantId) {
          results.steps.push({
            name: 'tenant',
            action: async () => {
              await deleteDoc(doc(db, 'tenants', userData.defaultTenantId));
              return { success: true };
            }
          });
        }
        
        // 3. Limpar subscription se existir
        const subscriptionsQuery = query(
          collection(db, 'subscriptions'),
          where('uid', '==', uid)
        );
        
        const subscriptionsSnapshot = await getDocs(subscriptionsQuery);
        if (!subscriptionsSnapshot.empty) {
          results.steps.push({
            name: 'subscriptions',
            action: async () => {
              const deletePromises = subscriptionsSnapshot.docs.map(
                (doc) => deleteDoc(doc.ref)
              );
              await Promise.all(deletePromises);
              return { success: true, count: deletePromises.length };
            }
          });
        }
      }
      
      // 4. Limpar usuário no Firestore
      results.steps.push({
        name: 'user',
        action: async () => {
          await deleteDoc(doc(db, 'users', uid));
          return { success: true };
        }
      });
      
      // 5. Limpar usuário no Auth (se for novo)
      results.steps.push({
        name: 'auth',
        action: async () => {
          const currentUser = auth.currentUser;
          if (currentUser && currentUser.uid === uid) {
            await currentUser.delete();
            return { success: true };
          }
          return { success: false, reason: 'not_current_user' };
        }
      });
      
      // Executar limpeza em ordem reversa
      for (const step of results.steps.reverse()) {
        try {
          const result = await step.action();
          results.steps.push({
            step: step.name,
            status: 'success',
            data: result
          });
        } catch (stepError: any) {
          console.error(`[ROLLBACK] Falha ao limpar ${step.name}`, stepError);
          results.steps.push({
            step: step.name,
            status: 'error',
            error: stepError.message
          });
        }
      }
      
      results.success = results.steps.every((s: any) => s.status === 'success');
      return results;
      
    } catch (verificationError: any) {
      console.error('[ROLLBACK] Erro na verificação inicial', verificationError);
      results.error = verificationError.message;
      return results;
    }
  } catch (overallError: any) {
    console.error('[ROLLBACK] Erro crítico no processo', overallError);
    return {
      userId: uid,
      error: overallError.message,
      steps: [],
      success: false
    };
  } finally {
    // Registrar no analytics
    const finalResults = {
      userId: uid,
      error: error.message,
      success: false,
      steps: []
    };
    logRollbackEvent(finalResults);
  }
};

// Função auxiliar para mensagens de erro
export const getAuthErrorMessage = (error: any) => {
  const messages: { [key: string]: string } = {
    'auth/email-already-in-use': 'Este e-mail já está em uso. Tente fazer login.',
    'auth/weak-password': 'A senha deve ter pelo menos 6 caracteres.',
    'auth/invalid-email': 'O e-mail fornecido é inválido.',
    'auth/user-disabled': 'Esta conta foi desativada.',
    'ERR_USER_EXISTS': 'Você já possui uma conta. Tente fazer login.',
    'ERR_ACTIVE_SUB_EXISTS': 'Você já possui uma assinatura ativa.'
  };
  
  return messages[error.code] || messages[error.message] || 
         'Ocorreu um erro ao criar sua conta. Tente novamente.';
};

const logRollbackEvent = (data: any) => {
  console.log('[ANALYTICS] Rollback event:', data);
  // TODO: Implementar analytics real
};