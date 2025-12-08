#!/bin/bash

# Script para criar VM no GCP com discos persistentes montados

set -e

PROJECT_ID="${PROJECT_ID:-agendamentointeligente-4405f}"
ZONE="${ZONE:-us-central1-a}"
VM_NAME="${VM_NAME:-evolution-api-gcp}"
# Usar T2A (ARM64) para suportar a imagem jilcimar/evolution-api
MACHINE_TYPE="${MACHINE_TYPE:-t2a-standard-1}"  # t2as-standard-2 para ARM64
DISK_SIZE="${DISK_SIZE:-30GB}"
DISK_TYPE="${DISK_TYPE:-pd-standard}"

# Nome do disco persistente único
DISK_NAME="evolution-data-disk"

echo "🚀 Criando VM para Evolution API..."

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

echo "📦 Criando VM ${VM_NAME}..."

# Criar script de inicialização em arquivo temporário
STARTUP_SCRIPT=$(mktemp)
cat > ${STARTUP_SCRIPT} << 'EOFSTARTUP'
#!/bin/bash
# Montar disco persistente único
mkdir -p /mnt/disks/evolution-data

# Formatar disco se não estiver formatado
if ! blkid /dev/disk/by-id/google-evolution-data-disk &>/dev/null; then
    echo "Formatando disco único..."
    mkfs.ext4 -F /dev/disk/by-id/google-evolution-data-disk
fi

# Montar disco
mount -o discard,defaults /dev/disk/by-id/google-evolution-data-disk /mnt/disks/evolution-data

# Adicionar ao fstab para montagem automática
if ! grep -q "google-evolution-data-disk" /etc/fstab; then
    echo "/dev/disk/by-id/google-evolution-data-disk /mnt/disks/evolution-data ext4 discard,defaults 0 2" >> /etc/fstab
fi

# Criar estrutura de diretórios dentro do disco
mkdir -p /mnt/disks/evolution-data/postgres
mkdir -p /mnt/disks/evolution-data/redis
mkdir -p /mnt/disks/evolution-data/instances
mkdir -p /mnt/disks/evolution-data/logs
mkdir -p /mnt/disks/evolution-data/tmp
mkdir -p /mnt/disks/evolution-data/database
mkdir -p /mnt/disks/evolution-data/messages

# Configurar permissões
chown -R 999:999 /mnt/disks/evolution-data/postgres
chown -R 999:999 /mnt/disks/evolution-data/redis
# Instâncias precisam de permissões de escrita para o usuário do container
chown -R 1000:1000 /mnt/disks/evolution-data/instances || chown -R root:root /mnt/disks/evolution-data/instances || true
chmod -R 755 /mnt/disks/evolution-data/instances
chmod -R 755 /mnt/disks/evolution-data/logs
chmod -R 755 /mnt/disks/evolution-data/tmp
chmod -R 755 /mnt/disks/evolution-data/database
# Mensagens precisam de permissões de escrita para salvar em arquivo
chown -R 1000:1000 /mnt/disks/evolution-data/messages || chown -R root:root /mnt/disks/evolution-data/messages || true
chmod -R 755 /mnt/disks/evolution-data/messages

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
    --labels=app=evolution-api \
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
echo "   - Disco único (100GB): ~\$4/mês"
echo "   - Total: ~\$34-39/mês"
echo ""
echo "ℹ️  Nota: Usando VM ARM64 (T2A) para suportar a imagem Evolution API"

