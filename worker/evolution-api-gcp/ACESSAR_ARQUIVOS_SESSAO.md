# Como Acessar Arquivos de Sessão do Evolution API

Os arquivos de sessão do Evolution API estão salvos na VM `evolution-api-gcp` no GCP, no diretório:
```
/mnt/disks/evolution-data/instances/
```

Cada instância do WhatsApp tem seu próprio diretório com os arquivos de sessão.

## 🚀 Método 1: Script Automatizado (Recomendado)

Use o script `view-sessions.sh`:

```bash
cd worker/evolution-api-gcp
bash scripts/view-sessions.sh
```

Para ver detalhes de uma instância específica:
```bash
bash scripts/view-sessions.sh nome-da-instancia
```

## 🔧 Método 2: Comando Manual via SSH

### Com IAP Tunneling (Recomendado - mais seguro)

```bash
gcloud compute ssh evolution-api-gcp \
  --zone=us-central1-a \
  --project=agendamentointeligente-4405f \
  --tunnel-through-iap \
  --command="ls -lah /mnt/disks/evolution-data/instances/"
```

### Sem IAP (se tiver IP externo configurado)

```bash
gcloud compute ssh evolution-api-gcp \
  --zone=us-central1-a \
  --project=agendamentointeligente-4405f \
  --command="ls -lah /mnt/disks/evolution-data/instances/"
```

## 🔍 Ver Detalhes de uma Instância Específica

```bash
# Listar todos os arquivos de uma instância
gcloud compute ssh evolution-api-gcp \
  --zone=us-central1-a \
  --project=agendamentointeligente-4405f \
  --tunnel-through-iap \
  --command="find /mnt/disks/evolution-data/instances/nome-da-instancia -type f -exec ls -lh {} \;"

# Ver tamanho total
gcloud compute ssh evolution-api-gcp \
  --zone=us-central1-a \
  --project=agendamentointeligente-4405f \
  --tunnel-through-iap \
  --command="du -sh /mnt/disks/evolution-data/instances/nome-da-instancia"
```

## 🖥️ Método 3: Via Console do GCP (Browser SSH)

Se o SSH via linha de comando não funcionar:

1. Acesse o [Console do GCP](https://console.cloud.google.com)
2. Vá para **Compute Engine > VM instances**
3. Encontre a VM `evolution-api-gcp`
4. Clique no botão **SSH** (ao lado da VM)
5. Isso abrirá um terminal no navegador
6. Execute os comandos:

```bash
# Listar instâncias
ls -lah /mnt/disks/evolution-data/instances/

# Ver detalhes de uma instância
ls -lah /mnt/disks/evolution-data/instances/nome-da-instancia/

# Ver estrutura completa
find /mnt/disks/evolution-data/instances/ -type f | head -20
```

## 📁 Estrutura dos Arquivos de Sessão

Cada instância contém arquivos como:

- `auth_info.json` - Informações de autenticação do WhatsApp
- `app-state` - Estado da aplicação
- `session` - Dados da sessão
- `pre-key` - Chaves de criptografia
- `sender-key` - Chaves de envio
- `app-state-sync-key` - Chaves de sincronização
- Outros arquivos de cache e configuração

## ⚠️ Resolver Problemas de Autenticação SSH

Se você receber erro "Permission denied (publickey)":

### Opção 1: Adicionar sua chave SSH pública à VM

```bash
# Gerar chave SSH (se não tiver)
ssh-keygen -t rsa -f ~/.ssh/gcp_rsa -C "seu-email@exemplo.com"

# Adicionar chave à VM
gcloud compute instances add-metadata evolution-api-gcp \
  --zone=us-central1-a \
  --metadata-from-file ssh-keys=<(echo "seu-usuario:$(cat ~/.ssh/gcp_rsa.pub)")

# Usar a chave ao conectar
gcloud compute ssh evolution-api-gcp \
  --zone=us-central1-a \
  --project=agendamentointeligente-4405f \
  --ssh-key-file=~/.ssh/gcp_rsa
```

### Opção 2: Usar IAP Tunneling (não requer chaves SSH)

O IAP tunneling funciona mesmo sem configurar chaves SSH:

```bash
gcloud compute ssh evolution-api-gcp \
  --zone=us-central1-a \
  --project=agendamentointeligente-4405f \
  --tunnel-through-iap
```

### Opção 3: Usar Console do GCP (Browser SSH)

O console do GCP tem SSH integrado que não requer configuração de chaves.

## 📊 Comandos Úteis

### Ver todas as instâncias e seus tamanhos

```bash
gcloud compute ssh evolution-api-gcp \
  --zone=us-central1-a \
  --project=agendamentointeligente-4405f \
  --tunnel-through-iap \
  --command="for dir in /mnt/disks/evolution-data/instances/*/; do echo \"\$(basename \$dir): \$(du -sh \$dir | cut -f1)\"; done"
```

### Contar total de arquivos de sessão

```bash
gcloud compute ssh evolution-api-gcp \
  --zone=us-central1-a \
  --project=agendamentointeligente-4405f \
  --tunnel-through-iap \
  --command="find /mnt/disks/evolution-data/instances/ -type f | wc -l"
```

### Ver espaço usado por todas as instâncias

```bash
gcloud compute ssh evolution-api-gcp \
  --zone=us-central1-a \
  --project=agendamentointeligente-4405f \
  --tunnel-through-iap \
  --command="du -sh /mnt/disks/evolution-data/instances/*"
```

## 🔐 Segurança

⚠️ **Importante**: Os arquivos de sessão contêm informações sensíveis de autenticação do WhatsApp. Não compartilhe ou exponha esses arquivos publicamente.

