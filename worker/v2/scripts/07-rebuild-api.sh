#!/bin/bash

# Script para fazer rebuild apenas do Evolution API após modificar os fontes

set -e

PROJECT_ID="${PROJECT_ID:-agendamentointeligente-4405f}"
ZONE="${ZONE:-us-central1-a}"
VM_NAME="${VM_NAME:-evolution-api-v2-gcp}"

echo "🔨 Fazendo rebuild do Evolution API..."

# Verificar se os fontes locais foram modificados e precisam ser copiados
read -p "Deseja copiar os fontes atualizados para a VM? (s/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Ss]$ ]]; then
    echo "📦 Compactando e enviando fontes atualizados para VM..."
    
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
    
    if [ ! -d "${SCRIPT_DIR}/evolution-api-src" ]; then
        echo "❌ Erro: Diretório evolution-api-src não encontrado!"
        exit 1
    fi
    
    # Compactar fontes
    ZIP_FILE="/tmp/evolution-api-src-$(date +%s).zip"
    cd "${SCRIPT_DIR}"
    zip -r -q "${ZIP_FILE}" evolution-api-src/ -x "evolution-api-src/node_modules/*" "evolution-api-src/dist/*" "evolution-api-src/.git/*" "evolution-api-src/*.log" "evolution-api-src/.env"
    
    ZIP_SIZE=$(du -h "${ZIP_FILE}" | cut -f1)
    echo "   Arquivo compactado: ${ZIP_SIZE}"
    
    # Enviar arquivo compactado
    gcloud compute scp \
        ${ZIP_FILE} \
        ${VM_NAME}:/tmp/evolution-api-src.zip \
        --zone=${ZONE} \
        --project=${PROJECT_ID}
    
    if [ $? -ne 0 ]; then
        echo "❌ Erro ao enviar fontes!"
        rm -f "${ZIP_FILE}"
        exit 1
    fi
    
    # Limpar arquivo local
    rm -f "${ZIP_FILE}"
    
    # Descompactar na VM
    echo "📦 Descompactando fontes na VM..."
    gcloud compute ssh ${VM_NAME} --zone=${ZONE} --project=${PROJECT_ID} --command="
    cd /opt/evolution-api-v2-gcp
    
    # Instalar unzip se necessário
    if ! command -v unzip &> /dev/null; then
        sudo apt-get update -qq
        sudo apt-get install -y unzip -qq
    fi
    
    # Descompactar (sobrescrever arquivos existentes)
    unzip -q -o /tmp/evolution-api-src.zip -d .
    rm -f /tmp/evolution-api-src.zip
    
    echo '✅ Fontes atualizados!'
    "
    
    echo "✅ Fontes copiados e descompactados!"
fi

# Fazer rebuild na VM
echo "🔨 Fazendo build da imagem na VM..."
echo "⏳ Isso pode levar alguns minutos..."

gcloud compute ssh ${VM_NAME} --zone=${ZONE} --project=${PROJECT_ID} --command="
cd /opt/evolution-api-v2-gcp

# Verificar se os fontes existem
if [ ! -d 'evolution-api-src' ]; then
    echo '❌ Erro: Diretório evolution-api-src não encontrado na VM!'
    exit 1
fi

# Fazer build
echo '🔨 Iniciando build...'
sudo docker compose build --progress=plain evolution-api

if [ \$? -eq 0 ]; then
    echo '✅ Build concluído com sucesso!'
    echo '🚀 Reiniciando container...'
    sudo docker compose up -d --force-recreate evolution-api
    echo '✅ Container reiniciado!'
else
    echo '❌ Erro ao fazer build!'
    exit 1
fi
"

echo ""
echo "✅ Rebuild concluído!"
echo ""
echo "📋 Ver logs:"
echo "   gcloud compute ssh ${VM_NAME} --zone=${ZONE} --project=${PROJECT_ID} --command='cd /opt/evolution-api-v2-gcp && sudo docker compose logs -f evolution-api'"

