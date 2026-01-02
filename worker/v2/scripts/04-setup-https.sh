#!/bin/bash

# Script para configurar HTTPS com Let's Encrypt (v2)

set -e

PROJECT_ID="${PROJECT_ID:-agendamentointeligente-4405f}"
ZONE="${ZONE:-us-central1-a}"
VM_NAME="${VM_NAME:-evolution-api-v2-gcp}"
DOMAIN="${DOMAIN:-}"

if [ -z "$DOMAIN" ]; then
    echo "❌ Por favor, defina a variável DOMAIN:"
    echo "   export DOMAIN=seu-dominio.com"
    echo "   ./scripts/04-setup-https.sh"
    exit 1
fi

echo "🔒 Configurando HTTPS para ${DOMAIN} (v2)..."

# Obter IP da VM
EXTERNAL_IP=$(gcloud compute instances describe ${VM_NAME} --zone=${ZONE} --project=${PROJECT_ID} --format='get(networkInterfaces[0].accessConfigs[0].natIP)')

echo "🌐 IP da VM: ${EXTERNAL_IP}"
echo ""
echo "⚠️  IMPORTANTE: Configure o DNS do seu domínio para apontar para este IP:"
echo "   ${DOMAIN} -> ${EXTERNAL_IP}"
echo ""
read -p "Pressione Enter quando o DNS estiver configurado..."

# Criar script de configuração SSL na VM
cat > /tmp/setup-ssl-vm-v2.sh << 'EOFSCRIPT'
#!/bin/bash
set -e

DOMAIN="${DOMAIN}"
EXTERNAL_IP="${EXTERNAL_IP}"

# Instalar Certbot
apt-get update
apt-get install -y certbot

# Criar diretório para certificados
mkdir -p /etc/letsencrypt/live/${DOMAIN}
mkdir -p /var/www/certbot

# Parar nginx temporariamente se estiver rodando
cd /opt/evolution-api-v2-gcp 2>/dev/null || true
if [ -f docker-compose.yml ]; then
    docker compose stop nginx 2>/dev/null || true
fi

# Obter certificado usando modo standalone (porta 80 precisa estar livre)
certbot certonly --standalone \
    -d ${DOMAIN} \
    --non-interactive \
    --agree-tos \
    --email admin@${DOMAIN} \
    --preferred-challenges http \
    --http-01-port 80

# Reiniciar nginx se estava rodando
if [ -f /opt/evolution-api-v2-gcp/docker-compose.yml ]; then
    cd /opt/evolution-api-v2-gcp
    docker compose up -d nginx 2>/dev/null || true
fi

# Configurar renovação automática
(crontab -l 2>/dev/null | grep -v "certbot renew" || true; echo "0 3 * * * certbot renew --quiet --deploy-hook 'cd /opt/evolution-api-v2-gcp && docker compose restart nginx'") | crontab -

echo "✅ Certificado SSL configurado!"
EOFSCRIPT

# Copiar script para VM
gcloud compute scp /tmp/setup-ssl-vm-v2.sh ${VM_NAME}:~/setup-ssl.sh --zone=${ZONE} --project=${PROJECT_ID}

# Executar script na VM
gcloud compute ssh ${VM_NAME} --zone=${ZONE} --project=${PROJECT_ID} --command="chmod +x ~/setup-ssl.sh && DOMAIN=${DOMAIN} EXTERNAL_IP=${EXTERNAL_IP} bash ~/setup-ssl.sh"

# Atualizar configuração do nginx com o domínio
gcloud compute ssh ${VM_NAME} --zone=${ZONE} --project=${PROJECT_ID} --command="
cd /opt/evolution-api-v2-gcp
if [ -f config/nginx-ssl.conf ]; then
    sed -i 's|/etc/letsencrypt/live/evolution-api/|/etc/letsencrypt/live/${DOMAIN}/|g' config/nginx-ssl.conf
    # Reiniciar nginx para aplicar mudanças
    docker compose restart nginx 2>/dev/null || true
fi
"

echo ""
echo "✅ HTTPS configurado com sucesso!"
echo "🌐 Acesse: https://${DOMAIN}"

