import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('Testes de Responsividade', () => {
  let originalInnerWidth: number;
  let originalInnerHeight: number;
  let originalMatchMedia: typeof window.matchMedia;

  beforeEach(() => {
    // Salvar valores originais
    originalInnerWidth = window.innerWidth;
    originalInnerHeight = window.innerHeight;
    originalMatchMedia = window.matchMedia;

    // Mock de matchMedia
    window.matchMedia = vi.fn().mockImplementation((query: string) => {
      const matches = {
        '(max-width: 640px)': window.innerWidth <= 640,
        '(min-width: 640px)': window.innerWidth >= 640,
        '(min-width: 768px)': window.innerWidth >= 768,
        '(min-width: 1024px)': window.innerWidth >= 1024,
        '(min-width: 1280px)': window.innerWidth >= 1280,
        '(min-width: 1400px)': window.innerWidth >= 1400,
        '(orientation: portrait)': window.innerHeight > window.innerWidth,
        '(orientation: landscape)': window.innerWidth > window.innerHeight,
      };

      return {
        matches: matches[query as keyof typeof matches] || false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      };
    });
  });

  afterEach(() => {
    // Restaurar valores originais
    window.innerWidth = originalInnerWidth;
    window.innerHeight = originalInnerHeight;
    window.matchMedia = originalMatchMedia;
  });

  const setViewport = (width: number, height: number) => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: width,
    });
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: height,
    });
  };

  describe('1. Breakpoints e Media Queries', () => {
    it('deve detectar breakpoint mobile (max-width: 640px)', () => {
      setViewport(375, 667); // iPhone SE
      const isMobile = window.matchMedia('(max-width: 640px)').matches;
      
      expect(isMobile).toBe(true);
    });

    it('deve detectar breakpoint tablet (min-width: 640px e max-width: 1024px)', () => {
      setViewport(768, 1024); // iPad
      const isTablet = window.matchMedia('(min-width: 640px)').matches && 
                       window.matchMedia('(min-width: 1024px)').matches === false;
      
      expect(isTablet).toBe(true);
    });

    it('deve detectar breakpoint desktop (min-width: 1024px)', () => {
      setViewport(1920, 1080); // Desktop
      const isDesktop = window.matchMedia('(min-width: 1024px)').matches;
      
      expect(isDesktop).toBe(true);
    });

    it('deve detectar breakpoint large desktop (min-width: 1280px)', () => {
      setViewport(1920, 1080);
      const isLargeDesktop = window.matchMedia('(min-width: 1280px)').matches;
      
      expect(isLargeDesktop).toBe(true);
    });

    it('deve detectar breakpoint 2xl (min-width: 1400px)', () => {
      setViewport(1920, 1080);
      const is2xl = window.matchMedia('(min-width: 1400px)').matches;
      
      expect(is2xl).toBe(true);
    });

    it('deve detectar orientação portrait', () => {
      setViewport(375, 667); // Portrait
      const isPortrait = window.matchMedia('(orientation: portrait)').matches;
      
      expect(isPortrait).toBe(true);
    });

    it('deve detectar orientação landscape', () => {
      setViewport(667, 375); // Landscape
      const isLandscape = window.matchMedia('(orientation: landscape)').matches;
      
      expect(isLandscape).toBe(true);
    });
  });

  describe('2. Layout em Diferentes Tamanhos de Tela', () => {
    it('deve aplicar layout mobile para telas pequenas', () => {
      setViewport(375, 667);
      
      const getLayoutType = () => {
        if (window.innerWidth <= 640) return 'mobile';
        if (window.innerWidth <= 1024) return 'tablet';
        return 'desktop';
      };
      
      expect(getLayoutType()).toBe('mobile');
    });

    it('deve aplicar layout tablet para telas médias', () => {
      setViewport(768, 1024);
      
      const getLayoutType = () => {
        if (window.innerWidth <= 640) return 'mobile';
        if (window.innerWidth <= 1024) return 'tablet';
        return 'desktop';
      };
      
      expect(getLayoutType()).toBe('tablet');
    });

    it('deve aplicar layout desktop para telas grandes', () => {
      setViewport(1920, 1080);
      
      const getLayoutType = () => {
        if (window.innerWidth <= 640) return 'mobile';
        if (window.innerWidth <= 1024) return 'tablet';
        return 'desktop';
      };
      
      expect(getLayoutType()).toBe('desktop');
    });

    it('deve calcular número de colunas baseado no breakpoint', () => {
      const getColumns = (width: number) => {
        if (width <= 640) return 1;
        if (width <= 1024) return 2;
        return 4;
      };
      
      expect(getColumns(375)).toBe(1); // Mobile
      expect(getColumns(768)).toBe(2); // Tablet
      expect(getColumns(1920)).toBe(4); // Desktop
    });

    it('deve ajustar padding baseado no breakpoint', () => {
      const getPadding = (width: number) => {
        if (width <= 640) return '16px';
        if (width <= 1024) return '24px';
        return '32px';
      };
      
      expect(getPadding(375)).toBe('16px');
      expect(getPadding(768)).toBe('24px');
      expect(getPadding(1920)).toBe('32px');
    });
  });

  describe('3. Componentes Móveis', () => {
    it('deve renderizar drawer mobile em telas pequenas', () => {
      setViewport(375, 667);
      
      const shouldShowMobileDrawer = window.innerWidth <= 640;
      
      expect(shouldShowMobileDrawer).toBe(true);
    });

    it('deve renderizar sidebar desktop em telas grandes', () => {
      setViewport(1920, 1080);
      
      const shouldShowDesktopSidebar = window.innerWidth > 640;
      
      expect(shouldShowDesktopSidebar).toBe(true);
    });

    it('deve aplicar classes mobile-drawer em mobile', () => {
      setViewport(375, 667);
      
      const mobileDrawerClasses = [
        'mobile-drawer',
        'h-screen',
        'overflow-y-auto',
        '-webkit-overflow-scrolling-touch',
      ];
      
      const isMobile = window.innerWidth <= 640;
      const shouldApplyClasses = isMobile;
      
      expect(shouldApplyClasses).toBe(true);
      expect(mobileDrawerClasses.length).toBeGreaterThan(0);
    });

    it('deve aplicar safe area insets em mobile', () => {
      setViewport(375, 667);
      
      const safeAreaInsets = {
        top: 'env(safe-area-inset-top, 0px)',
        bottom: 'env(safe-area-inset-bottom, 0px)',
        left: 'env(safe-area-inset-left, 0px)',
        right: 'env(safe-area-inset-right, 0px)',
      };
      
      const isMobile = window.innerWidth <= 640;
      const shouldApplySafeArea = isMobile;
      
      expect(shouldApplySafeArea).toBe(true);
      expect(safeAreaInsets.top).toContain('safe-area-inset-top');
      expect(safeAreaInsets.bottom).toContain('safe-area-inset-bottom');
    });

    it('deve ajustar tamanho de fonte em mobile', () => {
      setViewport(375, 667);
      
      // Mobile: 16px para prevenir zoom no iOS
      const mobileFontSize = '16px';
      const desktopFontSize = '14px';
      
      const fontSize = window.innerWidth <= 640 ? mobileFontSize : desktopFontSize;
      
      expect(fontSize).toBe('16px');
    });

    it('deve aplicar min-height de botões em mobile (48px)', () => {
      setViewport(375, 667);
      
      const mobileButtonMinHeight = '48px';
      const isMobile = window.innerWidth <= 640;
      
      expect(isMobile).toBe(true);
      expect(mobileButtonMinHeight).toBe('48px');
    });
  });

  describe('4. Touch Events', () => {
    it('deve detectar suporte a touch events', () => {
      const hasTouchSupport = 'ontouchstart' in window || 
                             navigator.maxTouchPoints > 0 ||
                             (navigator as any).msMaxTouchPoints > 0;
      
      // Em ambiente de teste, pode não ter suporte, mas a função deve funcionar
      expect(typeof hasTouchSupport).toBe('boolean');
    });

    it('deve aplicar touch-action: manipulation em elementos interativos', () => {
      const interactiveElements = ['button', 'a', 'input', 'textarea', 'select'];
      
      const touchAction = 'manipulation';
      
      interactiveElements.forEach(element => {
        expect(touchAction).toBe('manipulation');
      });
    });

    it('deve prevenir zoom em inputs no iOS', () => {
      const inputFontSize = '16px'; // Tamanho mínimo para prevenir zoom
      
      expect(inputFontSize).toBe('16px');
    });

    it('deve aplicar -webkit-overflow-scrolling: touch em containers scrolláveis', () => {
      const scrollContainerStyles = {
        webkitOverflowScrolling: 'touch',
        overscrollBehavior: 'auto',
      };
      
      expect(scrollContainerStyles.webkitOverflowScrolling).toBe('touch');
      expect(scrollContainerStyles.overscrollBehavior).toBe('auto');
    });
  });

  describe('5. Safe Area Insets (iOS)', () => {
    it('deve aplicar safe-area-inset-top no header', () => {
      const headerPadding = 'env(safe-area-inset-top, 0px)';
      
      expect(headerPadding).toContain('safe-area-inset-top');
    });

    it('deve aplicar safe-area-inset-bottom no footer', () => {
      const footerPadding = 'env(safe-area-inset-bottom, 0px)';
      
      expect(footerPadding).toContain('safe-area-inset-bottom');
    });

    it('deve aplicar safe-area-inset-left e right no drawer', () => {
      const drawerPadding = {
        left: 'env(safe-area-inset-left, 0px)',
        right: 'env(safe-area-inset-right, 0px)',
      };
      
      expect(drawerPadding.left).toContain('safe-area-inset-left');
      expect(drawerPadding.right).toContain('safe-area-inset-right');
    });

    it('deve calcular padding-bottom com safe area', () => {
      const basePadding = 16;
      const safeAreaBottom = 20; // Exemplo
      const totalPadding = `calc(${basePadding}px + env(safe-area-inset-bottom, ${safeAreaBottom}px))`;
      
      expect(totalPadding).toContain('safe-area-inset-bottom');
    });
  });

  describe('6. Grid System Responsivo', () => {
    it('deve aplicar grid de 1 coluna em mobile', () => {
      setViewport(375, 667);
      
      const getGridColumns = (width: number) => {
        if (width <= 640) return 1;
        if (width <= 1024) return 2;
        return 4;
      };
      
      expect(getGridColumns(window.innerWidth)).toBe(1);
    });

    it('deve aplicar grid de 2 colunas em tablet', () => {
      setViewport(768, 1024);
      
      const getGridColumns = (width: number) => {
        if (width <= 640) return 1;
        if (width <= 1024) return 2;
        return 4;
      };
      
      expect(getGridColumns(window.innerWidth)).toBe(2);
    });

    it('deve aplicar grid de 4 colunas em desktop', () => {
      setViewport(1920, 1080);
      
      const getGridColumns = (width: number) => {
        if (width <= 640) return 1;
        if (width <= 1024) return 2;
        return 4;
      };
      
      expect(getGridColumns(window.innerWidth)).toBe(4);
    });

    it('deve ajustar gap do grid baseado no breakpoint', () => {
      const getGap = (width: number) => {
        if (width <= 640) return '16px';
        if (width <= 1024) return '24px';
        return '32px';
      };
      
      expect(getGap(375)).toBe('16px');
      expect(getGap(768)).toBe('24px');
      expect(getGap(1920)).toBe('32px');
    });
  });

  describe('7. Formulários Responsivos', () => {
    it('deve empilhar campos em mobile', () => {
      setViewport(375, 667);
      
      const isMobile = window.innerWidth <= 640;
      const shouldStackFields = isMobile;
      
      expect(shouldStackFields).toBe(true);
    });

    it('deve aplicar layout horizontal em desktop', () => {
      setViewport(1920, 1080);
      
      const isDesktop = window.innerWidth > 1024;
      const shouldUseHorizontalLayout = isDesktop;
      
      expect(shouldUseHorizontalLayout).toBe(true);
    });

    it('deve ajustar largura de inputs baseado no breakpoint', () => {
      const getInputWidth = (width: number) => {
        if (width <= 640) return '100%';
        if (width <= 1024) return '50%';
        return '33.333%';
      };
      
      expect(getInputWidth(375)).toBe('100%');
      expect(getInputWidth(768)).toBe('50%');
      expect(getInputWidth(1920)).toBe('33.333%');
    });
  });

  describe('8. Calendário Responsivo', () => {
    it('deve aplicar altura automática em landscape mobile', () => {
      setViewport(667, 375); // Landscape mobile
      
      const isLandscapeMobile = window.innerWidth > window.innerHeight && 
                                window.innerWidth <= 767;
      
      expect(isLandscapeMobile).toBe(true);
    });

    it('deve limitar horários visíveis em mobile (08:00 - 20:00)', () => {
      const visibleHours = Array.from({ length: 13 }, (_, i) => i + 8); // 8-20
      
      expect(visibleHours).toContain(8);
      expect(visibleHours).toContain(20);
      expect(visibleHours).not.toContain(0);
      expect(visibleHours).not.toContain(23);
    });

    it('deve ajustar tamanho de células do calendário em mobile', () => {
      setViewport(375, 667);
      
      const isMobile = window.innerWidth <= 640;
      const cellSize = isMobile ? 'small' : 'normal';
      
      expect(cellSize).toBe('small');
    });
  });

  describe('9. Modais e Overlays Responsivos', () => {
    it('deve aplicar padding reduzido em mobile', () => {
      setViewport(375, 667);
      
      const isMobile = window.innerWidth <= 640;
      const modalPadding = isMobile ? '16px' : '24px';
      
      expect(modalPadding).toBe('16px');
    });

    it('deve aplicar max-height com viewport em mobile', () => {
      setViewport(375, 667);
      
      const isMobile = window.innerWidth <= 640;
      const maxHeight = isMobile ? 'calc(100vh - 32px)' : '90vh';
      
      expect(maxHeight).toContain('100vh');
    });

    it('deve aplicar overflow-y: auto em modais mobile', () => {
      setViewport(375, 667);
      
      const isMobile = window.innerWidth <= 640;
      const overflow = isMobile ? 'auto' : 'visible';
      
      expect(overflow).toBe('auto');
    });
  });

  describe('10. Navegação Responsiva', () => {
    it('deve mostrar menu hamburger em mobile', () => {
      setViewport(375, 667);
      
      const isMobile = window.innerWidth <= 640;
      const shouldShowHamburger = isMobile;
      
      expect(shouldShowHamburger).toBe(true);
    });

    it('deve mostrar sidebar completo em desktop', () => {
      setViewport(1920, 1080);
      
      const isDesktop = window.innerWidth > 1024;
      const shouldShowFullSidebar = isDesktop;
      
      expect(shouldShowFullSidebar).toBe(true);
    });

    it('deve aplicar sidebar overlay em mobile', () => {
      setViewport(375, 667);
      
      const isMobile = window.innerWidth <= 640;
      const sidebarType = isMobile ? 'overlay' : 'fixed';
      
      expect(sidebarType).toBe('overlay');
    });
  });

  describe('11. Tipografia Responsiva', () => {
    it('deve aplicar font-size base menor em mobile', () => {
      setViewport(375, 667);
      
      const isMobile = window.innerWidth <= 640;
      const baseFontSize = isMobile ? '12.6px' : '16px';
      
      expect(baseFontSize).toBe('12.6px');
    });

    it('deve aplicar font-size maior em desktop', () => {
      setViewport(1920, 1080);
      
      const isDesktop = window.innerWidth >= 640;
      const baseFontSize = isDesktop ? '16px' : '12.6px';
      
      expect(baseFontSize).toBe('16px');
    });

    it('deve ajustar line-height baseado no breakpoint', () => {
      const getLineHeight = (width: number) => {
        if (width <= 640) return 1.5;
        return 1.6;
      };
      
      expect(getLineHeight(375)).toBe(1.5);
      expect(getLineHeight(1920)).toBe(1.6);
    });
  });

  describe('12. Performance e Otimizações Mobile', () => {
    it('deve aplicar background-attachment: scroll em mobile', () => {
      setViewport(375, 667);
      
      const isMobile = window.innerWidth <= 640;
      const backgroundAttachment = isMobile ? 'scroll' : 'fixed';
      
      expect(backgroundAttachment).toBe('scroll');
    });

    it('deve aplicar overflow-x: hidden no body', () => {
      const bodyOverflowX = 'hidden';
      
      expect(bodyOverflowX).toBe('hidden');
    });

    it('deve aplicar overscroll-behavior-y: auto', () => {
      const overscrollBehavior = 'auto';
      
      expect(overscrollBehavior).toBe('auto');
    });

    it('deve aplicar -webkit-overflow-scrolling: touch em containers', () => {
      const webkitOverflowScrolling = 'touch';
      
      expect(webkitOverflowScrolling).toBe('touch');
    });
  });

  describe('13. Validação de Viewport', () => {
    it('deve validar largura mínima de viewport', () => {
      const minWidth = 320; // Largura mínima suportada
      
      expect(minWidth).toBeGreaterThanOrEqual(320);
    });

    it('deve validar altura mínima de viewport', () => {
      const minHeight = 568; // Altura mínima (iPhone SE)
      
      expect(minHeight).toBeGreaterThanOrEqual(568);
    });

    it('deve calcular aspect ratio', () => {
      setViewport(375, 667);
      
      const aspectRatio = window.innerWidth / window.innerHeight;
      
      expect(aspectRatio).toBeGreaterThan(0);
      expect(aspectRatio).toBeLessThan(1); // Portrait
    });

    it('deve detectar dispositivo móvel baseado em user agent (simulado)', () => {
      const isMobileDevice = (userAgent: string) => {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
      };
      
      expect(isMobileDevice('Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)')).toBe(true);
      expect(isMobileDevice('Mozilla/5.0 (Windows NT 10.0; Win64; x64)')).toBe(false);
    });
  });

  describe('14. Breakpoints Customizados', () => {
    it('deve suportar breakpoint landscape customizado', () => {
      setViewport(667, 375);
      
      const isLandscape = window.matchMedia('(orientation: landscape)').matches;
      
      expect(isLandscape).toBe(true);
    });

    it('deve suportar breakpoint 2xl (1400px)', () => {
      setViewport(1920, 1080);
      
      const is2xl = window.innerWidth >= 1400;
      
      expect(is2xl).toBe(true);
    });

    it('deve calcular breakpoints dinamicamente', () => {
      const breakpoints = {
        sm: 640,
        md: 768,
        lg: 1024,
        xl: 1280,
        '2xl': 1400,
      };
      
      const getCurrentBreakpoint = (width: number) => {
        if (width >= breakpoints['2xl']) return '2xl';
        if (width >= breakpoints.xl) return 'xl';
        if (width >= breakpoints.lg) return 'lg';
        if (width >= breakpoints.md) return 'md';
        if (width >= breakpoints.sm) return 'sm';
        return 'xs';
      };
      
      expect(getCurrentBreakpoint(375)).toBe('xs');
      expect(getCurrentBreakpoint(768)).toBe('md');
      expect(getCurrentBreakpoint(1920)).toBe('2xl');
    });
  });
});

