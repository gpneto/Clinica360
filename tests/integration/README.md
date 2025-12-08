# Testes de Integração

Este diretório contém testes de integração que validam fluxos completos do sistema, testando a interação entre diferentes partes da aplicação.

## 📋 Testes de Integração

### 1. Fluxo Completo de Agendamento (`appointment-flow.test.ts`)
Testa fluxos completos relacionados a agendamentos:

- ✅ **Criar Paciente → Criar Agendamento → Enviar Notificação**
  - Valida criação de paciente
  - Valida criação de agendamento
  - Valida que notificação pode ser enviada
  - Valida isolamento por companyId

- ✅ **Criar Agendamento → Concluir → Calcular Receita**
  - Valida conclusão de agendamento
  - Valida cálculo de receita
  - Valida cálculo de comissão
  - Valida repasse profissional
  - Valida exclusão quando cliente não compareceu
  - Valida uso de valorPagoCentavos

- ✅ **Criar Recorrência → Gerar Ocorrências → Cancelar Série**
  - Valida criação de série recorrente
  - Valida geração de ocorrências
  - Valida cancelamento de série completa

- ✅ **Criar Agendamento → Confirmar → Concluir**
  - Valida transições válidas de status
  - Valida que transições inválidas não são permitidas

- ✅ **Múltiplos Serviços → Calcular Duração Total → Criar Agendamento**
  - Valida cálculo de duração total
  - Valida cálculo de preço total
  - Valida criação com múltiplos serviços

- ✅ **Erro e Recuperação**
  - Valida tratamento de dados obrigatórios ausentes
  - Valida detecção de conflitos de horário

### 2. Fluxo Financeiro Completo (`financial-flow.test.ts`)
Testa fluxos completos relacionados a cálculos financeiros:

- ✅ **Múltiplos Agendamentos → Calcular Receita Total → Calcular Comissões**
  - Valida cálculo de receita total
  - Valida cálculo de comissão total
  - Valida cálculo de repasse total
  - Valida receita por profissional

- ✅ **Exclusão de Agendamentos Cancelados e No Show**
  - Valida que cancelados não contam para receita
  - Valida que no_show não conta para receita

- ✅ **Período → Filtrar Agendamentos → Calcular Receita do Período**
  - Valida filtro por período
  - Valida cálculo de receita do período

### 3. Fluxo de Notificações (`notification-flow.test.ts`)
Testa fluxos completos relacionados a notificações:

- ✅ **Criar Agendamento → Configurar Lembretes → Enviar Notificações**
  - Valida envio de lembrete 24h
  - Valida envio de lembrete 1h
  - Valida que bloqueios não recebem notificação
  - Valida marcação de lembretes como enviados

- ✅ **Agendamento Passado → Remover do Sistema de Notificações**
  - Valida que agendamentos passados são ignorados

### 4. Fluxo Multi-Tenant (`multi-tenant-flow.test.ts`)
Testa fluxos completos relacionados a isolamento multi-tenant:

- ✅ **Isolamento Completo entre Empresas**
  - Valida isolamento de dados entre empresas
  - Valida que companyId é obrigatório
  - Valida filtro de pacientes por companyId

- ✅ **Usuário com Múltiplos Contextos**
  - Valida acesso a múltiplas empresas
  - Valida permissões por contexto

### 5. Fluxo de Setup de Empresa (`company-setup-flow.test.ts`)
Testa fluxos completos relacionados a criação e configuração de empresas:

- ✅ **Criar Usuário → Criar Empresa → Configurar Empresa**
  - Valida criação de usuário
  - Valida criação de empresa
  - Valida adição de usuário como owner
  - Valida criação de configurações iniciais
  - Valida que owner tem acesso total

- ✅ **Configurar Empresa → Criar Profissionais → Criar Serviços**
  - Valida criação de profissional
  - Valida criação de serviço
  - Valida que tudo pertence à mesma empresa

- ✅ **Migração de Dados → Validação → Ativação**
  - Valida dados migrados
  - Valida referências entre entidades

### 6. Fluxo de Autenticação e Autorização (`authentication-flow.test.ts`)
Testa fluxos completos relacionados a autenticação:

