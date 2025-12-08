# 🚨 Problemas Identificados: Testes Passando mas Código com Problemas

Este documento lista problemas onde os testes estão passando, mas o código fonte pode estar incorreto ou incompleto.

## 1. ❌ **CRÍTICO: Validação de Conflitos de Agendamento no Frontend**

### Problema
O teste `tests/integration/appointment-flow.test.ts` (linha 456-484) verifica a lógica de detecção de conflitos, mas o código real em `hooks/useFirestore.ts` **NÃO valida conflitos antes de criar agendamentos**.

### Evidência
- **Teste**: Verifica se `hasConflict` é `true` quando há sobreposição de horários
- **Código Real** (`hooks/useFirestore.ts:865-940`): A função `createAppointment` **não verifica conflitos** antes de salvar
- **Backend** (`functions/src/index.ts:512-556`): A função `createAppointment` no backend **verifica conflitos**, mas usa a coleção legada `appointments` (não `companies/${companyId}/appointments`)

### Por que o teste passa?
O teste apenas valida a **lógica matemática** de detecção de conflitos, mas não testa se essa lógica é **realmente aplicada** antes de salvar no banco.

### Impacto
- **Alto**: Agendamentos podem ser criados com conflitos de horário
- Usuários podem criar agendamentos sobrepostos para o mesmo profissional
- Sistema financeiro pode calcular incorretamente

### Solução Necessária
1. Adicionar validação de conflitos em `hooks/useFirestore.ts` antes de `addDoc`
2. Buscar agendamentos existentes do mesmo profissional no mesmo período
3. Verificar sobreposição de horários
4. Lançar erro se houver conflito

---

## 2. ❌ **CRÍTICO: Backend Usa Coleção Legada para Validação de Conflitos**

### Problema
A função `createAppointment` no backend (`functions/src/index.ts:534-538`) busca conflitos na coleção `appointments` (legada), mas o frontend salva em `companies/${companyId}/appointments`.

### Evidência
```typescript
// Backend busca em:
const conflictingAppointments = await db
  .collection('appointments')  // ❌ Coleção legada
  .where('professionalId', '==', professionalId)
  .where('status', 'in', ['agendado', 'confirmado'])
  .get();

// Frontend salva em:
const docRef = await addDoc(
  collection(db, `companies/${companyId}/appointments`), // ✅ Nova estrutura
  payload
);
```

### Por que o teste passa?
Os testes de integração não testam a função do backend diretamente, apenas simulam a lógica.

### Impacto
- **Alto**: Validação de conflitos no backend não funciona
- Backend não encontra agendamentos criados pelo frontend
- Conflitos não são detectados

### Solução Necessária
1. Atualizar backend para buscar em `companies/${companyId}/appointments`
2. Adicionar `companyId` como parâmetro obrigatório
3. Validar que `companyId` corresponde ao token do usuário

---

## 3. ⚠️ **MÉDIO: Validação de Dados Obrigatórios Incompleta**

### Problema
O teste `tests/integration/appointment-flow.test.ts` (linha 435-454) verifica se dados obrigatórios estão presentes, mas o código em `hooks/useFirestore.ts:871-886` usa valores padrão (`??`) em vez de validar e lançar erro.

### Evidência
```typescript
// Código atual (aceita valores vazios):
const payload: any = {
  ...data,
  professionalId: data.professionalId ?? '',  // ❌ Aceita string vazia
  clientId: data.clientId ?? '',              // ❌ Aceita string vazia
  serviceId: data.serviceId ?? '',            // ❌ Aceita string vazia
  precoCentavos: data.precoCentavos ?? 0,    // ❌ Aceita zero
};
```

### Por que o teste passa?
O teste verifica se `isValid` é `false` quando `companyId` está ausente, mas não testa se o código realmente **rejeita** valores inválidos.

### Impacto
- **Médio**: Agendamentos podem ser criados com dados inválidos (strings vazias, zeros)
- Sistema pode quebrar silenciosamente
- Dados inconsistentes no banco

