'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import { auth, onAuthStateChanged, db } from '@/lib/firebase';
import { doc, getDoc, collection, query, where, getDocs, updateDoc, Timestamp } from 'firebase/firestore';
import { applyCustomColor, removeCustomColor } from '@/lib/utils';

import { GranularPermissions } from '@/types';

interface UserData {
  uid: string;
  nome: string;
  email: string;
  role: 'owner' | 'admin' | 'pro' | 'atendente' | 'outro' | 'super_admin';
  ativo: boolean;
  professionalId?: string;
  companyId?: string;
  themePreference?: 'neutral' | 'vibrant' | 'custom';
  customColor?: string;
  customColor2?: string;
  tutorialCompleted?: boolean;
  tutorialCompletedAt?: Date | null;
  userDocPath?: string;
  permissions?: GranularPermissions; // Permissões granulares para role 'outro'
}

interface AuthContextType {
  user: User | null;
  userData: UserData | null;
  loading: boolean;
  role: string | null;
  professionalId: string | null;
  companyId: string | null;
  needsContextSelection: boolean;
  needsCompanySetup: boolean;
  contextCount: number;
  themePreference: 'neutral' | 'vibrant' | 'custom';
  customColor: string | null;
  customColor2: string | null;
  setThemePreference: (theme: 'neutral' | 'vibrant' | 'custom', customColor?: string, customColor2?: string) => void;
  switchContext: (context: { companyId: string; role: string; professionalId?: string }) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userData: null,
  loading: true,
  role: null,
  professionalId: null,
  companyId: null,
  needsContextSelection: false,
  needsCompanySetup: false,
  contextCount: 0,
  themePreference: 'neutral',
  customColor: null,
  customColor2: null,
  setThemePreference: () => {},
  switchContext: () => {},
});

const timestampToDate = (value: any): Date | null => {
  if (!value) return null;
  if (value instanceof Timestamp) {
    return value.toDate();
  }
  if (typeof value?.toDate === 'function') {
    return value.toDate();
  }
  return null;
};


