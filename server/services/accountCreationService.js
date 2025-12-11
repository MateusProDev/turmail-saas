import admin from '../firebaseAdmin.js';
import { PLANS } from '../lib/plans.js';

class AccountCreationService {
  async createCompleteAccount({ 
    uid, 
    email, 
    name, 
    planId = 'trial',
    companyName = '',
    source = 'signup'
  }) {
    const db = admin.firestore();
    const timestamp = admin.firestore.FieldValue.serverTimestamp();
    
    console.log('[AccountCreationService] Iniciando criação de conta:', { uid, email, name, planId, companyName, source });
    return await db.runTransaction(async (transaction) => {
      // 1. Verificação robusta de existência
      const [userDoc, activeSubDoc] = await Promise.all([
        transaction.get(db.collection('users').doc(uid)),
        transaction.get(
          db.collection('subscriptions')
            .where('ownerUid', '==', uid)
            .where('status', 'in', ['active', 'trial'])
        )
      ]);
      
      if (userDoc.exists) {
        throw new Error('ERR_USER_EXISTS');
      }
      
      if (!activeSubDoc.empty) {
        throw new Error('ERR_ACTIVE_SUB_EXISTS');
      }
      
      // 2. Preparar dados do plano
      const planConfig = PLANS[planId] || PLANS.trial;
      const trialEndsAt = planId === 'trial' ? 
        new Date(Date.now() + planConfig.duration * 24 * 60 * 60 * 1000) : 
        null;
      
      // 3. Gerar IDs consistentes
      const tenantId = `tenant_${uid}`;
      const subscriptionId = `sub_${uid}_${Date.now()}`;
      
      // 4. Criar referências
      const userRef = db.collection('users').doc(uid);
      const tenantRef = db.collection('tenants').doc(tenantId);
      const subscriptionRef = db.collection('subscriptions').doc(subscriptionId);
      const memberRef = tenantRef.collection('members').doc(uid);
      const secretsRef = tenantRef.collection('settings').doc('secrets');
      
      // 5. Definir dados iniciais
      const initialUserData = {
        uid,
        email,
        displayName: name || '',
        photoURL: '',
        role: 'user',
        planId: planId,
        defaultTenantId: tenantId,
        createdAt: timestamp,
        updatedAt: timestamp,
        lastLoginAt: timestamp,
        company: { 
          name: companyName || '',
          website: ''
        }
      };
      
      const tenantData = {
        id: tenantId,
        ownerUid: uid,
        ownerEmail: email,
        name: companyName || `${name ? `${name}'s` : 'Seu'} Workspace`,
        planId: planId,
        status: planId === 'trial' ? 'active' : 'pending',
        trialEndsAt,
        trialDays: planConfig.duration,
        limits: planConfig.limits,
        createdAt: timestamp,
        subscriptionId,
        onboardingProgress: this.getInitialOnboardingProgress(planId === 'trial'),
        onboardingCompleted: planId === 'trial'
      };
      
      const subscriptionData = {
        id: subscriptionId,
        uid,
        email,
        planId,
        status: planId === 'trial' ? 'trial' : 'pending',
        trialEndsAt,
        limits: planConfig.limits,
        createdAt: timestamp,
        updatedAt: timestamp,
        tenantId,
        source,
        onboardingProgress: this.getInitialOnboardingProgress(planId === 'trial'),
        onboardingCompleted: planId === 'trial'
      };
      
      const memberData = {
        uid,
        email,
        displayName: name || '',
        role: 'owner',
        permissions: ['admin', 'write', 'read'],
        joinedAt: timestamp
      };
      
      const secretsData = {
        brevoApiKey: null,
        smtpLogin: null,
        encrypted: false
      };
      
      // 6. Executar operações atômicas
      transaction.set(userRef, initialUserData);
      transaction.set(tenantRef, tenantData);
      transaction.set(subscriptionRef, subscriptionData);
      transaction.set(memberRef, memberData);
      transaction.set(secretsRef, secretsData);
      
      return {
        userId: uid,
        tenantId,
        subscriptionId,
        planId,
        requiresPayment: planId !== 'trial',
        requiresOnboarding: !tenantData.onboardingCompleted
      };
    });
  }
  
  getInitialOnboardingProgress(hasTrialStarted = true) {
    const baseProgress = {
      billing: { 
        completed: true, 
        completedAt: new Date(),
        autoCompleted: true 
      }
    };
    
    if (hasTrialStarted) {
      baseProgress.trialStarted = { 
        completed: true, 
        completedAt: new Date(),
        autoCompleted: true 
      };
    }
    
    return baseProgress;
  }
  
  async verifyAccountCreation(userId) {
    const db = admin.firestore();
    const checks = [
      { name: 'User', ref: db.collection('users').doc(userId) },
      { name: 'Tenant', ref: db.collection('tenants').where('ownerUid', '==', userId).limit(1) },
      { name: 'Subscription', ref: db.collection('subscriptions').where('uid', '==', userId).limit(1) }
    ];
    
    const results = await Promise.all(
      checks.map(async ({ name, ref }) => {
        try {
          const snapshot = ref instanceof admin.firestore.DocumentReference ? 
            await ref.get() : 
            (await ref.get()).docs[0];
            
          return {
            name,
            exists: ref instanceof admin.firestore.DocumentReference ? 
              snapshot.exists : 
              !!snapshot,
            data: ref instanceof admin.firestore.DocumentReference ? 
              snapshot.data() : 
              snapshot.data()
          };
        } catch (e) {
          return { name, exists: false, error: e.message };
        }
      })
    );
    
    const failures = results.filter(r => !r.exists);
    return { results, failures };
  }
}

export default new AccountCreationService();