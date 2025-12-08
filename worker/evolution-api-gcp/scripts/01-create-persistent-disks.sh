#!/bin/bash

# Script para criar disco persistente único no GCP para Evolution API
# Este disco será montado na VM e usado para todos os dados (PostgreSQL, Redis, Evolution)

set -e

PROJECT_ID="${PROJECT_ID:-agendamentointeligente-4405f}"
ZONE="${ZONE:-us-central1-a}"
REGION="${REGION:-us-central1}"

# Tamanho do disco único (ajuste conforme necessário)
# 100GB é suficiente para PostgreSQL, Redis e instâncias do Evolution
DISK_SIZE="${DISK_SIZE:-100GB}"
DISK_TYPE="${DISK_TYPE:-pd-standard}"  # pd-standard ou pd-ssd (SSD é mais caro mas mais rápido)

# Nome do disco
DISK_NAME="evolution-data-disk"

echo "💾 Criando disco persistente único para Evolution API..."

# Verificar se o disco já existe
if gcloud compute disks describe ${DISK_NAME} --zone=${ZONE} --project=${PROJECT_ID} &>/dev/null; then
    echo "⚠️  Disco ${DISK_NAME} já existe, pulando..."
else
    echo "📦 Criando disco ${DISK_NAME} (${DISK_SIZE}, ${DISK_TYPE})..."
    gcloud compute disks create ${DISK_NAME} \
        --project=${PROJECT_ID} \
        --zone=${ZONE} \
        --size=${DISK_SIZE} \
        --type=${DISK_TYPE} \
        --labels=app=evolution-api
    echo "✅ Disco ${DISK_NAME} criado com sucesso!"
fi

echo ""
echo "✅ Disco persistente criado!"
echo ""
echo "📋 Disco criado:"
echo "   - ${DISK_NAME}: ${DISK_SIZE} (${DISK_TYPE})"
echo ""
echo "💰 Custo estimado mensal:"
if [ "${DISK_TYPE}" = "pd-ssd" ]; then
    echo "   - SSD ${DISK_SIZE}: ~\$17/mês (100GB SSD)"
else
    echo "   - Standard ${DISK_SIZE}: ~\$4/mês (100GB Standard)"
fi
echo ""
echo "📁 Estrutura do disco:"
echo "   /mnt/disks/evolution-data/"
echo "   ├── postgres/     (dados do PostgreSQL)"
echo "   ├── redis/        (dados do Redis)"
echo "   ├── instances/    (instâncias do WhatsApp)"
echo "   ├── logs/         (logs do Evolution API)"
echo "   └── tmp/          (arquivos temporários)"

