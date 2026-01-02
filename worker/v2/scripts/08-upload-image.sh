#!/bin/bash

# Script para enviar imagem Docker compilada para o servidor

set -e

PROJECT_ID="${PROJECT_ID:-agendamentointeligente-4405f}"
ZONE="${ZONE:-us-central1-a}"
VM_NAME="${VM_NAME:-evolution-api-v2-gcp}"

IMAGE_NAME="evolution-api-v2-custom:latest"
TAR_FILE="evolution-api-v2-image.tar"
COMPRESSED_TAR="${TAR_FILE}.gz"

echo "📤 Enviando imagem Docker para o servidor..."
echo ""

# Verificar se o arquivo tar existe
if [ ! -f "${TAR_FILE}" ] && [ ! -f "${COMPRESSED_TAR}" ]; then
    echo "❌ Arquivo ${TAR_FILE} não encontrado!"
    echo ""
    echo "💡 Execute primeiro:"
    echo "   bash scripts/build-image-local.sh"
    exit 1
fi

# Usar arquivo comprimido se existir
if [ -f "${COMPRESSED_TAR}" ]; then
    UPLOAD_FILE="${COMPRESSED_TAR}"
    echo "📦 Usando arquivo comprimido: ${COMPRESSED_TAR}"
else
    UPLOAD_FILE="${TAR_FILE}"
    echo "📦 Usando arquivo: ${TAR_FILE}"
    echo "💡 Dica: Comprimir o arquivo pode ser mais rápido: gzip ${TAR_FILE}"
fi

FILE_SIZE=$(du -h ${UPLOAD_FILE} | cut -f1)
echo "   Tamanho: ${FILE_SIZE}"
echo ""

# Verificar se a VM existe
if ! gcloud compute instances describe ${VM_NAME} --zone=${ZONE} --project=${PROJECT_ID} &>/dev/null; then
    echo "❌ VM ${VM_NAME} não encontrada!"
    exit 1
fi

# Enviar arquivo para VM
echo "📤 Enviando para ${VM_NAME}..."
echo "   Isso pode levar alguns minutos dependendo do tamanho do arquivo..."

gcloud compute scp \
    ${UPLOAD_FILE} \
    ${VM_NAME}:/tmp/${UPLOAD_FILE} \
    --zone=${ZONE} \
    --project=${PROJECT_ID}

if [ $? -ne 0 ]; then
    echo "❌ Erro ao enviar arquivo!"
    exit 1
fi

echo "✅ Arquivo enviado com sucesso!"
echo ""

# Fazer load da imagem no servidor
echo "📥 Carregando imagem no Docker do servidor..."

gcloud compute ssh ${VM_NAME} --zone=${ZONE} --project=${PROJECT_ID} --command="
cd /tmp

# Descomprimir se necessário
if [ -f '${COMPRESSED_TAR}' ]; then
    echo '📦 Descomprimindo arquivo...'
    gunzip -f ${COMPRESSED_TAR} || true
    LOAD_FILE='${TAR_FILE}'
else
    LOAD_FILE='${UPLOAD_FILE}'
fi

echo '📥 Carregando imagem no Docker...'
sudo docker load < \${LOAD_FILE}

if [ \$? -eq 0 ]; then
    echo '✅ Imagem carregada com sucesso!'
    # Limpar arquivo temporário
    rm -f ${TAR_FILE} ${COMPRESSED_TAR}
else
    echo '❌ Erro ao carregar imagem!'
    exit 1
fi
"

echo ""
echo "✅ Imagem enviada e carregada no servidor!"
echo ""
echo "📋 Próximo passo: Atualizar docker-compose.yml para usar a imagem local"
echo "   bash scripts/09-update-compose-image.sh"



