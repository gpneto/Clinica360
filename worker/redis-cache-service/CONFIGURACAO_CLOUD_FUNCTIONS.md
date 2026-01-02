# Configuração do Redis Cache Service nas Cloud Functions

Para usar o serviço Redis Cache Service nas Cloud Functions, você precisa configurar as variáveis de ambiente.

## Passo 1: Obter o IP da VM

```bash
gcloud compute instances describe evolution-api-gcp \
    --zone=us-central1-a \
    --format='get(networkInterfaces[0].accessConfigs[0].natIP)'
```

Ou se preferir usar o IP interno (mais rápido):

```bash
gcloud compute instances describe evolution-api-gcp \
    --zone=us-central1-a \
    --format='get(networkInterfaces[0].networkIP)'
```

## Passo 2: Configurar Variáveis de Ambiente

### Opção A: Via Firebase Console

1. Acesse o [Firebase Console](https://console.firebase.google.com)
2. Vá em **Functions** > **Configurações**
3. Adicione as seguintes variáveis:

```
REDIS_SERVICE_URL=http://34.42.180.145:8081
REDIS_SERVICE_API_KEY=SmartDoctorRedisService2024!Secure
```

**Nota:** Se estiver usando IP interno, use: `http://<IP_INTERNO>:8081`

### Opção B: Via Firebase CLI

```bash
firebase functions:config:set \
    redis_service.url="http://34.42.180.145:8081" \
    redis_service.api_key="SmartDoctorRedisService2024!Secure"
```

**Nota:** Se usar `functions:config:set`, você precisará acessar via `functions.config().redis_service.url` no código.

**⚠️ IMPORTANTE:** As Cloud Functions do Firebase usam variáveis de ambiente diretamente via `process.env`, não via `functions.config()`. Use a **Opção D** abaixo.

### Opção C: Via .env.local (desenvolvimento)

Crie um arquivo `.env.local` na pasta `functions/`:

```bash
REDIS_SERVICE_URL=http://localhost:8081
REDIS_SERVICE_API_KEY=SmartDoctorRedisService2024!Secure
```

### Opção D: Via Firebase Functions Environment (Recomendado)

Configure as variáveis de ambiente diretamente:

```bash
firebase functions:secrets:set REDIS_SERVICE_URL
# Quando solicitado, digite: http://34.42.180.145:8081

firebase functions:secrets:set REDIS_SERVICE_API_KEY
# Quando solicitado, digite: SmartDoctorRedisService2024!Secure
```

Ou configure via `.env` no diretório `functions/` e use o script de deploy que lê essas variáveis.

**Alternativa mais simples:** Configure diretamente no código ou via variáveis de ambiente do Firebase Functions (seção Runtime Config).

## Passo 3: Verificar Configuração

O código das Functions automaticamente:
1. ✅ Tenta usar o serviço HTTP primeiro
2. ✅ Faz fallback para conexão direta se o serviço não estiver disponível
3. ✅ Verifica a disponibilidade do serviço a cada 60 segundos

## Passo 4: Testar

Após fazer deploy, verifique os logs:

```bash
firebase functions:log --only evolutionWebhook
```

Você deve ver mensagens como:
- `[Redis] Serviço HTTP disponível, usando para cache`
- `[Redis HTTP] Cache HIT para "company:123:settings" (45ms)`

## Troubleshooting

### Serviço não está sendo usado

1. Verifique se a variável `REDIS_SERVICE_URL` está configurada
2. Verifique se o serviço está rodando na VM:
   ```bash
   gcloud compute ssh evolution-api-gcp --zone=us-central1-a --command="docker ps | grep redis-cache-service"
   ```
3. Verifique se a porta 8081 está aberta no firewall
4. Teste o health check:
   ```bash
   curl http://<IP_DA_VM>:8081/health
   ```

### Timeout ou conexão recusada

1. Verifique o firewall:
   ```bash
   gcloud compute firewall-rules list --filter="name:allow-redis-cache-service"
   ```
2. Verifique os logs do serviço:
   ```bash
   gcloud compute ssh evolution-api-gcp --zone=us-central1-a --command="docker logs redis-cache-service"
   ```

### Usando IP interno vs externo

- **IP Externo:** Mais fácil de configurar, mas pode ter latência maior
- **IP Interno:** Mais rápido, mas requer que as Functions estejam na mesma rede VPC

Para usar IP interno, você precisa:
1. Configurar VPC Connector nas Cloud Functions
2. Usar o IP interno na variável `REDIS_SERVICE_URL`

## Atualizar IP quando a VM reinicia

Se a VM receber um novo IP externo, você precisa atualizar a variável de ambiente:

```bash
# Obter novo IP
NEW_IP=$(gcloud compute instances describe evolution-api-gcp \
    --zone=us-central1-a \
    --format='get(networkInterfaces[0].accessConfigs[0].natIP)')

# Atualizar variável de ambiente
firebase functions:config:set redis_service.url="http://${NEW_IP}:8081"

# Fazer redeploy
firebase deploy --only functions
```

Ou crie um script automatizado para isso.

