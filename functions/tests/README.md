# Testes de Firebase Functions

Este diretório contém testes para as Firebase Cloud Functions do backend.

## 📋 Testes Implementados

### 1. WhatsApp Envio (`whatsapp-envio.test.ts`)
Testa funções utilitárias de WhatsApp:

- ✅ **normalizarTelefone**
  - Remove caracteres não numéricos
  - Retorna string vazia para null/undefined
  - Mantém apenas dígitos

- ✅ **normalizePhoneForContact**
  - Normaliza número brasileiro com 9º dígito
  - Adiciona 9º dígito se necessário
  - Retorna string vazia para null

- ✅ **generatePhoneVariants**
  - Gera variantes de telefone brasileiro
  - Inclui variante sem código do país
  - Retorna array vazio para número inválido

- ✅ **substituirParametros**
  - Substitui parâmetros no template
  - Mantém placeholders se parâmetros não fornecidos
  - Substitui apenas parâmetros fornecidos

- ✅ **templatesWhats**
  - Contém template de confirmação
  - Contém template de lembrete
  - Contém template de cancelamento

### 2. Appointment Functions (`appointment-functions.test.ts`)
Testa funções relacionadas a agendamentos:

- ✅ **createAppointment - Validações**
  - Valida autenticação do usuário
  - Valida dados obrigatórios
  - Detecta dados obrigatórios ausentes
  - Verifica conflitos de horário
  - Detecta quando não há conflito

- ✅ **callAltegioWebhook - Validações**
  - Valida autenticação do usuário
  - Valida que appointmentData é obrigatório
  - Valida que companyId é obrigatório
  - Valida dados obrigatórios do appointmentData
  - Detecta dados obrigatórios ausentes

### 3. Stripe Functions (`stripe-functions.test.ts`)
Testa funções relacionadas ao Stripe:

- ✅ **createStripeCheckoutSession - Validações**
  - Valida autenticação do usuário
  - Valida que companyId é obrigatório

- ✅ **createUsageBasedCheckout - Validações**
  - Valida autenticação do usuário
  - Valida que companyId é obrigatório
  - Calcula custo de mensagens excedentes
  - Retorna 0 quando não há mensagens excedentes

- ✅ **stripeWebhook - Validações**
  - Valida assinatura do webhook
  - Processa evento checkout.session.completed
  - Processa evento customer.subscription.updated
  - Processa evento invoice.payment_succeeded
  - Processa evento invoice.payment_failed

### 4. WhatsApp Functions (`whatsapp-functions.test.ts`)
Testa funções de WhatsApp:

- ✅ **sendManualWhatsappMessage - Validações**
  - Valida autenticação do usuário
  - Valida que companyId é obrigatório
  - Valida que telefone e mensagem são obrigatórios
  - Valida formato do telefone

- ✅ **startEvolutionSession - Validações**
  - Valida autenticação do usuário
  - Valida que companyId é obrigatório
  - Valida que whatsappIntegrationType é obrigatório
  - Valida que whatsappNumber é obrigatório
  - Valida formato do número de WhatsApp

- ✅ **checkEvolutionStatus - Validações**
  - Valida autenticação do usuário
  - Valida que companyId é obrigatório

### 5. Orçamento e Anamnese (`orcamento-anamnese.test.ts`)
Testa funções de orçamento e anamnese:

- ✅ **signOrcamento - Validações**
  - Valida autenticação do usuário
  - Valida que token é obrigatório
  - Valida que signature é obrigatória
  - Valida formato da assinatura (base64)

- ✅ **getOrcamentoByToken - Validações**
  - Valida que token é obrigatório

- ✅ **signAnamnese - Validações**
  - Valida autenticação do usuário
  - Valida que token é obrigatório
  - Valida que signature é obrigatória

- ✅ **getAnamneseByToken - Validações**
  - Valida que token é obrigatório

- ✅ **getSignatureImageBase64 - Validações**
  - Valida autenticação do usuário
  - Valida que orcamentoId é obrigatório
  - Valida que companyId é obrigatório

### 6. Birthday Functions (`birthday-functions.test.ts`)
Testa funções de aniversário:

- ✅ **generateBirthdayMessage - Validações**
  - Valida autenticação do usuário
  - Valida que companyId é obrigatório
  - Valida que patientId é obrigatório

- ✅ **checkBirthdayMessageSent - Validações**
  - Valida autenticação do usuário
  - Valida que companyId é obrigatório
  - Valida que patientId é obrigatório

- ✅ **sendBirthdayMessage - Validações**
  - Valida autenticação do usuário
  - Valida que companyId é obrigatório
  - Valida que patientId é obrigatório
  - Valida que aiMessage é obrigatória

### 7. User Claims (`user-claims.test.ts`)
Testa funções de custom claims:

- ✅ **setUserCustomClaimsOnLogin - Validações**
  - Valida autenticação do usuário

- ✅ **updateUserCustomClaimsForContext - Validações**
  - Valida autenticação do usuário
  - Valida que companyId é obrigatório
  - Valida que role é obrigatório

- ✅ **syncUserCustomClaims - Validações**
  - Valida autenticação do usuário

### 8. AI Assistant (`ai-assistant.test.ts`)
Testa função de assistente de IA:

