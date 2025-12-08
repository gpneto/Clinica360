# Baileys Worker (Recebimento de mensagens)

## Objetivo

Implementar um serviço contínuo, executando via Docker, responsável por manter o socket do Baileys conectado e sincronizar mensagens recebidas diretamente pelo WhatsApp Web da empresa com o Firestore.

## Motivações

- O ambiente de Cloud Functions é efêmero: cada execução encerra o socket do Baileys, inviabilizando o uso de eventos como `messages.upsert`.
- Precisamos armazenar mensagens recebidas (inbound) no Firestore para exibir histórico completo na aba “Interações”.
- Strutura atual já envia mensagens e armazena `alphabet` via Baileys — falta apenas um worker contínuo para ler os eventos.

## Plano

1. **Container Node.js**
   - Criar um serviço Node com TypeScript.
   - Importar os módulos existentes (`baileysClient.ts`) e mantê-lo rodando.
   - Utilizar `dotenv`/variáveis de ambiente para credenciais Firebase.

2. **Autenticação Firebase**
   - Usar `firebase-admin` com key service account.
   - Conectar no Firestore.
   - No container, apontar `GOOGLE_APPLICATION_CREDENTIALS=/app/service-account.json`.

3. **Reutilizar sessão Baileys**
   - Compartilhar credenciais via Google Cloud Storage.
   - No worker, sincronizar com o bucket (download e upload dos arquivos de sessão).

4. **Escutar eventos**
   - `sock.ev.on('messages.upsert', handler)`
   - Filtrar mensagens do tipo `notify` ou `append` e salvar em `whatsappMessages`.
   - Garantir deduplicação via `wam_id`.
   - Ignorar mensagens próprias (`fromMe`) e mensagens de status.

5. **Persistência**
   - Mesmo formato da função atual:
     - `whatsappMessages/{wamId}`
     - Campos: `direction=inbound`, `provider=baileys`, `companyId`, `chat_id`, `message` completo, `createdAt`.

6. **Deployment**
   - Criar `Dockerfile` usando Node 20.
   - Entrypoint que roda o worker continuamente (`node dist/worker.js`).
   - Hospedar em VM ou Cloud Run (com min instances = 1) para manter o socket ativo.

7. **Resiliência**
   - monitorar via logs, reconectar em caso de `connection.update` com `close`.
   - Atualizar `integrations/whatsappBaileys.status`.



## Implementação

O worker foi implementado na pasta `worker/` com as seguintes características:

### Estrutura Criada

- `worker/src/index.ts` - Código principal do worker
- `worker/package.json` - Dependências e scripts
- `worker/tsconfig.json` - Configuração TypeScript
- `worker/Dockerfile` - Container Docker
- `worker/docker-compose.yml` - Orquestração local
- `worker/README.md` - Documentação completa
- `worker/env.example` - Exemplo de variáveis de ambiente

### Funcionalidades Implementadas

✅ **Worker contínuo** que mantém sockets Baileys conectados  
✅ **Recebimento de mensagens** via evento `messages.upsert`  
✅ **Filtragem inteligente**: apenas mensagens `notify` ou `append`, excluindo mensagens próprias e de status  
✅ **Persistência no Firestore** em `whatsappMessages/{wamId}`  
✅ **Campos padronizados**: `direction=inbound`, `provider=baileys`, `companyId`, `chat_id`, `message` completo, `createdAt`, `messageTimestamp`  
✅ **Atualização automática** de `whatsappContacts` com `last_message_at`  
✅ **Sincronização de sessões** via Google Cloud Storage  
✅ **Reconexão automática** em caso de desconexão  
✅ **Atualização de status** em `integrations/whatsappBaileys`  
✅ **Suporte multi-empresa** (multi-tenant)  
✅ **Deduplicação** de mensagens por `wam_id`  
✅ **Tratamento de erros**: Bad MAC e outros erros de sessão são tratados graciosamente  

### Scripts NPM Disponíveis

Adicionados no `package.json` raiz:

- `npm run worker:build` - Instala dependências e compila TypeScript
- `npm run worker:start` - Executa o worker compilado
- `npm run worker:dev` - Executa em modo desenvolvimento
- `npm run worker:docker:build` - Build da imagem Docker
- `npm run worker:docker:up` - Inicia container Docker
- `npm run worker:docker:down` - Para container Docker
- `npm run worker:docker:logs` - Visualiza logs do container

### Próximos Passos

1. **Configurar Service Account:**
   - Obter JSON da service account no Firebase Console
   - Colocar em `worker/service-account.json` (não commitá-lo)
   - Configurar permissões: Firestore (leitura/escrita) e Storage (leitura/escrita)

2. **Configurar Variáveis de Ambiente:**
   - Copiar `worker/env.example` para `worker/.env`
   - Ajustar caminhos conforme necessário

3. **Testar Localmente:**
   ```bash
   npm run worker:build
   npm run worker:start
   ```

4. **Deploy em Cloud Run:**
   - Build da imagem: `gcloud builds submit --tag gcr.io/PROJECT_ID/baileys-worker`
   - Deploy com `--min-instances 1` para manter socket ativo
   - Ver detalhes em `worker/README.md`

### Observações Importantes

- O worker suporta múltiplas empresas simultaneamente
- Cada empresa mantém seu próprio socket Baileys
- Sessões são compartilhadas via Cloud Storage entre worker e Cloud Functions
- O worker descobre automaticamente empresas ativas e inicia workers para elas
- Verifica novas empresas a cada 1 minuto


