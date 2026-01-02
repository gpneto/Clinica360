# Passo a Passo Completo: Conectar no GCP e Acessar Arquivos do Container

## 📋 Pré-requisitos

- Google Cloud SDK (gcloud) instalado
- Autenticação no gcloud configurada
- Acesso à VM `evolution-api-gcp`

---

## 🔐 PASSO 1: Conectar na Instância do GCP

### 1.1 Verificar autenticação

```bash
# Verificar se está autenticado
gcloud auth list

# Se não estiver autenticado, fazer login
gcloud auth login
```

### 1.2 Configurar projeto

```bash
# Configurar projeto padrão
gcloud config set project agendamentointeligente-4405f

# Verificar configuração
gcloud config list
```

### 1.3 Conectar na VM

```bash
# Conectar via SSH com IAP tunneling (recomendado)
gcloud compute ssh evolution-api-gcp \
  --zone=us-central1-a \
  --project=agendamentointeligente-4405f \
  --tunnel-through-iap
```

**Ou sem IAP (se tiver IP externo):**
```bash
gcloud compute ssh evolution-api-gcp \
  --zone=us-central1-a \
  --project=agendamentointeligente-4405f
```

✅ **Agora você está conectado na VM!** Você verá algo como:
```
gpneto@evolution-api-gcp:~$
```

---

## 🐳 PASSO 2: Verificar Containers Docker

### 2.1 Verificar se os containers estão rodando

```bash
# Ver containers em execução
sudo docker ps

# Ou usar docker-compose
cd /opt/evolution-api-gcp
sudo docker compose ps
```

**Saída esperada:**
```
NAME                IMAGE                          STATUS
evolution-api       jilcimar/evolution-api:latest  Up X minutes
evolution-postgres  postgres:15-alpine              Up X minutes
evolution-redis     redis:7-alpine                 Up X minutes
evolution-nginx     nginx:alpine                   Up X minutes
```

### 2.2 Se os containers não estiverem rodando

```bash
# Ir para o diretório do projeto
cd /opt/evolution-api-gcp

# Iniciar os containers
sudo docker compose up -d

# Verificar status
sudo docker compose ps
```

---

## 📁 PASSO 3: Acessar Arquivos do Container evolution-api

### 3.1 Método A: Entrar no Container (Recomendado)

```bash
# Garantir que está no diretório correto
cd /opt/evolution-api-gcp

# Entrar no container evolution-api
sudo docker compose exec evolution-api sh
```

✅ **Agora você está dentro do container!** Você verá:
```
/evolution #
```

### 3.2 Navegar pelos arquivos dentro do container

```bash
# Ver onde você está
pwd
# Deve mostrar: /evolution

# Ver estrutura de diretórios
ls -lah

# Você verá algo como:
# drwxr-xr-x  ... instances/
# drwxr-xr-x  ... logs/
# drwxr-xr-x  ... store/
# drwxr-xr-x  ... tmp/
# drwxr-xr-x  ... database/
```

### 3.3 Explorar diretório de instâncias

```bash
# Ir para o diretório de instâncias
cd instances/

# Listar instâncias (se houver)
ls -lah

# Se houver instâncias, entrar em uma
cd nome-da-instancia/

# Ver todos os arquivos da instância
ls -lah

# Ver estrutura completa
find . -type f
```

### 3.4 Ver outros diretórios

```bash
# Voltar para /evolution
cd /evolution

# Ver logs
cd logs/
ls -lah

# Ver mensagens armazenadas
cd ../store/
ls -lah

# Ver arquivos temporários
cd ../tmp/
ls -lah

# Ver database local
cd ../database/
ls -lah
```

### 3.5 Sair do container

```bash
# Para sair do container
exit
```

---

## 🔍 PASSO 4: Método B - Executar Comandos Sem Entrar no Container

Se preferir não entrar no container, pode executar comandos diretamente:

### 4.1 Listar arquivos de instâncias

```bash
# Na VM (fora do container)
cd /opt/evolution-api-gcp

# Listar instâncias
sudo docker compose exec evolution-api ls -lah /evolution/instances/
```

### 4.2 Ver estrutura de uma instância específica

```bash
# Substitua "nome-da-instancia" pelo nome real
sudo docker compose exec evolution-api find /evolution/instances/nome-da-instancia -type f
```

### 4.3 Ver conteúdo de um arquivo

```bash
# Ver arquivo de autenticação
sudo docker compose exec evolution-api cat /evolution/instances/nome-da-instancia/auth_info.json

# Ver arquivo de sessão
sudo docker compose exec evolution-api cat /evolution/instances/nome-da-instancia/session
```

### 4.4 Ver tamanho dos diretórios

```bash
# Ver tamanho de todos os diretórios
sudo docker compose exec evolution-api du -sh /evolution/*

# Ver tamanho de instâncias específicas
sudo docker compose exec evolution-api du -sh /evolution/instances/*
```

---

## 📋 PASSO 5: Verificar Instâncias no PostgreSQL

