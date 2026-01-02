#!/bin/bash

# Script para verificar o status do build na VM

set -e

PROJECT_ID="${PROJECT_ID:-agendamentointeligente-4405f}"
ZONE="${ZONE:-us-central1-a}"
VM_NAME="${VM_NAME:-evolution-api-v2-gcp}"

echo "🔍 Verificando status do build na VM ${VM_NAME}..."
echo ""

gcloud compute ssh ${VM_NAME} --zone=${ZONE} --project=${PROJECT_ID} --command="
echo '📦 Containers Docker:'
sudo docker ps -a
echo ''
echo '🖼️  Imagens Docker (últimas 5):'
sudo docker images | head -6
echo ''
echo '🔨 Processos Docker Build (se houver):'
sudo ps aux | grep -i 'docker.*build' | grep -v grep || echo '   Nenhum processo de build ativo'
echo ''
echo '📊 Uso de recursos:'
echo '   CPU e Memória:'
top -bn1 | head -5
echo ''
echo '💾 Espaço em disco:'
df -h / | tail -1
"

