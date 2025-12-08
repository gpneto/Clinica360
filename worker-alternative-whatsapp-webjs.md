# Worker alternativo usando whatsapp-web.js

## Instalação

```bash
cd worker
npm install whatsapp-web.js qrcode-terminal
```

## Exemplo de código

```typescript
import { Client, LocalAuth, Message } from 'whatsapp-web.js';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

const db = admin.firestore();

interface CompanyWorker {
  companyId: string;
  client: Client | null;
  sessionDir: string;
}

const activeWorkers = new Map<string, CompanyWorker>();

async function startWorkerForCompany(companyId: string) {
  if (activeWorkers.has(companyId)) {
    console.log(`[Worker] Worker já ativo para ${companyId}`);
    return;
  }

  const sessionDir = `/tmp/whatsapp-webjs-${companyId}`;
  
  const client = new Client({
    authStrategy: new LocalAuth({
      dataPath: sessionDir,
      clientId: companyId,
    }),
    puppeteer: {
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    },
  });

  const worker: CompanyWorker = {
    companyId,
    client,
    sessionDir,
  };

  activeWorkers.set(companyId, worker);

  // QR Code
  client.on('qr', async (qr) => {
    console.log(`[Worker] QR code gerado para ${companyId}`);
    await updateStatus(companyId, {
      status: 'pending_qr',
      qrCode: qr,
      qrGeneratedAt: FieldValue.serverTimestamp(),
    });
  });

  // Autenticado
  client.on('ready', async () => {
    console.log(`[Worker] ✅ Conectado com sucesso (${companyId})`);
    await updateStatus(companyId, {
      status: 'connected',
      qrCode: FieldValue.delete(),
      lastConnectedAt: FieldValue.serverTimestamp(),
    });
  });

  // Receber mensagens
  client.on('message', async (message: Message) => {
    // Ignorar mensagens próprias
    if (message.fromMe) {
      return;
    }

    // Ignorar status
    if (message.from === 'status@broadcast') {
      return;
    }

    const chatId = message.from.split('@')[0];
    const wamId = message.id._serialized;

    // Verificar se já existe
    const messageRef = db.collection(`companies/${companyId}/whatsappMessages`).doc(wamId);
    const messageDoc = await messageRef.get();
    if (messageDoc.exists) {
      return;
    }

    // Salvar mensagem
    await messageRef.set({
      wam_id: wamId,
      message: {
        id: wamId,
        to: chatId,
        type: message.type,
        text: message.body,
      },
      chat_id: chatId,
      companyId,
      direction: 'inbound',
      provider: 'whatsapp-webjs',
      createdAt: FieldValue.serverTimestamp(),
      messageTimestamp: message.timestamp * 1000,
    });

    console.log(`[Worker] Mensagem recebida e salva (${companyId}): ${wamId}`);
  });

  // Erros
  client.on('auth_failure', async (msg) => {
    console.error(`[Worker] Falha na autenticação (${companyId}):`, msg);
    await updateStatus(companyId, {
      status: 'error',
      lastError: msg,
    });
  });

  client.on('disconnected', async (reason) => {
    console.log(`[Worker] Desconectado (${companyId}):`, reason);
    await updateStatus(companyId, {
      status: 'disconnected',
      lastDisconnectReason: reason,
    });
  });

  // Inicializar
  await client.initialize();
}

async function updateStatus(companyId: string, data: Record<string, unknown>) {
  await db.collection(`companies/${companyId}/integrations`)
    .doc('whatsappBaileys')
    .set({
      ...data,
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
}
```

## Vantagens do whatsapp-web.js

- ✅ Mais simples de usar
- ✅ Recebe mensagens de terceiros corretamente
- ✅ Comunidade ativa
- ✅ Suporte a mídia

## Desvantagens

- ❌ Requer Puppeteer (mais pesado)
- ❌ Pode ser bloqueado pelo WhatsApp
- ❌ Mais lento que Baileys
- ❌ Depende de navegador headless

