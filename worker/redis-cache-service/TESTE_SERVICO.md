# 🧪 Como Testar o Redis Cache Service

## 🌐 URL do Serviço: http://34.42.180.145:8081

## 📋 Endpoints Disponíveis

### 1. Health Check (GET)

Verifica se o serviço e Redis estão funcionando:

```bash
curl http://34.42.180.145:8081/health
```

**Resposta esperada:**
```json
{
  "status": "healthy",
  "redis": "connected"
}
```

### 2. Root (GET)

Informações básicas do serviço:

```bash
curl http://34.42.180.145:8081/
```

**Resposta esperada:**
```json
{
  "service": "Redis Cache Service",
  "version": "1.0.0",
  "status": "running"
}
```

### 3. Set Cache (POST)

Salva um valor no cache:

```bash
curl -X POST http://34.42.180.145:8081/cache/set \
  -H "Content-Type: application/json" \
  -H "X-API-Key: SmartDoctorRedisService2024!Secure" \
  -d '{
    "key": "test:key",
    "value": {
      "message": "Hello Redis Cache Service",
      "timestamp": 1234567890
    },
    "ttl": 60
  }'
```

**Resposta esperada:**
```json
{
  "success": true,
  "key": "test:key",
  "ttl": 60
}
```

### 4. Get Cache (POST)

Obtém um valor do cache:

```bash
curl -X POST http://34.42.180.145:8081/cache/get \
  -H "Content-Type: application/json" \
  -H "X-API-Key: SmartDoctorRedisService2024!Secure" \
  -d '{
    "key": "test:key"
  }'
```

**Resposta esperada (se encontrado):**
```json
{
  "found": true,
  "value": {
    "message": "Hello Redis Cache Service",
    "timestamp": 1234567890
  }
}
```

**Resposta esperada (se não encontrado):**
```json
{
  "found": false,
  "value": null
}
```

### 5. Delete Cache (POST)

Remove uma chave do cache:

```bash
curl -X POST http://34.42.180.145:8081/cache/delete \
  -H "Content-Type: application/json" \
  -H "X-API-Key: SmartDoctorRedisService2024!Secure" \
  -d '{
    "key": "test:key"
  }'
```

**Resposta esperada:**
```json
{
  "success": true,
  "deleted": true
}
```

## 🔐 Autenticação

Todos os endpoints de cache (exceto `/health` e `/`) requerem o header:

```
X-API-Key: SmartDoctorRedisService2024!Secure
```

## 🧪 Script de Teste Completo

Crie um arquivo `test-redis-service.sh`:

```bash
#!/bin/bash

API_URL="http://34.42.180.145:8081"
API_KEY="SmartDoctorRedisService2024!Secure"

echo "🧪 Testando Redis Cache Service..."
echo ""

# 1. Health Check
echo "1️⃣  Health Check:"
curl -s "${API_URL}/health" | python3 -m json.tool
echo ""

# 2. Root
echo "2️⃣  Root:"
curl -s "${API_URL}/" | python3 -m json.tool
echo ""

# 3. Set Cache
echo "3️⃣  Set Cache:"
curl -s -X POST "${API_URL}/cache/set" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: ${API_KEY}" \
  -d "{
    \"key\": \"test:$(date +%s)\",
    \"value\": {
      \"message\": \"Teste do Redis Cache Service\",
      \"timestamp\": $(date +%s)
    },
    \"ttl\": 60
  }" | python3 -m json.tool
echo ""

# 4. Get Cache (usando a mesma chave)
TEST_KEY="test:$(date +%s)"
echo "4️⃣  Set e Get Cache:"
SET_RESULT=$(curl -s -X POST "${API_URL}/cache/set" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: ${API_KEY}" \
  -d "{
    \"key\": \"${TEST_KEY}\",
    \"value\": {
      \"message\": \"Teste completo\",
      \"data\": \"$(date)\"
    },
    \"ttl\": 60
  }")

echo "Set result:"
echo "$SET_RESULT" | python3 -m json.tool
echo ""

sleep 1

GET_RESULT=$(curl -s -X POST "${API_URL}/cache/get" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: ${API_KEY}" \
  -d "{\"key\": \"${TEST_KEY}\"}")

echo "Get result:"
echo "$GET_RESULT" | python3 -m json.tool
echo ""

# 5. Delete Cache
echo "5️⃣  Delete Cache:"
DELETE_RESULT=$(curl -s -X POST "${API_URL}/cache/delete" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: ${API_KEY}" \
  -d "{\"key\": \"${TEST_KEY}\"}")
echo "$DELETE_RESULT" | python3 -m json.tool
echo ""

# 6. Verificar se foi deletado
echo "6️⃣  Verificar se foi deletado:"
curl -s -X POST "${API_URL}/cache/get" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: ${API_KEY}" \
  -d "{\"key\": \"${TEST_KEY}\"}" | python3 -m json.tool
echo ""

echo "✅ Testes concluídos!"
```

Execute com:
```bash
chmod +x test-redis-service.sh
./test-redis-service.sh
```

## ❌ Testando Erros

### Teste sem API Key (deve retornar 401):

```bash
curl -X POST http://34.42.180.145:8081/cache/get \
  -H "Content-Type: application/json" \
  -d '{"key":"test:key"}'
```

### Teste com API Key inválida (deve retornar 401):

```bash
curl -X POST http://34.42.180.145:8081/cache/get \
  -H "Content-Type: application/json" \
  -H "X-API-Key: chave-invalida" \
  -d '{"key":"test:key"}'
```

## 📊 Monitoramento

Para ver os logs do serviço na VM:

```bash
gcloud compute ssh evolution-api-gcp --zone=us-central1-a --command="docker logs redis-cache-service -f"
```

## ✅ Checklist de Testes

- [ ] Health check retorna `healthy`
- [ ] Root endpoint retorna informações do serviço
- [ ] Set cache salva com sucesso
- [ ] Get cache retorna o valor salvo
- [ ] Delete cache remove a chave
- [ ] Get após delete retorna `found: false`
- [ ] Erro 401 sem API Key
- [ ] Erro 401 com API Key inválida

