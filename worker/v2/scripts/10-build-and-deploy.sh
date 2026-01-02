#!/bin/bash

# Script completo: Build local + Upload + Deploy

set -e

echo "🚀 Build e Deploy Completo do Evolution API v2"
echo "=============================================="
echo ""

# Passo 1: Build local
echo "📦 Passo 1/4: Fazendo build local da imagem..."
bash scripts/build-image-local.sh

if [ $? -ne 0 ]; then
    echo "❌ Erro no build local!"
    exit 1
fi

# Passo 2: Upload para servidor
echo ""
echo "📤 Passo 2/4: Enviando imagem para servidor..."
bash scripts/08-upload-image.sh

if [ $? -ne 0 ]; then
    echo "❌ Erro ao enviar imagem!"
    exit 1
fi

# Passo 3: Atualizar docker-compose
echo ""
echo "🔧 Passo 3/4: Atualizando docker-compose.yml..."
bash scripts/09-update-compose-image.sh

if [ $? -ne 0 ]; then
    echo "❌ Erro ao atualizar docker-compose!"
    exit 1
fi

# Passo 4: Reiniciar containers
PROJECT_ID="${PROJECT_ID:-agendamentointeligente-4405f}"
ZONE="${ZONE:-us-central1-a}"
VM_NAME="${VM_NAME:-evolution-api-v2-gcp}"

echo ""
echo "🔄 Passo 4/4: Reiniciando containers..."

gcloud compute ssh ${VM_NAME} --zone=${ZONE} --project=${PROJECT_ID} --command="
cd /opt/evolution-api-v2-gcp
sudo docker compose up -d --force-recreate evolution-api
"

echo ""
echo "✅ Deploy completo finalizado!"
echo ""
echo "📋 Ver logs:"
echo "   gcloud compute ssh ${VM_NAME} --zone=${ZONE} --project=${PROJECT_ID} --command='cd /opt/evolution-api-v2-gcp && sudo docker compose logs -f evolution-api'"



