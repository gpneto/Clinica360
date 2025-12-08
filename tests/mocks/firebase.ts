import { vi } from 'vitest';

// Mock do Firebase Auth
export const mockUser = {
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

export const mockAuth = {
  currentUser: mockUser,
  onAuthStateChanged: vi.fn((callback) => {
    callback(mockUser);
    return vi.fn(); // unsubscribe function
  }),
  signInWithPopup: vi.fn(() => Promise.resolve({ user: mockUser })),
  signInWithRedirect: vi.fn(() => Promise.resolve()),
  signOut: vi.fn(() => Promise.resolve()),
  getRedirectResult: vi.fn(() => Promise.resolve({ user: mockUser })),
};

// Mock do Firestore
export const mockFirestore = {
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

// Mock do Firebase Functions
export const mockFunctions = {
  httpsCallable: vi.fn(() => vi.fn(() => Promise.resolve({ data: {} }))),
};

// Mock do Firebase Storage
export const mockStorage = {
  ref: vi.fn(),
  uploadBytes: vi.fn(),
  getDownloadURL: vi.fn(),
};

// Mock do Firebase antes de importar
vi.mock('@/lib/firebase', () => {
  const mockAuth = {
    currentUser: null,
    onAuthStateChanged: vi.fn((callback) => {
      callback(null);
      return vi.fn(); // unsubscribe function
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

