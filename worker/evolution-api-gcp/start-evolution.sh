#!/bin/bash
set -e

cd /opt/evolution-api-gcp

# Carregar variáveis do .env
export $(cat .env | grep -v '^#' | xargs)

# Garantir que Docker está rodando
sudo systemctl start docker || true

# Garantir que diretórios do disco persistente existem
sudo mkdir -p /mnt/disks/evolution-data/postgres
sudo mkdir -p /mnt/disks/evolution-data/redis
sudo mkdir -p /mnt/disks/evolution-data/instances
sudo mkdir -p /mnt/disks/evolution-data/logs
sudo mkdir -p /mnt/disks/evolution-data/tmp
sudo mkdir -p /mnt/disks/evolution-data/database
sudo mkdir -p /mnt/disks/evolution-data/messages

# Configurar permissões
sudo chown -R 999:999 /mnt/disks/evolution-data/postgres 2>/dev/null || true
sudo chown -R 999:999 /mnt/disks/evolution-data/redis 2>/dev/null || true
# Instâncias precisam de permissões de escrita para o usuário do container (geralmente 1000 ou root)
sudo chown -R 1000:1000 /mnt/disks/evolution-data/instances 2>/dev/null || sudo chown -R root:root /mnt/disks/evolution-data/instances 2>/dev/null || true
sudo chmod -R 755 /mnt/disks/evolution-data/instances 2>/dev/null || true
sudo chmod -R 755 /mnt/disks/evolution-data/logs 2>/dev/null || true
sudo chmod -R 755 /mnt/disks/evolution-data/tmp 2>/dev/null || true
sudo chmod -R 755 /mnt/disks/evolution-data/database 2>/dev/null || true
# Mensagens precisam de permissões de escrita para salvar em arquivo
sudo chown -R 1000:1000 /mnt/disks/evolution-data/messages 2>/dev/null || sudo chown -R root:root /mnt/disks/evolution-data/messages 2>/dev/null || true
sudo chmod -R 755 /mnt/disks/evolution-data/messages 2>/dev/null || true

# Obter IP externo
EXTERNAL_IP=$(curl -s ifconfig.me 2>/dev/null || echo "")

# Gerar certificado SSL auto-assinado se não existir
if [ ! -f config/ssl/cert.pem ] || [ ! -f config/ssl/key.pem ]; then
    echo "🔐 Gerando certificado SSL auto-assinado..."
    mkdir -p config/ssl
    
    # Gerar certificado válido por 10 anos
    # Verificar se é IP válido
    if [[ ${EXTERNAL_IP} =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
        SAN="IP:${EXTERNAL_IP},DNS:${EXTERNAL_IP}"
    else
        SAN="DNS:${EXTERNAL_IP},DNS:localhost"
    fi
    
    openssl req -x509 -nodes -days 3650 -newkey rsa:2048 \
        -keyout config/ssl/key.pem \
        -out config/ssl/cert.pem \
        -subj "/C=BR/ST=State/L=City/O=Evolution API/CN=${EXTERNAL_IP}" \
        -addext "subjectAltName=${SAN}" 2>/dev/null || \
    openssl req -x509 -nodes -days 3650 -newkey rsa:2048 \
        -keyout config/ssl/key.pem \
        -out config/ssl/cert.pem \
        -subj "/C=BR/ST=State/L=City/O=Evolution API/CN=${EXTERNAL_IP}"
    
    chmod 600 config/ssl/key.pem
    chmod 644 config/ssl/cert.pem
    echo "✅ Certificado SSL gerado para IP: ${EXTERNAL_IP}"
fi

# Configurar plataforma padrão para ARM64 (compatível com VMs T2A do GCP)
export DOCKER_DEFAULT_PLATFORM=linux/arm64

# Sempre recriar containers para garantir que variáveis de ambiente sejam aplicadas
echo "🔄 Recriando containers para aplicar configurações atualizadas..."
# Parar containers existentes se houver (SEM remover volumes para preservar dados)
sudo docker compose down --remove-orphans || true
# Fazer pull das imagens atualizadas
sudo docker compose pull
# Recriar containers para aplicar novas variáveis de ambiente (preserva volumes)
sudo docker compose up -d --force-recreate
# Aguardar um pouco para garantir que iniciaram
sleep 10

# Aguardar serviços iniciarem
echo "⏳ Aguardando serviços iniciarem..."
sleep 30

# Configurar PostgreSQL para aceitar conexões externas
echo "🔧 Configurando PostgreSQL para conexões externas..."
sudo docker compose exec -T postgres sh -c "
  # Copiar configurações se não existirem no diretório de dados
  if [ ! -f /var/lib/postgresql/data/postgresql.conf ]; then
    cp /etc/postgresql/postgresql.conf /var/lib/postgresql/data/postgresql.conf 2>/dev/null || true
  fi
  if [ ! -f /var/lib/postgresql/data/pg_hba.conf ]; then
    cp /etc/postgresql/pg_hba.conf /var/lib/postgresql/data/pg_hba.conf 2>/dev/null || true
  fi
  
  # Configurar postgresql.conf
  if [ -f /var/lib/postgresql/data/postgresql.conf ]; then
    # Remover linhas antigas de listen_addresses
    sed -i '/^listen_addresses/d' /var/lib/postgresql/data/postgresql.conf
    sed -i '/^#listen_addresses/d' /var/lib/postgresql/data/postgresql.conf
    # Adicionar nova configuração
    echo \"listen_addresses = '*'\" >> /var/lib/postgresql/data/postgresql.conf
    echo \"port = 5432\" >> /var/lib/postgresql/data/postgresql.conf
    echo \"max_connections = 200\" >> /var/lib/postgresql/data/postgresql.conf
  fi
  
  # Configurar pg_hba.conf para permitir conexões externas
  if [ -f /var/lib/postgresql/data/pg_hba.conf ]; then
    # Remover linhas antigas de 0.0.0.0/0
    sed -i '/0.0.0.0\/0/d' /var/lib/postgresql/data/pg_hba.conf
    sed -i '/::\/0/d' /var/lib/postgresql/data/pg_hba.conf
    # Adicionar novas regras
    echo \"\" >> /var/lib/postgresql/data/pg_hba.conf
    echo \"# Conexões externas permitidas\" >> /var/lib/postgresql/data/pg_hba.conf
    echo \"host    all             all             0.0.0.0/0               md5\" >> /var/lib/postgresql/data/pg_hba.conf
    echo \"host    all             all             ::/0                    md5\" >> /var/lib/postgresql/data/pg_hba.conf
  fi
" 2>/dev/null || echo "⚠️  Configuração do PostgreSQL será aplicada no próximo restart"

# Reiniciar PostgreSQL para aplicar configurações
echo "🔄 Reiniciando PostgreSQL para aplicar configurações..."
sudo docker compose restart postgres
sleep 10

# Verificar status
sudo docker compose ps

echo ""
echo "✅ Evolution API deployado com sucesso!"
EXTERNAL_IP=$(curl -s ifconfig.me 2>/dev/null || echo "${EXTERNAL_IP}")
echo "🌐 Acesse: http://${EXTERNAL_IP}:8080"
echo "   ou via HTTPS: https://${EXTERNAL_IP}"
echo ""
echo "📊 PostgreSQL disponível em: postgresql://evolution:\${POSTGRES_PASSWORD:-evolution123}@${EXTERNAL_IP}:5432/evolution"

