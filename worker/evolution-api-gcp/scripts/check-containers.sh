#!/bin/bash

# Script para verificar containers Docker e seus nomes

echo "🔍 Verificando containers Docker..."
echo ""

# Ver containers em execução
echo "📦 Containers em execução:"
sudo docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Ver todos os containers (incluindo parados)
echo "📦 Todos os containers (incluindo parados):"
sudo docker ps -a --format "table {{.Names}}\t{{.Image}}\t{{.Status}}"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Verificar se docker-compose está sendo usado
if [ -f "/opt/evolution-api-gcp/docker-compose.yml" ]; then
  echo "📋 Verificando serviços do docker-compose..."
  cd /opt/evolution-api-gcp
  sudo docker compose ps
elif [ -f "./docker-compose.yml" ]; then
  echo "📋 Verificando serviços do docker-compose (diretório atual)..."
  sudo docker compose ps
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Verificar se há containers relacionados ao Evolution
echo "🔎 Containers relacionados ao Evolution:"
sudo docker ps -a --filter "name=evolution" --format "table {{.Names}}\t{{.Image}}\t{{.Status}}"

echo ""
echo "💡 Se não houver containers, você pode precisar:"
echo "   1. Iniciar os containers: cd /opt/evolution-api-gcp && sudo docker compose up -d"
echo "   2. Verificar se o docker-compose.yml está configurado corretamente"



