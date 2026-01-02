import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut, 
  onIdTokenChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, memoryLocalCache } from 'firebase/firestore';
import { getFunctions, connectFunctionsEmulator, httpsCallable } from 'firebase/functions';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
};

const app = initializeApp(firebaseConfig);

const storageBucketUrl = (() => {
  const bucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  if (!bucket) return undefined;
  return bucket.startsWith('gs://') ? bucket : `gs://${bucket}`;
})();

export const auth = getAuth(app);
// Inicializar Firestore com persistência offline habilitada (apenas no navegador)
// No Safari, usar memoryLocalCache para evitar problemas de CORS
const isSafari = typeof window !== 'undefined' && /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
export const db = typeof window !== 'undefined'
  ? initializeFirestore(app, {
      localCache: isSafari ? memoryLocalCache() : persistentLocalCache(),
    })
  : initializeFirestore(app, {
      localCache: memoryLocalCache(),
    });
export const functions = getFunctions(app, 'us-central1');
export const storage = getStorage(app, storageBucketUrl);
// Conectar ao emulador de Functions em desenvolvimento, quando habilitado
// if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_USE_FUNCTIONS_EMULATOR === 'true') {
//   try {
//     // Porta do emulador de Functions (padrão 5001, pode ser alterada via env)
//     const port = Number(process.env.NEXT_PUBLIC_FUNCTIONS_EMULATOR_PORT || '5001');
//     connectFunctionsEmulator(functions, 'localhost', port);
//     // eslint-disable-next-line no-console
//     console.log(`[firebase] Functions emulator conectado em http://localhost:${port}`);
//   } catch (e) {
//     // eslint-disable-next-line no-console
//     console.warn('[firebase] Falha ao conectar Functions emulator:', e);
//   }
// }
export const provider = new GoogleAuthProvider();

// Configurações do provider Google
provider.setCustomParameters({
  prompt: 'select_account'
});

export async function loginWithGoogle() {
  try {
    const result = await signInWithPopup(auth, provider);
    
    if (result.user) {
      const user = result.user;
      
      // Usuários serão criados apenas em companies/{companyId}/users/
      // A collection 'users' na raiz será criada manualmente em casos especiais
      
      // Aguardar um pouco antes de setar custom claims
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Setar custom claims imediatamente após login
      // IMPORTANTE: Se o usuário tem contexto salvo (empresa selecionada), usar esse contexto
      try {
        let companyIdToUse: string | undefined = undefined;
        
        // Tentar pegar contexto salvo do localStorage
        if (typeof window !== 'undefined') {
          try {
            const savedContext = localStorage.getItem('selectedContext');
            if (savedContext) {
              const context = JSON.parse(savedContext);
              // Verificar se o contexto não é muito antigo (7 dias) e se o email corresponde
              if (context.userEmail === user.email && 
                  Date.now() - (context.timestamp || 0) < 7 * 24 * 60 * 60 * 1000) {
                companyIdToUse = context.companyId;
                console.log('[loginWithGoogle] 📋 Usando contexto salvo:', companyIdToUse);
              }
            }
          } catch (e) {
            console.warn('[loginWithGoogle] ⚠️ Erro ao ler contexto salvo:', e);
          }
        }
        
        console.log('[loginWithGoogle] 🔧 Chamando setUserCustomClaimsOnLogin para usuário:', user.uid, companyIdToUse ? `com companyId: ${companyIdToUse}` : 'sem companyId (buscará automaticamente)');
        const setUserCustomClaimsOnLogin = httpsCallable(functions, 'setUserCustomClaimsOnLogin');
        const result = await setUserCustomClaimsOnLogin(companyIdToUse ? { companyId: companyIdToUse } : {});
        console.log('[loginWithGoogle] ✅ Resposta de setUserCustomClaimsOnLogin:', result.data);
        
        if (result.data && (result.data as any).claimsSet === false) {
          console.warn('[loginWithGoogle] ⚠️ Claims não foram setados ainda, mas serão setados automaticamente pelo trigger');
        }
      } catch (claimsError: any) {
        console.error('[loginWithGoogle] ❌ Erro ao setar custom claims:', {
          message: claimsError.message,
          code: claimsError.code,
          details: claimsError.details,
          stack: claimsError.stack
        });
        // Não falhar o login se houver erro ao setar claims
      }
      
      // Força refresh do token para trazer custom claims atualizados
      await auth.currentUser?.getIdToken(true);
    }
    
    return result;
  } catch (error: any) {
    console.error('Erro no login com popup:', error);
    
    // Verificar se é erro de popup bloqueado ou invalid action
    if (
      error?.code === 'auth/popup-blocked' ||
      error?.code === 'auth/popup-closed-by-user' ||
      error?.message?.includes('The requested action is invalid') ||
      error?.message?.includes('invalid')
    ) {
      console.warn('[Auth] Popup bloqueado ou inválido, tentando redirect...');
      // Se popup falhar, usar redirect como fallback
      await signInWithRedirect(auth, provider);
      return null; // Redirect não retorna resultado imediatamente
    }
    
    // Log detalhado para debug
    console.error('[Auth] Detalhes do erro:', {
      code: error?.code,
      message: error?.message,
      email: error?.email,
      credential: error?.credential,
    });
    
    throw error;
  }
}

