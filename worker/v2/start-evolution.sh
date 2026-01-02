#!/bin/bash
set -e

cd /opt/evolution-api-v2-gcp

# Carregar variáveis do .env
export $(cat .env | grep -v '^#' | xargs)

# Garantir que Docker está rodando
sudo systemctl start docker || true

# Garantir que diretórios do disco persistente existem (usando o MESMO disco da versão original)
sudo mkdir -p /mnt/disks/evolution-data/postgres
sudo mkdir -p /mnt/disks/evolution-data/redis
sudo mkdir -p /mnt/disks/evolution-data/instances
sudo mkdir -p /mnt/disks/evolution-data/logs
sudo mkdir -p /mnt/disks/evolution-data/tmp
sudo mkdir -p /mnt/disks/evolution-data/database
sudo mkdir -p /mnt/disks/evolution-data/messages

# Configurar permissões (preservar dados existentes)
sudo chown -R 999:999 /mnt/disks/evolution-data/postgres 2>/dev/null || true
sudo chown -R 999:999 /mnt/disks/evolution-data/redis 2>/dev/null || true
# Instâncias precisam de permissões de escrita para o usuário do container (geralmente 1000 ou root)
sudo chmod -R 755 /mnt/disks/evolution-data/instances 2>/dev/null || true
sudo chmod -R 755 /mnt/disks/evolution-data/logs 2>/dev/null || true
sudo chmod -R 755 /mnt/disks/evolution-data/tmp 2>/dev/null || true
sudo chmod -R 755 /mnt/disks/evolution-data/database 2>/dev/null || true
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

# Verificar se a imagem existe (foi carregada via docker load)
if sudo docker images | grep -q "evolution-api-v2-custom"; then
    echo "✅ Imagem evolution-api-v2-custom encontrada!"
    echo "🚀 Iniciando containers com imagem pré-compilada..."
else
    echo "⚠️  Imagem evolution-api-v2-custom não encontrada!"
    echo "   Verificando se docker-compose.yml faz build ou usa imagem..."
    
    # Se docker-compose.yml faz build, tentar fazer build (fallback)
    if grep -q "build:" docker-compose.yml; then
        echo "🔨 Fazendo build a partir dos fontes..."
        echo ""
        echo "⏳ ATENÇÃO: O build pode levar 10-20 minutos!"
        echo "   - Compilação TypeScript: ~5-10 min"
        echo "   - Build Docker: ~5-10 min"
        echo "   O processo pode parecer travado durante a compilação, mas está rodando normalmente."
        echo ""
        echo "💡 Dica: Você pode verificar o progresso em outra janela:"
        echo "   gcloud compute ssh evolution-api-v2-gcp --zone=us-central1-a \\"
        echo "     --command='sudo docker ps -a && sudo docker images | head -5'"
        echo ""
        
        if [ -d "evolution-api-src" ]; then
            echo "📦 Iniciando build da imagem (isso pode demorar)..."
            
            # Executar build e capturar output
            # Usar timeout para evitar travamentos infinitos (30 minutos)
            if timeout 1800 sudo docker compose build evolution-api 2>&1 | while IFS= read -r line; do
                echo "$line"
                # Mostrar mensagens de progresso importantes
                if echo "$line" | grep -q "Building\|DONE\|RUN\|COPY\|Step"; then
                    echo "   → $line" >&2
                fi
            done; then
                echo ""
                echo "✅ Build concluído com sucesso!"
            else
                BUILD_EXIT_CODE=$?
                if [ $BUILD_EXIT_CODE -eq 124 ]; then
                    echo ""
                    echo "❌ Timeout: Build demorou mais de 30 minutos!"
                    echo "   Verifique a VM manualmente ou tente novamente."
                else
                    echo ""
                    echo "❌ Erro ao fazer build!"
                fi
                exit $BUILD_EXIT_CODE
            fi
        else
            echo "❌ Erro: evolution-api-src não encontrado e imagem não disponível!"
            exit 1
        fi
    else
        echo "❌ Erro: Imagem não encontrada e docker-compose.yml não faz build!"
        echo "   Execute o script 08-upload-image.sh para enviar a imagem."
        exit 1
    fi
fi

# Recriar containers para aplicar novas variáveis de ambiente (preserva volumes)
echo ""
echo "🚀 Iniciando containers..."
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
echo "✅ Evolution API v2 deployado com sucesso!"
EXTERNAL_IP=$(curl -s ifconfig.me 2>/dev/null || echo "${EXTERNAL_IP}")
echo "🌐 Acesse: http://${EXTERNAL_IP}:8080"
echo "   ou via HTTPS: https://${EXTERNAL_IP}"
echo ""
echo "📊 PostgreSQL disponível em: postgresql://evolution:\${POSTGRES_PASSWORD:-evolution123}@${EXTERNAL_IP}:5432/evolution"

