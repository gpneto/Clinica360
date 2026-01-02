#!/bin/bash

# Script para iniciar a VM e anexar o disco persistente

set -e

PROJECT_ID="${PROJECT_ID:-agendamentointeligente-4405f}"
ZONE="${ZONE:-us-central1-a}"
VM_NAME="${VM_NAME:-evolution-api-v2-gcp}"
DISK_NAME="${DISK_NAME:-evolution-data-disk}"

echo "🚀 Iniciando VM e anexando disco..."
echo "===================================="
echo ""
echo "📋 Configuração:"
echo "   VM: ${VM_NAME}"
echo "   Disco: ${DISK_NAME}"
echo "   Zona: ${ZONE}"
echo "   Projeto: ${PROJECT_ID}"
echo ""

# Verificar se a VM existe
if ! gcloud compute instances describe ${VM_NAME} --zone=${ZONE} --project=${PROJECT_ID} &>/dev/null; then
    echo "❌ VM ${VM_NAME} não encontrada!"
    echo "   Execute primeiro: bash scripts/02-create-vm.sh"
    exit 1
fi

# Verificar se o disco existe
if ! gcloud compute disks describe ${DISK_NAME} --zone=${ZONE} --project=${PROJECT_ID} &>/dev/null; then
    echo "❌ Disco ${DISK_NAME} não encontrado!"
    echo "   Execute primeiro: bash scripts/01-create-persistent-disks.sh"
    exit 1
fi

# Verificar status da VM
VM_STATUS=$(gcloud compute instances describe ${VM_NAME} --zone=${ZONE} --project=${PROJECT_ID} --format='get(status)')
echo "📊 Status atual da VM: ${VM_STATUS}"
echo ""

# Verificar se o disco está anexado
ATTACHED_DISKS=$(gcloud compute instances describe ${VM_NAME} --zone=${ZONE} --project=${PROJECT_ID} --format='get(disks[].source)' 2>/dev/null || echo "")
DISK_ATTACHED=false

if echo "$ATTACHED_DISKS" | grep -q "${DISK_NAME}"; then
    DISK_ATTACHED=true
    echo "ℹ️  Disco ${DISK_NAME} já está anexado à VM"
else
    echo "ℹ️  Disco ${DISK_NAME} não está anexado à VM"
fi

# Confirmar ação
read -p "Continuar? (s/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Ss]$ ]]; then
    echo "❌ Operação cancelada."
    exit 0
fi

# Parar a VM se estiver rodando (necessário para anexar disco)
if [ "$VM_STATUS" = "RUNNING" ]; then
    if [ "$DISK_ATTACHED" = false ]; then
        echo ""
        echo "⚠️  Para anexar o disco, é necessário parar a VM primeiro."
        echo "🛑 Parando VM ${VM_NAME}..."
        gcloud compute instances stop ${VM_NAME} --zone=${ZONE} --project=${PROJECT_ID}
        
        if [ $? -eq 0 ]; then
            echo "✅ VM parada com sucesso!"
            sleep 3
        else
            echo "❌ Erro ao parar a VM!"
            exit 1
        fi
    else
        echo "ℹ️  VM está rodando e disco já está anexado."
    fi
else
    echo "ℹ️  VM já está parada (status: ${VM_STATUS})"
fi

# Anexar disco se não estiver anexado
if [ "$DISK_ATTACHED" = false ]; then
    echo ""
    echo "📦 Anexando disco ${DISK_NAME} à VM..."
    
    gcloud compute instances attach-disk ${VM_NAME} \
        --disk=${DISK_NAME} \
        --zone=${ZONE} \
        --project=${PROJECT_ID}
    
    if [ $? -eq 0 ]; then
        echo "✅ Disco ${DISK_NAME} anexado com sucesso!"
    else
        echo "❌ Erro ao anexar o disco!"
        exit 1
    fi
fi

# Iniciar a VM se estiver parada
if [ "$VM_STATUS" != "RUNNING" ]; then
    echo ""
    echo "🚀 Iniciando VM ${VM_NAME}..."
    gcloud compute instances start ${VM_NAME} --zone=${ZONE} --project=${PROJECT_ID}
    
    if [ $? -eq 0 ]; then
        echo "✅ VM iniciada com sucesso!"
        
        # Aguardar VM iniciar completamente
        echo "⏳ Aguardando VM iniciar completamente..."
        sleep 10
        
        # Obter IP externo
        EXTERNAL_IP=$(gcloud compute instances describe ${VM_NAME} --zone=${ZONE} --project=${PROJECT_ID} --format='get(networkInterfaces[0].accessConfigs[0].natIP)' 2>/dev/null || echo "obtendo...")
        echo "🌐 IP Externo: ${EXTERNAL_IP}"
    else
        echo "❌ Erro ao iniciar a VM!"
        exit 1
    fi
else
    echo "ℹ️  VM já está rodando"
    EXTERNAL_IP=$(gcloud compute instances describe ${VM_NAME} --zone=${ZONE} --project=${PROJECT_ID} --format='get(networkInterfaces[0].accessConfigs[0].natIP)' 2>/dev/null || echo "obtendo...")
    echo "🌐 IP Externo: ${EXTERNAL_IP}"
fi

echo ""
echo "✅ Processo concluído!"
echo ""
echo "📋 Status final:"
echo "   VM: $(gcloud compute instances describe ${VM_NAME} --zone=${ZONE} --project=${PROJECT_ID} --format='get(status)' 2>/dev/null)"
echo "   IP: ${EXTERNAL_IP}"
echo "   Disco: ${DISK_NAME} anexado"
echo ""
echo "💡 Próximos passos:"
echo "   - Acesse a VM: gcloud compute ssh ${VM_NAME} --zone=${ZONE}"
echo "   - Para fazer deploy: bash scripts/05-deploy.sh"

