#!/bin/bash

# Script para criar VM no GCP com discos persistentes montados (v2)

set -e

PROJECT_ID="${PROJECT_ID:-agendamentointeligente-4405f}"
ZONE="${ZONE:-us-central1-a}"
VM_NAME="${VM_NAME:-evolution-api-v2-gcp}"
# Usar T2A (ARM64) para suportar a imagem Evolution API
MACHINE_TYPE="${MACHINE_TYPE:-t2a-standard-1}"  # t2a-standard-2 para ARM64
DISK_SIZE="${DISK_SIZE:-30GB}"
DISK_TYPE="${DISK_TYPE:-pd-standard}"

# Nome do disco persistente (usando o MESMO da versão original)
DISK_NAME="evolution-data-disk"

echo "🚀 Criando VM para Evolution API v2..."

# Verificar se a VM já existe
if gcloud compute instances describe ${VM_NAME} --zone=${ZONE} --project=${PROJECT_ID} &>/dev/null; then
    echo "⚠️  VM ${VM_NAME} já existe!"
    read -p "Deseja recriar? (s/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Ss]$ ]]; then
        exit 0
    fi
    echo "🗑️  Deletando VM existente..."
    gcloud compute instances delete ${VM_NAME} --zone=${ZONE} --project=${PROJECT_ID} --quiet
fi

# Verificar se o disco existe
if ! gcloud compute disks describe ${DISK_NAME} --zone=${ZONE} --project=${PROJECT_ID} &>/dev/null; then
    echo "❌ Disco ${DISK_NAME} não existe!"
    echo "   Execute primeiro: bash scripts/01-create-persistent-disks.sh"
    exit 1
fi

# Verificar se o disco está sendo usado por outra VM
ORIGINAL_VM="evolution-api-gcp"
DISK_USERS=$(gcloud compute disks describe ${DISK_NAME} --zone=${ZONE} --project=${PROJECT_ID} --format='get(users)' 2>/dev/null || echo "")

if [ -n "$DISK_USERS" ] && [ "$DISK_USERS" != "" ]; then
    # Extrair nome da VM do caminho completo
    VM_USING_DISK=$(echo "$DISK_USERS" | grep -o '/instances/[^/]*' | sed 's|/instances/||' | head -1)
    echo "⚠️  ATENÇÃO: O disco ${DISK_NAME} está sendo usado por outra VM!"
    if [ -n "$VM_USING_DISK" ]; then
        echo "   VM que está usando o disco: ${VM_USING_DISK}"
    else
        echo "   VM que está usando o disco: ${ORIGINAL_VM} (detectada)"
    fi
    echo ""
    echo "ℹ️  No GCP, um disco persistente não pode ser anexado a múltiplas VMs simultaneamente."
    echo ""
    echo "Opções:"
    echo "   1. Parar a VM original temporariamente para anexar o disco à nova VM"
    echo "   2. Usar a mesma VM original mas atualizar o código (recomendado)"
    echo ""
    read -p "Deseja parar a VM original (${ORIGINAL_VM}) para continuar? (s/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Ss]$ ]]; then
        echo "⏸️  Parando VM ${ORIGINAL_VM}..."
        gcloud compute instances stop ${ORIGINAL_VM} --zone=${ZONE} --project=${PROJECT_ID} || echo "⚠️  VM já estava parada ou não existe"
        echo "✅ VM ${ORIGINAL_VM} parada."
        
        echo "🔌 Desanexando disco ${DISK_NAME} da VM ${ORIGINAL_VM}..."
        gcloud compute instances detach-disk ${ORIGINAL_VM} \
            --disk=${DISK_NAME} \
            --zone=${ZONE} \
            --project=${PROJECT_ID} 2>/dev/null || echo "⚠️  Disco já estava desanexado ou erro ao desanexar"
        echo "✅ Disco desanexado."
        
        echo "⏳ Aguardando alguns segundos para garantir que o disco está livre..."
        sleep 5
    else
        echo ""
        echo "❌ Operação cancelada."
        echo ""
        echo "💡 Recomendação: Para atualizar para a nova versão mantendo os dados, você pode:"
        echo "   1. Fazer backup dos dados atuais"
        echo "   2. Parar a VM original"
        echo "   3. Criar a nova VM com o mesmo disco"
        echo "   4. Fazer deploy da nova versão"
        echo ""
        echo "   Ou, mais simples: Atualizar o código na VM original usando docker-compose pull"
        exit 0
    fi
fi

echo "📦 Criando VM ${VM_NAME}..."

# Criar script de inicialização em arquivo temporário
STARTUP_SCRIPT=$(mktemp)
cat > ${STARTUP_SCRIPT} << 'EOFSTARTUP'
#!/bin/bash
# Montar disco persistente (usando o MESMO da versão original)
mkdir -p /mnt/disks/evolution-data

