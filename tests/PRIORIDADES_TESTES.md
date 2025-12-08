# 🎯 Prioridades de Testes - O Que Ainda Precisa Ser Implementado

## 📊 Análise Atual

### Status de Cobertura
- **Componentes**: 18/48 testados (37.5%)
- **Hooks**: 1/3 testados (33.3%)
- **Páginas**: 17/17 testadas (100%)
- **Regras de Negócio**: 13/13 testadas (100%)
- **Utilitários**: 13/13 testados (100%)
- **Integração**: 15 categorias testadas
- **Backend**: 15 categorias testadas

## 🔴 ALTA PRIORIDADE - Testes Críticos

### 1. Hooks do Firestore (`hooks/useFirestore.test.ts`)
**Por que é crítico**: Esses hooks são a camada de dados principal do sistema.

#### Hooks que precisam de testes:
- ✅ `useCustomerLabels` - JÁ TESTADO
- ❌ `useProfessionals` - **CRÍTICO**
  - Buscar profissionais
  - Criar profissional
  - Atualizar profissional
  - Deletar profissional
  - Estados de loading/error
  - Cache de dados

- ❌ `useServices` - **CRÍTICO**
  - Buscar serviços
  - Criar serviço
  - Atualizar serviço
  - Deletar serviço
  - Estados de loading/error
  - Cache de dados

- ❌ `usePatients` - **CRÍTICO**
  - Buscar pacientes
  - Criar paciente
  - Atualizar paciente
  - Deletar paciente
  - Busca e filtros
  - Estados de loading/error

- ❌ `useAppointments` - **CRÍTICO**
  - Buscar agendamentos
  - Criar agendamento
  - Atualizar agendamento
  - Deletar agendamento
  - Criar recorrência
  - Atualizar recorrência
  - Deletar recorrência
  - Filtros por profissional/cliente/período
  - Estados de loading/error

- ❌ `useCompany` - **CRÍTICO**
  - Buscar dados da empresa
  - Cache de dados
  - Estados de loading/error

- ❌ `useCompanySettings` - **CRÍTICO**
  - Buscar configurações
  - Cache de dados
  - Estados de loading/error

- ❌ `useCompanyInvoices` - **IMPORTANTE**
  - Buscar faturas
  - Filtros por período
  - Estados de loading/error

- ❌ `usePatientEvolutions` - **IMPORTANTE**
  - Buscar evoluções
  - Criar evolução
  - Atualizar evolução
  - Deletar evolução
  - Upload de imagens
  - Estados de loading/error

- ❌ `usePatientDebits` - **IMPORTANTE**
  - Buscar débitos
  - Criar débito
  - Registrar pagamento
  - Estados de loading/error

- ❌ `useDentalProcedures` - **IMPORTANTE**
  - Buscar procedimentos
  - Criar procedimento
  - Atualizar procedimento
  - Deletar procedimento
  - Gerar débito
  - Estados de loading/error

- ❌ `useOrcamentos` - **IMPORTANTE**
  - Buscar orçamentos
  - Criar orçamento
  - Atualizar orçamento
  - Deletar orçamento
  - Estados de loading/error

- ❌ `usePatient` - **IMPORTANTE**
  - Buscar dados do paciente
  - Atualizar paciente
  - Estados de loading/error

### 2. Hook de WhatsApp (`hooks/useWhatsappMessages.test.ts`)
**Por que é crítico**: Gerencia toda comunicação via WhatsApp.

- ❌ `useWhatsAppMessages` - **CRÍTICO**
  - Buscar mensagens
  - Paginação
  - Carregar mais mensagens
  - Cache de mensagens
  - Estados de loading/error
  - Filtros por contato

### 3. Componente ProfessionalCalendar (`components/ProfessionalCalendar.test.tsx`)
**Por que é crítico**: Componente mais complexo do sistema, usado na agenda principal.

- ❌ Visualizações (dia, semana, mês)
- ❌ Navegação entre datas
- ❌ Renderização de eventos
- ❌ Interações (click, drag, resize)
- ❌ Filtros por profissional
- ❌ Bloqueios e feriados
- ❌ Aniversários
- ❌ Responsividade

### 4. Componentes de Formulário
**Por que é crítico**: Usuários interagem constantemente com formulários.

- ❌ `DentalChart.tsx` - **CRÍTICO**
  - Renderização do gráfico
  - Seleção de dentes
  - Adicionar procedimentos
  - Cálculo de valores
  - Geração de PDF
  - Estados de loading

- ❌ `OrcamentoModal.tsx` - **IMPORTANTE**
  - Criar orçamento
  - Editar orçamento
  - Validação de dados
  - Cálculo de totais

