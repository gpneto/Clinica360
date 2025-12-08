# Evolution API - Deploy no Google Cloud Platform

Este diretório contém a configuração completa para fazer deploy do Evolution API no GCP usando Docker Compose, com persistência de dados em discos externos e suporte a HTTPS.

## 📋 Características

- ✅ Evolution API usando imagem oficial do Docker Hub (`jilcimar/evolution-api`)
- ✅ PostgreSQL para armazenamento de dados
- ✅ Redis para cache
- ✅ Nginx como reverse proxy com HTTPS
- ✅ Persistência de dados em discos externos do GCP
- ✅ Scripts automatizados para deploy completo

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
   export VM_NAME="evolution-api-gcp"
   export DOMAIN="seu-dominio.com"  # Opcional para HTTPS
   ```

### Deploy Completo Automatizado

```bash
cd worker/evolution-api-gcp

# 1. Gerar arquivo .env com valores seguros
bash scripts/generate-env.sh

# 2. (Opcional) Editar .env se necessário
# nano .env  # Para configurar DOMAIN, WEBHOOK, etc.

# 3. Executar deploy completo
chmod +x scripts/*.sh
export DOMAIN="seu-dominio.com"  # Se quiser HTTPS
bash scripts/00-full-deploy.sh
```

### Deploy Passo a Passo

Se preferir executar cada passo manualmente:

```bash
# 1. Criar discos persistentes
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
evolution-api-gcp/
├── docker-compose.yml          # Configuração dos serviços
├── config/
│   ├── nginx.conf              # Configuração base do Nginx
│   ├── nginx-ssl.conf          # Configuração HTTPS do Nginx
│   └── evolution.env           # Configurações do Evolution API
├── scripts/
│   ├── 00-full-deploy.sh       # Script completo automatizado
│   ├── 01-create-persistent-disks.sh  # Criar discos no GCP
│   ├── 02-create-vm.sh         # Criar VM com discos
│   ├── 03-setup-firewall.sh    # Configurar firewall
│   ├── 04-setup-https.sh       # Configurar HTTPS
│   └── 05-deploy.sh            # Deploy da aplicação
└── README.md                   # Este arquivo
```

## 🔧 Configuração

### Arquivo .env

#### Gerar Automaticamente (Recomendado)

O script `generate-env.sh` cria o arquivo `.env` com valores seguros gerados automaticamente:

```bash
bash scripts/generate-env.sh
```

Este script irá:
- Gerar uma chave API segura (`AUTHENTICATION_API_KEY`)
- Gerar uma senha forte para PostgreSQL (`POSTGRES_PASSWORD`)
- Criar o arquivo `.env` com todas as configurações necessárias

#### Editar Manualmente (Opcional)

Se precisar ajustar alguma configuração, edite o arquivo `.env`:

```bash
nano .env
```

**Variáveis principais:**
- `AUTHENTICATION_API_KEY`: Chave para autenticar na API (gerada automaticamente)
- `POSTGRES_PASSWORD`: Senha do banco de dados (gerada automaticamente)
- `SERVER_URL`: URL do servidor (atualize após o deploy com o IP real)
- `DOMAIN`: Domínio para HTTPS (opcional)
- `WEBHOOK_GLOBAL_ENABLED`: Habilitar webhook (true/false)
- `WEBHOOK_GLOBAL_URL`: URL do webhook
- `LOG_LEVEL`: Nível de log (ERROR, WARN, INFO, DEBUG)

**Importante:** 
- As chaves são geradas automaticamente e são seguras
- Guarde o arquivo `.env` em local seguro
- Não commite o `.env` no Git (já está no .gitignore)

### Disco Persistente

Um único disco é criado no GCP:

- **evolution-data-disk**: 100GB (Standard ou SSD) - Todos os dados

O disco é montado automaticamente na VM em `/mnt/disks/evolution-data` e contém:
- `postgres/` - Dados do PostgreSQL (banco de dados completo)
- `redis/` - Dados do Redis (cache e estado das instâncias)
- `instances/` - Instâncias do WhatsApp (sessões e autenticações)
- `logs/` - Logs do Evolution API
- `tmp/` - Arquivos temporários e cache

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
gcloud compute ssh evolution-api-gcp --zone=us-central1-a \
  --command='cd /opt/evolution-api-gcp && docker compose logs -f'
```

### Ver Logs de um Serviço Específico

```bash
gcloud compute ssh evolution-api-gcp --zone=us-central1-a \
  --command='cd /opt/evolution-api-gcp && docker compose logs -f evolution-api'
```

### Status dos Serviços

```bash
gcloud compute ssh evolution-api-gcp --zone=us-central1-a \
  --command='cd /opt/evolution-api-gcp && docker compose ps'
```

## 🔄 Gerenciamento

### Script de Gerenciamento

Use o script `manage.sh` para facilitar o gerenciamento:

```bash
cd worker/evolution-api-gcp

# Ver logs
bash scripts/manage.sh logs

# Ver logs de um serviço específico
bash scripts/manage.sh logs-api
bash scripts/manage.sh logs-nginx

# Ver status
bash scripts/manage.sh status

# Reiniciar serviços
bash scripts/manage.sh restart
bash scripts/manage.sh restart-api

# Parar/Iniciar serviços
bash scripts/manage.sh stop
bash scripts/manage.sh start

# Atualizar Evolution API
bash scripts/manage.sh update

# Ver IP da VM
bash scripts/manage.sh ip

# Verificar saúde dos serviços
bash scripts/manage.sh health

# Abrir shell na VM
bash scripts/manage.sh shell
```

### Comandos Manuais

Se preferir usar comandos diretos:

```bash
# Reiniciar Serviços
gcloud compute ssh evolution-api-gcp --zone=us-central1-a \
  --command='cd /opt/evolution-api-gcp && docker compose restart'

# Parar Serviços
gcloud compute ssh evolution-api-gcp --zone=us-central1-a \
  --command='cd /opt/evolution-api-gcp && docker compose down'

# Iniciar Serviços
gcloud compute ssh evolution-api-gcp --zone=us-central1-a \
  --command='cd /opt/evolution-api-gcp && docker compose up -d'

# Atualizar Evolution API
gcloud compute ssh evolution-api-gcp --zone=us-central1-a \
  --command='cd /opt/evolution-api-gcp && docker compose pull evolution-api && docker compose up -d evolution-api'
```

## 💰 Custos Estimados

### Recursos Criados

- **VM t2a-standard-2 (ARM64)**: ~$30-35/mês
  - Usando ARM64 para suportar a imagem `jilcimar/evolution-api`
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

A VM usa **ARM64 (T2A)** porque a imagem `jilcimar/evolution-api` requer esta arquitetura. As VMs T2A são baseadas em processadores Ampere Altra e oferecem bom custo-benefício.

## 🔐 Segurança

### ⚠️ IMPORTANTE: PostgreSQL Exposto Publicamente

O PostgreSQL está configurado para ser acessível publicamente na porta 5432. Isso permite acesso externo ao banco de dados.

**IMPORTANTE:**
- Use uma senha forte no `POSTGRES_PASSWORD` (gerada automaticamente pelo script)
- Considere restringir o acesso por IP se necessário
- O firewall permite acesso de qualquer IP (0.0.0.0/0)

**Para restringir acesso por IP específico:**
```bash
# Editar regra de firewall para permitir apenas IPs específicos
gcloud compute firewall-rules update allow-postgres \
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
   gcloud compute ssh evolution-api-gcp --zone=us-central1-a \
     --command='sudo apt update && sudo apt upgrade -y'
   ```
6. **Configure backup** dos discos persistentes no GCP

### Backup dos Discos

```bash
# Criar snapshot do disco PostgreSQL
gcloud compute disks snapshot evolution-postgres-disk \
  --snapshot-names=postgres-$(date +%Y%m%d) \
  --zone=us-central1-a

# Criar snapshot do disco Evolution
gcloud compute disks snapshot evolution-instances-disk \
  --snapshot-names=evolution-$(date +%Y%m%d) \
  --zone=us-central1-a
```

## 💾 Persistência de Dados

### ✅ Garantias de Persistência

- **Reinicialização de Containers**: ✅ Dados preservados
- **Reinicialização da VM**: ✅ Dados preservados  
- **Recriação da VM**: ✅ Dados preservados (se usar os scripts)

Os dados são armazenados em **discos persistentes independentes** do GCP, que são anexados à VM. Mesmo se a VM for deletada, os discos permanecem e podem ser reanexados.

Para mais detalhes, consulte: [PERSISTENCIA.md](./PERSISTENCIA.md)

### Reanexar Discos a uma VM Existente

Se você recriou a VM ou os discos foram desanexados:

```bash
bash scripts/06-reattach-disks.sh
```

## 🐛 Troubleshooting

### Serviços não iniciam

```bash
# Verificar logs
gcloud compute ssh evolution-api-gcp --zone=us-central1-a \
  --command='cd /opt/evolution-api-gcp && docker compose logs'

# Verificar se discos estão montados
gcloud compute ssh evolution-api-gcp --zone=us-central1-a \
  --command='df -h | grep /mnt/disks'
```

### Certificado SSL não funciona

```bash
# Renovar certificado manualmente
gcloud compute ssh evolution-api-gcp --zone=us-central1-a \
  --command='sudo certbot renew --force-renewal'
```

### Problemas de conexão

```bash
# Verificar firewall
gcloud compute firewall-rules list --filter="name:allow-http OR name:allow-https"

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

