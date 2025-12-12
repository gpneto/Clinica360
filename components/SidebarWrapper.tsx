'use client';

import { useAuth } from '@/lib/auth-context';
import { Sidebar } from '@/components/Sidebar';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { cn } from '@/lib/utils';
import { TutorialProvider } from '@/components/tutorial/TutorialProvider';
import { TutorialGuide } from '@/components/tutorial/TutorialGuide';
import TrialGuard from '@/components/TrialGuard';
import { FloatingAIAssistant } from '@/components/FloatingAIAssistant';
import { AIAssistantWelcomeModal } from '@/components/AIAssistantWelcomeModal';

interface SidebarWrapperProps {
  children: React.ReactNode;
}

export function SidebarWrapper({ children }: SidebarWrapperProps) {
  const { user, loading, needsContextSelection, needsCompanySetup, themePreference } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const isVibrant = themePreference === 'vibrant';
  const isCustom = themePreference === 'custom';
  const hasGradient = isVibrant || isCustom;


  // Redirecionar para seleção de contexto se necessário
  useEffect(() => {
    if (!loading && user && needsContextSelection && pathname !== '/contexto') {
      router.push('/contexto');
    }
    if (!loading && user && needsCompanySetup && pathname !== '/setup') {
      router.push('/setup');
    }
  }, [loading, user, needsContextSelection, needsCompanySetup, pathname, router]);

  // Não mostrar sidebar na página de login, contexto, setup, ajuda e assinatura de orçamento/anamnese (páginas públicas)
  const shouldShowSidebar = user && pathname !== '/home' && pathname !== '/contexto' && pathname !== '/setup' && pathname !== '/ajuda' && !pathname?.startsWith('/assinatura-orcamento') && !pathname?.startsWith('/assinatura-anamnese') && !needsCompanySetup;

  return (
    <TutorialProvider>
      {shouldShowSidebar ? (
        <div
          className={cn(
            'flex min-h-screen w-full overflow-x-hidden',
            hasGradient ? 'bg-transparent' : 'bg-slate-100'
          )}
        >
          <Sidebar />
          <main
            className="flex-1 overflow-visible sm:overflow-auto"
          >
            <div className="app-page min-h-screen w-full">
              {children}
            </div>
          </main>
          <TrialGuard />
        </div>
      ) : (
        <div className={cn('app-page min-h-screen w-full')}>
          {children}
        </div>
      )}
      <TutorialGuide />
      <FloatingAIAssistant />
      {shouldShowSidebar && <AIAssistantWelcomeModal />}
    </TutorialProvider>
  );
}
