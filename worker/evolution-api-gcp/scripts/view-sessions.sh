#!/bin/bash

# Script para visualizar arquivos de sessão do Evolution API na VM do GCP

PROJECT_ID="agendamentointeligente-4405f"
VM_NAME="evolution-api-gcp"
ZONE="us-central1-a"
SESSIONS_DIR="/mnt/disks/evolution-data/instances"

echo "📁 Visualizando arquivos de sessão do Evolution API..."
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

echo "🔍 Listando diretórios de instâncias..."
echo ""

# Tentar primeiro com IAP tunneling (mais seguro e funciona mesmo sem IP externo)
# Se falhar, tentar sem IAP
SSH_METHOD=""
if gcloud compute ssh ${VM_NAME} --zone=${ZONE} --project=${PROJECT_ID} --tunnel-through-iap \
  --command="echo 'test'" 2>/dev/null >/dev/null; then
  SSH_METHOD="--tunnel-through-iap"
  echo "✅ Usando IAP tunneling"
else
  echo "⚠️  Tentando conexão SSH direta (sem IAP)..."
  SSH_METHOD=""
fi

# Listar diretórios de instâncias (cada instância tem seu próprio diretório)
if [ -n "$SSH_METHOD" ]; then
  gcloud compute ssh ${VM_NAME} --zone=${ZONE} --project=${PROJECT_ID} --tunnel-through-iap \
    --command="ls -lah ${SESSIONS_DIR}/ 2>/dev/null || echo 'Diretório não encontrado ou vazio'"
else
  gcloud compute ssh ${VM_NAME} --zone=${ZONE} --project=${PROJECT_ID} \
    --command="ls -lah ${SESSIONS_DIR}/ 2>/dev/null || echo 'Diretório não encontrado ou vazio'"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Verificar se foi passado um argumento para ver detalhes de uma instância específica
INSTANCE="${1:-}"

if [ -z "$INSTANCE" ]; then
  echo "💡 Para ver detalhes de uma instância específica, use:"
  echo "   $0 <nome-da-instancia>"
  echo ""
  echo "📋 Exemplo: $0 minha-instancia"
else
  echo "📂 Detalhes da instância: ${INSTANCE}"
  echo ""
  
  # Listar arquivos dentro do diretório da instância
  if [ -n "$SSH_METHOD" ]; then
    gcloud compute ssh ${VM_NAME} --zone=${ZONE} --project=${PROJECT_ID} --tunnel-through-iap \
      --command="if [ -d '${SESSIONS_DIR}/${INSTANCE}' ]; then
      echo '📁 Estrutura de arquivos:'
      echo ''
      find ${SESSIONS_DIR}/${INSTANCE} -type f -exec ls -lh {} \; | head -20
      echo ''
      echo '📊 Estatísticas:'
      echo 'Total de arquivos:' \$(find ${SESSIONS_DIR}/${INSTANCE} -type f | wc -l)
      echo 'Tamanho total:' \$(du -sh ${SESSIONS_DIR}/${INSTANCE} 2>/dev/null | cut -f1)
    else
      echo '❌ Instância não encontrada: ${INSTANCE}'
      echo '   Instâncias disponíveis:'
      ls -1 ${SESSIONS_DIR}/ 2>/dev/null || echo '   Nenhuma instância encontrada'
    fi"
  else
    gcloud compute ssh ${VM_NAME} --zone=${ZONE} --project=${PROJECT_ID} \
      --command="if [ -d '${SESSIONS_DIR}/${INSTANCE}' ]; then
      echo '📁 Estrutura de arquivos:'
      echo ''
      find ${SESSIONS_DIR}/${INSTANCE} -type f -exec ls -lh {} \; | head -20
      echo ''
      echo '📊 Estatísticas:'
      echo 'Total de arquivos:' \$(find ${SESSIONS_DIR}/${INSTANCE} -type f | wc -l)
      echo 'Tamanho total:' \$(du -sh ${SESSIONS_DIR}/${INSTANCE} 2>/dev/null | cut -f1)
    else
      echo '❌ Instância não encontrada: ${INSTANCE}'
      echo '   Instâncias disponíveis:'
      ls -1 ${SESSIONS_DIR}/ 2>/dev/null || echo '   Nenhuma instância encontrada'
    fi"
  fi
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "💡 Dica: Os arquivos de sessão incluem:"
echo "   - auth_info.json (informações de autenticação)"
echo "   - app-state (estado da aplicação)"
echo "   - session (dados da sessão)"
echo "   - outros arquivos de configuração e cache"

