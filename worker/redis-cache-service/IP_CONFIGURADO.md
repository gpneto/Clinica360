# ✅ IP da VM Configurado

## 🌐 IP da VM: `34.42.180.145`

Este IP foi configurado em todos os arquivos relevantes.

## 📋 Configuração Completa

### Variáveis de Ambiente para Cloud Functions

```
REDIS_SERVICE_URL=http://34.42.180.145:8081
REDIS_SERVICE_API_KEY=SmartDoctorRedisService2024!Secure
```

## 🚀 Próximos Passos

### 1. Fazer Deploy do Serviço na VM

```bash
cd worker/evolution-api-gcp

# Configurar firewall (se ainda não foi feito)
./scripts/03-setup-firewall.sh

# Fazer deploy completo
./scripts/05-deploy.sh
```

### 2. Verificar se o Serviço Está Rodando

```bash
# Testar health check
curl http://34.42.180.145:8081/health

# Deve retornar:
# {"status":"healthy","redis":"connected"}
```

### 3. Configurar Cloud Functions

**Opção A: Via Firebase Console (Recomendado)**
1. Acesse: https://console.firebase.google.com
2. Vá em **Functions** > **Configurações** > **Runtime Config**
3. Adicione:
   - `REDIS_SERVICE_URL` = `http://34.42.180.145:8081`
   - `REDIS_SERVICE_API_KEY` = `SmartDoctorRedisService2024!Secure`

**Opção B: Via Script**
```bash
cd worker/evolution-api-gcp
./scripts/08-config-redis-service.sh
```

**Opção C: Via arquivo .env**
```bash
cd functions
echo "REDIS_SERVICE_URL=http://34.42.180.145:8081" >> .env
echo "REDIS_SERVICE_API_KEY=SmartDoctorRedisService2024!Secure" >> .env
```

### 4. Fazer Deploy das Functions

```bash
firebase deploy --only functions
```

## ✅ Verificação

Após o deploy, verifique os logs:

```bash
firebase functions:log --only evolutionWebhook
```

Você deve ver mensagens como:
- `[Redis] Serviço HTTP disponível, usando para cache`
- `[Redis HTTP] Cache HIT para "company:123:settings" (45ms)`

## 🔄 Se o IP Mudar

Se a VM receber um novo IP, atualize:

1. Execute o script:
   ```bash
   cd worker/evolution-api-gcp
   ./scripts/07-update-redis-service-url.sh
   ```

2. Ou atualize manualmente nas variáveis de ambiente das Functions

3. Faça redeploy:
   ```bash
   firebase deploy --only functions
   ```

## 📝 Arquivos Atualizados

- ✅ `CONFIGURACAO_CLOUD_FUNCTIONS.md` - IP atualizado
- ✅ `CONFIGURACAO_RAPIDA.md` - Criado com IP
- ✅ `scripts/07-update-redis-service-url.sh` - IP padrão configurado
- ✅ `scripts/08-config-redis-service.sh` - Script de configuração criado

