(() => {
  if (typeof window === 'undefined') return;

  const applyTouchAction = () => {
    const apply = (element) => {
      if (!element) return;
      element.style.touchAction = 'manipulation';
      element.style.msTouchAction = 'manipulation';
      element.style.webkitTouchCallout = 'none';
    };
    apply(document.documentElement);
    apply(document.body);
  };

  applyTouchAction();

  let lastTouchEnd = 0;

  const handlers = [
    [
      'touchstart',
      (event) => {
        if (event.touches.length > 1) {
          event.preventDefault();
        }
      },
    ],
    [
      'touchmove',
      (event) => {
        if (event.touches.length > 1) {
          event.preventDefault();
        }
      },
    ],
    [
      'touchend',
      (event) => {
        const now = Date.now();
        if (now - lastTouchEnd <= 400) {
          event.preventDefault();
        }
        lastTouchEnd = now;
      },
    ],
    [
      'gesturestart',
      (event) => {
        event.preventDefault();
      },
    ],
    [
      'gesturechange',
      (event) => {
        event.preventDefault();
      },
    ],
    [
      'gestureend',
      (event) => {
        event.preventDefault();
      },
    ],
  ];

  handlers.forEach(([type, handler]) => {
    document.addEventListener(type, handler, { passive: false });
  });

  window.addEventListener('orientationchange', applyTouchAction);
})();