### Solução Necessária
1. Validar campos obrigatórios antes de criar payload
2. Lançar erros descritivos para cada campo ausente
3. Não usar valores padrão para campos obrigatórios

---

## 4. ⚠️ **MÉDIO: Teste de Conflito com Lógica Incorreta**

### Problema
O teste `tests/integration/appointment-flow.test.ts` (linha 477-481) tem uma lógica de precedência de operadores incorreta.

### Evidência
```typescript
// Teste atual (linha 477-481):
const hasConflict = 
  existingAppointment.status === 'agendado' || existingAppointment.status === 'confirmado' &&  // ❌ Precedência errada
  existingAppointment.professionalId === 'prof1' &&
  newAppointmentStart < existingAppointment.fim &&
  newAppointmentEnd > existingAppointment.inicio;
```

### Problema
A precedência de operadores faz com que a expressão seja avaliada como:
```typescript
(existingAppointment.status === 'agendado') || 
((existingAppointment.status === 'confirmado') && ...)
```

Isso significa que se o status for `'agendado'`, a expressão retorna `true` **sem verificar os outros critérios**.

### Por que o teste passa?
Por acaso, o status é `'agendado'` no teste, então retorna `true` mesmo com a lógica incorreta.

### Impacto
- **Médio**: Teste não valida corretamente a lógica de conflitos
- Pode passar mesmo quando deveria falhar

### Solução Necessária
1. Adicionar parênteses para corrigir precedência:
```typescript
const hasConflict = 
  (existingAppointment.status === 'agendado' || existingAppointment.status === 'confirmado') &&
  existingAppointment.professionalId === 'prof1' &&
  newAppointmentStart < existingAppointment.fim &&
  newAppointmentEnd > existingAppointment.inicio;
```

---

## 5. ✅ **RESOLVIDO: Isolamento por CompanyId Não Verificado no Backend**

### Problema (RESOLVIDO)
O teste `tests/business-rules/company-isolation.test.ts` verifica isolamento por `companyId`, mas a função do backend `createAppointment` não recebe nem valida `companyId`.

### Evidência (ANTES)
- **Backend** (`functions/src/index.ts:512`): Não recebe `companyId` como parâmetro
- **Backend** (`functions/src/index.ts:559`): Salva em `appointments` (legada) sem `companyId`
- **Frontend**: Salva em `companies/${companyId}/appointments` (correto)

### Correção Implementada
1. ✅ **`createAppointment`** (`functions/src/index.ts:512-626`):
   - Recebe `companyId` como parâmetro obrigatório
   - Valida `companyId` e verifica correspondência com token do usuário
   - Usa `companies/${finalCompanyId}/appointments` para salvar agendamentos
   - Verifica conflitos usando estrutura multi-tenant

2. ✅ **`sendConfirmation`** (`functions/src/index.ts:629-679`):
   - Recebe `companyId` como parâmetro
   - Usa `companies/${companyId}/appointments`, `companies/${companyId}/patients`, `companies/${companyId}/services` e `companies/${companyId}/messages`

3. ✅ **`callAltegioWebhook`** (`functions/src/index.ts:702-890`):
   - Valida `companyId` como obrigatório
   - Usa estrutura multi-tenant para buscar dados

4. ✅ **`webhookWats.ts`** (`functions/src/whatsapp/webhookWats.ts`):
   - Removido fallback para coleção legada `appointments` em `handleInteractiveButtonPayload` (linha 330-334)
   - Removido fallback para coleção legada em `findUpcomingAppointmentForPhone` (linha 669-671)
   - Agora exige `companyId` obrigatório em ambos os casos

### Status
✅ **RESOLVIDO** - Todas as funções do backend agora usam estrutura multi-tenant e validam `companyId`

---

## 6. ⚠️ **BAIXO: Validação de Transições de Status Superficial**

