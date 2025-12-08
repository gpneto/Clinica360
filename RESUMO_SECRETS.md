# 📋 Resumo dos Secrets no GCP

## ✅ Secrets Encontrados no Secret Manager

Os seguintes secrets estão configurados no projeto:

1. **OPENAI_API_KEY** - Criado em 15/11/2025
2. **STRIPE_PRICE_ID** - Criado em 16/11/2025
3. **STRIPE_SECRET** - Criado em 16/11/2025
4. **STRIPE_WEBHOOK_SECRET** - Criado em 16/11/2025
5. **evolution-api-key** - Criado em 19/11/2025 ✅
   - Valor: `ebba184d999d53c516d8ce31e65b71e9b7311358b5616b8336c59d23abba43ec`
6. **evolution-api-url** - Criado em 19/11/2025 ✅
   - Valor: `http://34.123.27.105:8080`

## ⚠️ Problema Identificado

Os secrets `evolution-api-key` e `evolution-api-url` **existem no Secret Manager**, mas as **Cloud Functions não estão configuradas para usá-los**.

Atualmente, o código está tentando ler de `process.env.EVOLUTION_API_KEY` e `process.env.EVOLUTION_API_URL`, que são **variáveis de ambiente**, não secrets.

## 🔧 Solução: Duas Opções

### Opção 1: Configurar Variáveis de Ambiente (Mais Simples) ✅ RECOMENDADO

Configure as variáveis de ambiente no Firebase Console:

1. Acesse: https://console.firebase.google.com/project/agendamentointeligente-4405f/functions
2. Clique em **⚙️ Configurações** > **Variáveis de ambiente**
3. Adicione:
   - `EVOLUTION_API_URL` = `http://34.123.27.105:8080`
   - `EVOLUTION_API_KEY` = `ebba184d999d53c516d8ce31e65b71e9b7311358b5616b8336c59d23abba43ec`

**Vantagens:**
- Mais simples
- Não requer mudanças no código
- Funciona imediatamente

### Opção 2: Usar Secrets (Mais Seguro)

Atualizar o código para usar `defineSecret` como o Stripe faz:

```typescript
import { defineSecret } from 'firebase-functions/params';

const EVOLUTION_API_KEY_SECRET = defineSecret('evolution-api-key');
const EVOLUTION_API_URL_SECRET = defineSecret('evolution-api-url');

// Nas funções, usar:
export const startEvolutionSession = onCall({ 
  secrets: [EVOLUTION_API_KEY_SECRET, EVOLUTION_API_URL_SECRET] 
}, async (request) => {
  const apiKey = EVOLUTION_API_KEY_SECRET.value();
  const apiUrl = EVOLUTION_API_URL_SECRET.value();
  // ...
});
```

**Vantagens:**
- Mais seguro (secrets não aparecem em logs)
- Consistente com o padrão do Stripe

**Desvantagens:**
- Requer mudanças no código
- Requer redeploy

## 🚀 Recomendação

**Use a Opção 1** (Variáveis de Ambiente) por enquanto, pois:
- É mais rápido
- Não requer mudanças no código
- Funciona imediatamente
- As variáveis de ambiente são suficientes para este caso

Se no futuro quiser mais segurança, pode migrar para secrets.

## 📝 Valores dos Secrets

Para referência, os valores atuais são:

```
evolution-api-url: http://34.123.27.105:8080
evolution-api-key: ebba184d999d53c516d8ce31e65b71e9b7311358b5616b8336c59d23abba43ec
```

## 🔍 Verificar Secrets

Para ver os secrets novamente:

```bash
# Listar todos os secrets
gcloud secrets list --project=agendamentointeligente-4405f

# Ver valor de um secret
gcloud secrets versions access latest --secret=evolution-api-key --project=agendamentointeligente-4405f
gcloud secrets versions access latest --secret=evolution-api-url --project=agendamentointeligente-4405f
```

