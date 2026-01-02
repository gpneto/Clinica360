#!/bin/bash

# Script para atualizar docker-compose.yml para usar a imagem local compilada

set -e

PROJECT_ID="${PROJECT_ID:-agendamentointeligente-4405f}"
ZONE="${ZONE:-us-central1-a}"
VM_NAME="${VM_NAME:-evolution-api-v2-gcp}"

IMAGE_NAME="evolution-api-v2-custom:latest"

echo "🔧 Atualizando docker-compose.yml para usar imagem local..."
echo ""

# Copiar docker-compose.image.yml para a VM
echo "📝 Enviando docker-compose.yml atualizado..."

# Copiar o arquivo docker-compose.image.yml
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
gcloud compute scp \
    ${SCRIPT_DIR}/docker-compose.image.yml \
    ${VM_NAME}:/opt/evolution-api-v2-gcp/docker-compose.yml \
    --zone=${ZONE} \
    --project=${PROJECT_ID}

# Método alternativo - atualizar diretamente na VM
gcloud compute ssh ${VM_NAME} --zone=${ZONE} --project=${PROJECT_ID} --command="
cd /opt/evolution-api-v2-gcp

# Backup do arquivo original
if [ -f docker-compose.yml ]; then
    cp docker-compose.yml docker-compose.yml.backup.\$(date +%Y%m%d_%H%M%S)
fi

# Se docker-compose.image.yml existe, usar ele
if [ -f docker-compose.image.yml ]; then
    cp docker-compose.image.yml docker-compose.yml
    echo '✅ docker-compose.yml atualizado usando docker-compose.image.yml'
else
    # Método alternativo: substituir build por image usando sed
    sed -i 's|build:|image: evolution-api-v2-custom:latest|' docker-compose.yml
    sed -i '/context:.*evolution-api-src/d' docker-compose.yml
    sed -i '/dockerfile:.*Dockerfile/d' docker-compose.yml
    sed -i '/args:/d' docker-compose.yml
    sed -i '/BUILDKIT_INLINE_CACHE/d' docker-compose.yml
    echo '✅ docker-compose.yml atualizado usando sed'
fi

echo ''
echo '📋 Verificando alterações:'
grep -A 2 'evolution-api:' docker-compose.yml | head -4
"
# docker-compose.yml será atualizado para usar imagem local
# Esta versão usa a imagem já compilada ao invés de fazer build dos fontes

services:
  # PostgreSQL Database
  postgres:
    image: postgres:15-alpine
    platform: linux/arm64
    container_name: evolution-v2-postgres
    restart: unless-stopped
    ports:
      - "5432:5432"
    environment:
      - POSTGRES_DB=evolution
      - POSTGRES_USER=evolution
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD:-evolution123}
      - PGDATA=/var/lib/postgresql/data/pgdata
    volumes:
      - /mnt/disks/evolution-data/postgres:/var/lib/postgresql/data
      - ./config/postgresql.conf:/etc/postgresql/postgresql.conf:ro
      - ./config/pg_hba.conf:/etc/postgresql/pg_hba.conf:ro
    networks:
      - evolution-v2-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U evolution"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 30s
    command: postgres -c listen_addresses='*' -c max_connections=200
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

  # Redis Cache
  redis:
    image: redis:7-alpine
    platform: linux/arm64
    container_name: evolution-v2-redis
    restart: unless-stopped
    volumes:
      - /mnt/disks/evolution-data/redis:/data
    networks:
      - evolution-v2-network
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 10s
    command: redis-server --appendonly yes --appendfsync always --maxmemory 512mb --maxmemory-policy allkeys-lru --save 60 1000 --save 300 10 --save 900 1
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

  # Evolution API - Usando imagem local compilada
  evolution-api:
    image: evolution-api-v2-custom:latest
    platform: linux/arm64
    container_name: evolution-v2-api
    restart: unless-stopped
    depends_on:
      redis:
        condition: service_healthy
      postgres:
        condition: service_healthy
EOFCOMPOSE

# Ler o resto do docker-compose.yml original (environment, volumes, etc)
# Vamos usar sed para substituir apenas a parte do build
echo "📝 Atualizando docker-compose.yml na VM..."

gcloud compute ssh ${VM_NAME} --zone=${ZONE} --project=${PROJECT_ID} --command="
cd /opt/evolution-api-v2-gcp

# Backup do arquivo original
cp docker-compose.yml docker-compose.yml.backup

# Substituir a seção de build por image
sed -i '/evolution-api:/,/platform: linux\/arm64/ {
    /build:/,/platform: linux\/arm64/ {
        /build:/ {
            i\
    image: ${IMAGE_NAME}
            d
        }
        /context:/d
        /dockerfile:/d
        /platform: linux\/arm64/d
    }
}' docker-compose.yml 2>/dev/null || {
    # Se sed não funcionar, usar método alternativo
    echo 'Usando método alternativo...'
    python3 << 'PYEOF'
import re
with open('docker-compose.yml', 'r') as f:
    content = f.read()

# Substituir build por image
pattern = r'evolution-api:.*?build:.*?platform: linux/arm64'
replacement = f'''evolution-api:
    image: ${IMAGE_NAME}
    platform: linux/arm64'''

content = re.sub(pattern, replacement, content, flags=re.DOTALL)

with open('docker-compose.yml', 'w') as f:
    f.write(content)
PYEOF
}

echo '✅ docker-compose.yml atualizado!'
echo ''
echo '📋 Verificando alterações:'
grep -A 3 'evolution-api:' docker-compose.yml | head -5
"

echo ""
echo "✅ docker-compose.yml atualizado para usar a imagem local!"
echo ""
echo "📋 Próximo passo: Reiniciar os containers"
echo "   gcloud compute ssh ${VM_NAME} --zone=${ZONE} --project=${PROJECT_ID} \\"
echo "     --command='cd /opt/evolution-api-v2-gcp && sudo docker compose up -d --force-recreate evolution-api'"

