#!/bin/bash

# Script para facilitar o acesso ao container Docker do Evolution API

CONTAINER_NAME="evolution-api"
INSTANCES_DIR="/evolution/instances"

echo "🐳 Acessando container Evolution API..."
echo ""

# Tentar encontrar o container (pode ter nome diferente com docker-compose)
ACTUAL_CONTAINER=$(sudo docker ps --format "{{.Names}}" | grep -i evolution | grep -i api | head -1)

if [ -z "$ACTUAL_CONTAINER" ]; then
  # Tentar com docker-compose
  if [ -d "/opt/evolution-api-gcp" ]; then
    cd /opt/evolution-api-gcp
    if sudo docker compose ps | grep -q "evolution-api"; then
      echo "✅ Usando docker-compose para acessar o container"
      echo ""
      if [ -n "$1" ]; then
        sudo docker compose exec evolution-api "$@"
      else
        sudo docker compose exec evolution-api sh
      fi
      exit 0
    fi
  fi
  
  echo "❌ Container Evolution API não está rodando!"
  echo ""
  echo "Containers disponíveis:"
  sudo docker ps --format "table {{.Names}}\t{{.Status}}"
  echo ""
  echo "💡 Tente iniciar os containers:"
  echo "   cd /opt/evolution-api-gcp && sudo docker compose up -d"
  exit 1
else
  CONTAINER_NAME="$ACTUAL_CONTAINER"
  echo "✅ Container encontrado: $CONTAINER_NAME"
  echo ""
fi

# Verificar se foi passado um comando específico
if [ -n "$1" ]; then
  echo "Executando comando: $*"
  echo ""
  sudo docker exec -it "$CONTAINER_NAME" "$@"
else
  echo "💡 Dica: Você pode passar comandos como argumentos:"
  echo "   $0 ls -lah $INSTANCES_DIR"
  echo "   $0 sh -c 'cd $INSTANCES_DIR && ls -lah'"
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  echo "📁 Diretório de instâncias: $INSTANCES_DIR"
  echo ""
  echo "Instâncias disponíveis:"
  sudo docker exec "$CONTAINER_NAME" ls -1 "$INSTANCES_DIR" 2>/dev/null | grep -v '^\.' || echo "   Nenhuma instância encontrada"
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  echo "Entrando no container... (digite 'exit' para sair)"
  echo ""
  
  # Entrar no container
  sudo docker exec -it "$CONTAINER_NAME" sh
fi

