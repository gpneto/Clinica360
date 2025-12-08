'use client';

import { useEffect } from 'react';

export function IosPreventZoom() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const applyTouchAction = () => {
      const apply = (element: HTMLElement | null) => {
        if (!element) return;
        // Evitar alterar globalmente o touch-action em html/body para não impactar scroll
        (element.style as any).webkitTouchCallout = 'none';
      };
      apply(document.body);
    };

    applyTouchAction();

    let lastTouchEnd = 0;

    const handlers: Array<[string, (event: Event) => void]> = [
      [
        'touchstart',
        (event: Event) => {
          const e = event as TouchEvent;
          if (e.touches.length > 1) {
            e.preventDefault();
          }
        },
      ],
      [
        'touchmove',
        (event: Event) => {
          const e = event as TouchEvent;
          if (e.touches.length > 1) {
            e.preventDefault();
          }
        },
      ],
      // Removido o bloqueio de touchend para não interferir na rolagem rápida
      ['gesturestart', (event: Event) => event.preventDefault()],
      ['gesturechange', (event: Event) => event.preventDefault()],
      ['gestureend', (event: Event) => event.preventDefault()],
    ];

    handlers.forEach(([type, handler]) => {
      document.addEventListener(type, handler, { passive: false });
    });

    window.addEventListener('orientationchange', applyTouchAction);

    return () => {
      handlers.forEach(([type, handler]) => {
        document.removeEventListener(type, handler);
      });
      window.removeEventListener('orientationchange', applyTouchAction);
    };
  }, []);

  return null;
}

