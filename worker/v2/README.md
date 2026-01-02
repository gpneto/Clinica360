# Evolution API v2 - Deploy no Google Cloud Platform

Este diretório contém a configuração completa para fazer deploy do Evolution API v2 no GCP usando Docker Compose, com persistência de dados em discos externos e suporte a HTTPS.

Esta é uma **nova VM com a última versão** do Evolution API, mas **compartilha o mesmo disco e banco de dados** da versão original, preservando todos os dados existentes.

## 📋 Características

- ✅ Evolution API build a partir dos fontes modificados (`evolution-api-src/`)
- ✅ PostgreSQL para armazenamento de dados
- ✅ Redis para cache
- ✅ Nginx como reverse proxy com HTTPS
- ✅ Persistência de dados em discos externos do GCP
- ✅ Scripts automatizados para deploy completo
- ✅ **VM separada, disco compartilhado** (usa o mesmo banco de dados e dados da versão original)

## 🆕 Diferenças da Versão Original

- **VM Name**: `evolution-api-v2-gcp` (original: `evolution-api-gcp`)
- **Disk Name**: `evolution-data-disk` ⚠️ **COMPARTILHADO** (mesmo disco da versão original)
- **Container Names**: Todos com prefixo `evolution-v2-*`
- **Network**: `evolution-v2-network`
- **Mount Path**: `/mnt/disks/evolution-data` ⚠️ **COMPARTILHADO** (mesmo caminho da versão original)
- **Deploy Path**: `/opt/evolution-api-v2-gcp` (original: `/opt/evolution-api-gcp`)
- **Build**: A partir dos fontes em `evolution-api-src/` (você pode modificar os fontes antes de fazer build)

### ⚠️ IMPORTANTE: Dados Compartilhados

Esta versão v2 **compartilha o mesmo disco e banco de dados** da versão original. Isso significa:
- ✅ Todos os dados existentes serão preservados
- ✅ Instâncias do WhatsApp existentes estarão disponíveis
- ✅ Banco de dados PostgreSQL será o mesmo
- ✅ Redis compartilhará o mesmo cache

**ATENÇÃO IMPORTANTE**: 
- ⚠️ No GCP, um disco persistente **não pode ser anexado a múltiplas VMs simultaneamente**
- Para criar a nova VM, você precisará **parar a VM original** primeiro
- Após criar a nova VM, a VM original ficará sem o disco anexado
- **Recomendação**: Se você quer apenas atualizar a versão, considere atualizar o código na VM original usando `docker compose pull` em vez de criar uma nova VM

## ⚠️ IMPORTANTE: Limitação do GCP

**Um disco persistente não pode ser anexado a múltiplas VMs simultaneamente no GCP.**

Isso significa que para criar a nova VM v2 usando o mesmo disco, você precisará **parar a VM original** primeiro. O script de criação de VM (`02-create-vm.sh`) irá detectar isso e perguntar se deseja parar a VM original.

**Recomendação**: Se você quer apenas atualizar para a última versão, considere usar a Opção 2 do [Guia de Migração](./MIGRACAO.md) (atualizar código na VM existente) ao invés de criar uma nova VM.

## 🚀 Início Rápido

### Pré-requisitos

1. **Google Cloud SDK (gcloud)** instalado e configurado
   ```bash
   # Verificar instalação
   gcloud --version
   
   # Autenticar
   gcloud auth login
   ```

2. **Variáveis de ambiente configuradas**
   ```bash
   export PROJECT_ID="agendamentointeligente-4405f"
   export ZONE="us-central1-a"
   export VM_NAME="evolution-api-v2-gcp"
   export DOMAIN="seu-dominio.com"  # Opcional para HTTPS
   ```

### Deploy Completo Automatizado

```bash
cd worker/v2

# 1. Criar arquivo .env a partir do exemplo
cp env.example .env

# 2. Editar .env com suas configurações
nano .env

# 3. Executar deploy completo
chmod +x scripts/*.sh
export DOMAIN="seu-dominio.com"  # Se quiser HTTPS
bash scripts/00-full-deploy.sh
```

