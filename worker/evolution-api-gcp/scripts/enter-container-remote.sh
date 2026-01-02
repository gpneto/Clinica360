#!/bin/bash

# Script para acessar o container Docker remotamente via SSH

PROJECT_ID="agendamentointeligente-4405f"
VM_NAME="evolution-api-gcp"
ZONE="us-central1-a"

echo "🐳 Acessando container Evolution API na VM: ${VM_NAME}"
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

# Verificar se foi passado um comando específico
if [ -n "$1" ]; then
  echo "Executando comando na VM: $*"
  echo ""
  if [ -n "$SSH_METHOD" ]; then
    gcloud compute ssh ${VM_NAME} --zone=${ZONE} --project=${PROJECT_ID} --tunnel-through-iap \
      --command="sudo docker exec -it evolution-api $*"
  else
    gcloud compute ssh ${VM_NAME} --zone=${ZONE} --project=${PROJECT_ID} \
      --command="sudo docker exec -it evolution-api $*"
  fi
else
  echo "💡 Opções:"
  echo ""
  echo "1. Entrar no container interativamente:"
  echo "   $0 sh"
  echo ""
  echo "2. Executar um comando específico:"
  echo "   $0 ls -lah /evolution/instances/"
  echo ""
  echo "3. Ou conectar diretamente na VM e usar docker compose:"
  echo "   gcloud compute ssh ${VM_NAME} --zone=${ZONE} --tunnel-through-iap"
  echo "   cd /opt/evolution-api-gcp"
  echo "   sudo docker compose exec evolution-api sh"
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  echo "Conectando na VM e entrando no container..."
  echo ""
  
  # Conectar na VM e entrar no container
  if [ -n "$SSH_METHOD" ]; then
    gcloud compute ssh ${VM_NAME} --zone=${ZONE} --project=${PROJECT_ID} --tunnel-through-iap \
      --command="cd /opt/evolution-api-gcp && sudo docker compose exec evolution-api sh"
  else
    gcloud compute ssh ${VM_NAME} --zone=${ZONE} --project=${PROJECT_ID} \
      --command="cd /opt/evolution-api-gcp && sudo docker compose exec evolution-api sh"
  fi
fi