- ✅ **Login → Verificar Contextos → Selecionar Contexto**
  - Valida autenticação de usuário
  - Valida múltiplos contextos
  - Valida seleção de contexto
  - Valida permissões por contexto

- ✅ **Redirecionamento → Verificação de Acesso → Carregamento**
  - Valida redirecionamento de não autenticados
  - Valida verificação de acesso antes de carregar página

- ✅ **Múltiplos Contextos → Troca de Contexto → Atualização de Dados**
  - Valida troca de contexto
  - Valida atualização de dados filtrados por companyId

### 7. Fluxo de Evolução de Paciente (`patient-evolution-flow.test.ts`)
Testa fluxos completos relacionados a evoluções de pacientes:

- ✅ **Criar Paciente → Agendar → Registrar Evolução**
  - Valida criação de paciente
  - Valida criação de agendamento
  - Valida registro de evolução
  - Valida vínculo entre evolução e agendamento
  - Valida isolamento por companyId

- ✅ **Múltiplas Evoluções → Histórico → Filtros**
  - Valida organização de histórico
  - Valida ordenação por data
  - Valida filtro por período

### 8. Fluxo de Débitos e Pagamentos (`debit-payment-flow.test.ts`)
Testa fluxos completos relacionados a débitos e pagamentos:

- ✅ **Criar Agendamento → Gerar Débito → Registrar Pagamento**
  - Valida geração de débito do agendamento
  - Valida registro de pagamento parcial
  - Valida completar pagamento
  - Valida cálculo de saldo devedor

- ✅ **Múltiplos Débitos → Calcular Total → Pagamento Total**
  - Valida cálculo de total devido
  - Valida cálculo de total pago
  - Valida filtro de débitos pendentes

- ✅ **Débito Vencido → Notificação → Pagamento**
  - Valida identificação de débitos vencidos

### 9. Fluxo de Relatórios e Exportação (`report-export-flow.test.ts`)
Testa fluxos completos relacionados a relatórios:

- ✅ **Selecionar Período → Calcular Dados → Gerar Relatório**
  - Valida geração de relatório financeiro
  - Valida relatório por profissional
  - Valida filtro por período

- ✅ **Exportar Dados → Formatar → Download**
  - Valida formatação para CSV
  - Valida formatação para Excel

- ✅ **Relatório de Serviços → Agrupar → Calcular Estatísticas**
  - Valida agrupamento por serviço
  - Valida cálculo de estatísticas

### 10. Fluxo de Mensagens WhatsApp (`whatsapp-message-flow.test.ts`)
Testa fluxos completos relacionados a mensagens WhatsApp:

- ✅ **Criar Agendamento → Enviar Confirmação → Verificar Limite**
  - Valida envio de confirmação automática
  - Valida verificação de limite mensal
  - Valida cálculo de custo de mensagens excedentes

- ✅ **Lembrete 24h → Lembrete 1h → Confirmação**
  - Valida envio de lembretes na ordem correta
  - Valida janelas de tempo para lembretes

- ✅ **Resposta do Cliente → Processar → Atualizar Status**
  - Valida processamento de confirmação
  - Valida processamento de cancelamento

- ✅ **Identificar Paciente → Buscar Agendamento → Responder**
  - Valida identificação de paciente pelo telefone
  - Valida busca de agendamento

### 11. Fluxo de Onboarding de Usuário (`user-onboarding-flow.test.ts`)
Testa fluxos completos relacionados ao onboarding:

- ✅ **Primeiro Acesso → Criar Conta → Criar Empresa → Configurar**
  - Valida criação de novo usuário
  - Valida criação de empresa
  - Valida configuração inicial
  - Valida que onboarding está completo

- ✅ **Usuário Existente → Adicionar Nova Empresa → Trocar Contexto**
  - Valida adição de nova empresa
  - Valida múltiplos contextos
  - Valida troca de contexto

- ✅ **Convite → Aceitar → Adicionar à Empresa**
  - Valida processamento de convite
  - Valida adição de usuário à empresa

