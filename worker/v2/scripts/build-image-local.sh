#!/bin/bash

# Script para fazer build da imagem Docker localmente

set -e

echo "🔨 Fazendo build da imagem Evolution API localmente..."
echo ""

# Verificar se Docker está instalado e rodando
if ! command -v docker &> /dev/null; then
    echo "❌ Docker não está instalado localmente!"
    echo "   Instale o Docker Desktop ou Docker Engine primeiro."
    exit 1
fi

# Verificar se Docker daemon está rodando
if ! docker info &> /dev/null; then
    echo "❌ Docker daemon não está rodando!"
    echo ""
    echo "💡 Opções:"
    echo "   1. Inicie o Docker Desktop e tente novamente"
    echo "   2. Ou execute o script sem build local (fará build no servidor)"
    echo ""
    exit 1
fi

# Verificar se os fontes existem
if [ ! -d "evolution-api-src" ]; then
    echo "❌ Erro: Diretório evolution-api-src não encontrado!"
    exit 1
fi

# Nome da imagem
IMAGE_NAME="evolution-api-v2-custom"
IMAGE_TAG="latest"
FULL_IMAGE_NAME="${IMAGE_NAME}:${IMAGE_TAG}"
TAR_FILE="evolution-api-v2-image.tar"
TAR_FILE_GZ="${TAR_FILE}.gz"

echo "📦 Build da imagem: ${FULL_IMAGE_NAME}"
echo "   Context: ./evolution-api-src"
echo ""

# Fazer build
echo "🔨 Compilando..."
echo "   Isso pode levar vários minutos na primeira vez..."

# Verificar se buildx está disponível, senão usar build normal
if docker buildx version &>/dev/null; then
    docker buildx build \
        --platform linux/arm64 \
        --tag ${FULL_IMAGE_NAME} \
        --file ./evolution-api-src/Dockerfile \
        ./evolution-api-src
else
    # Fallback para build normal (mas só funciona se a arquitetura for compatível)
    echo "⚠️  buildx não disponível, usando build normal..."
    docker build \
        --tag ${FULL_IMAGE_NAME} \
        --file ./evolution-api-src/Dockerfile \
        ./evolution-api-src
fi

if [ $? -ne 0 ]; then
    echo "❌ Erro ao fazer build da imagem!"
    exit 1
fi

echo ""
echo "✅ Build concluído com sucesso!"
echo ""

# Salvar automaticamente como tar comprimido
echo "💾 Salvando imagem como ${TAR_FILE_GZ} (comprimido)..."
docker save ${FULL_IMAGE_NAME} | gzip > ${TAR_FILE_GZ}

# Calcular tamanho
FILE_SIZE=$(du -h ${TAR_FILE_GZ} | cut -f1)
echo "✅ Imagem salva: ${TAR_FILE_GZ} (${FILE_SIZE})"
echo ""
echo "📋 Próximo passo:"
echo "   bash scripts/08-upload-image.sh"
echo ""
echo "   Ou use o script completo:"
echo "   bash scripts/10-build-and-deploy.sh"

echo ""
echo "✅ Processo concluído!"
echo ""
echo "💡 Dica: Você pode também fazer push para um registry:"
echo "   docker tag ${FULL_IMAGE_NAME} gcr.io/SEU_PROJECT/evolution-api-v2:latest"
echo "   docker push gcr.io/SEU_PROJECT/evolution-api-v2:latest"

