# Persistência de Dados - Evolution API GCP

## ✅ Garantias de Persistência

### 1. **Reinicialização de Containers (Pods)**
**SIM - Dados são preservados** ✅

Os containers usam volumes que apontam para discos persistentes montados em `/mnt/disks/*`:
- PostgreSQL: `/mnt/disks/evolution-data/postgres` → Disco único `evolution-data-disk`
- Redis: `/mnt/disks/evolution-data/redis` → Disco único `evolution-data-disk`
- Evolution Instances: `/mnt/disks/evolution-data/instances` → Disco único `evolution-data-disk`

Quando os containers reiniciam (via `docker compose restart` ou reinicialização da VM), os dados permanecem porque estão em discos externos.

### 2. **Reinicialização da VM**
**SIM - Dados são preservados** ✅

Os discos persistentes são:
- Adicionados ao `/etc/fstab` para montagem automática
- Montados automaticamente no boot da VM
- Independentes do disco de boot da VM

Quando a VM reinicia, os discos são automaticamente montados e os dados permanecem intactos.

### 3. **Recriação da VM (Deletar e Criar Nova)**
**SIM - Dados são preservados** ✅ (se usar o script correto)

Os discos persistentes são recursos **independentes** da VM:
- Existem mesmo se a VM for deletada
- Podem ser reanexados a uma nova VM
- O script `02-create-vm.sh` já anexa os discos existentes automaticamente

**IMPORTANTE**: Se você deletar a VM manualmente sem usar o script, os discos **NÃO** são deletados automaticamente. Eles permanecem no GCP e podem ser reanexados.

## 🔧 Como Garantir Persistência ao Recriar VM

### Opção 1: Usar o Script de Criação (Recomendado)

O script `02-create-vm.sh` verifica se os discos existem e os anexa automaticamente:

```bash
bash scripts/02-create-vm.sh
```

O script:
1. Verifica se os discos existem
2. Se existirem, os anexa à nova VM
3. Se não existirem, pede para executar `01-create-persistent-disks.sh` primeiro

### Opção 2: Reanexar Discos Manualmente

Se você já tem uma VM e quer reanexar os discos:

```bash
bash scripts/06-reattach-disks.sh
```

## 📊 Estrutura de Persistência

```
GCP Persistent Disk (Recurso Independente)
└── evolution-data-disk (100GB Standard/SSD)
    └── Montado em: /mnt/disks/evolution-data
        ├── postgres/     → Dados do PostgreSQL (banco de dados)
        ├── redis/         → Dados do Redis (cache e estado)
        ├── instances/    → Instâncias do WhatsApp (sessões)
        ├── logs/         → Logs do Evolution API
        └── tmp/          → Arquivos temporários e cache
```

## ⚠️ Cenários de Perda de Dados

### ❌ Quando os dados SERÃO perdidos:

1. **Deletar o disco persistente manualmente**
   ```bash
   # NÃO FAÇA ISSO a menos que queira deletar os dados!
   gcloud compute disks delete evolution-data-disk --zone=us-central1-a
   ```

2. **Formatação acidental dos discos**
   - O script verifica se o disco já está formatado antes de formatar
   - Mas se você formatar manualmente, os dados serão perdidos

### ✅ Quando os dados NÃO serão perdidos:

1. ✅ Reiniciar containers
2. ✅ Reiniciar a VM
3. ✅ Deletar e recriar a VM (usando os scripts)
4. ✅ Parar e iniciar a VM
5. ✅ Atualizar a VM (mudar tipo de máquina)
6. ✅ Recriar containers com `docker compose down && docker compose up`

## 🔍 Verificar Persistência

### Verificar se disco está montado:

```bash
gcloud compute ssh evolution-api-gcp --zone=us-central1-a \
  --command='df -h | grep /mnt/disks/evolution-data'
```

### Verificar estrutura de diretórios:

```bash
gcloud compute ssh evolution-api-gcp --zone=us-central1-a \
  --command='ls -la /mnt/disks/evolution-data/'
```

### Verificar se disco existe no GCP:

```bash
gcloud compute disks list --filter="name~evolution-data-disk"
```

### Verificar se disco está anexado à VM:

```bash
gcloud compute instances describe evolution-api-gcp \
  --zone=us-central1-a \
  --format='get(disks[].source)'
```

## 💾 Backup Recomendado

Mesmo com persistência garantida, é recomendado fazer backups periódicos:

```bash
# Criar snapshot do disco único (contém todos os dados)
gcloud compute disks snapshot evolution-data-disk \
  --snapshot-names=evolution-backup-$(date +%Y%m%d) \
  --zone=us-central1-a \
  --description="Backup completo Evolution API (PostgreSQL, Redis, Instances)"
```

## 🚨 Recuperação de Dados

Se você precisar recuperar dados de um snapshot:

```bash
# Criar disco a partir de snapshot
gcloud compute disks create evolution-data-restored \
  --source-snapshot=evolution-backup-20240101 \
  --zone=us-central1-a

# Anexar à VM
gcloud compute instances attach-disk evolution-api-gcp \
  --disk=evolution-data-restored \
  --device-name=evolution-data-restored \
  --zone=us-central1-a
```