### Deploy Passo a Passo

Se preferir executar cada passo manualmente:

```bash
# 1. Verificar disco persistente (usará o disco existente da versão original)
bash scripts/01-create-persistent-disks.sh

# 2. Criar VM com discos montados
bash scripts/02-create-vm.sh

# 3. Configurar firewall
bash scripts/03-setup-firewall.sh

# 4. Configurar HTTPS (opcional, requer domínio)
export DOMAIN="seu-dominio.com"
bash scripts/04-setup-https.sh

# 5. Fazer deploy da aplicação
bash scripts/05-deploy.sh
```

## 📁 Estrutura de Arquivos

```
v2/
├── docker-compose.yml          # Configuração dos serviços
├── config/
│   ├── nginx.conf              # Configuração base do Nginx
│   ├── nginx-ssl.conf          # Configuração HTTPS do Nginx
│   ├── evolution.env           # Configurações do Evolution API
│   ├── postgresql.conf         # Configuração PostgreSQL
│   └── pg_hba.conf             # Configuração autenticação PostgreSQL
├── scripts/
│   ├── 00-full-deploy.sh       # Script completo automatizado
│   ├── 01-create-persistent-disks.sh  # Criar discos no GCP
│   ├── 02-create-vm.sh         # Criar VM com discos
│   ├── 03-setup-firewall.sh    # Configurar firewall
│   ├── 04-setup-https.sh       # Configurar HTTPS
│   ├── 05-deploy.sh            # Deploy da aplicação
│   └── 06-reattach-disks.sh    # Reanexar discos a VM existente
├── start-evolution.sh          # Script de inicialização na VM
├── env.example                 # Exemplo de variáveis de ambiente
└── README.md                   # Este arquivo
```

## 🔧 Configuração

### Arquivo .env

Copie o `env.example` para `.env` e configure:

```bash
cp env.example .env
nano .env
```

**Variáveis principais:**
- `AUTHENTICATION_API_KEY`: Chave para autenticar na API (gere com `openssl rand -hex 32`)
- `POSTGRES_PASSWORD`: Senha do banco de dados (use uma senha forte!)
- `SERVER_URL`: URL do servidor (atualize após o deploy com o IP real)
- `DOMAIN`: Domínio para HTTPS (opcional)
- `WEBHOOK_GLOBAL_ENABLED`: Habilitar webhook (true/false)
- `WEBHOOK_GLOBAL_URL`: URL do webhook
- `LOG_LEVEL`: Nível de log (ERROR, WARN, INFO, DEBUG)

**Importante:** 
- Não commite o `.env` no Git (já está no .gitignore)
- Guarde o arquivo `.env` em local seguro
- Use senhas fortes!

### Disco Persistente

⚠️ **IMPORTANTE**: Esta versão usa o **MESMO disco** da versão original:

- **evolution-data-disk**: Disco compartilhado com a versão original

O disco é montado automaticamente na VM em `/mnt/disks/evolution-data` (mesmo caminho da versão original) e contém:
- `postgres/` - Dados do PostgreSQL (banco de dados completo)
- `redis/` - Dados do Redis (cache e estado das instâncias)
- `instances/` - Instâncias do WhatsApp (sessões e autenticações)
- `logs/` - Logs do Evolution API
- `tmp/` - Arquivos temporários e cache
- `database/` - Database local (SQLite fallback)
- `messages/` - Mensagens salvas em arquivo

**Tudo é persistido no disco externo**, garantindo que nenhum dado seja perdido mesmo se:
- Os containers forem reiniciados
- A VM for reiniciada
- A VM for recriada (usando os scripts)

## 🌐 Configuração de Domínio e HTTPS

### 1. Configurar DNS

Após criar a VM, você receberá um IP externo. Configure seu DNS:

```
Tipo: A
Nome: @ (ou subdomínio)
Valor: IP_EXTERNO_DA_VM
TTL: 300
```

