'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { CompanyContextSelector } from '@/components/CompanyContextSelector';
import { Loader2 } from 'lucide-react';

interface ContextOption {
  companyId: string;
  companyName: string;
  role: string;
  professionalId?: string;
  professionalName?: string;
  isSuperAdmin?: boolean;
}

export default function ContextSelectionPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [contexts, setContexts] = useState<ContextOption[]>([]);
  const [loading, setLoading] = useState(true);

  const loadUserContexts = useCallback(async () => {
    if (!user?.email) return;

    try {
      const { doc, getDoc, collection, query, where, getDocs } = await import('firebase/firestore');
      const { db } = await import('@/lib/firebase');
      const { firestoreCache, CACHE_TTL } = await import('@/lib/firestore-cache');
      
      const contextsList: ContextOption[] = [];

      // 1. Verificar se é super admin (com cache)
      let superAdminDoc = null;
      const cachedUser = firestoreCache.getDoc('users', user.uid) as { role?: string } | null;
      if (cachedUser && 'role' in cachedUser && cachedUser.role === 'super_admin') {
        contextsList.push({
          companyId: 'super_admin',
          companyName: 'Sistema Global',
          role: 'super_admin',
          isSuperAdmin: true
        });
      } else {
        superAdminDoc = await getDoc(doc(db, 'users', user.uid));
        if (superAdminDoc.exists()) {
          const userData = superAdminDoc.data();
          firestoreCache.setDoc('users', user.uid, userData, CACHE_TTL.USER);
          if (userData.role === 'super_admin') {
            contextsList.push({
              companyId: 'super_admin',
              companyName: 'Sistema Global',
              role: 'super_admin',
              isSuperAdmin: true
            });
          }
        }
      }

      // 2. Buscar em todas as empresas (com cache)
      const cachedCompanies = firestoreCache.getQuery<any[]>('companies', undefined, 'nome');
      let companiesDocs: any[] = [];
      
      if (cachedCompanies && Array.isArray(cachedCompanies)) {
        companiesDocs = cachedCompanies.map((c: any) => ({ 
          id: c.id, 
          data: () => c 
        }));
      } else {
        const companiesSnapshot = await getDocs(collection(db, 'companies'));
        companiesDocs = companiesSnapshot.docs;
        const companiesData = companiesDocs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date(),
          updatedAt: doc.data().updatedAt?.toDate() || new Date(),
        }));
        firestoreCache.setQuery('companies', companiesData, undefined, 'nome', CACHE_TTL.COMPANY);
      }
      
      const isGlobalOwner = user.email === 'guilherme@gpneto.com.br';

      for (const companyDoc of companiesDocs) {
        const companyId = companyDoc.id || companyDoc.data()?.id;
        const companyData = companyDoc.data ? companyDoc.data() : companyDoc;
        
        // Buscar usuário nesta empresa (com cache)
        const usersCollectionPath = `companies/${companyId}/users`;
        const cachedUsers = firestoreCache.getQuery(usersCollectionPath, { email: user.email }, undefined) as any[] | null | undefined;
        let usersDocs = [];
        
        if (cachedUsers && Array.isArray(cachedUsers)) {
          usersDocs = cachedUsers.map((u: any) => ({ id: u.id, data: () => u }));
        } else {
          const usersQuery = query(
            collection(db, usersCollectionPath),
            where('email', '==', user.email)
          );
          const usersSnapshot = await getDocs(usersQuery);
          usersDocs = usersSnapshot.docs;
          if (usersDocs.length > 0) {
            const usersData = usersDocs.map(doc => ({
              id: doc.id,
              ...doc.data(),
              createdAt: doc.data().createdAt?.toDate() || new Date(),
              updatedAt: doc.data().updatedAt?.toDate() || new Date(),
            }));
            firestoreCache.setQuery(usersCollectionPath, usersData, { email: user.email }, undefined, CACHE_TTL.COMPANY_USER);
          }
        }
        
        // Processar TODOS os usuários com o mesmo email (múltiplos perfis)
        for (const userDoc of usersDocs) {
          const userData = userDoc.data ? userDoc.data() : userDoc;
          
          // Buscar nome do profissional se existir (com cache)
          let professionalName = undefined;
          if (userData.professionalId) {
            try {
              const professionalPath = `companies/${companyId}/professionals`;
              const cachedProfessional = firestoreCache.getDoc(professionalPath, userData.professionalId) as { apelido?: string } | null;
              
              if (cachedProfessional && 'apelido' in cachedProfessional) {
                professionalName = cachedProfessional.apelido;
              } else {
                const professionalDoc = await getDoc(doc(db, professionalPath, userData.professionalId));
                if (professionalDoc.exists()) {
                  const profData = professionalDoc.data();
                  firestoreCache.setDoc(professionalPath, userData.professionalId, profData, CACHE_TTL.PROFESSIONAL);
                  professionalName = profData.apelido;
                }
              }
            } catch (error) {
              console.error('Erro ao buscar profissional:', error);
            }
          }
          
          contextsList.push({
            companyId,
            companyName: companyData.nome || `Empresa ${companyId}`,
            role: userData.role,
            professionalId: userData.professionalId,
            professionalName
          });
        }

        if (isGlobalOwner) {
          const alreadyAdded = contextsList.some(
            (context) => context.companyId === companyId && context.role === 'owner'
          );

          if (!alreadyAdded) {
            contextsList.push({
              companyId,
              companyName: companyData.nome || `Empresa ${companyId}`,
              role: 'owner',
            });
          }
        }
      }

      setContexts(contextsList);
    } catch (error) {
      console.error('Erro ao carregar contextos:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading && user) {
      loadUserContexts();
    }
  }, [authLoading, user, loadUserContexts]);

  const handleContextSelection = useCallback(async (context: ContextOption) => {
    try {
      // Salvar contexto selecionado no localStorage com informações mais detalhadas
      const contextData = {
        companyId: context.companyId,
        companyName: context.companyName,
        role: context.role,
        professionalId: context.professionalId,
        professionalName: context.professionalName,
        isSuperAdmin: context.isSuperAdmin,
        timestamp: Date.now(),
        userEmail: user?.email // Adicionar email do usuário para validação
      };
      
      localStorage.setItem('selectedContext', JSON.stringify(contextData));

      // Aguardar um pouco para garantir que o localStorage foi salvo
      await new Promise(resolve => setTimeout(resolve, 100));

      // Redirecionar baseado no contexto usando window.location para forçar reload
      if (context.isSuperAdmin) {
        window.location.href = '/admin/empresas';
      } else {
        window.location.href = '/';
      }
    } catch (error) {
      console.error('Erro ao selecionar contexto:', error);
    }
  }, [user?.email]);

  // Redirecionar automaticamente se tem apenas um contexto
  useEffect(() => {
    if (!loading && contexts.length === 1) {
      handleContextSelection(contexts[0]);
    }
  }, [loading, contexts, handleContextSelection]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          <span className="text-gray-600">Carregando...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    router.push('/signin');
    return null;
  }

  if (contexts.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-red-100 rounded-2xl mb-6">
            <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Acesso Negado
          </h1>
          <p className="text-gray-600 mb-6">
            Você não tem acesso a nenhuma empresa cadastrada.
          </p>
          <button
            onClick={() => router.push('/signin')}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Voltar ao Login
          </button>
        </div>
      </div>
    );
  }

  if (contexts.length === 1) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          <span className="text-gray-600">Redirecionando...</span>
        </div>
      </div>
    );
  }

  return (
    <CompanyContextSelector
      contexts={contexts}
      onSelect={handleContextSelection}
      userEmail={user.email || ''}
    />
  );
}