### 12. Fluxo de Gerenciamento de Serviços (`service-management-flow.test.ts`)
Testa fluxos completos relacionados a serviços:

- ✅ **Criar Serviço → Associar a Profissional → Criar Agendamento**
  - Valida criação de serviço
  - Valida associação com profissional
  - Valida criação de agendamento usando serviço

- ✅ **Múltiplos Serviços → Calcular Total → Criar Agendamento**
  - Valida cálculo de duração total
  - Valida cálculo de preço total
  - Valida criação com múltiplos serviços

- ✅ **Desativar Serviço → Validar Agendamentos Futuros**
  - Valida que serviço desativado não pode ser usado
  - Valida que agendamentos existentes continuam válidos

### 13. Fluxo de Gerenciamento de Profissionais (`professional-management-flow.test.ts`)
Testa fluxos completos relacionados a profissionais:

- ✅ **Criar Profissional → Atribuir Serviços → Criar Agendamentos**
  - Valida criação de profissional
  - Valida criação de agendamentos
  - Valida cálculo de receita

- ✅ **Calcular Comissão → Calcular Repasse → Atualizar Saldo**
  - Valida cálculo de comissão total
  - Valida cálculo de repasse
  - Valida atualização de saldo

- ✅ **Desativar Profissional → Validar Agendamentos Futuros**
  - Valida que profissional desativado não pode receber novos agendamentos
  - Valida que agendamentos existentes continuam válidos

### 14. Fluxo de Gerenciamento de Recorrência (`recurrence-management-flow.test.ts`)
Testa fluxos completos relacionados a recorrência:

- ✅ **Criar Recorrência → Gerar Ocorrências → Gerenciar Série**
  - Valida criação de série recorrente
  - Valida geração de ocorrências
  - Valida cancelamento de série completa
  - Valida atualização de série

- ✅ **Recorrência Diária → Validar Limites → Gerar Ocorrências**
  - Valida limite de 1 ano para recorrência
  - Valida geração de ocorrências diárias

### 15. Fluxo de Analytics e Relatórios (`analytics-reporting-flow.test.ts`)
Testa fluxos completos relacionados a analytics:

- ✅ **Coletar Dados → Calcular Métricas → Gerar Dashboard**
  - Valida cálculo de métricas completas
  - Valida filtro por período
  - Valida cálculo de receita e comissão

- ✅ **Agrupar por Profissional → Calcular Estatísticas → Comparar**
  - Valida agrupamento por profissional
  - Valida cálculo de estatísticas comparativas

- ✅ **Analisar Tendências → Identificar Padrões → Prever**
  - Valida identificação de tendências
  - Valida análise de padrões semanais

## 🎯 Objetivos dos Testes de Integração

1. **Validar Fluxos Completos**: Testam a interação entre diferentes partes do sistema
2. **Detectar Problemas de Integração**: Identificam bugs que só aparecem quando componentes trabalham juntos
3. **Garantir Consistência**: Validam que as regras de negócio são aplicadas corretamente em fluxos reais
4. **Validar Isolamento**: Garantem que dados de diferentes empresas não se misturam
5. **Validar Autenticação**: Garantem que acesso e permissões funcionam corretamente
6. **Validar Comunicação**: Garantem que mensagens e notificações são enviadas corretamente
7. **Validar Onboarding**: Garantem que novos usuários podem configurar o sistema corretamente
8. **Validar Gerenciamento**: Garantem que serviços, profissionais e recorrências são gerenciados corretamente
9. **Validar Analytics**: Garantem que métricas e relatórios são calculados corretamente

## 📊 Estatísticas

- **Total de Testes**: 85+
- **Categorias**: 15
- **Cobertura**: Fluxos críticos do sistema

## 🚀 Como Executar

```bash
# Executar todos os testes de integração
npm test -- tests/integration

# Executar um arquivo específico
npm test -- tests/integration/appointment-flow.test.ts
```

## 📝 Notas

- Estes testes são **mais complexos** que testes unitários
- Testam **interação entre componentes** e **regras de negócio**
- Validam **fluxos completos** do usuário
- Podem ser mais lentos que testes unitários
- São essenciais para garantir que o sistema funciona como um todo

