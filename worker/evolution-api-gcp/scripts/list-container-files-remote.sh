#!/bin/bash

# Script para listar arquivos do container Docker - Executa na VM via SSH

PROJECT_ID="agendamentointeligente-4405f"
VM_NAME="evolution-api-gcp"
ZONE="us-central1-a"
INSTANCES_DIR="/evolution/instances"

echo "📁 Arquivos de sessão no container Evolution API (VM: ${VM_NAME})"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Verificar se gcloud está instalado
if ! command -v gcloud &> /dev/null; then
  echo "❌ Erro: gcloud não está instalado."
  exit 1
fi

# Configurar projeto
CURRENT_PROJECT=$(gcloud config get-value project 2>/dev/null)
if [ "$CURRENT_PROJECT" != "$PROJECT_ID" ]; then
  gcloud config set project ${PROJECT_ID} 2>/dev/null
fi

# Determinar método SSH
SSH_METHOD=""
if gcloud compute ssh ${VM_NAME} --zone=${ZONE} --project=${PROJECT_ID} --tunnel-through-iap \
  --command="echo 'test'" 2>/dev/null >/dev/null; then
  SSH_METHOD="--tunnel-through-iap"
fi

# Função para executar comando na VM
run_ssh() {
  if [ -n "$SSH_METHOD" ]; then
    gcloud compute ssh ${VM_NAME} --zone=${ZONE} --project=${PROJECT_ID} --tunnel-through-iap --command="$1" 2>/dev/null
  else
    gcloud compute ssh ${VM_NAME} --zone=${ZONE} --project=${PROJECT_ID} --command="$1" 2>/dev/null
  fi
}

# Verificar se foi passado um nome de instância
INSTANCE="${1:-}"

if [ -z "$INSTANCE" ]; then
  echo "📂 Listando todas as instâncias:"
  echo ""
  
  # Verificar se os containers estão rodando
  CONTAINER_STATUS=$(run_ssh "sudo docker ps --format '{{.Names}}' | grep -i evolution | grep -i api | head -1")
  
  if [ -z "$CONTAINER_STATUS" ]; then
    echo "⚠️  Container Evolution API não está rodando na VM!"
    echo ""
    echo "Containers disponíveis:"
    run_ssh "sudo docker ps --format 'table {{.Names}}\t{{.Status}}'"
    echo ""
    echo "💡 Para iniciar os containers:"
    echo "   gcloud compute ssh ${VM_NAME} --zone=${ZONE} --tunnel-through-iap \\"
    echo "     --command='cd /opt/evolution-api-gcp && sudo docker compose up -d'"
    exit 1
  fi
  
  CONTAINER_NAME="$CONTAINER_STATUS"
  echo "✅ Container encontrado: $CONTAINER_NAME"
  echo ""
  
  # Listar instâncias com tamanhos
  run_ssh "sudo docker exec $CONTAINER_NAME sh -c \"
    if [ -d '$INSTANCES_DIR' ]; then
      for dir in $INSTANCES_DIR/*/; do
        if [ -d \\\"\\\$dir\\\" ]; then
          instance=\\\$(basename \\\"\\\$dir\\\")
          size=\\\$(du -sh \\\"\\\$dir\\\" 2>/dev/null | cut -f1)
          files=\\\$(find \\\"\\\$dir\\\" -type f 2>/dev/null | wc -l)
          echo \\\"  📁 \\\$instance\\\"
          echo \\\"     Tamanho: \\\$size\\\"
          echo \\\"     Arquivos: \\\$files\\\"
          echo \\\"\\\"
        fi
      done
    else
      echo '  ⚠️  Diretório não encontrado ou vazio'
    fi
  \""
  
  echo ""
  echo "💡 Para ver detalhes de uma instância específica:"
  echo "   $0 <nome-da-instancia>"
else
  echo "📂 Detalhes da instância: $INSTANCE"
  echo ""
  
  # Encontrar container
  CONTAINER_NAME=$(run_ssh "sudo docker ps --format '{{.Names}}' | grep -i evolution | grep -i api | head -1")
  
  if [ -z "$CONTAINER_NAME" ]; then
    echo "❌ Container Evolution API não está rodando!"
    exit 1
  fi
  
  # Verificar se a instância existe
  INSTANCE_EXISTS=$(run_ssh "sudo docker exec $CONTAINER_NAME test -d '$INSTANCES_DIR/$INSTANCE' && echo 'yes' || echo 'no'")
  
  if [ "$INSTANCE_EXISTS" = "yes" ]; then
    echo "📁 Estrutura de arquivos:"
    echo ""
    
    # Listar arquivos com detalhes
    run_ssh "sudo docker exec $CONTAINER_NAME find '$INSTANCES_DIR/$INSTANCE' -type f -exec ls -lh {} \; | head -30"
    
    echo ""
    echo "📊 Estatísticas:"
    
    # Total de arquivos
    TOTAL_FILES=$(run_ssh "sudo docker exec $CONTAINER_NAME find '$INSTANCES_DIR/$INSTANCE' -type f 2>/dev/null | wc -l")
    echo "   Total de arquivos: $TOTAL_FILES"
    
    # Tamanho total
    SIZE=$(run_ssh "sudo docker exec $CONTAINER_NAME du -sh '$INSTANCES_DIR/$INSTANCE' 2>/dev/null | cut -f1")
    echo "   Tamanho total: $SIZE"
    
    # Arquivos importantes
    echo ""
    echo "💡 Verificando arquivos importantes:"
    run_ssh "sudo docker exec $CONTAINER_NAME sh -c \"
      if [ -f '$INSTANCES_DIR/$INSTANCE/auth_info.json' ]; then
        echo '   ✅ auth_info.json (autenticação)'
      fi
      if [ -f '$INSTANCES_DIR/$INSTANCE/app-state' ]; then
        echo '   ✅ app-state (estado da aplicação)'
      fi
      if [ -f '$INSTANCES_DIR/$INSTANCE/session' ]; then
        echo '   ✅ session (dados da sessão)'
      fi
    \""
  else
    echo "❌ Instância '$INSTANCE' não encontrada!"
    echo ""
    echo "Instâncias disponíveis:"
    run_ssh "sudo docker exec $CONTAINER_NAME ls -1 '$INSTANCES_DIR' 2>/dev/null | grep -v '^\.' || echo '   Nenhuma instância encontrada'"
  fi
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

