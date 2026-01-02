#!/bin/bash

# Script para verificar/criar disco persistente no GCP para Evolution API v2
# NOTA: Esta versão usa o MESMO disco da versão original para manter os dados

set -e

PROJECT_ID="${PROJECT_ID:-agendamentointeligente-4405f}"
ZONE="${ZONE:-us-central1-a}"
REGION="${REGION:-us-central1}"

# Usar o MESMO disco da versão original para manter os dados
DISK_NAME="evolution-data-disk"

echo "💾 Verificando disco persistente para Evolution API v2..."
echo "📌 Usando o MESMO disco da versão original: ${DISK_NAME}"
echo "   Isso permite compartilhar os dados existentes entre as versões."

# Verificar se o disco existe
if gcloud compute disks describe ${DISK_NAME} --zone=${ZONE} --project=${PROJECT_ID} &>/dev/null; then
    echo "✅ Disco ${DISK_NAME} encontrado!"
    echo ""
    echo "📋 Informações do disco:"
    gcloud compute disks describe ${DISK_NAME} --zone=${ZONE} --project=${PROJECT_ID} \
        --format="value(sizeGb,type)" | while read size type; do
        echo "   - Nome: ${DISK_NAME}"
        echo "   - Tamanho: ${size}GB"
        echo "   - Tipo: ${type}"
    done
else
    echo "❌ Disco ${DISK_NAME} não encontrado!"
    echo ""
    echo "⚠️  ATENÇÃO: O disco da versão original não existe."
    echo "   Isso significa que você precisa criar o disco primeiro na versão original,"
    echo "   ou criar este disco agora (isso criará um novo disco vazio)."
    echo ""
    read -p "Deseja criar o disco agora? (s/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Ss]$ ]]; then
        DISK_SIZE="${DISK_SIZE:-100GB}"
        DISK_TYPE="${DISK_TYPE:-pd-standard}"
        echo "📦 Criando disco ${DISK_NAME} (${DISK_SIZE}, ${DISK_TYPE})..."
        gcloud compute disks create ${DISK_NAME} \
            --project=${PROJECT_ID} \
            --zone=${ZONE} \
            --size=${DISK_SIZE} \
            --type=${DISK_TYPE} \
            --labels=app=evolution-api
        echo "✅ Disco ${DISK_NAME} criado com sucesso!"
    else
        echo "❌ Abortando. Crie o disco primeiro ou use a versão original."
        exit 1
    fi
fi

echo ""
echo "✅ Verificação do disco concluída!"
echo ""
echo "📁 Estrutura do disco (compartilhada):"
echo "   /mnt/disks/evolution-data/"
echo "   ├── postgres/     (dados do PostgreSQL)"
echo "   ├── redis/        (dados do Redis)"
echo "   ├── instances/    (instâncias do WhatsApp)"
echo "   ├── logs/         (logs do Evolution API)"
echo "   ├── tmp/          (arquivos temporários)"
echo "   ├── database/     (database local)"
echo "   └── messages/     (mensagens salvas)"

