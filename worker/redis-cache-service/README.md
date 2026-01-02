# Redis Cache Service

Serviço intermediário em Python que mantém uma conexão Redis sempre aberta, expondo uma API REST para operações de cache. Isso elimina a latência de conexão que ocorre quando as Cloud Functions se conectam diretamente ao Redis.

## Características

- ✅ Conexão Redis persistente (sempre aberta)
- ✅ API REST simples e rápida
- ✅ Autenticação via header `X-API-Key`
- ✅ Health check endpoint
- ✅ Timeout configurável
- ✅ Logs detalhados

## Endpoints

### `GET /health`
Verifica a saúde do serviço e conexão Redis.

**Resposta:**
```json
{
  "status": "healthy",
  "redis": "connected"
}
```

### `POST /cache/get`
Obtém um valor do cache.

**Headers:**
- `X-API-Key`: Chave de autenticação
- `Content-Type`: application/json

**Body:**
```json
{
  "key": "company:settings:123"
}
```

**Resposta:**
```json
{
  "found": true,
  "value": { ... }
}
```

### `POST /cache/set`
Define um valor no cache.

**Headers:**
- `X-API-Key`: Chave de autenticação
- `Content-Type`: application/json

**Body:**
```json
{
  "key": "company:settings:123",
  "value": { ... },
  "ttl": 300
}
```

**Resposta:**
```json
{
  "success": true,
  "key": "company:settings:123",
  "ttl": 300
}
```

### `POST /cache/delete`
Remove uma chave do cache.

**Headers:**
- `X-API-Key`: Chave de autenticação
- `Content-Type`: application/json

**Body:**
```json
{
  "key": "company:settings:123"
}
```

**Resposta:**
```json
{
  "success": true,
  "deleted": true
}
```

## Variáveis de Ambiente

| Variável | Descrição | Padrão |
|----------|-----------|--------|
| `REDIS_HOST` | Host do Redis | `localhost` |
| `REDIS_PORT` | Porta do Redis | `6379` |
| `REDIS_PASSWORD` | Senha do Redis | (vazio) |
| `REDIS_DB` | Database do Redis | `1` |
| `REDIS_SERVICE_API_KEY` | Chave de autenticação da API | `SmartDoctorRedisService2024!Secure` |
| `PORT` | Porta do serviço | `8080` |

## Deploy

O serviço é automaticamente incluído no `docker-compose.yml` e sobe junto com os outros serviços.

### Build manual

```bash
cd worker/redis-cache-service
docker build -t redis-cache-service .
```

### Executar localmente

```bash
cd worker/redis-cache-service
pip install -r requirements.txt
python main.py
```

## Configuração nas Cloud Functions

Adicione as seguintes variáveis de ambiente nas Cloud Functions:

```bash
REDIS_SERVICE_URL=http://<IP_DA_VM>:8081
REDIS_SERVICE_API_KEY=SmartDoctorRedisService2024!Secure
```

O código das Functions automaticamente:
1. Tenta usar o serviço HTTP primeiro
2. Faz fallback para conexão direta se o serviço não estiver disponível
3. Verifica a disponibilidade do serviço a cada 60 segundos

## Firewall

Certifique-se de que a porta `8081` está aberta no firewall do GCP:

```bash
gcloud compute firewall-rules create allow-redis-cache-service \
    --direction=INGRESS \
    --priority=1000 \
    --network=default \
    --action=ALLOW \
    --rules=tcp:8081 \
    --source-ranges=0.0.0.0/0 \
    --target-tags=http-server,https-server
```

Ou use o script:

```bash
./scripts/03-setup-firewall.sh
```

## Logs

Ver logs do serviço:

```bash
docker logs redis-cache-service -f
```

Ou via docker-compose:

```bash
docker compose logs -f redis-cache-service
```
