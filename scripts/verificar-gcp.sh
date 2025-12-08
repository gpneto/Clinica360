#!/bin/bash

# Script para verificar configurações do GCP
# Uso: ./scripts/verificar-gcp.sh

# Removido set -e para evitar saída prematura em caso de erros não críticos

PROJECT_ID="agendamentointeligente-4405f"
echo "🔍 Verificando configurações do GCP para o projeto: $PROJECT_ID"
echo ""

# Cores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Função para verificar se o gcloud CLI está instalado
check_gcloud() {
    if ! command -v gcloud &> /dev/null; then
        echo -e "${RED}❌ gcloud CLI não está instalado${NC}"
        echo "Instale em: https://cloud.google.com/sdk/docs/install"
        exit 1
    fi
    echo -e "${GREEN}✅ gcloud CLI encontrado${NC}"
}

# Função para verificar login
check_login() {
    if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" &> /dev/null; then
        echo -e "${YELLOW}⚠️  Você não está logado no gcloud${NC}"
        echo "Execute: gcloud auth login"
        return 1
    fi
    echo -e "${GREEN}✅ Autenticado no gcloud${NC}"
    return 0
}

# Função para verificar se a API está habilitada
check_api_enabled() {
    local api_name=$1
    local api_display_name=$2
    
    echo -n "Verificando $api_display_name... "
    
    if gcloud services list --enabled --filter="name:$api_name" --format="value(name)" --project=$PROJECT_ID | grep -q "$api_name"; then
        echo -e "${GREEN}✅ Habilitada${NC}"
        return 0
    else
        echo -e "${RED}❌ NÃO habilitada${NC}"
        echo "  Habilitar: https://console.cloud.google.com/apis/library/$api_name?project=$PROJECT_ID"
        return 1
    fi
}

# Função para listar chaves de API
list_api_keys() {
    echo ""
    echo "📋 Chaves de API encontradas:"
    # Tentar listar chaves de API (pode demorar alguns segundos)
    local output
    if output=$(gcloud services api-keys list --project=$PROJECT_ID --format="table(displayName,name,restrictions)" 2>/dev/null 2>&1); then
        echo "$output"
        echo ""
    else
        echo "  ⚠️  Não foi possível listar chaves de API automaticamente"
        echo "  Verifique manualmente: https://console.cloud.google.com/apis/credentials?project=$PROJECT_ID"
        echo ""
    fi
}

# Função para informar sobre clientes OAuth
list_oauth_clients() {
    echo ""
    echo "📋 Clientes OAuth 2.0:"
    echo "  ℹ️  Não é possível listar clientes OAuth via CLI"
    echo "  👉 Verifique manualmente em:"
    echo "     https://console.cloud.google.com/apis/credentials?project=$PROJECT_ID"
    echo ""
    echo "  O que verificar:"
    echo "  ✅ Deve existir um cliente OAuth 2.0 criado pelo Firebase"
    echo "  ✅ Tipo: 'Aplicativo da Web'"
    echo "  ✅ URIs de redirecionamento devem incluir:"
    echo "     - https://webagendamentos.web.app/__/auth/handler"
    echo "     - https://webagendamentos.firebaseapp.com/__/auth/handler"
    echo "     - https://agendamentointeligente-4405f.firebaseapp.com/__/auth/handler"
}

# Main
echo "🔧 Verificando pré-requisitos..."
check_gcloud
check_login || exit 1

echo ""
echo "🌐 Verificando APIs habilitadas..."
echo ""

APIS=(
    "identitytoolkit.googleapis.com:Identity Toolkit API"
    "firestore.googleapis.com:Cloud Firestore API"
    "cloudfunctions.googleapis.com:Cloud Functions API"
    "storage-component.googleapis.com:Cloud Storage API"
)

ALL_APIS_OK=true
for api_info in "${APIS[@]}"; do
    IFS=':' read -r api_name api_display <<< "$api_info"
    if ! check_api_enabled "$api_name" "$api_display"; then
        ALL_APIS_OK=false
    fi
done

echo ""
echo "🔑 Verificando credenciais..."
list_api_keys
list_oauth_clients

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
if [ "$ALL_APIS_OK" = true ]; then
    echo -e "${GREEN}✅ Todas as APIs necessárias estão habilitadas${NC}"
else
    echo -e "${YELLOW}⚠️  Algumas APIs não estão habilitadas${NC}"
    echo "  Verifique os links acima para habilitá-las"
fi

echo ""
echo "📝 Próximos passos:"
echo ""
echo "1. Verifique as chaves de API em:"
echo "   https://console.cloud.google.com/apis/credentials?project=$PROJECT_ID"
echo ""
echo "2. Verifique os clientes OAuth 2.0 na mesma página"
echo ""
echo "3. Verifique domínios autorizados no Firebase:"
echo "   https://console.firebase.google.com/project/$PROJECT_ID/authentication/settings"
echo ""
echo "4. Consulte o guia completo: VERIFICACAO_GCP.md"
echo ""