Se o diretório `instances/` estiver vazio, as instâncias podem estar apenas no banco de dados:

### 5.1 Acessar PostgreSQL

```bash
# Na VM (fora do container evolution-api)
cd /opt/evolution-api-gcp

# Entrar no PostgreSQL
sudo docker compose exec postgres psql -U evolution -d evolution
```

### 5.2 Consultar instâncias

```sql
-- Ver todas as instâncias
SELECT name, status, number FROM instance;

-- Ver detalhes de uma instância específica
SELECT * FROM instance WHERE name = 'nome-da-instancia';

-- Ver quantidade de instâncias
SELECT COUNT(*) FROM instance;

-- Sair do PostgreSQL
\q
```

---

## 📤 PASSO 6: Copiar Arquivos do Container para a VM

### 6.1 Copiar um arquivo específico

```bash
cd /opt/evolution-api-gcp

# Copiar arquivo de autenticação
sudo docker compose cp evolution-api:/evolution/instances/nome-instancia/auth_info.json /tmp/auth_info.json

# Verificar se foi copiado
ls -lah /tmp/auth_info.json
```

### 6.2 Copiar toda uma instância

```bash
# Copiar instância completa
sudo docker compose cp evolution-api:/evolution/instances/nome-instancia /tmp/backup-instancia

# Verificar
ls -lah /tmp/backup-instancia/
```

### 6.3 Fazer backup completo

```bash
# Criar backup dentro do container
sudo docker compose exec evolution-api tar -czf /tmp/backup.tar.gz /evolution/instances/

# Copiar backup para a VM
sudo docker compose cp evolution-api:/tmp/backup.tar.gz /tmp/backup-evolution.tar.gz

# Verificar
ls -lah /tmp/backup-evolution.tar.gz
```

---

## 🔄 PASSO 7: Copiar Arquivos da VM para o Container

```bash
cd /opt/evolution-api-gcp

# Copiar arquivo para o container
sudo docker compose cp /tmp/arquivo.json evolution-api:/evolution/instances/nome-instancia/
```

---

## 📊 PASSO 8: Comandos Úteis de Exploração

### 8.1 Ver arquivos mais recentes

```bash
cd /opt/evolution-api-gcp
sudo docker compose exec evolution-api find /evolution/instances/ -type f -exec ls -lht {} \; | head -20
```

### 8.2 Contar arquivos

```bash
# Contar total de arquivos
sudo docker compose exec evolution-api find /evolution/instances/ -type f | wc -l

# Contar por instância
sudo docker compose exec evolution-api sh -c "for dir in /evolution/instances/*/; do echo \"\$(basename \$dir): \$(find \$dir -type f | wc -l) arquivos\"; done"
```

### 8.3 Buscar por tipo de arquivo

```bash
# Buscar arquivos JSON
sudo docker compose exec evolution-api find /evolution/instances/ -name "*.json"

# Buscar arquivos de sessão
sudo docker compose exec evolution-api find /evolution/instances/ -name "*session*"
```

### 8.4 Ver logs do container

```bash
# Ver logs em tempo real
cd /opt/evolution-api-gcp
sudo docker compose logs -f evolution-api

# Ver últimas 100 linhas
sudo docker compose logs --tail=100 evolution-api
```

---

## 🚪 PASSO 9: Desconectar da VM

```bash
# Para sair da VM e voltar para seu computador local
exit
```

---

## 📝 Resumo dos Comandos Principais

```bash
# 1. Conectar na VM
gcloud compute ssh evolution-api-gcp --zone=us-central1-a --project=agendamentointeligente-4405f --tunnel-through-iap

# 2. Verificar containers
cd /opt/evolution-api-gcp && sudo docker compose ps

# 3. Entrar no container
sudo docker compose exec evolution-api sh

# 4. Dentro do container, navegar
cd /evolution/instances/
ls -lah

# 5. Sair do container
exit

# 6. Sair da VM
exit
```

---

## ⚠️ Troubleshooting

### Problema: "Permission denied" ao conectar

**Solução:**
```bash
# Verificar autenticação
gcloud auth list

# Fazer login novamente
gcloud auth login
```

### Problema: Container não encontrado

**Solução:**
```bash
# Verificar se containers estão rodando
sudo docker ps -a

# Iniciar containers
cd /opt/evolution-api-gcp
sudo docker compose up -d
```

### Problema: Diretório instances/ vazio

**Solução:**
- Verificar se há instâncias no PostgreSQL (Passo 5)
- Verificar se instâncias foram criadas via API
- Verificar logs do container para erros

---

## 💡 Dicas Finais

1. **Use `sudo docker compose`** em vez de `sudo docker` quando possível (mais fácil)
2. **O diretório `/evolution/instances/`** é mapeado para `/mnt/disks/evolution-data/instances/` na VM (persistente)
3. **Se não houver arquivos em `instances/`**, verifique o PostgreSQL - as instâncias podem estar apenas no banco
4. **Use `exit` duas vezes** para sair do container e depois da VM



