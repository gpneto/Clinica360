#!/bin/bash

# Script para configurar o Redis Cache Service nas Cloud Functions
# IP da VM: 34.42.180.145

set -e

REDIS_SERVICE_URL="http://34.42.180.145:8081"
REDIS_SERVICE_API_KEY="SmartDoctorRedisService2024!Secure"

echo "🔧 Configurando Redis Cache Service nas Cloud Functions..."
echo ""
echo "📋 Configuração:"
echo "   URL: ${REDIS_SERVICE_URL}"
echo "   API Key: ${REDIS_SERVICE_API_KEY}"
echo ""

# Verificar se estamos no diretório do projeto
if [ ! -f "firebase.json" ] && [ ! -f "../firebase.json" ]; then
    echo "⚠️  Não encontrado firebase.json."
    echo ""
    echo "📝 Configure manualmente as variáveis de ambiente nas Cloud Functions:"
    echo ""
    echo "   REDIS_SERVICE_URL=${REDIS_SERVICE_URL}"
    echo "   REDIS_SERVICE_API_KEY=${REDIS_SERVICE_API_KEY}"
    echo ""
    echo "   Ou via Firebase Console:"
    echo "   1. Acesse https://console.firebase.google.com"
    echo "   2. Vá em Functions > Configurações"
    echo "   3. Adicione as variáveis acima"
    exit 0
fi

# Verificar se Firebase CLI está instalado
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI não encontrado."
    echo "   Instale com: npm install -g firebase-tools"
    exit 1
fi

# Verificar se está logado
if ! firebase projects:list &> /dev/null; then
    echo "⚠️  Você precisa estar logado no Firebase."
    echo "   Execute: firebase login"
    exit 1
fi

echo "📦 Configurando variáveis de ambiente..."

# Nota: Firebase Functions v2+ usa variáveis de ambiente diretamente
# Para configurar, você precisa usar o Firebase Console ou definir no código
# Este script mostra as instruções

echo ""
echo "✅ Para configurar as variáveis de ambiente, você tem duas opções:"
echo ""
echo "1️⃣  Via Firebase Console (Recomendado):"
echo "   - Acesse: https://console.firebase.google.com"
echo "   - Vá em: Functions > Configurações > Runtime Config"
echo "   - Adicione as variáveis:"
echo "     • REDIS_SERVICE_URL = ${REDIS_SERVICE_URL}"
echo "     • REDIS_SERVICE_API_KEY = ${REDIS_SERVICE_API_KEY}"
echo ""
echo "2️⃣  Via arquivo .env (para desenvolvimento local):"
echo "   - Crie/edite: functions/.env"
echo "   - Adicione:"
echo "     REDIS_SERVICE_URL=${REDIS_SERVICE_URL}"
echo "     REDIS_SERVICE_API_KEY=${REDIS_SERVICE_API_KEY}"
echo ""
echo "⚠️  IMPORTANTE: Após configurar, faça redeploy das functions:"
echo "   firebase deploy --only functions"
echo ""
echo "🧪 Para testar se o serviço está acessível:"
echo "   curl http://34.42.180.145:8081/health"
echo ""

