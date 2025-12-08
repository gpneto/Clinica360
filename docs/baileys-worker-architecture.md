# Arquitetura do Baileys Worker

## Visão Geral

O Baileys Worker é um serviço contínuo responsável por manter conexões ativas com o WhatsApp Web via Baileys e sincronizar mensagens recebidas com o Firestore.

## Estrutura Implementada

### 1. Worker Principal (`worker/src/index.ts`)

#### Funcionalidades Core

- **Worker contínuo**: Mantém sockets Baileys conectados indefinidamente
- **Multi-tenant**: Suporta múltiplas empresas simultaneamente
- **Descoberta automática**: Verifica novas empresas a cada 5 minutos
- **Isolamento por empresa**: Cada empresa tem seu próprio socket e diretório de sessão

#### Recebimento de Mensagens

```typescript
socket.ev.on("messages.upsert", async ({ messages, type }) => {
  // Filtra apenas mensagens do tipo 'notify' ou 'append'
  if (type !== "notify" && type !== "append") {
    return;
  }
  
  // Processa cada mensagem
  for (const message of messages) {
    // Ignora mensagens próprias (outbound)
    if (message.key.fromMe) continue;
    
    // Ignora mensagens de status
    if (message.key.remoteJid === "status@broadcast") continue;
    
    // Salva mensagem inbound
    await saveIncomingMessage(message, companyId);
  }
});
```

**Filtros aplicados:**
- ✅ Apenas `type === "notify"` ou `type === "append"`
- ✅ Exclui mensagens próprias (`fromMe === true`)
- ✅ Exclui mensagens de status (`status@broadcast`)

#### Persistência no Firestore

**Coleção: `whatsappMessages/{wamId}`**

```typescript
{
  wam_id: string;                    // ID único da mensagem
  message: proto.IWebMessageInfo;    // Mensagem completa do Baileys
  chat_id: string;                   // Número do telefone normalizado
  direction: "inbound";              // Sempre inbound para mensagens recebidas
  provider: "baileys";               // Identificador do provider
  companyId: string;                 // ID da empresa
  createdAt: Timestamp;              // Data de criação no Firestore
  messageTimestamp: Timestamp;       // Timestamp original da mensagem
}
```

**Deduplicação:**
- Verifica se `wam_id` já existe antes de salvar
- Evita duplicação de mensagens

#### Atualização de Contatos

**Coleção: `whatsappContacts/{chatId}`**

```typescript
{
  wa_id: string;                     // ID do WhatsApp
  last_message_at: Timestamp;        // Última mensagem recebida
  updatedAt: Timestamp;              // Última atualização
  companyId: string;                 // ID da empresa
}
```

Atualizado automaticamente sempre que uma mensagem é recebida.

### 2. Sincronização de Sessões

#### Estrutura no Google Cloud Storage

```
gs://bucket-name/
  └── whatsappBaileysSessions/
      └── {companyId}/
          ├── creds.json
          ├── app-state-sync-key-*.json
          ├── app-state-sync-version-*.json
          └── ... (outros arquivos de sessão)
```

#### Operações

**Download (ao iniciar worker):**
```typescript
async function downloadSessionFiles(companyId: string, targetDir: string) {
  const prefix = `whatsappBaileysSessions/${companyId}/`;
  const [files] = await bucket.getFiles({ prefix });
  
  for (const file of files) {
    await file.download({ destination: localPath });
  }
}
```

**Upload (ao atualizar credenciais):**
```typescript
async function uploadSessionFiles(companyId: string, sourceDir: string) {
  const prefix = `whatsappBaileysSessions/${companyId}/`;
  const files = await fs.readdir(sourceDir);
  
  for (const file of files) {
    await bucket.upload(localPath, { destination: `${prefix}${file}` });
  }
}
```

**Eventos que disparam upload:**
- `creds.update`: Sempre que as credenciais são atualizadas
- Após reconexão bem-sucedida

### 3. Reconexão Automática

#### Lógica de Reconexão

```typescript
if (connection === "close") {
  const shouldReconnect = 
    lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
  
  if (shouldReconnect) {
    // Agendar reconexão após 5 segundos
    setTimeout(() => {
      startWorkerForCompany(companyId);
    }, 5000);
  } else {
    // Logged out, não reconectar
    activeSockets.delete(companyId);
  }
}
```

**Razões de desconexão:**
- `DisconnectReason.loggedOut`: Não reconecta (requer novo QR)
- Outras razões: Reconecta automaticamente após 5 segundos

### 4. Status e Monitoramento

#### Coleção: `integrations/whatsappBaileys`

```typescript
{
  status: "connected" | "disconnected" | "pending_qr" | "logged_out" | "error";
  qrCode?: string;                   // QR code para autenticação
  qrGeneratedAt?: Timestamp;          // Quando o QR foi gerado
  lastConnectedAt?: Timestamp;       // Última conexão bem-sucedida
  lastDisconnectedAt?: Timestamp;    // Última desconexão
  lastDisconnectReason?: string;     // Razão da desconexão
  workerStartedAt?: Timestamp;       // Quando o worker foi iniciado
  lastError?: string;                // Último erro ocorrido
  lastErrorAt?: Timestamp;           // Quando o erro ocorreu
}
```

**Estados possíveis:**
- `initializing`: Worker sendo iniciado
- `pending_qr`: Aguardando escanear QR code
- `connected`: Conectado e funcionando
- `disconnected`: Desconectado, tentando reconectar
- `logged_out`: Deslogado, requer novo QR
- `error`: Erro ao iniciar worker

