# Guia de Migração: Atualizar para v2 Mantendo os Dados

Este guia explica como migrar da versão original para a v2 mantendo todos os dados.

## ⚠️ Limitação do GCP

No Google Cloud Platform, **um disco persistente não pode ser anexado a múltiplas VMs simultaneamente**. Isso significa que você não pode ter a VM original e a v2 rodando ao mesmo tempo com o mesmo disco.

## Opções de Migração

### Opção 1: Criar Nova VM e Migrar (Recomendado se quiser VM separada)

**Passo a passo:**

1. **Parar a VM original**:
   ```bash
   gcloud compute instances stop evolution-api-gcp --zone=us-central1-a
   ```

2. **Criar a nova VM v2** (o script vai anexar o disco automaticamente):
   ```bash
   cd worker/v2
   bash scripts/02-create-vm.sh
   ```

3. **Fazer deploy da v2**:
   ```bash
   bash scripts/05-deploy.sh
   ```

4. **Verificar se tudo está funcionando**

5. **Opcional**: Se tudo estiver OK, você pode deletar a VM original:
   ```bash
   gcloud compute instances delete evolution-api-gcp --zone=us-central1-a
   ```

**Prós:**
- ✅ VM completamente nova com última versão
- ✅ Pode manter a VM original como backup temporário

**Contras:**
- ⚠️ Precisa parar a VM original
- ⚠️ Tempo de indisponibilidade durante a migração

---

### Opção 2: Atualizar Código na VM Existente (Mais Simples)

Se você quer apenas atualizar para a última versão do Evolution API sem criar nova VM:

1. **SSH na VM original**:
   ```bash
   gcloud compute ssh evolution-api-gcp --zone=us-central1-a
   ```

2. **Navegar para o diretório**:
   ```bash
   cd /opt/evolution-api-gcp
   ```

3. **Fazer pull da última versão**:
   ```bash
   sudo docker compose pull evolution-api
   ```

4. **Atualizar o docker-compose.yml se necessário** (copiar da v2 se houver mudanças)

5. **Reiniciar os containers**:
   ```bash
   sudo docker compose up -d --force-recreate evolution-api
   ```

**Prós:**
- ✅ Sem tempo de indisponibilidade
- ✅ Mantém tudo como está
- ✅ Mais simples e rápido

**Contras:**
- ⚠️ Não cria uma VM nova (se isso for importante para você)

---

### Opção 3: Criar Snapshot e Nova VM com Disco Separado

Se você realmente precisa de duas VMs rodando simultaneamente:

1. **Criar snapshot do disco atual**:
   ```bash
   gcloud compute disks snapshot evolution-data-disk \
     --snapshot-names=backup-antes-v2-$(date +%Y%m%d) \
     --zone=us-central1-a
   ```

2. **Criar novo disco a partir do snapshot**:
   ```bash
   gcloud compute disks create evolution-v2-data-disk \
     --source-snapshot=backup-antes-v2-$(date +%Y%m%d) \
     --zone=us-central1-a \
     --size=100GB
   ```

3. **Modificar os scripts v2** para usar `evolution-v2-data-disk` ao invés de `evolution-data-disk`

4. **Criar a nova VM** normalmente

**Prós:**
- ✅ Ambas as VMs podem rodar simultaneamente
- ✅ Dados iniciais copiados do snapshot

**Contras:**
- ⚠️ Os dados não são compartilhados em tempo real (cada VM terá seu próprio disco)
- ⚠️ Custo adicional do novo disco

---

## Recomendação Final

Para a maioria dos casos, **recomendo a Opção 2** (atualizar código na VM existente), pois é:
- Mais simples
- Sem tempo de indisponibilidade
- Mantém a mesma infraestrutura
- Atualiza para a última versão

A Opção 1 só faz sentido se você realmente precisa de uma VM completamente nova ou quer fazer uma migração limpa.



