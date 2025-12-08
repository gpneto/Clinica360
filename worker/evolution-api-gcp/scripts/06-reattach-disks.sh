#!/bin/bash

# Script para reanexar discos persistentes a uma VM existente
# Útil quando você recriou a VM ou os discos foram desanexados

set -e

PROJECT_ID="${PROJECT_ID:-agendamentointeligente-4405f}"
ZONE="${ZONE:-us-central1-a}"
VM_NAME="${VM_NAME:-evolution-api-gcp}"

# Nome do disco persistente único
DISK_NAME="evolution-data-disk"

echo "🔗 Reanexando disco persistente à VM ${VM_NAME}..."

# Verificar se a VM existe
if ! gcloud compute instances describe ${VM_NAME} --zone=${ZONE} --project=${PROJECT_ID} &>/dev/null; then
    echo "❌ VM ${VM_NAME} não encontrada!"
    echo "   Crie a VM primeiro com: bash scripts/02-create-vm.sh"
    exit 1
fi

# Verificar se o disco existe
if ! gcloud compute disks describe ${DISK_NAME} --zone=${ZONE} --project=${PROJECT_ID} &>/dev/null; then
    echo "❌ Disco ${DISK_NAME} não existe!"
    echo "   Execute primeiro: bash scripts/01-create-persistent-disks.sh"
    exit 1
fi

# Verificar se o disco já está anexado
if gcloud compute instances describe ${VM_NAME} --zone=${ZONE} --project=${PROJECT_ID} \
    --format='get(disks[].source)' | grep -q "${DISK_NAME}"; then
    echo "✅ Disco ${DISK_NAME} já está anexado"
else
    echo "📦 Anexando disco ${DISK_NAME}..."
    gcloud compute instances attach-disk ${VM_NAME} \
        --disk=${DISK_NAME} \
        --device-name=evolution-data-disk \
        --zone=${ZONE} \
        --project=${PROJECT_ID}
    
    echo "✅ Disco ${DISK_NAME} anexado com sucesso!"
fi

echo ""
echo "🔧 Configurando montagem dos discos na VM..."

# Script para montar disco na VM
gcloud compute ssh ${VM_NAME} --zone=${ZONE} --project=${PROJECT_ID} --command="
# Criar diretório de montagem
sudo mkdir -p /mnt/disks/evolution-data

# Verificar se disco já está formatado e montar
if [ -b /dev/disk/by-id/google-evolution-data-disk ]; then
    if ! mountpoint -q /mnt/disks/evolution-data; then
        if ! blkid /dev/disk/by-id/google-evolution-data-disk &>/dev/null; then
            echo 'Formatando disco único...'
            sudo mkfs.ext4 -F /dev/disk/by-id/google-evolution-data-disk
        fi
        echo 'Montando disco único...'
        sudo mount -o discard,defaults /dev/disk/by-id/google-evolution-data-disk /mnt/disks/evolution-data
    fi
fi

# Adicionar ao fstab se não estiver lá
if ! grep -q 'google-evolution-data-disk' /etc/fstab; then
    echo '/dev/disk/by-id/google-evolution-data-disk /mnt/disks/evolution-data ext4 discard,defaults 0 2' | sudo tee -a /etc/fstab
fi

# Criar estrutura de diretórios dentro do disco
sudo mkdir -p /mnt/disks/evolution-data/postgres
sudo mkdir -p /mnt/disks/evolution-data/redis
sudo mkdir -p /mnt/disks/evolution-data/instances
sudo mkdir -p /mnt/disks/evolution-data/logs
sudo mkdir -p /mnt/disks/evolution-data/tmp

# Configurar permissões
sudo chown -R 999:999 /mnt/disks/evolution-data/postgres 2>/dev/null || true
sudo chown -R 999:999 /mnt/disks/evolution-data/redis 2>/dev/null || true
sudo chmod -R 755 /mnt/disks/evolution-data/instances 2>/dev/null || true
sudo chmod -R 755 /mnt/disks/evolution-data/logs 2>/dev/null || true
sudo chmod -R 755 /mnt/disks/evolution-data/tmp 2>/dev/null || true

# Verificar montagem
echo ''
echo '📊 Status do disco montado:'
df -h | grep /mnt/disks/evolution-data || echo 'Disco não está montado'
echo ''
echo '📁 Estrutura de diretórios:'
ls -la /mnt/disks/evolution-data/ 2>/dev/null || echo 'Diretório não existe'
"

echo ""
echo "✅ Discos reanexados e configurados!"
echo ""
echo "📋 Próximos passos:"
echo "   1. Verificar se os discos estão montados:"
echo "      gcloud compute ssh ${VM_NAME} --zone=${ZONE} --command='df -h | grep /mnt/disks'"
echo ""
echo "   2. Reiniciar os serviços:"
echo "      bash scripts/manage.sh restart"

