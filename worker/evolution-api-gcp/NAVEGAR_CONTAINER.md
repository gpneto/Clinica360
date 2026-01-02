# Como Navegar nos Arquivos do Container Docker

Quando você está conectado na VM via SSH, pode acessar os arquivos dentro do container Docker de várias formas.

## ⚠️ Verificar se os Containers Estão Rodando

Antes de acessar, verifique se os containers estão rodando:

```bash
# Ver containers em execução
sudo docker ps

# Ver todos os containers (incluindo parados)
sudo docker ps -a

# Verificar serviços do docker-compose
cd /opt/evolution-api-gcp
sudo docker compose ps
```

### Se os containers não estiverem rodando:

```bash
# Ir para o diretório do projeto
cd /opt/evolution-api-gcp

# Iniciar os containers
sudo docker compose up -d

# Verificar status
sudo docker compose ps
```

### Se os containers não existirem:

```bash
# Verificar se o docker-compose.yml existe
ls -la /opt/evolution-api-gcp/docker-compose.yml

# Se não existir, você pode precisar fazer o deploy primeiro
# Ver scripts/05-deploy.sh ou README.md
```

## 🐳 Acessar o Container (Shell Interativo)

### Verificar nome correto do container

Primeiro, descubra o nome exato do container:

```bash
# Ver todos os containers
sudo docker ps -a

# Ou usar o script de verificação
bash /opt/evolution-api-gcp/scripts/check-containers.sh
```

### Entrar no container Evolution API

```bash
# Se o container se chama "evolution-api"
sudo docker exec -it evolution-api sh

# Se o nome for diferente, use o nome que apareceu em "docker ps"
# Exemplo: sudo docker exec -it evolution-api-gcp_evolution-api_1 sh
```

**Dica**: Se você estiver usando docker-compose, o nome do container pode ser diferente. Use:
```bash
cd /opt/evolution-api-gcp
sudo docker compose exec evolution-api sh
```

Ou se o container usar bash:
```bash
sudo docker exec -it evolution-api bash
```

Agora você está dentro do container e pode navegar normalmente:
```bash
# Ver onde você está
pwd

# Listar arquivos de sessão
ls -lah /evolution/instances/

# Navegar para o diretório de instâncias
cd /evolution/instances/

# Ver conteúdo de uma instância específica
ls -lah nome-da-instancia/

# Ver arquivos de uma instância
find nome-da-instancia/ -type f
```

### Sair do container
```bash
exit
```

## 📁 Executar Comandos Sem Entrar no Container

Você pode executar comandos diretamente sem entrar no container:

### Listar instâncias
```bash
sudo docker exec evolution-api ls -lah /evolution/instances/
```

### Ver estrutura de uma instância
```bash
sudo docker exec evolution-api find /evolution/instances/nome-da-instancia -type f
```

### Ver conteúdo de um arquivo específico
```bash
sudo docker exec evolution-api cat /evolution/instances/nome-da-instancia/auth_info.json
```

### Ver tamanho dos diretórios
```bash
sudo docker exec evolution-api du -sh /evolution/instances/*
```

### Listar todos os arquivos de uma instância com detalhes
```bash
sudo docker exec evolution-api find /evolution/instances/nome-da-instancia -type f -exec ls -lh {} \;
```

## 🔍 Comandos Úteis para Explorar

### Ver todas as instâncias e seus tamanhos
```bash
sudo docker exec evolution-api sh -c "for dir in /evolution/instances/*/; do echo \"\$(basename \$dir): \$(du -sh \$dir | cut -f1)\"; done"
```

### Contar arquivos por instância
```bash
sudo docker exec evolution-api sh -c "for dir in /evolution/instances/*/; do echo \"\$(basename \$dir): \$(find \$dir -type f | wc -l) arquivos\"; done"
```

### Ver arquivos de sessão mais recentes
```bash
sudo docker exec evolution-api find /evolution/instances/ -type f -exec ls -lht {} \; | head -20
```

### Ver estrutura completa de diretórios
```bash
sudo docker exec evolution-api tree /evolution/instances/ -L 3
```

Ou se tree não estiver instalado:
```bash
sudo docker exec evolution-api find /evolution/instances/ -type d | head -20
```

## 📂 Estrutura de Diretórios no Container

Dentro do container Evolution API, os principais diretórios são:

```
/evolution/
├── instances/          # Arquivos de sessão do WhatsApp (mapeado para /mnt/disks/evolution-data/instances)
├── logs/              # Logs do Evolution API
├── tmp/               # Arquivos temporários
├── database/          # Database local (SQLite, se usado)
├── store/             # Mensagens salvas em arquivo
└── .env               # Configurações (read-only)
```

## 🔄 Copiar Arquivos do Container para a VM

### Copiar um arquivo específico
```bash
sudo docker cp evolution-api:/evolution/instances/nome-da-instancia/auth_info.json /tmp/auth_info.json
```

### Copiar toda uma instância
```bash
sudo docker cp evolution-api:/evolution/instances/nome-da-instancia /tmp/backup-instancia
```

### Copiar arquivos da VM para o container
```bash
sudo docker cp /tmp/arquivo.json evolution-api:/evolution/instances/nome-da-instancia/
```

## 📊 Verificar Outros Containers

### Ver containers em execução
```bash
sudo docker ps
```

### Acessar container PostgreSQL
```bash
sudo docker exec -it evolution-postgres psql -U evolution -d evolution
```

### Acessar container Redis
```bash
sudo docker exec -it evolution-redis redis-cli
```

## 🛠️ Comandos de Diagnóstico

### Ver logs do container em tempo real
```bash
sudo docker logs -f evolution-api
```

### Ver uso de recursos
```bash
sudo docker stats evolution-api
```

### Ver variáveis de ambiente do container
```bash
sudo docker exec evolution-api env | grep -E "DATABASE|REDIS|INSTANCE"
```

### Verificar se os volumes estão montados corretamente
```bash
sudo docker inspect evolution-api | grep -A 10 Mounts
```

## 💡 Dicas

1. **Permissões**: Se você precisar modificar arquivos, pode precisar ajustar permissões:
   ```bash
   sudo docker exec evolution-api chmod -R 755 /evolution/instances/nome-da-instancia
   ```

2. **Backup**: Para fazer backup de uma instância:
   ```bash
   sudo docker exec evolution-api tar -czf /tmp/backup.tar.gz /evolution/instances/nome-da-instancia
   sudo docker cp evolution-api:/tmp/backup.tar.gz /tmp/
   ```

3. **Explorar arquivos JSON**: Use `jq` se estiver instalado:
   ```bash
   sudo docker exec evolution-api cat /evolution/instances/nome-da-instancia/auth_info.json | jq .
   ```

4. **Buscar por conteúdo**: Para buscar texto em arquivos:
   ```bash
   sudo docker exec evolution-api grep -r "texto" /evolution/instances/
   ```

