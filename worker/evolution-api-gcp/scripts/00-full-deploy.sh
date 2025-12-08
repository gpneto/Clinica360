#!/bin/bash

# Script completo para fazer deploy do Evolution API no GCP
# Este script executa todos os passos necessários em sequência

set -e

PROJECT_ID="${PROJECT_ID:-agendamentointeligente-4405f}"
ZONE="${ZONE:-us-central1-a}"
VM_NAME="${VM_NAME:-evolution-api-gcp}"
DOMAIN="${DOMAIN:-}"

echo "🚀 Deploy completo do Evolution API no GCP"
echo "============================================"
echo ""

# Verificar se gcloud está instalado
if ! command -v gcloud &> /dev/null; then
    echo "❌ gcloud CLI não está instalado!"
    echo "   Instale em: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Verificar se está autenticado
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
    echo "❌ Você não está autenticado no gcloud!"
    echo "   Execute: gcloud auth login"
    exit 1
fi

# Definir projeto
gcloud config set project ${PROJECT_ID}

echo "📋 Configuração:"
echo "   Projeto: ${PROJECT_ID}"
echo "   Zona: ${ZONE}"
echo "   VM: ${VM_NAME}"
if [ -n "$DOMAIN" ]; then
    echo "   Domínio: ${DOMAIN}"
fi
echo ""

read -p "Continuar? (s/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Ss]$ ]]; then
    exit 0
fi

# Passo 1: Criar discos persistentes
echo ""
echo "📦 Passo 1/6: Criando discos persistentes..."
bash scripts/01-create-persistent-disks.sh

# Passo 2: Criar VM
echo ""
echo "🖥️  Passo 2/6: Criando VM..."
bash scripts/02-create-vm.sh

# Passo 3: Configurar firewall
echo ""
echo "🔥 Passo 3/6: Configurando firewall..."
bash scripts/03-setup-firewall.sh

# Passo 4: Configurar HTTPS (se domínio fornecido)
if [ -n "$DOMAIN" ]; then
    echo ""
    echo "🔒 Passo 4/6: Configurando HTTPS..."
    export DOMAIN=${DOMAIN}
    bash scripts/04-setup-https.sh
else
    echo ""
    echo "⏭️  Passo 4/6: Pulando configuração HTTPS (DOMAIN não definido)"
    echo "   Para configurar HTTPS depois, execute:"
    echo "   export DOMAIN=seu-dominio.com"
    echo "   bash scripts/04-setup-https.sh"
fi

# Passo 5: Deploy (inclui verificação/instalação do Docker)
echo ""
echo "🚀 Passo 5/6: Fazendo deploy..."
bash scripts/05-deploy.sh

echo ""
echo "✅ Deploy completo finalizado!"
echo ""
EXTERNAL_IP=$(gcloud compute instances describe ${VM_NAME} --zone=${ZONE} --project=${PROJECT_ID} --format='get(networkInterfaces[0].accessConfigs[0].natIP)' 2>/dev/null || echo "obter-ip")

echo "📋 Próximos passos:"
echo "   1. Configure o .env com suas variáveis (se ainda não fez)"
echo "   2. Acesse a API:"
echo "      - HTTP:  http://${EXTERNAL_IP}:8080"
echo "      - HTTPS: https://${EXTERNAL_IP} (certificado auto-assinado)"
if [ -n "$DOMAIN" ]; then
    echo "      - HTTPS com domínio: https://${DOMAIN}"
fi
echo ""
echo "   ⚠️  Nota: O navegador mostrará aviso sobre certificado não confiável"
echo "      (normal para certificados auto-assinados). A conexão será criptografada."
echo ""
echo "📚 Documentação:"
echo "   - Ver logs: gcloud compute ssh ${VM_NAME} --zone=${ZONE} --command='cd /opt/evolution-api-gcp && sudo docker compose logs -f'"
echo "   - Reiniciar: gcloud compute ssh ${VM_NAME} --zone=${ZONE} --command='cd /opt/evolution-api-gcp && sudo docker compose restart'"
echo ""
echo "📋 Scripts de gerenciamento:"
echo "   - Status: bash scripts/manage.sh status"
echo "   - Logs: bash scripts/manage.sh logs"
echo "   - Reiniciar: bash scripts/manage.sh restart"

