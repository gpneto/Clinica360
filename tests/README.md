# 🧪 Testes do SmartDoctor

Este diretório contém todos os testes do projeto SmartDoctor.

## 📋 Estrutura

```
tests/
├── setup.ts                    # Configuração global dos testes
├── mocks/                      # Mocks e utilitários de teste
│   ├── firebase.ts            # Mock do Firebase
│   └── auth-context.tsx       # Mock do contexto de autenticação
├── app/                        # Testes das páginas
│   ├── signin/
│   │   └── page.test.tsx
│   ├── page.test.tsx          # Teste da página Home
│   ├── pacientes/
│   │   └── page.test.tsx
│   └── agenda/
│       └── page.test.tsx
└── components/                # Testes dos componentes
    ├── Dashboard.test.tsx
    ├── AccessGuard.test.tsx
    └── Sidebar.test.tsx
```

## 🚀 Como Executar os Testes

### Instalar dependências

```bash
npm install
```

### Executar todos os testes

```bash
npm test
```

### Executar testes em modo watch

```bash
npm run test:watch
```

### Executar testes com UI interativa

```bash
npm run test:ui
```

### Executar testes com cobertura

```bash
npm run test:coverage
```

## 📝 Tipos de Testes

### Testes de Páginas

Testes que verificam o comportamento completo das páginas:
- Renderização correta
- Navegação e redirecionamentos
- Integração com hooks e contextos
- Estados de loading e erro

### Testes de Componentes

Testes que verificam componentes isolados:
- Props e renderização
- Interações do usuário
- Estados internos
- Callbacks e eventos

## 🔧 Configuração

Os testes estão configurados usando:
- **Vitest**: Framework de testes rápido
- **React Testing Library**: Utilitários para testar componentes React
- **jsdom**: Ambiente DOM simulado
- **@testing-library/jest-dom**: Matchers adicionais para DOM

## 📦 Mocks

### Firebase Mock

O mock do Firebase (`tests/mocks/firebase.ts`) fornece:
- Mock do Firebase Auth
- Mock do Firestore
- Mock do Firebase Functions
- Mock do Firebase Storage

### Auth Context Mock

O mock do contexto de autenticação (`tests/mocks/auth-context.tsx`) fornece:
- Usuário mockado
- Dados de usuário mockados
- Funções de autenticação mockadas

## ✍️ Escrevendo Novos Testes

### Exemplo Básico

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import MeuComponente from '@/components/MeuComponente';

// Mocks necessários
vi.mock('@/lib/auth-context');

describe('MeuComponente', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve renderizar corretamente', () => {
    render(<MeuComponente />);
    expect(screen.getByText('Texto esperado')).toBeInTheDocument();
  });
});
```

### Boas Práticas

1. **Isolar testes**: Cada teste deve ser independente
2. **Usar mocks**: Mockar dependências externas (Firebase, APIs, etc)
3. **Testar comportamento**: Focar no que o usuário vê e faz
4. **Nomes descritivos**: Usar nomes claros para testes e describe blocks
5. **Limpar mocks**: Sempre limpar mocks no `beforeEach`

## 🎯 Cobertura de Testes

Os testes cobrem:
- ✅ Páginas principais (SignIn, Home, Pacientes, Agenda)
- ✅ Componentes principais (Dashboard, Sidebar, AccessGuard)
- ✅ Fluxos de autenticação
- ✅ Navegação e redirecionamentos
- ✅ Estados de loading e erro

## 📚 Recursos

- [Documentação do Vitest](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

