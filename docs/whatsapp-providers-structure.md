# Estrutura dos Providers de WhatsApp

## Visão Geral

O sistema suporta dois providers de WhatsApp:

1. **Meta API (WhatsApp Business API)** - API oficial do Meta
2. **Baileys** - Biblioteca que conecta diretamente ao WhatsApp Web

Ambos salvam mensagens na mesma coleção do Firestore: `whatsappMessages`, mas com algumas diferenças na estrutura.

## Estrutura da Coleção `whatsappMessages`

### Campos Comuns

Todos os documentos devem ter:
- `wam_id` (string): ID único da mensagem (WhatsApp Message ID)
- `chat_id` (string): ID do chat (número do telefone normalizado)
- `companyId` (string): ID da empresa
- `createdAt` (Timestamp): Data de criação
- `message` (object): Objeto com detalhes da mensagem

### Campos por Provider

#### Meta API (`provider: 'meta'`)

```typescript
{
  wam_id: string;
  chat_id: string;
  companyId: string;
  provider: 'meta';
  message: {
    id: string;
    to: string;
    type: 'template' | 'text';
    provider: 'meta';
    template?: {
      name: string;
      language: { code: string };
    };
    text?: {
      body: string;
      preview_url: boolean;
    };
  };
  direction?: 'outbound' | 'inbound'; // Pode estar ausente em alguns casos
  createdAt: Timestamp;
}
```

**Observação**: Mensagens recebidas via webhook do Meta podem não ter o campo `provider` definido, apenas `direction: 'inbound'`.

#### Baileys (`provider: 'baileys'`)

```typescript
{
  wam_id: string;
  chat_id: string;
  companyId: string;
  provider: 'baileys';
  message: {
    id: string;
    to: string;
    type: 'text';
    provider: 'baileys';
    text: {
      body: string;
      preview_url: boolean;
    };
  };
  direction: 'outbound' | 'inbound';
  sentBy?: string; // UID do usuário que enviou (apenas outbound)
  patientId?: string | null; // ID do paciente relacionado (opcional)
  createdAt: Timestamp;
}
```

## Problemas Identificados

### 1. Inconsistência no campo `provider`

- **Meta API (enviadas)**: Sempre tem `provider: 'meta'`
- **Meta API (recebidas via webhook)**: Pode não ter `provider` definido
- **Baileys (enviadas)**: Sempre tem `provider: 'baileys'`
- **Baileys (recebidas via worker)**: Deve ter `provider: 'baileys'` (verificar implementação do worker)

### 2. Inconsistência no campo `direction`

- **Meta API (enviadas)**: Pode não ter `direction` definido
- **Meta API (recebidas)**: Tem `direction: 'inbound'`
- **Baileys (enviadas)**: Sempre tem `direction: 'outbound'`
- **Baileys (recebidas)**: Deve ter `direction: 'inbound'`

## Recomendações de Padronização

### 1. Sempre incluir `provider`

Todas as mensagens devem ter o campo `provider` definido:
- `'meta'` para mensagens via Meta API
- `'baileys'` para mensagens via Baileys

### 2. Sempre incluir `direction`

Todas as mensagens devem ter o campo `direction`:
- `'outbound'` para mensagens enviadas
- `'inbound'` para mensagens recebidas

### 3. Estrutura Padrão Recomendada

```typescript
{
  wam_id: string;
  chat_id: string;
  companyId: string;
  provider: 'meta' | 'baileys';
  direction: 'outbound' | 'inbound';
  message: {
    id: string;
    to: string;
    type: 'template' | 'text';
    provider: 'meta' | 'baileys';
    template?: {
      name: string;
      language: { code: string };
    };
    text?: {
      body: string;
      preview_url: boolean;
    };
  };
  sentBy?: string; // UID do usuário (apenas outbound)
  patientId?: string | null; // ID do paciente (opcional)
  createdAt: Timestamp;
  messageTimestamp?: Date; // Timestamp original da mensagem (para inbound)
}
```

## Onde Cada Provider Salva

### Meta API

**Mensagens Enviadas:**
- Função: `sendManualWhatsappMessage` (quando `config.provider === 'meta'`)
- Localização: `functions/src/index.ts` (linha ~1653)
- Estrutura: Inclui `provider: 'meta'`, pode não ter `direction`

**Mensagens Recebidas:**
- Função: `whatsappWebhook` (webhook do Meta)
- Localização: `functions/src/whatsapp/webhookWats.ts`
- Estrutura: Tem `direction: 'inbound'`, pode não ter `provider`

### Baileys

**Mensagens Enviadas:**
- Função: `sendManualWhatsappMessage` (quando `config.provider === 'baileys'`)
- Localização: `functions/src/index.ts` (linha ~848)
- Estrutura: Inclui `provider: 'baileys'` e `direction: 'outbound'`

**Mensagens Recebidas:**
- Worker: `worker/src/index.ts`
- Localização: Worker contínuo (Docker/Cloud Run)
- Estrutura: Deve incluir `provider: 'baileys'` e `direction: 'inbound'`

## Consultas Recomendadas

### Buscar todas as mensagens de uma empresa

```typescript
db.collection('whatsappMessages')
  .where('companyId', '==', companyId)
  .orderBy('createdAt', 'desc')
```

### Buscar mensagens por provider

```typescript
db.collection('whatsappMessages')
  .where('companyId', '==', companyId)
  .where('provider', '==', 'meta') // ou 'baileys'
  .orderBy('createdAt', 'desc')
```

### Buscar mensagens recebidas

```typescript
db.collection('whatsappMessages')
  .where('companyId', '==', companyId)
  .where('direction', '==', 'inbound')
  .orderBy('createdAt', 'desc')
```

### Buscar mensagens enviadas

```typescript
db.collection('whatsappMessages')
  .where('companyId', '==', companyId)
  .where('direction', '==', 'outbound')
  .orderBy('createdAt', 'desc')
```

## Índices Necessários

Para otimizar as consultas, os seguintes índices compostos são recomendados:

1. `companyId` (ASC) + `createdAt` (DESC)
2. `companyId` (ASC) + `provider` (ASC) + `createdAt` (DESC)
3. `companyId` (ASC) + `direction` (ASC) + `createdAt` (DESC)
4. `companyId` (ASC) + `chat_id` (ASC) + `createdAt` (DESC)

## Próximos Passos

1. **Padronizar mensagens do Meta**: Garantir que todas as mensagens enviadas via Meta API tenham `direction: 'outbound'`
2. **Padronizar webhook do Meta**: Garantir que mensagens recebidas via webhook tenham `provider: 'meta'`
3. **Verificar worker do Baileys**: Garantir que mensagens recebidas via worker tenham `provider: 'baileys'` e `direction: 'inbound'`
4. **Criar script de migração**: Atualizar documentos existentes para incluir campos faltantes