// Função alternativa usando redirect (fallback)
export async function loginWithGoogleRedirect() {
  try {
    await signInWithRedirect(auth, provider);
  } catch (error: any) {
    console.error('Erro no login com redirect:', error);
    throw error;
  }
}

// Função para processar resultado do redirect (chamar após redirect)
export async function handleGoogleRedirect() {
  try {
    const result = await getRedirectResult(auth);
    
    if (result?.user) {
      const user = result.user;
      
      // Usuários serão criados apenas em companies/{companyId}/users/
      // A collection 'users' na raiz será criada manualmente em casos especiais
      
      // Setar custom claims imediatamente após login
      // IMPORTANTE: Se o usuário tem contexto salvo (empresa selecionada), usar esse contexto
      try {
        let companyIdToUse: string | undefined = undefined;
        
        // Tentar pegar contexto salvo do localStorage
        if (typeof window !== 'undefined') {
          try {
            const savedContext = localStorage.getItem('selectedContext');
            if (savedContext) {
              const context = JSON.parse(savedContext);
              if (context.userEmail === user.email && 
                  Date.now() - (context.timestamp || 0) < 7 * 24 * 60 * 60 * 1000) {
                companyIdToUse = context.companyId;
              }
            }
          } catch (e) {
            // Ignorar erro
          }
        }
        
        const setUserCustomClaimsOnLogin = httpsCallable(functions, 'setUserCustomClaimsOnLogin');
        await setUserCustomClaimsOnLogin(companyIdToUse ? { companyId: companyIdToUse } : {});
        console.log('[handleGoogleRedirect] ✅ Custom claims setados com sucesso');
      } catch (claimsError: any) {
        console.warn('[handleGoogleRedirect] ⚠️ Erro ao setar custom claims (não crítico):', claimsError.message);
        // Não falhar o login se houver erro ao setar claims
      }
      
      // Força refresh do token para trazer custom claims atualizados
      await auth.currentUser?.getIdToken(true);
    }
    
    return result;
  } catch (error: any) {
    console.error('Erro ao processar redirect:', error);
    throw error;
  }
}

// Função removida: createUserIfNotExists
// Usuários agora são criados apenas em companies/{companyId}/users/
// A collection 'users' na raiz será criada manualmente em casos especiais

