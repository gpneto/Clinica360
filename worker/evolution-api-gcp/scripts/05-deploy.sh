#!/bin/bash

# Script para fazer deploy completo do Evolution API na VM

set -e

PROJECT_ID="${PROJECT_ID:-agendamentointeligente-4405f}"
ZONE="${ZONE:-us-central1-a}"
VM_NAME="${VM_NAME:-evolution-api-gcp}"

# Verificar se .env existe
if [ ! -f .env ]; then
    echo "❌ Arquivo .env não encontrado!"
    echo "   Copie o env.example para .env e configure as variáveis:"
    echo "   cp env.example .env"
    echo "   nano .env"
    exit 1
fi

echo "🚀 Fazendo deploy do Evolution API..."

# Obter IP da VM
EXTERNAL_IP=$(gcloud compute instances describe ${VM_NAME} --zone=${ZONE} --project=${PROJECT_ID} --format='get(networkInterfaces[0].accessConfigs[0].natIP)')

echo "🌐 IP da VM: ${EXTERNAL_IP}"

# Verificar e instalar Docker se necessário
echo "🐳 Verificando Docker na VM..."
gcloud compute ssh ${VM_NAME} --zone=${ZONE} --project=${PROJECT_ID} --command="
if ! command -v docker &> /dev/null || ! sudo systemctl is-active --quiet docker; then
    echo '📦 Docker não encontrado ou não está rodando. Instalando...'
    
    # Atualizar sistema
    sudo apt-get update -y
    
    # Instalar dependências
    sudo apt-get install -y ca-certificates curl gnupg lsb-release
    
    # Adicionar chave GPG do Docker
    sudo install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    sudo chmod a+r /etc/apt/keyrings/docker.gpg
    
    # Adicionar repositório Docker
    echo \"deb [arch=\$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \$(lsb_release -cs) stable\" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    
    # Instalar Docker
    sudo apt-get update -y
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    
    # Iniciar e habilitar Docker
    sudo systemctl start docker
    sudo systemctl enable docker
    
    # Adicionar usuário ao grupo docker
    CURRENT_USER=\$(whoami)
    sudo usermod -aG docker \$CURRENT_USER || true
    
    echo '✅ Docker instalado e iniciado!'
else
    echo '✅ Docker já está instalado e rodando'
    # Garantir que está rodando
    sudo systemctl start docker || true
fi
"

# Criar diretório na VM
gcloud compute ssh ${VM_NAME} --zone=${ZONE} --project=${PROJECT_ID} --command="
sudo mkdir -p /opt/evolution-api-gcp
sudo chown -R \$USER:\$USER /opt/evolution-api-gcp
"

# Copiar arquivos para VM
echo "📦 Copiando arquivos para VM..."
gcloud compute scp --recurse \
    docker-compose.yml \
    config/ \
    ../redis-cache-service/ \
    ${VM_NAME}:/opt/evolution-api-gcp/ \
    --zone=${ZONE} \
    --project=${PROJECT_ID}

# Copiar .env
gcloud compute scp \
    .env \
    ${VM_NAME}:/opt/evolution-api-gcp/.env \
    --zone=${ZONE} \
    --project=${PROJECT_ID}

# Copiar script de inicialização para a VM
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
gcloud compute scp ${SCRIPT_DIR}/start-evolution.sh ${VM_NAME}:/opt/evolution-api-gcp/start.sh --zone=${ZONE} --project=${PROJECT_ID}
gcloud compute ssh ${VM_NAME} --zone=${ZONE} --project=${PROJECT_ID} --command="
chmod +x /opt/evolution-api-gcp/start.sh
cd /opt/evolution-api-gcp
bash start.sh
"

echo ""
echo "✅ Deploy concluído!"
echo ""
echo "📋 Comandos úteis:"
echo "   # Ver logs"
echo "   gcloud compute ssh ${VM_NAME} --zone=${ZONE} --project=${PROJECT_ID} --command='cd /opt/evolution-api-gcp && sudo docker compose logs -f'"
echo ""
echo "   # Reiniciar serviços"
echo "   gcloud compute ssh ${VM_NAME} --zone=${ZONE} --project=${PROJECT_ID} --command='cd /opt/evolution-api-gcp && sudo docker compose restart'"
echo ""
echo "   # Parar serviços"
echo "   gcloud compute ssh ${VM_NAME} --zone=${ZONE} --project=${PROJECT_ID} --command='cd /opt/evolution-api-gcp && sudo docker compose down'"