# Formatar disco se não estiver formatado (cuidado: só se realmente necessário!)
if ! blkid /dev/disk/by-id/google-evolution-data-disk &>/dev/null; then
    echo "⚠️  ATENÇÃO: Disco não formatado. Formatando..."
    mkfs.ext4 -F /dev/disk/by-id/google-evolution-data-disk
fi

# Montar disco
mount -o discard,defaults /dev/disk/by-id/google-evolution-data-disk /mnt/disks/evolution-data

# Adicionar ao fstab para montagem automática (se não estiver lá)
if ! grep -q "google-evolution-data-disk" /etc/fstab; then
    echo "/dev/disk/by-id/google-evolution-data-disk /mnt/disks/evolution-data ext4 discard,defaults 0 2" >> /etc/fstab
fi

# Criar estrutura de diretórios dentro do disco (se não existirem)
mkdir -p /mnt/disks/evolution-data/postgres
mkdir -p /mnt/disks/evolution-data/redis
mkdir -p /mnt/disks/evolution-data/instances
mkdir -p /mnt/disks/evolution-data/logs
mkdir -p /mnt/disks/evolution-data/tmp
mkdir -p /mnt/disks/evolution-data/database
mkdir -p /mnt/disks/evolution-data/messages

# Configurar permissões (preservar dados existentes - não sobrescrever)
# Apenas criar diretórios se não existirem, sem remover dados
chown -R 999:999 /mnt/disks/evolution-data/postgres 2>/dev/null || true
chown -R 999:999 /mnt/disks/evolution-data/redis 2>/dev/null || true
chmod -R 755 /mnt/disks/evolution-data/instances 2>/dev/null || true
chmod -R 755 /mnt/disks/evolution-data/logs 2>/dev/null || true
chmod -R 755 /mnt/disks/evolution-data/tmp 2>/dev/null || true
chmod -R 755 /mnt/disks/evolution-data/database 2>/dev/null || true
chmod -R 755 /mnt/disks/evolution-data/messages 2>/dev/null || true

# Instalar Docker e Docker Compose
apt-get update
apt-get install -y ca-certificates curl gnupg lsb-release
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Iniciar e habilitar Docker
systemctl start docker
systemctl enable docker

# Adicionar usuário ao grupo docker
# Obter usuário atual (pode ser diferente de $USER no startup script)
CURRENT_USER=$(logname 2>/dev/null || echo $(whoami))
usermod -aG docker $CURRENT_USER || usermod -aG docker $(whoami) || true

# Verificar se Docker está rodando
sleep 5
systemctl status docker || systemctl start docker
EOFSTARTUP

gcloud compute instances create ${VM_NAME} \
    --project=${PROJECT_ID} \
    --zone=${ZONE} \
    --machine-type=${MACHINE_TYPE} \
    --network-tier=PREMIUM \
    --maintenance-policy=MIGRATE \
    --provisioning-model=STANDARD \
    --scopes=https://www.googleapis.com/auth/devstorage.read_write,https://www.googleapis.com/auth/logging.write,https://www.googleapis.com/auth/monitoring.write,https://www.googleapis.com/auth/servicecontrol,https://www.googleapis.com/auth/service.management.readonly,https://www.googleapis.com/auth/trace.append \
    --tags=http-server,https-server \
    --image-family=ubuntu-2204-lts-arm64 \
    --image-project=ubuntu-os-cloud \
    --boot-disk-size=${DISK_SIZE} \
    --boot-disk-type=${DISK_TYPE} \
    --no-shielded-secure-boot \
    --shielded-vtpm \
    --shielded-integrity-monitoring \
    --labels=app=evolution-api-v2 \
    --reservation-affinity=any \
    --disk=name=${DISK_NAME},device-name=evolution-data-disk,mode=rw,boot=no \
    --metadata-from-file=startup-script=${STARTUP_SCRIPT}

# Limpar arquivo temporário
rm -f ${STARTUP_SCRIPT}

echo "⏳ Aguardando VM iniciar e configurar..."
sleep 30

# Obter IP externo
EXTERNAL_IP=$(gcloud compute instances describe ${VM_NAME} --zone=${ZONE} --project=${PROJECT_ID} --format='get(networkInterfaces[0].accessConfigs[0].natIP)')

echo "✅ VM criada com sucesso!"
echo "🌐 IP Externo: ${EXTERNAL_IP}"
echo ""
echo "📝 Próximos passos:"
echo "   1. Configure o firewall: ./scripts/03-setup-firewall.sh"
echo "   2. Configure HTTPS: ./scripts/04-setup-https.sh"
echo "   3. Faça o deploy: ./scripts/05-deploy.sh"
echo ""
echo "💰 Custo estimado:"
echo "   - t2a-standard-2 (ARM64): ~\$30-35/mês"
echo "   - Disco (compartilhado): já existe (não cria novo disco)"
echo ""
echo "ℹ️  Nota: Usando VM ARM64 (T2A) para suportar a imagem Evolution API"
echo "⚠️  IMPORTANTE: Esta VM usará o MESMO disco da versão original (evolution-data-disk)"
echo "   Todos os dados existentes serão preservados e compartilhados."