### 2. Configurar HTTPS

```bash
export DOMAIN="seu-dominio.com"
bash scripts/04-setup-https.sh
```

O script irá:
- Instalar Certbot
- Obter certificado Let's Encrypt
- Configurar renovação automática

## 📊 Monitoramento e Logs

### Ver Logs

```bash
gcloud compute ssh evolution-api-v2-gcp --zone=us-central1-a \
  --command='cd /opt/evolution-api-v2-gcp && docker compose logs -f'
```

### Ver Logs de um Serviço Específico

```bash
gcloud compute ssh evolution-api-v2-gcp --zone=us-central1-a \
  --command='cd /opt/evolution-api-v2-gcp && docker compose logs -f evolution-api'
```

### Status dos Serviços

```bash
gcloud compute ssh evolution-api-v2-gcp --zone=us-central1-a \
  --command='cd /opt/evolution-api-v2-gcp && docker compose ps'
```

## 🔄 Gerenciamento

### Comandos Manuais

```bash
# Reiniciar Serviços
gcloud compute ssh evolution-api-v2-gcp --zone=us-central1-a \
  --command='cd /opt/evolution-api-v2-gcp && docker compose restart'

# Parar Serviços
gcloud compute ssh evolution-api-v2-gcp --zone=us-central1-a \
  --command='cd /opt/evolution-api-v2-gcp && docker compose down'

# Iniciar Serviços
gcloud compute ssh evolution-api-v2-gcp --zone=us-central1-a \
  --command='cd /opt/evolution-api-v2-gcp && docker compose up -d'

# Atualizar Evolution API (buscar última versão)
gcloud compute ssh evolution-api-v2-gcp --zone=us-central1-a \
  --command='cd /opt/evolution-api-v2-gcp && docker compose pull evolution-api && docker compose up -d evolution-api'
```

## 💰 Custos Estimados

### Recursos Criados

- **VM t2a-standard-2 (ARM64)**: ~$30-35/mês
  - Usando ARM64 para suportar a imagem Evolution API
- **Disco único (100GB Standard)**: ~$4/mês
- **Disco único (100GB SSD)**: ~$17/mês (opcional, mais rápido)
- **Tráfego de rede**: Variável

**Total estimado**: 
- Com Standard: ~$34-39/mês
- Com SSD: ~$47-52/mês

### Reduzir Custos

- Use `t2a-standard-1` para VM menor (pode afetar performance)
- Reduza tamanho do disco se necessário (padrão: 100GB)
- Use disco `pd-standard` em vez de `pd-ssd` (menos performance, mais barato)

### Nota sobre Arquitetura

A VM usa **ARM64 (T2A)** porque a imagem Evolution API requer esta arquitetura. As VMs T2A são baseadas em processadores Ampere Altra e oferecem bom custo-benefício.

## 🔐 Segurança

### ⚠️ IMPORTANTE: PostgreSQL Exposto Publicamente

O PostgreSQL está configurado para ser acessível publicamente na porta 5432. Isso permite acesso externo ao banco de dados.

**IMPORTANTE:**
- Use uma senha forte no `POSTGRES_PASSWORD` no arquivo `.env`
- Considere restringir o acesso por IP se necessário
- O firewall permite acesso de qualquer IP (0.0.0.0/0)

**Para restringir acesso por IP específico:**
```bash
# Editar regra de firewall para permitir apenas IPs específicos
gcloud compute firewall-rules update allow-postgres-v2 \
  --source-ranges=SEU_IP_AQUI/32 \
  --project=agendamentointeligente-4405f
```

### Boas Práticas

1. **Altere todas as senhas padrão** no arquivo `.env`
2. **Use chaves API fortes** (geradas com `openssl rand -hex 32`)
3. **PostgreSQL está exposto** - use senha forte!
4. **Configure firewall** para restringir acesso se necessário
5. **Mantenha o sistema atualizado**:
   ```bash
   gcloud compute ssh evolution-api-v2-gcp --zone=us-central1-a \
     --command='sudo apt update && sudo apt upgrade -y'
   ```
