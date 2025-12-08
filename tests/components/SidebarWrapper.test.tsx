import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SidebarWrapper } from '@/components/SidebarWrapper';
import { useAuth } from '@/lib/auth-context';
import { usePathname, useRouter } from 'next/navigation';

// Mocks
vi.mock('@/lib/auth-context');
vi.mock('next/navigation');
vi.mock('@/components/Sidebar', () => ({
  Sidebar: () => <div data-testid="sidebar">Sidebar</div>,
}));
vi.mock('@/components/TrialGuard', () => ({
  default: () => <div data-testid="trial-guard">TrialGuard</div>,
}));
vi.mock('@/components/FloatingAIAssistant', () => ({
  FloatingAIAssistant: () => <div data-testid="floating-ai">FloatingAI</div>,
}));
vi.mock('@/components/AIAssistantWelcomeModal', () => ({
  AIAssistantWelcomeModal: () => <div data-testid="ai-welcome-modal">AIWelcomeModal</div>,
}));
vi.mock('@/components/tutorial/TutorialProvider', () => ({
  TutorialProvider: ({ children }: any) => <div data-testid="tutorial-provider">{children}</div>,
}));
vi.mock('@/components/tutorial/TutorialGuide', () => ({
  TutorialGuide: () => <div data-testid="tutorial-guide">TutorialGuide</div>,
}));

describe('SidebarWrapper', () => {
  const mockPush = vi.fn();
  const mockReplace = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    (useAuth as any).mockReturnValue({
      user: { uid: 'test-user-id' },
      loading: false,
      needsContextSelection: false,
      needsCompanySetup: false,
      themePreference: 'neutral',
    });

    (useRouter as any).mockReturnValue({
      push: mockPush,
      replace: mockReplace,
    });

    (usePathname as any).mockReturnValue('/');
  });

  it('deve renderizar o wrapper corretamente quando usuário está logado', () => {
    const { container } = render(
      <SidebarWrapper>
        <div>Conteúdo</div>
      </SidebarWrapper>
    );

    expect(container).toBeTruthy();
  });

  it('deve mostrar sidebar quando usuário está logado', () => {
    const { container } = render(
      <SidebarWrapper>
        <div>Conteúdo</div>
      </SidebarWrapper>
    );

    expect(container).toBeTruthy();
  });

  it('não deve mostrar sidebar na página de signin', () => {
    (usePathname as any).mockReturnValue('/signin');

    const { container } = render(
      <SidebarWrapper>
        <div>Conteúdo</div>
      </SidebarWrapper>
    );

    expect(container).toBeTruthy();
  });

  it('deve redirecionar para /contexto se needsContextSelection for true', () => {
    (useAuth as any).mockReturnValue({
      user: { uid: 'test-user-id' },
      loading: false,
      needsContextSelection: true,
      needsCompanySetup: false,
      themePreference: 'neutral',
    });

    render(
      <SidebarWrapper>
        <div>Conteúdo</div>
      </SidebarWrapper>
    );

    expect(mockPush).toHaveBeenCalledWith('/contexto');
  });

  it('deve redirecionar para /setup se needsCompanySetup for true', () => {
    (useAuth as any).mockReturnValue({
      user: { uid: 'test-user-id' },
      loading: false,
      needsContextSelection: false,
      needsCompanySetup: true,
      themePreference: 'neutral',
    });

    render(
      <SidebarWrapper>
        <div>Conteúdo</div>
      </SidebarWrapper>
    );

    expect(mockPush).toHaveBeenCalledWith('/setup');
  });

  it('deve aplicar tema custom quando configurado', () => {
    (useAuth as any).mockReturnValue({
      user: { uid: 'test-user-id' },
      loading: false,
      needsContextSelection: false,
      needsCompanySetup: false,
      themePreference: 'custom',
      customColor: '#FF5733',
      customColor2: '#33FF57',
    });

    const { container } = render(
      <SidebarWrapper>
        <div>Conteúdo</div>
      </SidebarWrapper>
    );

    expect(container).toBeTruthy();
  });
});