export async function registerWithEmail({
  email,
  password,
  nome,
}: {
  email: string;
  password: string;
  nome: string;
}) {
  try {
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    if (credential.user) {
      if (nome) {
        await updateProfile(credential.user, { displayName: nome });
      }
      
      // Usuários serão criados apenas em companies/{companyId}/users/
      // A collection 'users' na raiz será criada manualmente em casos especiais
      
      // Setar custom claims imediatamente após registro
      try {
        const setUserCustomClaimsOnLogin = httpsCallable(functions, 'setUserCustomClaimsOnLogin');
        await setUserCustomClaimsOnLogin({});
        console.log('[registerWithEmail] ✅ Custom claims setados com sucesso');
      } catch (claimsError: any) {
        console.warn('[registerWithEmail] ⚠️ Erro ao setar custom claims (não crítico):', claimsError.message);
        // Não falhar o registro se houver erro ao setar claims
      }
      
      // Força refresh do token para trazer custom claims atualizados
      await auth.currentUser?.getIdToken(true);
    }
    return credential;
  } catch (error) {
    console.error('Erro no registro:', error);
    throw error;
  }
}

export async function loginWithEmail({
  email,
  password,
}: {
  email: string;
  password: string;
}) {
  try {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    if (credential.user) {
      // Usuários serão criados apenas em companies/{companyId}/users/
      // A collection 'users' na raiz será criada manualmente em casos especiais
      
      // Setar custom claims imediatamente após login
      // IMPORTANTE: Se o usuário tem contexto salvo (empresa selecionada), usar esse contexto
      try {
        let companyIdToUse: string | undefined = undefined;
        
        // Tentar pegar contexto salvo do localStorage
        if (typeof window !== 'undefined') {
          try {
            const savedContext = localStorage.getItem('selectedContext');
            if (savedContext) {
              const context = JSON.parse(savedContext);
              if (context.userEmail === credential.user.email && 
                  Date.now() - (context.timestamp || 0) < 7 * 24 * 60 * 60 * 1000) {
                companyIdToUse = context.companyId;
              }
            }
          } catch (e) {
            // Ignorar erro
          }
        }
        
        const setUserCustomClaimsOnLogin = httpsCallable(functions, 'setUserCustomClaimsOnLogin');
        await setUserCustomClaimsOnLogin(companyIdToUse ? { companyId: companyIdToUse } : {});
        console.log('[loginWithEmail] ✅ Custom claims setados com sucesso');
      } catch (claimsError: any) {
        console.warn('[loginWithEmail] ⚠️ Erro ao setar custom claims (não crítico):', claimsError.message);
        // Não falhar o login se houver erro ao setar claims
      }
      
      // Força refresh do token para trazer custom claims atualizados
      await auth.currentUser?.getIdToken(true);
    }
    return credential;
  } catch (error) {
    console.error('Erro no login com email:', error);
    throw error;
  }
}

export async function logout() {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Erro no logout:', error);
    throw error;
  }
}

export async function resetPassword(email: string) {
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error) {
    console.error('Erro ao enviar email de reset de senha:', error);
    throw error;
  }
}

export function onAuthStateChanged(callback: (user: any) => void) {
  return onIdTokenChanged(auth, callback);
}

// Função para ativar usuário (usar no console do Firebase)
export async function activateUser(userEmail: string) {
  const { doc, updateDoc } = await import('firebase/firestore');
  const userDocRef = doc(db, 'users', userEmail);
  
  try {
    await updateDoc(userDocRef, {
      ativo: true
    });
    return true;
  } catch (error) {
    console.error('Erro ao ativar usuário:', error);
    return false;
  }
}

// Função para criar allowlist (usar no console do Firebase)
export async function addToAllowlist(email: string, role: string = 'admin', professionalId?: string) {
  const { doc, setDoc } = await import('firebase/firestore');
  const allowlistDocRef = doc(db, 'allowlist', email.toLowerCase());
  
  try {
    await setDoc(allowlistDocRef, {
      email: email.toLowerCase(),
      role: role,
      professionalId: professionalId || null,
      createdAt: new Date()
    });
    return true;
  } catch (error) {
    console.error('Erro ao adicionar à allowlist:', error);
    return false;
  }
}

export default app;
