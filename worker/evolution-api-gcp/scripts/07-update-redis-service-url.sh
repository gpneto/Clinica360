#!/bin/bash

# Script para atualizar a URL do Redis Cache Service nas Cloud Functions
# Útil quando a VM recebe um novo IP externo

set -e

PROJECT_ID="${PROJECT_ID:-agendamentointeligente-4405f}"
ZONE="${ZONE:-us-central1-a}"
VM_NAME="${VM_NAME:-evolution-api-gcp}"

echo "🔄 Atualizando URL do Redis Cache Service nas Cloud Functions..."

# IP fixo da VM (ou obter dinamicamente)
EXTERNAL_IP="${VM_IP:-34.42.180.145}"

# Se não foi fornecido via variável, tentar obter dinamicamente
if [ "$EXTERNAL_IP" == "34.42.180.145" ]; then
    DETECTED_IP=$(gcloud compute instances describe ${VM_NAME} --zone=${ZONE} --project=${PROJECT_ID} --format='get(networkInterfaces[0].accessConfigs[0].natIP)' 2>/dev/null || echo "")
    if [ ! -z "$DETECTED_IP" ] && [ "$DETECTED_IP" != "34.42.180.145" ]; then
        echo "⚠️  IP detectado diferente do configurado: ${DETECTED_IP}"
        echo "   Usando IP detectado..."
        EXTERNAL_IP="$DETECTED_IP"
    fi
fi

echo "🌐 IP da VM: ${EXTERNAL_IP}"
echo "📝 Configurando REDIS_SERVICE_URL=http://${EXTERNAL_IP}:8081"

# Verificar se estamos no diretório do projeto
if [ ! -f "firebase.json" ] && [ ! -f "../firebase.json" ]; then
    echo "⚠️  Não encontrado firebase.json. Execute este script da raiz do projeto ou da pasta functions."
    echo "   Você pode configurar manualmente:"
    echo ""
    echo "   firebase functions:config:set redis_service.url=\"http://${EXTERNAL_IP}:8081\""
    echo "   firebase functions:config:set redis_service.api_key=\"SmartDoctorRedisService2024!Secure\""
    echo ""
    echo "   Ou via .env nas Functions:"
    echo "   REDIS_SERVICE_URL=http://${EXTERNAL_IP}:8081"
    echo "   REDIS_SERVICE_API_KEY=SmartDoctorRedisService2024!Secure"
    exit 0
fi

# Tentar configurar via Firebase CLI
if command -v firebase &> /dev/null; then
    echo "📦 Configurando via Firebase CLI..."
    
    # Verificar se está logado
    if ! firebase projects:list &> /dev/null; then
        echo "⚠️  Você precisa estar logado no Firebase. Execute: firebase login"
        exit 1
    fi
    
    firebase functions:config:set \
        redis_service.url="http://${EXTERNAL_IP}:8081" \
        redis_service.api_key="SmartDoctorRedisService2024!Secure"
    
    echo "✅ Variáveis de ambiente configuradas!"
    echo ""
    echo "⚠️  IMPORTANTE: Você precisa fazer redeploy das functions para aplicar as mudanças:"
    echo "   firebase deploy --only functions"
else
    echo "⚠️  Firebase CLI não encontrado. Configure manualmente:"
    echo ""
    echo "   firebase functions:config:set redis_service.url=\"http://${EXTERNAL_IP}:8081\""
    echo "   firebase functions:config:set redis_service.api_key=\"SmartDoctorRedisService2024!Secure\""
    echo ""
    echo "   Ou via .env nas Functions:"
    echo "   REDIS_SERVICE_URL=http://${EXTERNAL_IP}:8081"
    echo "   REDIS_SERVICE_API_KEY=SmartDoctorRedisService2024!Secure"
fi

echo ""
echo "✅ Script concluído!"

