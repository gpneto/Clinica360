import { vi } from 'vitest';

// Mock do Firebase Admin
vi.mock('firebase-admin', () => {
  const mockFirestore = {
    collection: vi.fn(() => ({
      doc: vi.fn(() => ({
        get: vi.fn(() => Promise.resolve({
          exists: false,
          data: () => null,
        })),
        set: vi.fn(() => Promise.resolve()),
        update: vi.fn(() => Promise.resolve()),
      })),
      add: vi.fn(() => Promise.resolve({ id: 'doc123' })),
      where: vi.fn(() => ({
        get: vi.fn(() => Promise.resolve({
          empty: true,
          docs: [],
        })),
      })),
    })),
    doc: vi.fn(() => ({
      get: vi.fn(() => Promise.resolve({
        exists: false,
        data: () => null,
      })),
    })),
    FieldValue: {
      serverTimestamp: vi.fn(() => ({ _methodName: 'serverTimestamp' })),
      delete: vi.fn(() => ({ _methodName: 'delete' })),
    },
    Timestamp: {
      now: vi.fn(() => ({ seconds: Date.now() / 1000, nanoseconds: 0 })),
      fromDate: vi.fn((date: Date) => ({ seconds: date.getTime() / 1000, nanoseconds: 0 })),
    },
  };

  const mockFirestoreFn = vi.fn(() => mockFirestore);

  const mockAdmin = {
    initializeApp: vi.fn(),
    apps: [],
    firestore: mockFirestoreFn,
    auth: vi.fn(() => ({
      getUser: vi.fn(),
      setCustomUserClaims: vi.fn(),
      getUserByEmail: vi.fn(),
    })),
  };

  return {
    default: mockAdmin,
    ...mockAdmin,
    apps: [],
    firestore: mockFirestoreFn,
    FieldValue: mockFirestore.FieldValue,
    Timestamp: mockFirestore.Timestamp,
  };
});

// Mock do Stripe
vi.mock('stripe', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      checkout: {
        sessions: {
          create: vi.fn(),
        },
      },
      webhooks: {
        constructEvent: vi.fn(),
      },
      paymentIntents: {
        retrieve: vi.fn(),
      },
      paymentMethods: {
        retrieve: vi.fn(),
      },
      charges: {
        retrieve: vi.fn(),
      },
    })),
  };
});

// Mock do OpenAI
vi.mock('openai', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: vi.fn(),
        },
      },
    })),
  };
});

// Mock do luxon
vi.mock('luxon', () => {
  return {
    DateTime: {
      fromISO: vi.fn(() => ({
        setLocale: vi.fn(() => ({
          toFormat: vi.fn(() => '15 de janeiro de 2024 às 10:00'),
        })),
      })),
    },
  };
});

// Configurar variáveis de ambiente
process.env.OPENAI_API_KEY = 'test-key';
process.env.STRIPE_SECRET = 'test-secret';
process.env.STRIPE_PRICE_ID = 'test-price-id';
process.env.STRIPE_WEBHOOK_SECRET = 'test-webhook-secret';
process.env.EVOLUTION_API_KEY = 'test-evolution-key';
process.env.EVOLUTION_API_URL = 'https://test-evolution-api.com';
