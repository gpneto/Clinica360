#!/bin/bash

# Script para ver logs da Evolution API na VM do GCP em tempo real

PROJECT_ID="agendamentointeligente-4405f"
VM_NAME="evolution-api-v2-gcp"
ZONE="us-central1-a"

echo "📋 Visualizando logs da Evolution API em tempo real..."
echo "💡 Pressione Ctrl+C para sair"
echo ""

# Verificar se gcloud está instalado
if ! command -v gcloud &> /dev/null; then
  echo "❌ Erro: gcloud não está instalado."
  echo "   Instale o Google Cloud SDK: https://cloud.google.com/sdk/docs/install"
  exit 1
fi

# Verificar se está autenticado
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
  echo "⚠️  Você não está autenticado no gcloud."
  echo "   Executando: gcloud auth login"
  gcloud auth login
fi

# Configurar projeto padrão
CURRENT_PROJECT=$(gcloud config get-value project 2>/dev/null)
if [ "$CURRENT_PROJECT" != "$PROJECT_ID" ]; then
  echo "⚙️  Configurando projeto padrão: ${PROJECT_ID}"
  gcloud config set project ${PROJECT_ID}
fi

# Verificar se a configuração está correta
if ! gcloud config list &> /dev/null; then
  echo "❌ Erro: Falha ao verificar configuração do gcloud."
  echo "   Execute manualmente:"
  echo "   gcloud auth login"
  echo "   gcloud config set project ${PROJECT_ID}"
  exit 1
fi

# Verificar se foi passado um argumento para escolher qual serviço ver
SERVICE="${1:-}"

if [ -z "$SERVICE" ]; then
  # Ver todos os logs
  gcloud compute ssh ${VM_NAME} --zone=${ZONE} --project=${PROJECT_ID} --command="cd /opt/evolution-api-v2-gcp && sudo docker compose logs -f"
else
  # Ver logs de um serviço específico
  gcloud compute ssh ${VM_NAME} --zone=${ZONE} --project=${PROJECT_ID} --command="cd /opt/evolution-api-v2-gcp && sudo docker compose logs -f ${SERVICE}"
fi

