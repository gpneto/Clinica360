# Testes de Regras de Negócio

Este diretório contém testes específicos para validar as regras de negócio do sistema.

## 📋 Categorias de Testes

### 1. Permissões (`permissions.test.ts`)
Testa as regras de acesso e permissões do sistema:
- ✅ Verificação de roles (owner, admin, pro, atendente, outro)
- ✅ Permissões granulares para role 'outro'
- ✅ Acesso a menus e funcionalidades
- ✅ Criação de permissões padrão

### 2. Cálculos Financeiros (`financial-calculations.test.ts`)
Testa as regras de cálculo financeiro:
- ✅ Cálculo de comissão do salão
- ✅ Cálculo de repasse para profissional
- ✅ Cálculo de receita total
- ✅ Uso de valorPagoCentavos vs precoCentavos
- ✅ Exclusão de agendamentos onde cliente não compareceu

### 3. Validação de Agendamentos (`appointment-validation.test.ts`)
Testa as regras de validação de agendamentos:
- ✅ Detecção de conflitos de horário
- ✅ Validação de sobreposição
- ✅ Status que causam conflitos (agendado, confirmado)
- ✅ Validação de cliente presente
- ✅ Filtros por período

### 4. Status de Agendamentos (`appointment-status-rules.test.ts`)
Testa as regras de status:
- ✅ Transições válidas de status
- ✅ Estados finais (concluido, cancelado, no_show)
- ✅ Relação entre status e cálculo financeiro
- ✅ Cliente presente vs no_show
- ✅ Identificação de bloqueios

### 5. Regras de WhatsApp (`whatsapp-rules.test.ts`)
Testa as regras de uso de WhatsApp:
- ✅ Limite mensal gratuito (200 mensagens)
- ✅ Cálculo de mensagens excedentes
- ✅ Cálculo de custo excedente (R$ 0,30 por mensagem)
- ✅ Filtro de mensagens automáticas

### 6. Validações Gerais (`validation-rules.test.ts`)
Testa validações de entrada:
- ✅ Formato de telefone E.164
- ✅ Formato de email
- ✅ Validação de preço (centavos)
- ✅ Validação de percentual de comissão (0-100%)
- ✅ Validação de duração (minutos)
- ✅ Validação de data
- ✅ Validação de horário de funcionamento (8h-22h)
- ✅ Formatação de moeda (BRL)
- ✅ Formatação de duração

### 7. Regras de Acesso (`access-rules.test.ts`)
Testa regras específicas de acesso:
- ✅ Agendas de owner/admin não visíveis para profissionais
- ✅ Profissionais veem apenas sua própria agenda
- ✅ Atendentes podem criar agendamentos para qualquer profissional

### 8. Isolamento por Empresa (`company-isolation.test.ts`)
Testa isolamento multi-tenant:
- ✅ Filtro de dados por companyId
- ✅ Isolamento de agendamentos
- ✅ Isolamento de pacientes
- ✅ Validação de companyId obrigatório

### 9. Recorrência de Agendamentos (`appointment-recurrence.test.ts`) - NOVO
Testa regras de recorrência:
- ✅ Validação de data final
- ✅ Frequências (diária, semanal, quinzenal, mensal, custom)
- ✅ Intervalo customizado (1-365 dias)
- ✅ Bloqueios e recorrência
- ✅ Cálculo de ocorrências

### 10. Notificações e Lembretes (`notification-rules.test.ts`) - NOVO
Testa regras de notificações:
- ✅ Janelas de lembrete (24h e 1h)
- ✅ Configuração de lembretes
- ✅ Notificações de confirmação
- ✅ Agendamentos passados

### 11. Bloqueios de Agenda (`block-rules.test.ts`) - NOVO
Testa regras de bloqueios:
- ✅ Identificação de bloqueios
- ✅ Escopo (single/all)
- ✅ Bloqueios e validações
- ✅ Filtros de bloqueios

### 12. Múltiplos Serviços (`multiple-services.test.ts`) - NOVO
Testa regras de múltiplos serviços:
- ✅ Cálculo de duração total
- ✅ Cálculo de preço total
- ✅ Validação de serviços
- ✅ Compatibilidade com serviceId único

### 13. Horários de Funcionamento (`working-hours.test.ts`) - NOVO
Testa regras de horários:
- ✅ Validação de horário (8h-22h)
- ✅ Geração de slots (30 em 30 minutos)
- ✅ Dias da semana
- ✅ Cálculo de duração

### 14. Edge Cases (`edge-cases.test.ts`) - NOVO
Testa casos extremos:
- ✅ Cálculos financeiros extremos
- ✅ Agendamentos extremos
- ✅ Validações edge cases
- ✅ Permissões edge cases
- ✅ WhatsApp edge cases
- ✅ Filtros edge cases

## 🎯 Regras de Negócio Principais Testadas

### Permissões
- Owner e Admin têm acesso total
- Profissionais veem apenas sua agenda
- Atendentes podem criar agendamentos
- Role 'outro' usa permissões granulares

### Financeiro
- Comissão = (preço × percentual) / 100
- Repasse = preço - comissão
- Apenas agendamentos concluidos contam para receita
- Cliente não presente não conta para receita

### Agendamentos
- Não pode haver conflito de horário para mesmo profissional
- Apenas status 'agendado' e 'confirmado' causam conflito
- Cliente presente = true ou undefined conta para receita
- Cliente presente = false não conta para receita

### Recorrência
- Data final deve ser posterior à inicial
- Data final não pode exceder 1 ano
- Bloqueios não podem ter recorrência
- Frequências: daily, weekly, biweekly, monthly, custom

### Notificações
- Lembrete 24h: janela de 23h-25h antes
- Lembrete 1h: janela de 30min-1h30min antes
- Não envia para bloqueios
- Respeita configurações da empresa

### Bloqueios
- Identificados por isBlock ou status 'bloqueio'
- Escopo: single (profissional) ou all (todos)
- Não contam para receita
- Não podem ter recorrência

### Múltiplos Serviços
- Duração total = soma das durações
- Preço total = soma dos preços (ou preço customizado)
- Deve ter pelo menos um serviço válido
- Compatível com serviceId único

### Horários
- Funcionamento: 8h-22h
- Slots de 30 em 30 minutos
- Validação de dias da semana
- Cálculo de duração em minutos

### WhatsApp
- 200 mensagens automáticas gratuitas por mês
- R$ 0,30 por mensagem excedente
- Apenas mensagens automáticas contam para uso

## 📊 Estatísticas

- **Total de Testes**: 157
- **Categorias**: 14
- **Cobertura**: Regras de negócio críticas e edge cases

## 🚀 Como Executar

```bash
# Executar todos os testes de regras de negócio
npm test -- tests/business-rules

# Executar um arquivo específico
npm test -- tests/business-rules/permissions.test.ts
```

## 📝 Notas

- Estes testes são **unitários** e testam a lógica de negócio isoladamente
- Não dependem de componentes React ou hooks
- Focam em validar as regras de negócio críticas do sistema
- Podem ser executados rapidamente sem setup complexo
- Incluem **edge cases** e **casos extremos** para garantir robustez
