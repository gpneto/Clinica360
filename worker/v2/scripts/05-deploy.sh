#!/bin/bash

# Script para fazer deploy completo do Evolution API v2 na VM

set -e

PROJECT_ID="${PROJECT_ID:-agendamentointeligente-4405f}"
ZONE="${ZONE:-us-central1-a}"
VM_NAME="${VM_NAME:-evolution-api-v2-gcp}"

# Obter diretório do script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Verificar se .env existe
if [ ! -f "${SCRIPT_DIR}/.env" ]; then
    echo "❌ Arquivo .env não encontrado!"
    echo "   Copie o env.example para .env e configure as variáveis:"
    echo "   cp env.example .env"
    echo "   nano .env"
    exit 1
fi

echo "🚀 Fazendo deploy do Evolution API v2..."

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
sudo mkdir -p /opt/evolution-api-v2-gcp
sudo chown -R \$USER:\$USER /opt/evolution-api-v2-gcp
"

# Copiar arquivos para VM
echo "📦 Passo 3/4: Copiando arquivos de configuração para VM..."

# Se build foi local, usar docker-compose.image.yml (que usa imagem)
# Se build será no servidor, usar docker-compose.yml normal (que faz build)
if [ "$BUILD_LOCAL" = true ] && [ -f "${SCRIPT_DIR}/docker-compose.image.yml" ]; then
    # Copiar docker-compose.image.yml como docker-compose.yml
    cp ${SCRIPT_DIR}/docker-compose.image.yml /tmp/docker-compose.yml
    gcloud compute scp \
        /tmp/docker-compose.yml \
        ${VM_NAME}:/opt/evolution-api-v2-gcp/docker-compose.yml \
        --zone=${ZONE} \
        --project=${PROJECT_ID}
    rm /tmp/docker-compose.yml
else
    # Usar docker-compose.yml normal (que faz build no servidor)
    gcloud compute scp \
        ${SCRIPT_DIR}/docker-compose.yml \
        ${VM_NAME}:/opt/evolution-api-v2-gcp/docker-compose.yml \
        --zone=${ZONE} \
        --project=${PROJECT_ID}
    
    if [ "$BUILD_LOCAL" = true ]; then
        # Se build local foi feito mas não temos docker-compose.image.yml, atualizar manualmente
        gcloud compute ssh ${VM_NAME} --zone=${ZONE} --project=${PROJECT_ID} --command="
        cd /opt/evolution-api-v2-gcp
        sed -i 's|build:|image: evolution-api-v2-custom:latest|' docker-compose.yml
        sed -i '/context:.*evolution-api-src/d' docker-compose.yml
        sed -i '/dockerfile:.*Dockerfile/d' docker-compose.yml
        sed -i '/args:/d' docker-compose.yml
        sed -i '/BUILDKIT_INLINE_CACHE/d' docker-compose.yml
        "
    fi
    # Se build será no servidor, docker-compose.yml já está configurado para fazer build
fi

# Copiar config
gcloud compute scp --recurse \
    ${SCRIPT_DIR}/config/ \
    ${VM_NAME}:/opt/evolution-api-v2-gcp/ \
    --zone=${ZONE} \
    --project=${PROJECT_ID}

# Verificar se os fontes existem
if [ ! -d "${SCRIPT_DIR}/evolution-api-src" ]; then
    echo "❌ Erro: Diretório evolution-api-src não encontrado!"
    echo "   Execute: git clone https://github.com/EvolutionAPI/evolution-api.git evolution-api-src"
    exit 1
fi

# Tentar fazer build local, se não conseguir, fazer build no servidor
BUILD_LOCAL=true
cd "${SCRIPT_DIR}"

# Verificar se Docker está disponível localmente
if command -v docker &> /dev/null && docker info &> /dev/null 2>&1; then
    echo "🔨 Passo 1/4: Fazendo build local da imagem..."
    echo "   Isso pode levar vários minutos na primeira vez..."
    
    # Verificar se o script de build existe
    if [ -f "${SCRIPT_DIR}/scripts/build-image-local.sh" ]; then
        if bash "${SCRIPT_DIR}/scripts/build-image-local.sh"; then
            # Build local bem-sucedido, enviar imagem
            echo ""
            echo "📤 Passo 2/4: Enviando imagem compilada para VM..."
            if bash "${SCRIPT_DIR}/scripts/08-upload-image.sh"; then
                BUILD_LOCAL=true
            else
                echo "⚠️  Erro ao enviar imagem, continuando com build no servidor..."
                BUILD_LOCAL=false
            fi
        else
            echo "⚠️  Build local falhou, continuando com build no servidor..."
            BUILD_LOCAL=false
        fi
    else
        echo "⚠️  Script de build local não encontrado, usando build no servidor..."
        BUILD_LOCAL=false
    fi
else
    echo "⚠️  Docker não está disponível localmente ou não está rodando."
    echo "   Fazendo build no servidor (será mais lento)..."
    BUILD_LOCAL=false
fi

