'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { loginWithGoogle, loginWithEmail, registerWithEmail, handleGoogleRedirect, resetPassword } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  Mail,
  Lock,
  User as UserIcon,
  Eye,
  EyeOff,
  X
} from 'lucide-react';
import { showError, showSuccess } from '@/components/ui/toast';

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nome, setNome] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading: authLoading, needsCompanySetup, companyId } = useAuth();
  const isRedirectingRef = useRef(false);

  // Processar resultado do redirect OAuth ao carregar a página
  useEffect(() => {
    const processRedirect = async () => {
      try {
        const result = await handleGoogleRedirect();
        if (result?.user) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      } catch (error: any) {
        if (error?.code && error.code !== 'auth/no-auth-event') {
          console.error('[Login] Erro ao processar redirect:', error);
          const errorMessage = error?.message || 'Erro ao processar autenticação. Tente novamente.';
          showError(errorMessage);
        }
      }
    };

    if (typeof window !== 'undefined' && !authLoading) {
      processRedirect();
    }
  }, [authLoading]);

  // Redirecionar se já estiver autenticado
  useEffect(() => {
    const normalizedPathname = pathname?.replace(/\/$/, '') || '';
    const isLoginPage = normalizedPathname === '/login';

    if (!isLoginPage || isRedirectingRef.current) {
      return;
    }

    if (!authLoading && user && companyId) {
      if (needsCompanySetup) {
        isRedirectingRef.current = true;
        window.location.href = '/setup';
      } else {
        isRedirectingRef.current = true;
        window.location.href = '/';
      }
    }
  }, [user, authLoading, needsCompanySetup, companyId, pathname]);

  const handleLogin = async () => {
    try {
      setLoading(true);
      isRedirectingRef.current = true;
      
      const result = await loginWithGoogle();
      
      if (result === null) {
        return;
      }
      
      const { auth } = await import('@/lib/firebase');
      await auth.authStateReady();
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const currentUser = auth.currentUser;
      
      if (currentUser) {
        const { db } = await import('@/lib/firebase');
        const { collection, query, where, getDocs } = await import('firebase/firestore');
        
        const ownerQuery = query(
          collection(db, 'companies'),
          where('ownerUid', '==', currentUser.uid)
        );
        const ownerSnapshot = await getDocs(ownerQuery);
        
        if (!ownerSnapshot.empty) {
          window.location.href = '/';
          return;
        }
        
        const companiesSnapshot = await getDocs(collection(db, 'companies'));
        let belongsToCompany = false;
        let foundCompanyId = null;
        
        for (const companyDoc of companiesSnapshot.docs) {
          const companyId = companyDoc.id;
          const usersQuery = query(
            collection(db, `companies/${companyId}/users`),
            where('email', '==', currentUser.email)
          );
          const usersSnapshot = await getDocs(usersQuery);
          
          if (!usersSnapshot.empty) {
            belongsToCompany = true;
            foundCompanyId = companyId;
            break;
          }
        }
        
        if (belongsToCompany) {
          window.location.href = '/';
        } else {
          window.location.href = '/setup';
        }
      } else {
        console.error('[Login] Nenhum usuário encontrado após login');
        showError('Erro ao autenticar. Tente novamente.');
        setLoading(false);
        isRedirectingRef.current = false;
      }
    } catch (error: any) {
      console.error('[Login] Erro no login:', error);
      
      let errorMessage = 'Erro ao fazer login. Tente novamente.';
      
      if (error?.code === 'auth/popup-blocked') {
        errorMessage = 'Popup bloqueado pelo navegador. Por favor, permita popups para este site e tente novamente.';
      } else if (error?.code === 'auth/popup-closed-by-user') {
        errorMessage = 'A janela de login foi fechada. Tente novamente.';
      } else if (error?.message?.includes('invalid') || error?.message?.includes('The requested action is invalid')) {
        errorMessage = 'Erro de configuração OAuth. Verifique as configurações do Firebase.';
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      showError(errorMessage);
      setLoading(false);
      isRedirectingRef.current = false;
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || (authMode === 'register' && !nome)) {
      showError('Preencha todos os campos obrigatórios.');
      return;
    }

    try {
      setEmailLoading(true);
      if (authMode === 'register') {
        await registerWithEmail({ email, password, nome });
        showSuccess('Conta criada com sucesso!');
      } else {
        await loginWithEmail({ email, password });
        showSuccess('Login realizado com sucesso!');
      }
        const { auth } = await import('@/lib/firebase');
        await auth.authStateReady();
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const currentUser = auth.currentUser;
        if (currentUser) {
          const { db } = await import('@/lib/firebase');
          const { collection, query, where, getDocs } = await import('firebase/firestore');
          
          const ownerQuery = query(
            collection(db, 'companies'),
            where('ownerUid', '==', currentUser.uid)
          );
          const ownerSnapshot = await getDocs(ownerQuery);
          
          if (!ownerSnapshot.empty) {
            window.location.href = '/';
            return;
          }
          
          const companiesSnapshot = await getDocs(collection(db, 'companies'));
          let belongsToCompany = false;
          
          for (const companyDoc of companiesSnapshot.docs) {
            const companyId = companyDoc.id;
            const usersQuery = query(
              collection(db, `companies/${companyId}/users`),
              where('email', '==', currentUser.email)
            );
            const usersSnapshot = await getDocs(usersQuery);
            
            if (!usersSnapshot.empty) {
              belongsToCompany = true;
              break;
            }
          }
          
          if (belongsToCompany) {
            window.location.href = '/';
          } else {
            window.location.href = '/setup';
          }
        } else {
          showError('Erro ao autenticar. Tente novamente.');
          setEmailLoading(false);
        }
    } catch (error: any) {
      const message = error?.message || 'Erro na autenticação. Tente novamente.';
      showError(message);
    } finally {
      setEmailLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) {
      showError('Por favor, informe seu email.');
      return;
    }

    try {
      setResetLoading(true);
      await resetPassword(resetEmail);
      showSuccess('Email de recuperação enviado! Verifique sua caixa de entrada.');
      setShowResetPasswordModal(false);
      setResetEmail('');
    } catch (error: any) {
      const message = error?.message || 'Erro ao enviar email de recuperação. Tente novamente.';
      showError(message);
    } finally {
      setResetLoading(false);
    }
  };

  // Mostrar loading enquanto verifica autenticação
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8"
        >
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-slate-700 to-slate-900 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">
              {authMode === 'login' ? 'Bem-vindo de volta' : 'Crie sua conta'}
            </h1>
            <p className="text-slate-600">
              {authMode === 'login' ? 'Faça login para acessar sua conta' : 'Comece seu teste hoje mesmo'}
            </p>
          </div>

          <Button
            onClick={handleLogin}
            disabled={loading}
            className="w-full h-12 text-base font-semibold bg-white border-2 border-slate-300 text-slate-700 hover:bg-slate-50 rounded-xl shadow-sm mb-4"
            size="lg"
          >
            <AnimatePresence mode="wait">
              {loading ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-3"
                >
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-slate-400 border-t-transparent"></div>
                  <span>Entrando...</span>
                </motion.div>
              ) : (
                <motion.div
                  key="login"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center justify-center gap-3"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  <span>Entrar com Google</span>
                </motion.div>
              )}
            </AnimatePresence>
          </Button>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-slate-500">ou</span>
            </div>
          </div>

          <div className="flex items-center justify-between mb-4 bg-slate-50 rounded-lg p-1">
            <button
              className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
                authMode === 'login'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              onClick={() => setAuthMode('login')}
              type="button"
            >
              Entrar
            </button>
            <button
              className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
                authMode === 'register'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              onClick={() => setAuthMode('register')}
              type="button"
            >
              Criar conta
            </button>
          </div>

          <form onSubmit={handleEmailAuth} className="space-y-4">
            {authMode === 'register' && (
              <div className="relative">
                <UserIcon className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
                <Input
                  placeholder="Seu nome completo"
                  value={nome}
                  onChange={(event) => setNome(event.target.value)}
                  className="pl-11 h-12 border-slate-300 focus:border-slate-500 focus:ring-slate-500"
                />
              </div>
            )}
            <div className="relative">
              <Mail className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
              <Input
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                className="pl-11 h-12 border-slate-300 focus:border-slate-500 focus:ring-slate-500"
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="Sua senha"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                className="pl-11 pr-11 h-12 border-slate-300 focus:border-slate-500 focus:ring-slate-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-600 transition-colors"
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
            {authMode === 'login' && (
              <div className="text-right">
                <button
                  type="button"
                  onClick={() => {
                    setResetEmail(email);
                    setShowResetPasswordModal(true);
                  }}
                  className="text-sm text-slate-600 hover:text-slate-900 hover:underline transition-colors"
                >
                  Esqueci minha senha
                </button>
              </div>
            )}
            <Button
              type="submit"
              disabled={emailLoading}
              className="w-full h-12 text-base font-semibold bg-slate-900 text-white hover:bg-slate-800 rounded-xl shadow-lg"
            >
              {emailLoading ? 'Processando...' : authMode === 'login' ? 'Entrar' : 'Começar teste'}
            </Button>
          </form>

          <p className="mt-6 text-xs text-slate-500 text-center leading-relaxed">
            Ao continuar, você concorda com nossa{' '}
            <a href="/politica-de-privacidade" className="text-slate-700 hover:text-slate-900 underline font-medium">
              Política de Privacidade
            </a>
            .
          </p>
        </motion.div>
      </div>

      {/* Modal de Reset de Senha */}
      <AnimatePresence>
        {showResetPasswordModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowResetPasswordModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-slate-900">Recuperar senha</h3>
                <button
                  onClick={() => setShowResetPasswordModal(false)}
                  className="text-slate-400 hover:text-slate-600 transition-colors"
                  aria-label="Fechar"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <p className="text-slate-600 mb-6">
                Digite seu email e enviaremos um link para você redefinir sua senha.
              </p>

              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="relative">
                  <Mail className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
                  <Input
                    type="email"
                    placeholder="seu@email.com"
                    value={resetEmail}
                    onChange={(event) => setResetEmail(event.target.value)}
                    required
                    className="pl-11 h-12 border-slate-300 focus:border-slate-500 focus:ring-slate-500"
                    autoFocus
                  />
                </div>
                
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowResetPasswordModal(false)}
                    className="flex-1 h-12 border-slate-300 text-slate-700 hover:bg-slate-50"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={resetLoading}
                    className="flex-1 h-12 bg-slate-900 text-white hover:bg-slate-800"
                  >
                    {resetLoading ? 'Enviando...' : 'Enviar'}
                  </Button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