export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<string | null>(null);
  const [professionalId, setProfessionalId] = useState<string | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [needsContextSelection, setNeedsContextSelection] = useState(false);
  const [needsCompanySetup, setNeedsCompanySetup] = useState(false);
  const [contextCount, setContextCount] = useState(0);
  const [themePreference, setThemePreferenceState] = useState<'neutral' | 'vibrant' | 'custom'>(() => {
    if (typeof window === 'undefined') return 'neutral';
    const stored = localStorage.getItem('appThemePreference');
    return (stored === 'vibrant' || stored === 'custom') ? stored as 'neutral' | 'vibrant' | 'custom' : 'neutral';
  });
  const [customColor, setCustomColorState] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('appCustomColor');
  });
  const [customColor2, setCustomColor2State] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('appCustomColor2');
  });

  const applyThemeClass = (theme: 'neutral' | 'vibrant' | 'custom', color?: string | null, color2?: string | null) => {
    if (typeof document === 'undefined') return;
    document.body.classList.remove('theme-neutral', 'theme-vibrant', 'theme-custom');
    
    if (theme === 'custom' && color) {
      document.body.classList.add('theme-custom');
      applyCustomColor(color, color2 || undefined);
    } else if (theme === 'vibrant') {
      document.body.classList.add('theme-vibrant');
      removeCustomColor();
    } else {
      document.body.classList.add('theme-neutral');
      removeCustomColor();
    }
  };

  useEffect(() => {
    // Aplicar tema quando montar ou quando mudar
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      applyThemeClass(themePreference, customColor, customColor2);
      
      // Se for custom e tiver cor, aplicar imediatamente
      if (themePreference === 'custom' && customColor) {
        applyCustomColor(customColor, customColor2 || undefined);
      }
    }
  }, [themePreference, customColor, customColor2]);

  const setThemePreference = (theme: 'neutral' | 'vibrant' | 'custom', color?: string, color2?: string) => {
    setThemePreferenceState(theme);
    if (theme === 'custom' && color) {
      setCustomColorState(color);
      if (color2) {
        setCustomColor2State(color2);
      }
      if (typeof window !== 'undefined') {
        localStorage.setItem('appThemePreference', 'custom');
        localStorage.setItem('appCustomColor', color);
        if (color2) {
          localStorage.setItem('appCustomColor2', color2);
        }
      }
    } else {
      setCustomColorState(null);
      setCustomColor2State(null);
      if (typeof window !== 'undefined') {
        localStorage.setItem('appThemePreference', theme);
        localStorage.removeItem('appCustomColor');
        localStorage.removeItem('appCustomColor2');
      }
    }
  };

  const switchContext = async (context: { companyId: string; role: string; professionalId?: string }) => {
    try {
      // Salvar contexto no localStorage
      localStorage.setItem('selectedContext', JSON.stringify({
        userEmail: user?.email || null,
        companyId: context.companyId,
        role: context.role,
        professionalId: context.professionalId,
        timestamp: Date.now()
      }));

      // Atualizar custom claims para o novo contexto
      if (user) {
        try {
          const { getFunctions, httpsCallable } = await import('firebase/functions');
          const { functions } = await import('@/lib/firebase');
          const updateUserCustomClaimsForContext = httpsCallable(functions, 'updateUserCustomClaimsForContext');
          await updateUserCustomClaimsForContext({
            companyId: context.companyId,
            role: context.role
          });
          console.log('[switchContext] ✅ Custom claims atualizados para o novo contexto');
          
          // Forçar refresh do token para receber os novos claims
          await user.getIdToken(true);
        } catch (claimsError: any) {
          console.warn('[switchContext] ⚠️ Erro ao atualizar custom claims (não crítico):', claimsError.message);
          // Não falhar a troca de contexto se houver erro ao atualizar claims
        }
      }

      // Atualizar estado
      setCompanyId(context.companyId);
      setRole(context.role);
      setProfessionalId(context.professionalId || null);
      setNeedsContextSelection(false);
      setNeedsCompanySetup(false);

      // Atualizar userData
      if (user) {
        setUserData(prev => ({
          uid: user.uid,
          nome: user.displayName || '',
          email: user.email || '',
          role: context.role as any,
          ativo: true,
          professionalId: context.professionalId,
          companyId: context.companyId,
          themePreference,
          tutorialCompleted: prev?.tutorialCompleted ?? false,
          tutorialCompletedAt: prev?.tutorialCompletedAt ?? null,
          userDocPath: prev?.userDocPath,
        }));
      }
    } catch (error) {
      console.error('Erro ao trocar contexto:', error);
    }
  };

  useEffect(() => {
    // Usar autenticação real do Firebase
    const unsubscribe = onAuthStateChanged(async (user) => {
      setUser(user);
      
      if (user) {
        try {
          const tokenResult = await user.getIdTokenResult();
          const roleFromToken = tokenResult.claims.role as string || 'pro';
          const professionalIdFromToken = tokenResult.claims.professionalId as string || null;
          
          setRole(roleFromToken);
          setProfessionalId(professionalIdFromToken);
          
          const isGlobalOwner = user.email === 'guilherme@gpneto.com.br';

          // Buscar dados do usuário no Firestore
          try {
            // Verificar contexto salvo no localStorage
            const savedContext = localStorage.getItem('selectedContext');
            let hasValidContext = false;
            
            if (savedContext) {
              try {
                const context = JSON.parse(savedContext);
                if (!context.userEmail) {
                  context.userEmail = user.email;
                }
                
                // Verificar se o contexto é do mesmo usuário
                if (context.userEmail === user.email) {
                  // Verificar se o contexto não é muito antigo (7 dias)
                  if (Date.now() - context.timestamp < 7 * 24 * 60 * 60 * 1000) {
                    hasValidContext = true;
                  }
                }
              } catch (error) {
                console.error('Erro ao parsear contexto salvo:', error);
              }
            }

            // Primeiro, verificar se é super admin (coleção root/users)
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            const isSuperAdmin = userDoc.exists() && userDoc.data().role === 'super_admin';
            
            // Buscar todos os contextos disponíveis para o usuário
            const availableContexts = [];
            
            if (isSuperAdmin) {
              availableContexts.push({
                companyId: 'super_admin',
                role: 'super_admin',
                isSuperAdmin: true
              });
            }

            // Buscar em todas as empresas
            const companiesSnapshot = await getDocs(collection(db, 'companies'));
            for (const companyDoc of companiesSnapshot.docs) {
              const companyId = companyDoc.id;
              const usersQuery = query(
                collection(db, `companies/${companyId}/users`),
                where('email', '==', user.email)
              );
              
              const usersSnapshot = await getDocs(usersQuery);
              // Processar TODOS os usuários com o mesmo email (múltiplos perfis)
              for (const userDoc of usersSnapshot.docs) {
                const userData = userDoc.data();
                availableContexts.push({
                  companyId,
                  role: userData.role,
                  professionalId: userData.professionalId
                });
              }

              if (isGlobalOwner) {
                const alreadyAdded = availableContexts.some(
                  (context) => context.companyId === companyId && context.role === 'owner'
                );

                if (!alreadyAdded) {
                  availableContexts.push({
                    companyId,
                    role: 'owner',
                  });
                }
              }
            }

            setContextCount(availableContexts.length);
            
            // Se tem múltiplos contextos e não tem contexto válido salvo, mostrar seleção
            if (availableContexts.length > 1 && !hasValidContext) {
              setNeedsContextSelection(true);
              // Definir loading como false para permitir redirecionamento
              // O SidebarWrapper vai redirecionar para /contexto
              setTimeout(() => setLoading(false), 100);
              return;
            }

            // Se tem apenas um contexto ou tem contexto válido salvo, usar automaticamente
            let selectedContext;
            if (hasValidContext && savedContext) {
              const context = JSON.parse(savedContext);
              
              // Buscar contexto exato baseado no contexto salvo
              selectedContext = availableContexts.find(c => 
                c.companyId === context.companyId && c.role === context.role
              );
              
              // Se não encontrar o contexto exato, usar o primeiro da empresa
              if (!selectedContext) {
                selectedContext = availableContexts.find(c => 
                  c.companyId === context.companyId
                ) || availableContexts[0];
                
                // Usar o role do contexto salvo
                if (selectedContext) {
                  selectedContext.role = context.role;
                  selectedContext.professionalId = context.professionalId;
                }
              }
            } else {
              selectedContext = availableContexts[0];
            }

            if (!selectedContext) {
              // Usuário não encontrado em nenhuma empresa
              setNeedsCompanySetup(true);
              setThemePreference('neutral');
              setUserData({
                uid: user.uid,
                nome: user.displayName || '',
                email: user.email || '',
                role: 'owner',
                ativo: true,
                themePreference: 'neutral',
                tutorialCompleted: false,
                tutorialCompletedAt: null,
                userDocPath: undefined,
              });
              setCompanyId(null);
              setRole('owner');
              setProfessionalId(null);
              setNeedsContextSelection(false);
              setContextCount(0);
              // Definir loading como false após um pequeno delay para permitir que a página de setup seja exibida
              setTimeout(() => setLoading(false), 100);
              return;
            }

            if (selectedContext.isSuperAdmin) {
              // É super admin
              const data = userDoc.data();
              
              if (data) {
                const userTheme = (data.themePreference as 'neutral' | 'vibrant' | 'custom') || 'neutral';
                const userCustomColor = data.customColor || null;
                const userCustomColor2 = (data as any).customColor2 || null;
                
                if (userTheme === 'custom' && userCustomColor) {
                  setThemePreference('custom', userCustomColor, userCustomColor2 || undefined);
                } else {
                  setThemePreference(userTheme);
                }
                
                setRole('super_admin');
                setProfessionalId(null);
                setCompanyId('super_admin');
                setNeedsContextSelection(false);
                setNeedsCompanySetup(false);
                
                const tutorialCompleted = Boolean(data?.tutorialCompleted);
                const tutorialCompletedAt = timestampToDate(data?.tutorialCompletedAt);
                
                setUserData({
                  uid: user.uid,
                  nome: data.nome || user.displayName || '',
                  email: data.email || user.email || '',
                  role: 'super_admin',
                  ativo: data.ativo !== undefined ? data.ativo : true,
                  companyId: 'super_admin',
                  themePreference: userTheme,
                  customColor: userCustomColor || undefined,
                  customColor2: userCustomColor2 || undefined,
                  tutorialCompleted,
                  tutorialCompletedAt,
                  userDocPath: userDoc.ref.path,
                });
                
                // Definir loading como false após companyId estar definido
                setTimeout(() => setLoading(false), 100);
              }
            } else {
              // Usuário de empresa - buscar dados específicos
              const foundCompanyId = selectedContext.companyId;
              const usersQuery = query(
                collection(db, `companies/${foundCompanyId}/users`),
                where('email', '==', user.email)
              );
              
              const usersSnapshot = await getDocs(usersQuery);
              
              if (usersSnapshot.empty && isGlobalOwner && selectedContext.role === 'owner') {
                setThemePreference('neutral');
                setRole('owner');
                setProfessionalId(null);
                setCompanyId(foundCompanyId);
                setNeedsContextSelection(false);
                setNeedsCompanySetup(false);

                let companyName = '';
                try {
                  const companyDoc = await getDoc(doc(db, 'companies', foundCompanyId));
                  if (companyDoc.exists()) {
                    companyName = companyDoc.data().nome || '';
                  }
                } catch (error) {
                  console.error('Erro ao buscar empresa para global owner:', error);
                }

                setUserData({
                  uid: user.uid,
                  nome: user.displayName || companyName || '',
                  email: user.email || '',
                  role: 'owner',
                  ativo: true,
                  professionalId: undefined,
                  companyId: foundCompanyId,
                  themePreference: 'neutral',
                  tutorialCompleted: false,
                  tutorialCompletedAt: null,
                  userDocPath: undefined,
                });
                // Definir loading como false apenas após companyId estar definido
                // Usar setTimeout para garantir que o estado foi atualizado
                setTimeout(() => setLoading(false), 100);
                return;
              }

              if (!usersSnapshot.empty) {
                console.log(`[AuthContext] ✅ Encontrado usuário na empresa ${foundCompanyId}`);
                const matchingUserDoc = usersSnapshot.docs.find(docSnapshot => {
                  const data = docSnapshot.data();
                  const roleMatches = data.role === selectedContext.role;
                  const professionalMatches = selectedContext.professionalId
                    ? data.professionalId === selectedContext.professionalId
                    : true;
                  return roleMatches && professionalMatches;
                });

                const userDocRef = matchingUserDoc || usersSnapshot.docs[0];
                const foundUser = userDocRef.data();
                console.log('[AuthContext] 📋 Dados do usuário encontrado:', {
                  nome: foundUser.nome,
                  role: foundUser.role,
                  professionalId: foundUser.professionalId
                });
                
                // Salvar o UID do usuário se estiver vazio
                if (!foundUser.uid || foundUser.uid === '') {
                  await updateDoc(userDocRef.ref, {
                    uid: user.uid,
                    updatedAt: Timestamp.now()
                  });
                  foundUser.uid = user.uid;
                }
                
                // Verificar se usuário está ativo
                const isActive = foundUser.ativo !== undefined ? foundUser.ativo : true;
                
                if (!isActive) {
                  alert('Acesso negado: Seu usuário está inativo. Entre em contato com o administrador.');
                  await auth.signOut();
                  setUserData(null);
                  setCompanyId(null);
                  setRole(null);
                  setProfessionalId(null);
                  setNeedsContextSelection(false);
                  return;
                }
                
                // Buscar professionalId se necessário
                let finalProfessionalId = foundUser.professionalId || selectedContext.professionalId || null;
                if (finalProfessionalId) {
                  try {
                    const professionalDoc = await getDoc(doc(db, `companies/${foundCompanyId}/professionals`, finalProfessionalId));
                    if (!professionalDoc.exists()) {
                      finalProfessionalId = null;
                    }
                  } catch (error) {
                    console.error('Erro ao buscar professionalId:', error);
                    finalProfessionalId = null;
                  }
                }
                
                // Buscar tema e cor APENAS do documento da empresa
                let userTheme = (foundUser.themePreference as 'neutral' | 'vibrant' | 'custom') || 'neutral';
                let userCustomColor = foundUser.customColor || null;
                let userCustomColor2 = (foundUser as any).customColor2 || null;
                
                if (userTheme === 'custom' && userCustomColor) {
                  setThemePreference('custom', userCustomColor, userCustomColor2 || undefined);
                } else {
                  setThemePreference(userTheme);
                }
                
                const finalRole = foundUser.role || selectedContext.role;
                const finalCompanyId = foundCompanyId;
                
                console.log('[AuthContext] ✅ Definindo contexto final:', {
                  companyId: finalCompanyId,
                  role: finalRole,
                  professionalId: finalProfessionalId
                });
                
                setRole(finalRole);
                setProfessionalId(finalProfessionalId);
                setCompanyId(finalCompanyId);
                setNeedsContextSelection(false);
                setNeedsCompanySetup(false);
                
                const tutorialCompleted = Boolean(foundUser.tutorialCompleted);
                const tutorialCompletedAt = timestampToDate(foundUser.tutorialCompletedAt);
                
                setUserData({
                  uid: user.uid,
                  nome: foundUser.nome || user.displayName || '',
                  email: foundUser.email || user.email || '',
                  role: finalRole as any,
                  ativo: isActive,
                  professionalId: finalProfessionalId || undefined,
                  companyId: finalCompanyId,
                  themePreference: userTheme,
                  customColor: userCustomColor || undefined,
                  customColor2: userCustomColor2 || undefined,
                  tutorialCompleted,
                  tutorialCompletedAt,
                  userDocPath: userDocRef.ref.path,
                  permissions: foundUser.permissions || undefined, // Incluir permissões granulares se existirem
                });
                
              }
            }
          } catch (error) {
            console.error('Erro ao buscar dados do usuário:', error);
            setUserData(null);
            setCompanyId(null);
          }
        } catch (error) {
          console.error('Erro ao obter claims:', error);
          setRole('pro'); // Fallback para profissional
          setProfessionalId(null);
          setCompanyId(null);
          setUserData(null);
          setNeedsContextSelection(false);
          setNeedsCompanySetup(false);
          setContextCount(0);
        }
      } else {
        setRole(null);
        setProfessionalId(null);
        setCompanyId(null);
        setUserData(null);
        setNeedsContextSelection(false);
        setNeedsCompanySetup(false);
        setContextCount(0);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ 
      user, 
      userData, 
      loading, 
      role, 
      professionalId, 
      companyId, 
      needsContextSelection,
      needsCompanySetup,
      contextCount,
      themePreference,
      customColor,
      customColor2,
      setThemePreference,
      switchContext 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
}