# Se build local não funcionou, fazer build no servidor
if [ "$BUILD_LOCAL" = false ]; then
    echo ""
    echo "🔨 Passo 1/4: Preparando para build no servidor..."
    echo "   Os fontes serão copiados para a VM e o build será feito lá."
    
    # Verificar se os fontes existem
    if [ ! -d "${SCRIPT_DIR}/evolution-api-src" ]; then
        echo "❌ Erro: Diretório evolution-api-src não encontrado!"
        echo "   Execute: git clone https://github.com/EvolutionAPI/evolution-api.git evolution-api-src"
        exit 1
    fi
    
    # Compactar fontes antes de enviar (muito mais rápido!)
    echo "📦 Compactando fontes do Evolution API..."
    ZIP_FILE="/tmp/evolution-api-src-$(date +%s).zip"
    
    cd "${SCRIPT_DIR}"
    zip -r -q "${ZIP_FILE}" evolution-api-src/ -x "evolution-api-src/node_modules/*" "evolution-api-src/dist/*" "evolution-api-src/.git/*" "evolution-api-src/*.log" "evolution-api-src/.env"
    
    ZIP_SIZE=$(du -h "${ZIP_FILE}" | cut -f1)
    echo "   Arquivo compactado: ${ZIP_SIZE}"
    
    # Copiar arquivo compactado para VM
    echo "📤 Enviando fontes compactados para VM..."
    echo "   Isso será muito mais rápido que enviar arquivo por arquivo..."
    gcloud compute scp \
        ${ZIP_FILE} \
        ${VM_NAME}:/tmp/evolution-api-src.zip \
        --zone=${ZONE} \
        --project=${PROJECT_ID}
    
    if [ $? -ne 0 ]; then
        echo "❌ Erro ao enviar fontes compactados para a VM!"
        rm -f "${ZIP_FILE}"
        exit 1
    fi
    
    # Limpar arquivo local
    rm -f "${ZIP_FILE}"
    
    # Descompactar na VM
    echo "📦 Descompactando fontes na VM..."
    gcloud compute ssh ${VM_NAME} --zone=${ZONE} --project=${PROJECT_ID} --command="
    cd /opt/evolution-api-v2-gcp
    
    # Instalar unzip se não estiver instalado
    if ! command -v unzip &> /dev/null; then
        sudo apt-get update -qq
        sudo apt-get install -y unzip -qq
    fi
    
    # Descompactar
    unzip -q -o /tmp/evolution-api-src.zip -d .
    rm -f /tmp/evolution-api-src.zip
    
    # Verificar se descompactou corretamente
    if [ -d 'evolution-api-src' ]; then
        echo '✅ Fontes descompactados com sucesso!'
    else
        echo '❌ Erro ao descompactar fontes!'
        exit 1
    fi
    "
    
    if [ $? -ne 0 ]; then
        echo "❌ Erro ao descompactar fontes na VM!"
        exit 1
    fi
    
    echo "✅ Fontes enviados e descompactados com sucesso!"
    echo ""
    echo "📤 Passo 2/4: Pulando upload de imagem (build será feito no servidor)"
fi

# Copiar .env
gcloud compute scp \
    ${SCRIPT_DIR}/.env \
    ${VM_NAME}:/opt/evolution-api-v2-gcp/.env \
    --zone=${ZONE} \
    --project=${PROJECT_ID}

# Copiar script de inicialização para a VM
gcloud compute scp ${SCRIPT_DIR}/start-evolution.sh ${VM_NAME}:/opt/evolution-api-v2-gcp/start.sh --zone=${ZONE} --project=${PROJECT_ID}

# Passo 4: Iniciar containers
echo ""
if [ "$BUILD_LOCAL" = true ]; then
    echo "🚀 Passo 4/4: Iniciando containers (usando imagem pré-compilada)..."
else
    echo "🚀 Passo 4/4: Iniciando containers (build será feito no servidor, pode demorar)..."
fi
gcloud compute ssh ${VM_NAME} --zone=${ZONE} --project=${PROJECT_ID} --command="
chmod +x /opt/evolution-api-v2-gcp/start.sh
cd /opt/evolution-api-v2-gcp
bash start.sh
"

echo ""
echo "✅ Deploy concluído!"
echo ""
if [ "$BUILD_LOCAL" = true ]; then
    echo "ℹ️  Nota: A imagem foi compilada localmente e enviada para o servidor (método rápido)."
else
    echo "ℹ️  Nota: A imagem foi compilada no servidor (método mais lento, mas funcional)."
    echo "   Para build local mais rápido, inicie o Docker Desktop e execute novamente."
fi
echo ""
echo "📋 Comandos úteis:"
echo "   # Ver logs"
echo "   gcloud compute ssh ${VM_NAME} --zone=${ZONE} --project=${PROJECT_ID} --command='cd /opt/evolution-api-v2-gcp && sudo docker compose logs -f'"
echo ""
echo "   # Rebuild após modificar fontes (usar script completo)"
echo "   bash scripts/10-build-and-deploy.sh"
echo ""
echo "   # Reiniciar serviços"
echo "   gcloud compute ssh ${VM_NAME} --zone=${ZONE} --project=${PROJECT_ID} --command='cd /opt/evolution-api-v2-gcp && sudo docker compose restart'"
echo ""
echo "   # Parar serviços"
echo "   gcloud compute ssh ${VM_NAME} --zone=${ZONE} --project=${PROJECT_ID} --command='cd /opt/evolution-api-v2-gcp && sudo docker compose down'"