6. **Configure backup** dos discos persistentes no GCP

### Backup dos Discos

```bash
# Criar snapshot do disco (mesmo disco da versão original)
gcloud compute disks snapshot evolution-data-disk \
  --snapshot-names=evolution-$(date +%Y%m%d) \
  --zone=us-central1-a
```

## 💾 Persistência de Dados

### ✅ Garantias de Persistência

- **Reinicialização de Containers**: ✅ Dados preservados
- **Reinicialização da VM**: ✅ Dados preservados  
- **Recriação da VM**: ✅ Dados preservados (se usar os scripts)

Os dados são armazenados em **disco persistente independente** do GCP, que é anexado à VM. Mesmo se a VM for deletada, o disco permanece e pode ser reanexado.

### Reanexar Discos a uma VM Existente

Se você recriou a VM ou os discos foram desanexados:

```bash
bash scripts/06-reattach-disks.sh
```

## 🐛 Troubleshooting

### Serviços não iniciam

```bash
# Verificar logs
gcloud compute ssh evolution-api-v2-gcp --zone=us-central1-a \
  --command='cd /opt/evolution-api-v2-gcp && docker compose logs'

# Verificar se discos estão montados
gcloud compute ssh evolution-api-v2-gcp --zone=us-central1-a \
  --command='df -h | grep /mnt/disks'
```

### Certificado SSL não funciona

```bash
# Renovar certificado manualmente
gcloud compute ssh evolution-api-v2-gcp --zone=us-central1-a \
  --command='sudo certbot renew --force-renewal'
```

### Problemas de conexão

```bash
# Verificar firewall
gcloud compute firewall-rules list --filter="name:allow-http-v2 OR name:allow-https-v2"

# Testar conectividade
curl -I http://IP_DA_VM:8080
```

## 📚 Documentação Adicional

- [Evolution API Documentation](https://doc.evolution-api.com/)
- [Google Cloud Compute Engine](https://cloud.google.com/compute/docs)
- [Docker Compose Documentation](https://docs.docker.com/compose/)

## 🆘 Suporte

Em caso de problemas:

1. Verifique os logs dos serviços
2. Verifique se os discos estão montados corretamente
3. Verifique as regras de firewall
4. Verifique as variáveis de ambiente no `.env`

## 🔄 Rebuild Após Modificar Fontes

Após fazer alterações nos fontes em `evolution-api-src/src/`, você precisa fazer rebuild:

### Opção 1: Script Automatizado (Recomendado)

```bash
cd worker/v2
bash scripts/07-rebuild-api.sh
```

Este script:
- Copia os fontes atualizados para a VM (opcional)
- Faz build da nova imagem
- Reinicia o container

### Opção 2: Manual

```bash
# 1. Copiar fontes atualizados
gcloud compute scp --recurse evolution-api-src/ evolution-api-v2-gcp:/opt/evolution-api-v2-gcp/ --zone=us-central1-a

# 2. Fazer build na VM
gcloud compute ssh evolution-api-v2-gcp --zone=us-central1-a \
  --command='cd /opt/evolution-api-v2-gcp && sudo docker compose build evolution-api && sudo docker compose up -d evolution-api'
```

### Opção 3: Apenas Rebuild (se fontes já estão na VM)

```bash
gcloud compute ssh evolution-api-v2-gcp --zone=us-central1-a \
  --command='cd /opt/evolution-api-v2-gcp && sudo docker compose build evolution-api && sudo docker compose up -d evolution-api'
```

## 🔄 Atualizar Fontes do GitHub

Para atualizar os fontes para a versão mais recente do repositório oficial:

```bash
cd worker/v2/evolution-api-src
git pull origin main
# Ou para uma versão específica:
# git fetch origin
# git checkout <tag-version>
```

**⚠️ ATENÇÃO**: Isso irá sobrescrever suas modificações locais. Se você tem alterações não commitadas, faça backup primeiro ou use `git stash`.

