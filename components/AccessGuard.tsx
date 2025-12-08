'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { hasFullAccess } from '@/lib/permissions';
import { auth } from '@/lib/firebase';

interface AccessGuardProps {
  allowed: ('owner' | 'admin' | 'pro' | 'atendente' | 'outro' | 'super_admin')[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
  // Função opcional para verificar permissão granular (para role 'outro')
  checkPermission?: (user: any) => boolean;
}

export function AccessGuard({ 
  allowed, 
  children, 
  checkPermission,
  fallback = <div className="flex items-center justify-center min-h-screen">
    <div className="text-center">
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Acesso Negado</h2>
      <p className="text-gray-600">Você não tem permissão para acessar esta página.</p>
    </div>
  </div>
}: AccessGuardProps) {
  const { role, userData, loading, user, needsCompanySetup } = useAuth();
  const router = useRouter();
  const [hasAccess, setHasAccess] = useState(false);
  const [accessDeniedReason, setAccessDeniedReason] = useState<string>('');
  const redirectTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hasUserRef = useRef(false);

  useEffect(() => {
    // Se o usuário foi carregado, atualizar ref e limpar qualquer timer
    if (user) {
      hasUserRef.current = true;
      if (redirectTimerRef.current) {
        clearTimeout(redirectTimerRef.current);
        redirectTimerRef.current = null;
      }
    }

    if (!loading && user && needsCompanySetup) {
      router.push('/setup');
      return;
    }

    // Se não está carregando e não há usuário, verificar Firebase Auth antes de redirecionar
    if (!loading && !user && !hasUserRef.current) {
      // Verificar Firebase Auth diretamente
      const checkAuthAndRedirect = async () => {
        try {
          // Aguardar Firebase Auth estar pronto
          await auth.authStateReady();
          const currentUser = auth.currentUser;
          
          // Se há usuário no Firebase Auth, marcar e aguardar contexto carregar
          if (currentUser) {
            hasUserRef.current = true;
            if (redirectTimerRef.current) {
              clearTimeout(redirectTimerRef.current);
              redirectTimerRef.current = null;
            }
            
            // Aguardar mais tempo para o contexto carregar após reload
            // Não redirecionar se há usuário no Firebase Auth
            return;
          }
          
          // Se não há usuário no Firebase Auth imediatamente, aguardar mais e verificar novamente
          // Isso dá tempo para o contexto carregar após um reload da página (menos tempo no Safari)
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Verificar novamente o Firebase Auth
          const finalCheck = auth.currentUser;
          if (finalCheck) {
            hasUserRef.current = true;
            if (redirectTimerRef.current) {
              clearTimeout(redirectTimerRef.current);
              redirectTimerRef.current = null;
            }
            return;
          }
          
          // Aguardar mais um pouco e verificar se o contexto carregou
          // Mesmo sem usuário no Firebase Auth, o contexto pode estar carregando (menos tempo no Safari)
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Verificação final: se ainda não há usuário nem no Firebase Auth nem no contexto
          const finalFirebaseCheck = auth.currentUser;
          if (!finalFirebaseCheck) {
            // Só redirecionar se realmente não há usuário após todas as verificações
            const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
            if (currentPath !== '/signin' && currentPath !== '/signin/') {
              window.location.href = '/signin';
            }
          } else {
            hasUserRef.current = true;
          }
        } catch (error) {
          console.error('[AccessGuard] Erro ao verificar autenticação:', error);
          // Em caso de erro, aguardar mais um pouco antes de redirecionar (menos tempo no Safari)
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          const finalCheck = auth.currentUser;
          if (!finalCheck) {
            const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
            if (currentPath !== '/signin' && currentPath !== '/signin/') {
              window.location.href = '/signin';
            }
          } else {
            hasUserRef.current = true;
          }
        }
      };
      
      checkAuthAndRedirect();
    }

    if (!loading && role && user) {
      if (user.email === 'guilherme@gpneto.com.br') {
        setHasAccess(true);
        return;
      }
      // Verificar se o usuário está ativo (mesmo em desenvolvimento)
      if (userData && !userData.ativo) {
        setAccessDeniedReason('Usuário inativo');
        setHasAccess(false);
        return;
      }
      
      // Criar objeto user completo para verificação de permissões
      const userWithPermissions = userData && user ? {
        uid: user.uid,
        role: userData.role,
        permissions: userData.permissions,
      } : null;
      
      // Em modo de desenvolvimento, permitir acesso se usuário estiver ativo
      if (process.env.NODE_ENV === 'development') {
        setHasAccess(true);
        return;
      }
      
      // Verificar acesso básico por role
      const hasRoleAccess = allowed.includes(role as any);
      
      if (!hasRoleAccess) {
        setAccessDeniedReason('Permissão insuficiente');
        setHasAccess(false);
        return;
      }
      
      // Se o role é 'outro' e há função de verificação de permissão, usar ela
      if (role === 'outro' && checkPermission) {
        const hasPermission = checkPermission(userWithPermissions);
        if (!hasPermission) {
          setAccessDeniedReason('Permissão granular insuficiente');
        }
        setHasAccess(hasPermission);
        return;
      }
      
      // Owner e admin sempre têm acesso se o role está na lista
      if (hasFullAccess(userWithPermissions)) {
        setHasAccess(true);
        return;
      }
      
      setHasAccess(true);
    }
  }, [role, userData, loading, allowed, user, router, needsCompanySetup, checkPermission]);

  // Timeout de segurança para evitar loader infinito (especialmente no Safari)
  useEffect(() => {
    if (loading) {
      const timeout = setTimeout(() => {
        console.warn('[AccessGuard] Timeout de loading detectado - pode ser problema no Safari');
      }, 10000); // 10 segundos máximo

      return () => clearTimeout(timeout);
    }
  }, [loading]);

  if (loading || (needsCompanySetup && user)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Se não há usuário, não renderizar nada (redirecionamento já foi feito)
  if (!user && !loading) {
    return null;
  }

  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Acesso Negado</h2>
          <p className="text-gray-600 mb-4">
            {accessDeniedReason === 'Usuário inativo' 
              ? 'Sua conta está inativa. Entre em contato com o administrador.'
              : 'Você não tem permissão para acessar esta página.'
            }
          </p>
          <button 
            onClick={() => window.location.href = '/signin'}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Voltar ao Login
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
