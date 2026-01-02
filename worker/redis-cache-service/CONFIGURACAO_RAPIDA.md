# ⚡ Configuração Rápida - Redis Cache Service

## IP da VM: `34.42.180.145`

### 📋 Variáveis de Ambiente para Cloud Functions

Configure estas variáveis nas Cloud Functions:

```
REDIS_SERVICE_URL=http://34.42.180.145:8081
REDIS_SERVICE_API_KEY=SmartDoctorRedisService2024!Secure
```

## 🚀 Passos Rápidos

### 1. Configurar via Firebase Console

1. Acesse: https://console.firebase.google.com
2. Selecione seu projeto
3. Vá em **Functions** > **Configurações** > **Runtime Config**
4. Adicione as variáveis acima

### 2. Ou criar arquivo `.env` na pasta `functions/`

```bash
cd functions
cat > .env << EOF
REDIS_SERVICE_URL=http://34.42.180.145:8081
REDIS_SERVICE_API_KEY=SmartDoctorRedisService2024!Secure
EOF
```

### 3. Fazer deploy

```bash
firebase deploy --only functions
```

## 🧪 Testar

```bash
# Testar se o serviço está acessível
curl http://34.42.180.145:8081/health

# Deve retornar:
# {"status":"healthy","redis":"connected"}
```

## 📝 Notas

- O serviço precisa estar rodando na VM (porta 8081)
- O firewall precisa permitir conexões na porta 8081
- Após configurar, as Functions usarão automaticamente o serviço HTTP quando disponível

## 🔄 Se o IP mudar

Execute o script:

```bash
cd worker/evolution-api-gcp
./scripts/07-update-redis-service-url.sh
```