- ✅ **aiAssistant - Validações**
  - Valida autenticação do usuário
  - Valida que companyId é obrigatório
  - Valida que message é obrigatória
  - Valida formato de IDs

### 9. Document Triggers (`document-triggers.test.ts`)
Testa funções acionadas por mudanças em documentos:

- ✅ **syncWhatsappPhoneNumbers - Validações**
  - Processa criação de paciente
  - Processa atualização de telefone
  - Processa exclusão de paciente

- ✅ **updateUserCustomClaims - Validações**
  - Processa criação de usuário da empresa
  - Processa atualização de role

### 10. Scheduler Functions (`scheduler-functions.test.ts`)
Testa funções agendadas:

- ✅ **sendReminders - Validações**
  - Processa lembretes de agendamentos
  - Ignora agendamentos que já receberam lembretes
  - Ignora agendamentos cancelados ou concluídos

### 11. Evolution Integration (`evolution-integration.test.ts`)
Testa integração com Evolution API:

- ✅ **startEvolutionPairing - Validações**
  - Valida formato do número de WhatsApp
  - Valida tipo de integração

- ✅ **getEvolutionInstanceStatus - Validações**
  - Valida estados de conexão
  - Atualiza status quando conexão muda

- ✅ **sendEvolutionTextMessage - Validações**
  - Valida que companyId é obrigatório
  - Valida formato do número de destino
  - Valida que mensagem não está vazia

### 12. Contact Sync (`contact-sync.test.ts`)
Testa sincronização de contatos:

- ✅ **syncWhatsAppContacts - Validações**
  - Valida autenticação do usuário
  - Valida que companyId é obrigatório
  - Processa sincronização de contatos

- ✅ **getWhatsAppContactsPhotos - Validações**
  - Valida autenticação do usuário
  - Valida que companyId é obrigatório
  - Processa busca de fotos de contatos

### 13. Webhook Processing (`webhook-processing.test.ts`)
Testa processamento de webhooks:

- ✅ **handleWebhookAgendamento - Validações**
  - Valida estrutura do webhook
  - Processa webhook de criação
  - Processa webhook de atualização
  - Processa webhook de exclusão
  - Valida formato de telefone
  - Valida formato de datetime

- ✅ **processEvolutionWebhook - Validações**
  - Processa mensagem de texto recebida
  - Processa mensagem de mídia recebida
  - Identifica palavras-chave de confirmação
  - Identifica palavras-chave de cancelamento

### 14. Error Handling (`error-handling.test.ts`)
Testa tratamento de erros:

- ✅ **Tratamento de Erros de Autenticação**
  - Lança erro quando usuário não está autenticado
  - Lança erro quando dados obrigatórios estão ausentes

- ✅ **Tratamento de Erros de Validação**
  - Valida formato de telefone inválido
  - Valida formato de email inválido
  - Valida datas inválidas

- ✅ **Tratamento de Erros de Negócio**
  - Detecta conflito de horário
  - Detecta quando recurso não existe

- ✅ **Tratamento de Erros de Permissão**
  - Valida permissões insuficientes

- ✅ **Tratamento de Erros Internos**
  - Trata erros inesperados

### 15. Data Validation (`data-validation.test.ts`)
Testa validação de dados:

- ✅ **Validação de IDs**
  - Valida formato de ID válido

- ✅ **Validação de Datas**
  - Valida que data de início é anterior à data de fim
  - Rejeita quando data de fim é anterior à data de início
  - Valida que data não está no passado

- ✅ **Validação de Valores Financeiros**
  - Valida que preço é positivo
  - Rejeita preço negativo
  - Valida que comissão está entre 0 e 100
  - Rejeita comissão fora do range

- ✅ **Validação de Strings**
  - Valida que nome não está vazio
  - Rejeita nome vazio
  - Valida formato de email
  - Rejeita email inválido

- ✅ **Validação de Arrays**
  - Valida que array não está vazio quando necessário
  - Rejeita array vazio quando necessário

## 🎯 Objetivos dos Testes

1. **Validar Autenticação**: Garantir que todas as functions exigem autenticação
2. **Validar Parâmetros**: Verificar que parâmetros obrigatórios são validados
3. **Validar Regras de Negócio**: Testar lógica de validação e cálculos
4. **Validar Tratamento de Erros**: Garantir que erros são tratados corretamente
5. **Validar Triggers**: Garantir que document triggers funcionam corretamente
6. **Validar Schedulers**: Garantir que funções agendadas funcionam corretamente
7. **Validar Integrações**: Garantir que integrações externas são validadas
8. **Validar Validação de Dados**: Garantir que dados são validados corretamente

## 📊 Estatísticas

- **Total de Testes**: ~150+
- **Categorias**: 15
- **Cobertura**: Funções principais do backend

## 🚀 Como Executar

```bash
# Executar todos os testes das functions
cd functions
npm test

# Executar em modo watch
npm run test:watch

# Executar com UI
npm run test:ui
```

## 📝 Notas

- Estes testes focam em **validações e lógica de negócio**
- Mocks são usados para isolar as functions
- Testes não fazem chamadas reais ao Firebase ou APIs externas
- Foco em garantir que validações e regras de negócio funcionam corretamente