### Problema
O teste `tests/integration/appointment-flow.test.ts` (linha 321-387) verifica transições de status, mas usa valores hardcoded em vez de testar a função real.

### Evidência
```typescript
// Teste (linha 349):
const canConfirm = ['agendado', 'pendente'].includes('agendado'); // ❌ Hardcoded

// Teste (linha 362):
const canComplete = ['agendado', 'confirmado'].includes('confirmado'); // ❌ Hardcoded
```

### Por que o teste passa?
O teste sempre usa valores que estão na lista, então sempre passa.

### Impacto
- **Baixo**: Teste não valida a lógica real de transições
- Pode passar mesmo se a lógica estiver errada

### Solução Necessária
1. Criar função de validação de transições
2. Testar a função real, não valores hardcoded
3. Testar transições inválidas

---

## 7. ⚠️ **BAIXO: Cálculo de Receita Não Valida Status**

### Problema
O teste `tests/integration/appointment-flow.test.ts` (linha 138-143) calcula receita filtrando por status, mas não verifica se o código real faz o mesmo.

### Evidência
```typescript
// Teste filtra corretamente:
const revenue = appointments
  .filter(apt => apt.status === 'concluido' && apt.clientePresente !== false)
  .reduce((total, apt) => {
    const valorPago = apt.valorPagoCentavos || apt.precoCentavos;
    return total + valorPago;
  }, 0);
```

Mas não há garantia de que o código real (em relatórios, dashboard, etc.) use a mesma lógica.

### Por que o teste passa?
O teste apenas valida a lógica matemática, não verifica se o código real a usa.

### Impacto
- **Baixo**: Relatórios podem calcular incorretamente se não usarem a mesma lógica

### Solução Necessária
1. Extrair lógica de cálculo para função utilitária
2. Testar a função utilitária
3. Garantir que todos os lugares usem a mesma função

---

## 📊 Resumo de Prioridades

| Prioridade | Problema | Impacto | Testes Afetados | Status |
|------------|----------|---------|-----------------|--------|
| ✅ **RESOLVIDO** | Validação de conflitos ausente no frontend | Alto | `appointment-flow.test.ts` | ✅ Corrigido |
| ✅ **RESOLVIDO** | Backend usa coleção legada | Alto | `appointment-flow.test.ts`, `company-isolation.test.ts` | ✅ Corrigido |
| 🟡 **MÉDIO** | Validação de dados obrigatórios incompleta | Médio | `appointment-flow.test.ts` | ⚠️ Pendente |
| 🟡 **MÉDIO** | Lógica de conflito com precedência errada | Médio | `appointment-flow.test.ts` | ⚠️ Pendente |
| ✅ **RESOLVIDO** | Isolamento não verificado no backend | Médio | `company-isolation.test.ts` | ✅ Corrigido |
| 🟢 **BAIXO** | Validação de transições superficial | Baixo | `appointment-flow.test.ts` | ⚠️ Pendente |
| 🟢 **BAIXO** | Cálculo de receita não centralizado | Baixo | `appointment-flow.test.ts`, `financial-flow.test.ts` | ⚠️ Pendente |

---

## 🎯 Recomendações Imediatas

1. ✅ **CONCLUÍDO**: Adicionar validação de conflitos no frontend antes de salvar
2. ✅ **CONCLUÍDO**: Corrigir backend para usar estrutura multi-tenant
3. **IMPORTANTE**: Melhorar validação de dados obrigatórios
4. **IMPORTANTE**: Corrigir lógica de precedência no teste
5. **DESEJÁVEL**: Centralizar lógica de cálculos financeiros
6. **DESEJÁVEL**: Melhorar testes para validar código real, não apenas lógica

---

## 📝 Notas

- Estes problemas foram identificados através de análise estática do código
- Alguns problemas podem não se manifestar em produção devido a outras camadas de validação
- Recomenda-se revisão manual e testes em ambiente de desenvolvimento antes de corrigir