### 5. Tratamento de Erros

#### Erros de Descriptografia (Bad MAC)

```typescript
// Handler global de erros
socket.ev.on("error", (error) => {
  if (error?.message?.includes("Bad MAC") || 
      error?.message?.includes("Session error")) {
    // Log como warning, não interrompe funcionamento
    console.warn(`[Worker] Erro de sessão (pode ser ignorado): ${error.message}`);
  } else {
    console.error(`[Worker] Erro não tratado no socket:`, error);
  }
});

// Tratamento individual de mensagens
try {
  await saveIncomingMessage(message, companyId);
} catch (error: any) {
  if (error?.message?.includes("Bad MAC")) {
    console.warn(`[Worker] Erro ao processar mensagem: ${error.message}`);
    // Continua processando outras mensagens
  }
}
```

**Comportamento:**
- Erros "Bad MAC" são logados como warnings
- Não interrompem o processamento de outras mensagens
- Podem indicar sessão desatualizada, mas não são críticos

### 6. Descoberta de Empresas

#### Lógica de Descoberta

```typescript
async function startWorkers() {
  // Buscar todas as empresas ativas
  const companiesSnapshot = await db.collection("companies").get();
  
  for (const companyDoc of companiesSnapshot.docs) {
    const companyId = companyDoc.id;
    const companyData = companyDoc.data();
    
    // Verificar se empresa usa Baileys
    const settings = await getCompanySettings(companyId);
    if (settings.whatsappProvider === "baileys") {
      await startWorkerForCompany(companyId);
    }
  }
  
  // Verificar novas empresas a cada 1 minuto
  setInterval(startWorkers, 60 * 1000);
}
```

**Critérios para iniciar worker:**
- Empresa existe no Firestore
- `settings.whatsappProvider === "baileys"`
- Não há worker ativo para a empresa

**Frequência de verificação:**
- Verifica novas empresas a cada **1 minuto**
- Detecta automaticamente quando uma empresa muda para Baileys

## Fluxo de Dados

### Recebimento de Mensagem

```
WhatsApp Web
    ↓
Baileys Socket (messages.upsert)
    ↓
Filtro (notify/append, !fromMe, !status)
    ↓
saveIncomingMessage()
    ↓
Firestore (whatsappMessages/{wamId})
    ↓
Firestore (whatsappContacts/{chatId})
```

### Sincronização de Sessão

```
Cloud Functions (envia mensagem)
    ↓
Atualiza credenciais localmente
    ↓
Upload para Cloud Storage
    ↓
Worker detecta mudança
    ↓
Download do Cloud Storage
    ↓
Atualiza sessão local
    ↓
Continua recebendo mensagens
```

## Configuração

### Variáveis de Ambiente

```bash
# Firebase Service Account
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json

# Firebase Storage Bucket
FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com

# Diretório de sessões
SESSION_BASE_DIR=/tmp/baileys-sessions

# Firebase Project ID (opcional)
FIREBASE_PROJECT_ID=your-project-id
```

### Permissões Necessárias

**Service Account precisa de:**
- Firestore: Leitura/Escrita
- Storage: Leitura/Escrita
- Acesso à coleção `companies`
- Acesso à coleção `whatsappMessages`
- Acesso à coleção `whatsappContacts`
- Acesso à coleção `integrations`

## Deployment

### Local (Desenvolvimento)

```bash
cd worker
npm install
npm run build
npm run start
```

### Docker

```bash
docker build -t baileys-worker .
docker run -e GOOGLE_APPLICATION_CREDENTIALS=/app/service-account.json \
           -e FIREBASE_STORAGE_BUCKET=your-project.appspot.com \
           baileys-worker
```

### Cloud Run

```bash
gcloud builds submit --tag gcr.io/PROJECT_ID/baileys-worker
gcloud run deploy baileys-worker \
  --image gcr.io/PROJECT_ID/baileys-worker \
  --min-instances 1 \
  --max-instances 1 \
  --set-env-vars FIREBASE_STORAGE_BUCKET=your-project.appspot.com
```

**Importante:** Usar `--min-instances 1` para manter o socket sempre ativo.

## Monitoramento

### Logs Importantes

- `[Worker] Iniciando worker para empresa: {companyId}`
- `[Worker] Conectado: {companyId}`
- `[Worker] Recebidas {n} mensagens (type: {type}) para {companyId}`
- `[Worker] Mensagem inbound salva: {messageId}`
- `[Worker] Conexão fechada: {companyId}, shouldReconnect: {bool}`
- `[Worker] Tentando reconectar: {companyId}`

### Métricas Recomendadas

- Número de empresas com workers ativos
- Taxa de mensagens recebidas por minuto
- Taxa de reconexões
- Erros de descriptografia (Bad MAC)
- Tempo de resposta do Firestore

## Troubleshooting

### Worker não inicia

1. Verificar service account e permissões
2. Verificar variável `FIREBASE_STORAGE_BUCKET`
3. Verificar logs de erro no console

### Mensagens não aparecem

1. Verificar se worker está conectado (`status === "connected"`)
2. Verificar se mensagens estão sendo filtradas corretamente
3. Verificar logs de `messages.upsert`
4. Verificar se `companyId` está sendo determinado corretamente

### Erros "Bad MAC"

- Normal em algumas situações
- Não impede funcionamento
- Pode indicar sessão desatualizada (será corrigida na próxima sincronização)

### Sessão não sincroniza

1. Verificar permissões do Storage
2. Verificar se `creds.update` está sendo disparado
3. Verificar logs de upload/download de sessão

