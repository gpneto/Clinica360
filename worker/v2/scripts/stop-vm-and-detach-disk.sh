#!/bin/bash

# Script para parar a VM e desanexar o disco persistente

set -e

PROJECT_ID="${PROJECT_ID:-agendamentointeligente-4405f}"
ZONE="${ZONE:-us-central1-a}"
VM_NAME="${VM_NAME:-evolution-api-v2-gcp}"
DISK_NAME="${DISK_NAME:-evolution-data-disk}"

echo "🛑 Parando VM e desanexando disco..."
echo "======================================"
echo ""
echo "📋 Configuração:"
echo "   VM: ${VM_NAME}"
echo "   Disco: ${DISK_NAME}"
echo "   Zona: ${ZONE}"
echo "   Projeto: ${PROJECT_ID}"
echo ""

# Verificar se a VM existe
if ! gcloud compute instances describe ${VM_NAME} --zone=${ZONE} --project=${PROJECT_ID} &>/dev/null; then
    echo "⚠️  VM ${VM_NAME} não encontrada!"
    exit 1
fi

# Verificar status da VM
VM_STATUS=$(gcloud compute instances describe ${VM_NAME} --zone=${ZONE} --project=${PROJECT_ID} --format='get(status)')
echo "📊 Status atual da VM: ${VM_STATUS}"
echo ""

# Confirmar ação
read -p "Tem certeza que deseja parar a VM e desanexar o disco? (s/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Ss]$ ]]; then
    echo "❌ Operação cancelada."
    exit 0
fi

# Parar a VM se estiver rodando
if [ "$VM_STATUS" = "RUNNING" ]; then
    echo ""
    echo "🛑 Parando VM ${VM_NAME}..."
    gcloud compute instances stop ${VM_NAME} --zone=${ZONE} --project=${PROJECT_ID}
    
    if [ $? -eq 0 ]; then
        echo "✅ VM parada com sucesso!"
    else
        echo "❌ Erro ao parar a VM!"
        exit 1
    fi
    
    # Aguardar um pouco para garantir que a VM parou completamente
    echo "⏳ Aguardando VM parar completamente..."
    sleep 5
else
    echo "ℹ️  VM já está parada (status: ${VM_STATUS})"
fi

# Verificar se o disco está anexado à VM
echo ""
echo "🔍 Verificando se o disco está anexado à VM..."

ATTACHED_DISKS=$(gcloud compute instances describe ${VM_NAME} --zone=${ZONE} --project=${PROJECT_ID} --format='get(disks[].source)' 2>/dev/null || echo "")

if echo "$ATTACHED_DISKS" | grep -q "${DISK_NAME}"; then
    echo "📦 Disco ${DISK_NAME} está anexado à VM. Desanexando..."
    
    # Desanexar disco
    gcloud compute instances detach-disk ${VM_NAME} \
        --disk=${DISK_NAME} \
        --zone=${ZONE} \
        --project=${PROJECT_ID}
    
    if [ $? -eq 0 ]; then
        echo "✅ Disco ${DISK_NAME} desanexado com sucesso!"
    else
        echo "❌ Erro ao desanexar o disco!"
        exit 1
    fi
else
    echo "ℹ️  Disco ${DISK_NAME} não está anexado à VM ${VM_NAME}"
fi

# Verificar status final
echo ""
echo "📊 Status final:"
echo "   VM: $(gcloud compute instances describe ${VM_NAME} --zone=${ZONE} --project=${PROJECT_ID} --format='get(status)' 2>/dev/null || echo 'não encontrada')"
echo "   Disco: $(gcloud compute disks describe ${DISK_NAME} --zone=${ZONE} --project=${PROJECT_ID} --format='get(name)' 2>/dev/null || echo 'não encontrado')"

echo ""
echo "✅ Processo concluído!"
echo ""
echo "📋 Próximos passos:"
echo "   - O disco ${DISK_NAME} está livre e pode ser anexado a outra VM"
echo "   - Para iniciar a VM novamente: gcloud compute instances start ${VM_NAME} --zone=${ZONE}"
echo "   - Para anexar o disco novamente, execute o script 02-create-vm.sh ou use:"
echo "     gcloud compute instances attach-disk ${VM_NAME} --disk=${DISK_NAME} --zone=${ZONE}"
echo ""
echo "⚠️  IMPORTANTE: Se você quiser usar este disco em outra VM, certifique-se de que:"
echo "   1. A outra VM esteja parada antes de anexar o disco"
echo "   2. O disco seja anexado na mesma zona"
echo "   3. Os dados serão compartilhados entre as VMs que usam este disco"



