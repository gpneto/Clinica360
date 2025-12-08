import '@testing-library/jest-dom';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// Mock das variáveis de ambiente do Firebase antes de qualquer importação
process.env.NEXT_PUBLIC_FIREBASE_API_KEY = 'mock-api-key';
process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN = 'mock-project.firebaseapp.com';
process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = 'mock-project-id';
process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET = 'mock-project.appspot.com';
process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID = '123456789';
process.env.NEXT_PUBLIC_FIREBASE_APP_ID = '1:123456789:web:abcdef';

// Limpar após cada teste
afterEach(() => {
  cleanup();
});

// Mock do Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    pathname: '/',
    query: {},
    asPath: '/',
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

// Mock do useCompanySettings globalmente
vi.mock('@/hooks/useFirestore', async () => {
  const actual = await vi.importActual('@/hooks/useFirestore');
  return {
    ...actual,
    useCompanySettings: () => ({
      settings: { customerLabel: 'paciente' },
      loading: false,
    }),
  };
});

// Mock dos componentes UI
vi.mock('@/components/ui/button', () => {
  const React = require('react');
  return {
    Button: ({ children, ...props }: any) => React.createElement('button', props, children),
  };
});

vi.mock('@/components/ui/input', () => {
  const React = require('react');
  return {
    Input: (props: any) => React.createElement('input', props),
  };
});

vi.mock('@/components/ui/dialog', () => {
  const React = require('react');
  return {
    Dialog: ({ children }: any) => React.createElement('div', {}, children),
    DialogContent: ({ children }: any) => React.createElement('div', {}, children),
    DialogDescription: ({ children }: any) => React.createElement('div', {}, children),
    DialogFooter: ({ children }: any) => React.createElement('div', {}, children),
    DialogHeader: ({ children }: any) => React.createElement('div', {}, children),
    DialogTitle: ({ children }: any) => React.createElement('h2', {}, children),
  };
});

vi.mock('@/components/ui/toast', () => ({
  showError: vi.fn(),
  showSuccess: vi.fn(),
}));

vi.mock('@/components/ui/card', () => {
  const React = require('react');
  return {
    Card: ({ children }: any) => React.createElement('div', {}, children),
    CardContent: ({ children }: any) => React.createElement('div', {}, children),
    CardHeader: ({ children }: any) => React.createElement('div', {}, children),
    CardTitle: ({ children }: any) => React.createElement('h3', {}, children),
  };
});

vi.mock('@/components/ui/badge', () => {
  const React = require('react');
  return {
    Badge: ({ children, ...props }: any) => React.createElement('span', props, children),
  };
});

// Mock do window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock do IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  takeRecords() {
    return [];
  }
  unobserve() {}
} as any;

// Mock do ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
} as any;

// Mock do window.scrollTo
Object.defineProperty(window, 'scrollTo', {
  writable: true,
  value: vi.fn(),
});

// Mock do Firebase - deve ser feito antes de qualquer importação
vi.mock('@/lib/firebase', () => {
  
  const mockUser = {
    uid: 'test-user-id',
    email: 'test@example.com',
    displayName: 'Test User',
    photoURL: 'https://example.com/photo.jpg',
    emailVerified: true,
    isAnonymous: false,
    metadata: {
      creationTime: '2024-01-01T00:00:00Z',
      lastSignInTime: '2024-01-01T00:00:00Z',
    },
    providerData: [],
    refreshToken: 'mock-refresh-token',
    tenantId: null,
    delete: vi.fn(),
    getIdToken: vi.fn(() => Promise.resolve('mock-id-token')),
    getIdTokenResult: vi.fn(),
    reload: vi.fn(),
    toJSON: vi.fn(),
  };

  const mockAuth = {
    currentUser: null,
    onAuthStateChanged: vi.fn((callback) => {
      callback(null);
      return vi.fn();
    }),
    signInWithPopup: vi.fn(() => Promise.resolve({ user: mockUser })),
    signInWithRedirect: vi.fn(() => Promise.resolve()),
    signOut: vi.fn(() => Promise.resolve()),
    getRedirectResult: vi.fn(() => Promise.resolve({ user: mockUser })),
    authStateReady: vi.fn(() => Promise.resolve()),
  };

  const mockFirestore = {
    collection: vi.fn(),
    doc: vi.fn(),
    getDoc: vi.fn(),
    getDocs: vi.fn(),
    setDoc: vi.fn(),
    updateDoc: vi.fn(),
    deleteDoc: vi.fn(),
    query: vi.fn(),
    where: vi.fn(),
    orderBy: vi.fn(),
    limit: vi.fn(),
    Timestamp: {
      now: vi.fn(() => ({ seconds: Date.now() / 1000, nanoseconds: 0 })),
      fromDate: vi.fn((date) => ({ seconds: date.getTime() / 1000, nanoseconds: 0 })),
    },
  };

  return {
    auth: mockAuth,
    db: mockFirestore,
    functions: {
      httpsCallable: vi.fn(() => vi.fn(() => Promise.resolve({ data: {} }))),
    },
    storage: {
      ref: vi.fn(),
      uploadBytes: vi.fn(),
      getDownloadURL: vi.fn(),
    },
    onAuthStateChanged: mockAuth.onAuthStateChanged,
    signInWithPopup: mockAuth.signInWithPopup,
    signInWithRedirect: mockAuth.signInWithRedirect,
    signOut: mockAuth.signOut,
    getRedirectResult: mockAuth.getRedirectResult,
    handleGoogleRedirect: vi.fn(() => Promise.resolve(mockUser)),
  };
});

