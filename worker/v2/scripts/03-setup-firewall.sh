#!/bin/bash

# Script para configurar firewall no GCP (v2)

set -e

PROJECT_ID="${PROJECT_ID:-agendamentointeligente-4405f}"

echo "🔥 Configurando regras de firewall para Evolution API v2..."

# Regra para HTTP
if gcloud compute firewall-rules describe allow-http-v2 --project=${PROJECT_ID} &>/dev/null; then
    echo "⚠️  Regra allow-http-v2 já existe, pulando..."
else
    echo "📝 Criando regra para HTTP (porta 80)..."
    gcloud compute firewall-rules create allow-http-v2 \
        --project=${PROJECT_ID} \
        --direction=INGRESS \
        --priority=1000 \
        --network=default \
        --action=ALLOW \
        --rules=tcp:80 \
        --source-ranges=0.0.0.0/0 \
        --target-tags=http-server
    echo "✅ Regra HTTP criada!"
fi

# Regra para HTTPS
if gcloud compute firewall-rules describe allow-https-v2 --project=${PROJECT_ID} &>/dev/null; then
    echo "⚠️  Regra allow-https-v2 já existe, pulando..."
else
    echo "📝 Criando regra para HTTPS (porta 443)..."
    gcloud compute firewall-rules create allow-https-v2 \
        --project=${PROJECT_ID} \
        --direction=INGRESS \
        --priority=1000 \
        --network=default \
        --action=ALLOW \
        --rules=tcp:443 \
        --source-ranges=0.0.0.0/0 \
        --target-tags=https-server
    echo "✅ Regra HTTPS criada!"
fi

# Regra para PostgreSQL (v2 - usando porta diferente se necessário)
# Nota: Se você quiser usar a mesma porta 5432, considere usar tags diferentes ou IPs diferentes
if gcloud compute firewall-rules describe allow-postgres-v2 --project=${PROJECT_ID} &>/dev/null; then
    echo "⚠️  Regra allow-postgres-v2 já existe, pulando..."
else
    echo "📝 Criando regra para PostgreSQL (porta 5432)..."
    echo "⚠️  ATENÇÃO: Esta regra permite acesso na porta 5432. Se você já tem outra VM usando esta porta, considere usar uma porta diferente."
    gcloud compute firewall-rules create allow-postgres-v2 \
        --project=${PROJECT_ID} \
        --direction=INGRESS \
        --priority=1001 \
        --network=default \
        --action=ALLOW \
        --rules=tcp:5432 \
        --source-ranges=0.0.0.0/0 \
        --target-tags=http-server,https-server
    echo "✅ Regra PostgreSQL criada!"
fi

echo ""
echo "✅ Firewall configurado com sucesso!"
echo ""
echo "⚠️  ATENÇÃO: PostgreSQL está exposto publicamente na porta 5432"
echo "   Certifique-se de usar uma senha forte no POSTGRES_PASSWORD!"



