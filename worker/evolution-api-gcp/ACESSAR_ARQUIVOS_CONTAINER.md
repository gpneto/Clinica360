# Como Acessar Arquivos do Container evolution-api

## 🐳 Método 1: Entrar no Container (Shell Interativo)

### Na VM, execute:

```bash
# Ir para o diretório do projeto
cd /opt/evolution-api-gcp

# Entrar no container evolution-api
sudo docker compose exec evolution-api sh
```

### Dentro do container, navegue pelos arquivos:

```bash
# Ver onde você está
pwd
# Deve mostrar: /evolution

# Ver estrutura de diretórios
ls -lah

# Ir para instâncias
cd instances/
ls -lah

# Ver outros diretórios
cd ../logs/
cd ../store/
cd ../tmp/
cd ../database/
```

## 📁 Método 2: Executar Comandos Sem Entrar no Container

### Listar arquivos de instâncias:

```bash
cd /opt/evolution-api-gcp
sudo docker compose exec evolution-api ls -lah /evolution/instances/
```

### Ver estrutura completa de uma instância:

```bash
sudo docker compose exec evolution-api find /evolution/instances/nome-da-instancia -type f
```

### Ver conteúdo de um arquivo:

```bash
sudo docker compose exec evolution-api cat /evolution/instances/nome-da-instancia/auth_info.json
```

### Ver todos os arquivos com detalhes:

```bash
sudo docker compose exec evolution-api find /evolution/instances/ -type f -exec ls -lh {} \;
```

## 📋 Método 3: Copiar Arquivos do Container para a VM

### Copiar um arquivo específico:

```bash
cd /opt/evolution-api-gcp
sudo docker compose cp evolution-api:/evolution/instances/nome-da-instancia/auth_info.json /tmp/auth_info.json
```

### Copiar toda uma instância:

```bash
sudo docker compose cp evolution-api:/evolution/instances/nome-da-instancia /tmp/backup-instancia
```

### Copiar todos os arquivos de instâncias:

```bash
sudo docker compose cp evolution-api:/evolution/instances /tmp/instances-backup
```

## 🔍 Método 4: Explorar Todos os Diretórios do Container

### Ver estrutura completa:

```bash
cd /opt/evolution-api-gcp

# Ver instâncias
sudo docker compose exec evolution-api ls -lah /evolution/instances/

# Ver logs
sudo docker compose exec evolution-api ls -lah /evolution/logs/

# Ver mensagens armazenadas
sudo docker compose exec evolution-api ls -lah /evolution/store/

# Ver arquivos temporários
sudo docker compose exec evolution-api ls -lah /evolution/tmp/

# Ver database local
sudo docker compose exec evolution-api ls -lah /evolution/database/
```

## 📊 Comandos Úteis para Explorar

### Ver tamanho dos diretórios:

```bash
sudo docker compose exec evolution-api du -sh /evolution/*
```

### Contar arquivos:

```bash
sudo docker compose exec evolution-api find /evolution/instances/ -type f | wc -l
```

### Ver arquivos mais recentes:

```bash
sudo docker compose exec evolution-api find /evolution/instances/ -type f -exec ls -lht {} \; | head -20
```

### Buscar por tipo de arquivo:

```bash
# Buscar arquivos JSON
sudo docker compose exec evolution-api find /evolution/instances/ -name "*.json"

# Buscar arquivos de sessão
sudo docker compose exec evolution-api find /evolution/instances/ -name "*session*"
```

## 🔄 Copiar Arquivos da VM para o Container

```bash
cd /opt/evolution-api-gcp

# Copiar um arquivo para o container
sudo docker compose cp /tmp/arquivo.json evolution-api:/evolution/instances/nome-da-instancia/
```

## 📂 Estrutura de Diretórios no Container

```
/evolution/
├── instances/     → Arquivos de sessão do WhatsApp
│   └── nome-instancia/
│       ├── auth_info.json
│       ├── app-state
│       ├── session
│       └── ...
├── logs/          → Logs do Evolution API
├── store/         → Mensagens salvas em arquivo
├── tmp/           → Arquivos temporários
└── database/      → Database local (SQLite, se usado)
```

## 🛠️ Comandos de Diagnóstico

### Ver variáveis de ambiente do container:

```bash
sudo docker compose exec evolution-api env | grep -E "DATABASE|REDIS|INSTANCE"
```

### Ver volumes montados:

```bash
sudo docker compose exec evolution-api mount | grep evolution
```

### Verificar permissões:

```bash
sudo docker compose exec evolution-api ls -lah /evolution/
```

## 💡 Dicas

1. **Se o diretório instances/ estiver vazio**: As instâncias podem estar apenas no PostgreSQL. Verifique:
   ```bash
   sudo docker compose exec postgres psql -U evolution -d evolution -c "SELECT name, status FROM instance;"
   ```

2. **Para fazer backup completo**:
   ```bash
   cd /opt/evolution-api-gcp
   sudo docker compose exec evolution-api tar -czf /tmp/backup.tar.gz /evolution/instances/
   sudo docker compose cp evolution-api:/tmp/backup.tar.gz /tmp/
   ```

3. **Para ver logs em tempo real**:
   ```bash
   sudo docker compose logs -f evolution-api
   ```



