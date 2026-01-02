# Build e Deploy - Método Rápido (Recomendado)

## 🚀 Build Local + Upload de Imagem

Este é o método **mais rápido** para fazer deploy após modificar os fontes:

### Processo Completo Automatizado

```bash
cd worker/v2
bash scripts/10-build-and-deploy.sh
```

Este script faz tudo automaticamente:
1. ✅ Build local da imagem
2. ✅ Compressão e upload para servidor
3. ✅ Load da imagem no Docker do servidor
4. ✅ Atualização do docker-compose.yml
5. ✅ Reinicialização dos containers

### Processo Manual (Passo a Passo)

#### 1. Modificar Fontes
```bash
# Edite os arquivos em evolution-api-src/src/
nano evolution-api-src/src/api/integrations/channel/whatsapp/whatsapp.baileys.service.ts
```

#### 2. Build Local
```bash
cd worker/v2
bash scripts/build-image-local.sh
```

Isso irá:
- Compilar a imagem Docker localmente
- Salvar como `evolution-api-v2-image.tar.gz` (comprimido)

#### 3. Upload para Servidor
```bash
bash scripts/08-upload-image.sh
```

Isso irá:
- Enviar o arquivo `.tar.gz` para o servidor
- Fazer `docker load` da imagem no servidor

#### 4. Atualizar e Reiniciar
```bash
bash scripts/09-update-compose-image.sh
```

Isso irá:
- Atualizar `docker-compose.yml` para usar a imagem ao invés de fazer build
- Reiniciar o container

## ⚡ Vantagens deste Método

- ✅ **Muito mais rápido**: Apenas 1 arquivo comprimido (~500MB-1GB) vs milhares de arquivos pequenos
- ✅ **Build local**: Usa recursos da sua máquina (mais rápido que no servidor)
- ✅ **Reutilização**: Pode reenviar a mesma imagem várias vezes sem rebuild
- ✅ **Compressão**: O arquivo é comprimido, reduzindo tempo de transferência

## 📊 Comparação de Tempo

| Método | Tempo Estimado |
|--------|----------------|
| Enviar fontes + build no servidor | 15-30 minutos |
| Build local + upload imagem | 5-10 minutos |

## 🔄 Após Modificar Fontes

Sempre que modificar os fontes, execute:

```bash
bash scripts/10-build-and-deploy.sh
```

Ou os passos individuais se preferir mais controle.

## 📝 Notas

- O arquivo `evolution-api-v2-image.tar.gz` é criado localmente e pode ser deletado após o upload
- A imagem local `evolution-api-v2-custom:latest` permanece no Docker local para reutilização
- O servidor mantém a imagem carregada, então rebuilds subsequentes são mais rápidos