- ❌ `DocumentModal.tsx` - **IMPORTANTE**
  - Visualização de documentos
  - Upload de documentos
  - Download de documentos

- ❌ `DocumentosTab.tsx` - **IMPORTANTE**
  - Lista de documentos
  - Filtros
  - Upload/Download

### 5. Funções de Permissões (`lib/permissions.test.ts`)
**Por que é crítico**: Controla acesso a funcionalidades.

- ❌ `hasFullAccess`
- ❌ `isProfessional`
- ❌ `isOtherRole`
- ❌ `canEditAppointments`
- ❌ `canViewAllAgendas`
- ❌ `canAccessPatientDebits`
- ❌ `canAccessOnlyOwnFinancials`
- ❌ `hasFullFinancialAccess`
- ❌ `canAccessProfessionalsMenu`
- ❌ `canAccessClientsMenu`
- ❌ `canAccessServicesMenu`
- ❌ `createDefaultPermissions`

### 6. Funções Utilitárias Adicionais (`lib/utils.test.ts`)
**Por que é importante**: Funções usadas em todo o sistema.

- ✅ Funções de cores - JÁ TESTADAS
- ❌ `getGradientColors` - **IMPORTANTE**
- ❌ `getGradientStyle` - **IMPORTANTE**
- ❌ `applyCustomColor` - **IMPORTANTE**
- ❌ `removeCustomColor` - **IMPORTANTE**
- ❌ `fetchHolidays` - **IMPORTANTE** (parcialmente testado)

## 🟡 MÉDIA PRIORIDADE - Testes Importantes

### 7. Componentes de UI Adicionais

- ❌ `CalendarEvent.tsx` - Renderização de eventos no calendário
- ❌ `ReturnSuggestions.tsx` - Sugestões de retorno
- ❌ `AIAssistantComponents.tsx` - Componentes do assistente IA
- ❌ `AIAssistantWelcomeModal.tsx` - Modal de boas-vindas
- ❌ `ModernCalendar.tsx` - Calendário moderno
- ❌ `DocumentPDFGenerator.tsx` - Geração de PDFs
- ❌ `IosPreventZoom.tsx` - Prevenção de zoom no iOS

### 8. Componentes de Tutorial

- ❌ `TutorialGuide.tsx` - Guia de tutorial
- ❌ `TutorialProvider.tsx` - Provider de tutorial

### 9. Funções do Backend Adicionais

- ❌ `processarNotificacoesAgendamentos` - Processamento completo
- ❌ Funções de sincronização de dados
- ❌ Funções de migração
- ❌ Funções de limpeza

## 🟢 BAIXA PRIORIDADE - Testes de Melhoria

### 10. Testes de Performance

- Testes de carga para funções críticas
- Testes de performance de queries Firestore
- Testes de otimização de cache
- Testes de paginação com grandes volumes

### 11. Testes de Segurança

- Validação de entrada (SQL injection, XSS)
- Testes de autenticação e autorização avançados
- Testes de isolamento de dados
- Testes de validação de tokens

### 12. Testes de Acessibilidade

- Navegação por teclado
- Screen readers
- Contraste de cores
- ARIA attributes

### 13. Testes de Responsividade

- Layout em diferentes tamanhos de tela
- Componentes móveis
- Breakpoints
- Touch events

### 14. Testes End-to-End (E2E)

- Fluxos completos do usuário
- Testes de integração com serviços externos reais
- Testes de performance em produção

## 📋 Resumo de Prioridades

### 🔴 Implementar Imediatamente (Alta Prioridade)
1. **Hooks do Firestore** - `useProfessionals`, `useServices`, `usePatients`, `useAppointments`
2. **Hook de WhatsApp** - `useWhatsAppMessages`
3. **ProfessionalCalendar** - Componente crítico
4. **Funções de Permissões** - Controle de acesso
5. **DentalChart** - Componente complexo

### 🟡 Implementar em Seguida (Média Prioridade)
6. Componentes de formulário adicionais
7. Funções utilitárias adicionais
8. Componentes de UI adicionais
9. Funções do backend adicionais

### 🟢 Implementar Depois (Baixa Prioridade)
10. Testes de performance
11. Testes de segurança avançados
12. Testes de acessibilidade
13. Testes de responsividade
14. Testes E2E

## 🎯 Recomendação

**Começar pelos testes de ALTA PRIORIDADE**, especialmente:
1. Hooks do Firestore (críticos para funcionamento)
2. ProfessionalCalendar (componente mais complexo)
3. Funções de permissões (segurança)

Esses testes terão o maior impacto na qualidade e confiabilidade do sistema.

