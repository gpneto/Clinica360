# Build do Evolution API a partir dos Fontes

Este projeto compila o Evolution API a partir dos fontes modificados localmente ao invés de usar a imagem Docker pronta.

## 📁 Estrutura

```
v2/
├── evolution-api-src/          # Fontes do Evolution API (clonado do GitHub)
│   ├── src/                    # Código fonte TypeScript
│   ├── Dockerfile              # Dockerfile para build
│   ├── package.json            # Dependências Node.js
│   └── ...
├── docker-compose.yml          # Configuração com build a partir dos fontes
└── ...
```

## 🔧 Modificar os Fontes

Para fazer alterações no código do Evolution API:

1. **Edite os arquivos na pasta `evolution-api-src/src/`**
   - O código fonte TypeScript está em `evolution-api-src/src/`
   - Faça suas modificações conforme necessário

2. **Rebuild da imagem Docker**
   ```bash
   # Na VM, após fazer deploy:
   cd /opt/evolution-api-v2-gcp
   sudo docker compose build evolution-api
   sudo docker compose up -d evolution-api
   ```

   Ou localmente (se tiver Docker instalado):
   ```bash
   cd worker/v2
   docker compose build evolution-api
   ```

## 🚀 Deploy com Fontes Modificados

O processo de deploy é o mesmo, mas a imagem será construída a partir dos fontes:

```bash
cd worker/v2
bash scripts/00-full-deploy.sh
```

O script `05-deploy.sh` automaticamente fará o build da imagem quando copiar os arquivos para a VM.

### Build na VM

Quando você fizer deploy, o Docker Compose irá:

1. Copiar os fontes para a VM
2. Fazer build da imagem Docker a partir dos fontes
3. Iniciar os containers

**Nota**: O primeiro build pode demorar alguns minutos, pois precisa compilar o TypeScript e instalar todas as dependências.

## 📝 Atualizar Fontes do GitHub

Se quiser atualizar os fontes para a versão mais recente do repositório oficial:

```bash
cd worker/v2/evolution-api-src
git pull origin main
# ou
git fetch origin
git checkout <tag-version>  # Para usar uma versão específica
```

**⚠️ ATENÇÃO**: Isso irá sobrescrever suas modificações locais. Se você tem alterações não commitadas, faça backup primeiro ou use `git stash`.

## 💡 Dicas

1. **Testar mudanças localmente primeiro** (se possível):
   ```bash
   cd evolution-api-src
   npm install
   npm run build
   ```

2. **Manter suas modificações em um branch separado**:
   ```bash
   cd evolution-api-src
   git checkout -b minhas-modificacoes
   # Faça suas alterações
   git add .
   git commit -m "Minhas modificações"
   ```

3. **Versionar suas modificações**: Considere criar tags ou branches para marcar versões específicas das suas modificações.

## 🔄 Workflow Recomendado (Build Local + Upload)

**Melhor método**: Compilar localmente e enviar a imagem já compilada (muito mais rápido!)

1. Fazer modificações em `evolution-api-src/src/`
2. Build local da imagem:
   ```bash
   bash scripts/build-image-local.sh
   ```
3. Upload da imagem para o servidor:
   ```bash
   bash scripts/08-upload-image.sh
   ```
4. Atualizar docker-compose e reiniciar:
   ```bash
   bash scripts/09-update-compose-image.sh
   ```

**Ou use o script completo que faz tudo:**
```bash
bash scripts/10-build-and-deploy.sh
```

### Workflow Alternativo (Build no Servidor - Mais Lento)

Se preferir fazer build no servidor (não recomendado, mais lento):

1. Fazer modificações em `evolution-api-src/src/`
2. Copiar fontes para servidor (lento, arquivo por arquivo)
3. Build no servidor usando docker-compose build
4. Reiniciar containers

