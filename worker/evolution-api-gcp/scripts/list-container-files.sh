#!/bin/bash

# Script para listar arquivos dentro do container Docker

CONTAINER_NAME="evolution-api"
INSTANCES_DIR="/evolution/instances"

echo "📁 Arquivos de sessão no container Evolution API"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Tentar encontrar o container (pode ter nome diferente com docker-compose)
ACTUAL_CONTAINER=$(sudo docker ps --format "{{.Names}}" | grep -i evolution | grep -i api | head -1)

if [ -z "$ACTUAL_CONTAINER" ]; then
  # Tentar com docker-compose
  if [ -d "/opt/evolution-api-gcp" ]; then
    cd /opt/evolution-api-gcp
    if sudo docker compose ps | grep -q "evolution-api"; then
      echo "✅ Usando docker-compose"
      echo ""
      if [ -z "$INSTANCE" ]; then
        sudo docker compose exec evolution-api ls -lah "$INSTANCES_DIR" 2>/dev/null || echo "   Nenhuma instância encontrada"
      else
        sudo docker compose exec evolution-api find "$INSTANCES_DIR/$INSTANCE" -type f 2>/dev/null
      fi
      exit 0
    fi
  fi
  
  echo "❌ Container Evolution API não está rodando!"
  echo ""
  echo "💡 Tente iniciar os containers:"
  echo "   cd /opt/evolution-api-gcp && sudo docker compose up -d"
  exit 1
else
  CONTAINER_NAME="$ACTUAL_CONTAINER"
fi

# Verificar se foi passado um nome de instância
INSTANCE="${1:-}"

if [ -z "$INSTANCE" ]; then
  echo "📂 Listando todas as instâncias:"
  echo ""
  
  # Listar instâncias com tamanhos
  sudo docker exec "$CONTAINER_NAME" sh -c "
    if [ -d '$INSTANCES_DIR' ]; then
      for dir in $INSTANCES_DIR/*/; do
        if [ -d \"\$dir\" ]; then
          instance=\$(basename \"\$dir\")
          size=\$(du -sh \"\$dir\" 2>/dev/null | cut -f1)
          files=\$(find \"\$dir\" -type f 2>/dev/null | wc -l)
          echo \"  📁 \$instance\"
          echo \"     Tamanho: \$size\"
          echo \"     Arquivos: \$files\"
          echo \"\"
        fi
      done
    else
      echo '  ⚠️  Diretório não encontrado'
    fi
  "
  
  echo ""
  echo "💡 Para ver detalhes de uma instância específica:"
  echo "   $0 <nome-da-instancia>"
else
  echo "📂 Detalhes da instância: $INSTANCE"
  echo ""
  
  # Verificar se a instância existe
  if sudo docker exec "$CONTAINER_NAME" test -d "$INSTANCES_DIR/$INSTANCE"; then
    echo "📁 Estrutura de arquivos:"
    echo ""
    
    # Listar arquivos com detalhes
    sudo docker exec "$CONTAINER_NAME" find "$INSTANCES_DIR/$INSTANCE" -type f -exec ls -lh {} \; | head -30
    
    echo ""
    echo "📊 Estatísticas:"
    
    # Total de arquivos
    TOTAL_FILES=$(sudo docker exec "$CONTAINER_NAME" find "$INSTANCES_DIR/$INSTANCE" -type f 2>/dev/null | wc -l)
    echo "   Total de arquivos: $TOTAL_FILES"
    
    # Tamanho total
    SIZE=$(sudo docker exec "$CONTAINER_NAME" du -sh "$INSTANCES_DIR/$INSTANCE" 2>/dev/null | cut -f1)
    echo "   Tamanho total: $SIZE"
    
    # Tipos de arquivos
    echo ""
    echo "📄 Tipos de arquivos encontrados:"
    sudo docker exec "$CONTAINER_NAME" find "$INSTANCES_DIR/$INSTANCE" -type f -name "*.json" 2>/dev/null | wc -l | xargs -I {} echo "   JSON: {} arquivos"
    sudo docker exec "$CONTAINER_NAME" find "$INSTANCES_DIR/$INSTANCE" -type f ! -name "*.json" 2>/dev/null | wc -l | xargs -I {} echo "   Outros: {} arquivos"
    
    echo ""
    echo "💡 Arquivos importantes:"
    sudo docker exec "$CONTAINER_NAME" sh -c "
      if [ -f '$INSTANCES_DIR/$INSTANCE/auth_info.json' ]; then
        echo '   ✅ auth_info.json (autenticação)'
      fi
      if [ -f '$INSTANCES_DIR/$INSTANCE/app-state' ]; then
        echo '   ✅ app-state (estado da aplicação)'
      fi
      if [ -f '$INSTANCES_DIR/$INSTANCE/session' ]; then
        echo '   ✅ session (dados da sessão)'
      fi
    "
  else
    echo "❌ Instância '$INSTANCE' não encontrada!"
    echo ""
    echo "Instâncias disponíveis:"
    sudo docker exec "$CONTAINER_NAME" ls -1 "$INSTANCES_DIR" 2>/dev/null | grep -v '^\.' || echo "   Nenhuma instância encontrada"
  fi
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

