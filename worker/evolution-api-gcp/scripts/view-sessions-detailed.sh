#!/bin/bash

# Script detalhado para visualizar arquivos de sessão do Evolution API
# Verifica múltiplos locais: diretório de instâncias, dentro do container, e no PostgreSQL

PROJECT_ID="agendamentointeligente-4405f"
VM_NAME="evolution-api-gcp"
ZONE="us-central1-a"
SESSIONS_DIR="/mnt/disks/evolution-data/instances"
CONTAINER_SESSIONS_DIR="/evolution/instances"

echo "📁 Verificando arquivos de sessão do Evolution API..."
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

echo "1️⃣  Verificando diretório de instâncias no disco persistente..."
echo "   Caminho: ${SESSIONS_DIR}"
echo ""
INSTANCES_HOST=$(run_ssh "ls -1 ${SESSIONS_DIR}/ 2>/dev/null | grep -v '^\.' || echo ''")
if [ -z "$INSTANCES_HOST" ]; then
  echo "   ⚠️  Nenhuma instância encontrada no disco persistente"
else
  echo "   ✅ Instâncias encontradas:"
  echo "$INSTANCES_HOST" | while read instance; do
    if [ -n "$instance" ]; then
      SIZE=$(run_ssh "du -sh ${SESSIONS_DIR}/${instance} 2>/dev/null | cut -f1")
      echo "      - ${instance} (${SIZE})"
    fi
  done
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "2️⃣  Verificando dentro do container Docker..."
echo "   Container: evolution-api"
echo "   Caminho: ${CONTAINER_SESSIONS_DIR}"
echo ""
INSTANCES_CONTAINER=$(run_ssh "sudo docker exec evolution-api ls -1 ${CONTAINER_SESSIONS_DIR}/ 2>/dev/null | grep -v '^\.' || echo ''")
if [ -z "$INSTANCES_CONTAINER" ]; then
  echo "   ⚠️  Nenhuma instância encontrada dentro do container"
else
  echo "   ✅ Instâncias encontradas no container:"
  echo "$INSTANCES_CONTAINER" | while read instance; do
    if [ -n "$instance" ]; then
      SIZE=$(run_ssh "sudo docker exec evolution-api du -sh ${CONTAINER_SESSIONS_DIR}/${instance} 2>/dev/null | cut -f1")
      echo "      - ${instance} (${SIZE})"
    fi
  done
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "3️⃣  Verificando instâncias no PostgreSQL..."
echo "   (As instâncias podem estar salvas no banco de dados)"
echo ""
DB_INSTANCES=$(run_ssh "sudo docker exec evolution-postgres psql -U evolution -d evolution -t -c \"SELECT DISTINCT name FROM instance WHERE name IS NOT NULL;\" 2>/dev/null | tr -d ' ' | grep -v '^$' || echo ''")
if [ -z "$DB_INSTANCES" ]; then
  echo "   ⚠️  Nenhuma instância encontrada no PostgreSQL"
  echo "   💡 Isso pode significar que:"
  echo "      - Ainda não há instâncias criadas"
  echo "      - A tabela 'instance' não existe ainda"
else
  echo "   ✅ Instâncias encontradas no banco de dados:"
  echo "$DB_INSTANCES" | while read instance; do
    if [ -n "$instance" ]; then
      STATUS=$(run_ssh "sudo docker exec evolution-postgres psql -U evolution -d evolution -t -c \"SELECT status FROM instance WHERE name='${instance}' LIMIT 1;\" 2>/dev/null | tr -d ' ' || echo 'unknown'")
      echo "      - ${instance} (status: ${STATUS})"
    fi
  done
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "4️⃣  Verificando status do container Evolution API..."
echo ""
CONTAINER_STATUS=$(run_ssh "sudo docker ps --filter name=evolution-api --format '{{.Status}}' 2>/dev/null || echo 'Container não está rodando'")
echo "   Status: ${CONTAINER_STATUS}"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Se foi passado um nome de instância, mostrar detalhes
INSTANCE="${1:-}"
if [ -n "$INSTANCE" ]; then
  echo "📂 Detalhes da instância: ${INSTANCE}"
  echo ""
  
  echo "   Arquivos no disco persistente:"
  run_ssh "if [ -d '${SESSIONS_DIR}/${INSTANCE}' ]; then
    echo '   📁 Estrutura:'
    find ${SESSIONS_DIR}/${INSTANCE} -type f -exec ls -lh {} \; 2>/dev/null | head -20 | sed 's/^/      /'
    echo ''
    echo '   📊 Estatísticas:'
    echo '      Total de arquivos:' \$(find ${SESSIONS_DIR}/${INSTANCE} -type f 2>/dev/null | wc -l)
    echo '      Tamanho total:' \$(du -sh ${SESSIONS_DIR}/${INSTANCE} 2>/dev/null | cut -f1)
  else
    echo '      ⚠️  Diretório não encontrado no disco persistente'
  fi"
  
  echo ""
  echo "   Arquivos no container:"
  run_ssh "sudo docker exec evolution-api sh -c \"if [ -d '${CONTAINER_SESSIONS_DIR}/${INSTANCE}' ]; then
    echo '   📁 Estrutura:'
    find ${CONTAINER_SESSIONS_DIR}/${INSTANCE} -type f -exec ls -lh {} \; 2>/dev/null | head -20 | sed 's/^/      /'
  else
    echo '      ⚠️  Diretório não encontrado no container'
  fi\""
  
  echo ""
  echo "   Informações no PostgreSQL:"
  run_ssh "sudo docker exec evolution-postgres psql -U evolution -d evolution -c \"SELECT name, status, qrcode, number FROM instance WHERE name='${INSTANCE}';\" 2>/dev/null || echo '      ⚠️  Instância não encontrada no banco de dados'"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "💡 Dica: Para ver detalhes de uma instância específica:"
echo "   $0 <nome-da-instancia>"
echo ""
echo "💡 Nota: Se não houver instâncias, você precisa criar uma via API do Evolution:"
echo "   POST /instance/create"

