# 📋 Sugestão de Novos Testes

## 🎯 Tipos de Testes que Podem Ser Criados

### 1. ✅ Testes de Utilitários (`utils.test.ts`)
**O que testar:**
- Funções de formatação de cores (hexToHsl, hexToRgb, rgbToHex)
- Funções de gradiente (generateGradientColors, generateGradientColorsWithTwoColors)
- Funções de paleta de cores (generateColorPalette)
- Funções de ajuste de cor (adjustHue, adjustSaturation, adjustLightness)
- Função `cn` (merge de classes)
- Funções de feriados (fetchHolidays, getDefaultNationalHolidays)

**Por que é importante:**
- Essas funções são usadas em todo o sistema
- Erros aqui afetam a aparência visual
- Validação de cores é crítica para temas customizados

### 2. ✅ Testes de Hooks Customizados (`hooks.test.ts`)
**O que testar:**
- `useCustomerLabels` - retorno correto de labels
- `useFirestore` hooks (useProfessionals, useServices, usePatients, etc.)
- Normalização de dados
- Estados de loading e error
- Cache de dados

**Por que é importante:**
- Hooks são a camada de dados do sistema
- Erros aqui afetam toda a aplicação
- Validação de transformação de dados

### 3. ✅ Testes de Transformação de Dados (`data-transformation.test.ts`)
**O que testar:**
- Normalização de telefone (normalizarTelefone, generatePhoneVariants)
- Normalização de datas (normalizeToLocalDate)
- Conversão de Timestamp para Date
- Transformação de Appointment (toAppointment)
- Transformação de Patient, Professional, Service

**Por que é importante:**
- Dados vêm do Firestore em formatos diferentes
- Normalização garante consistência
- Erros aqui causam bugs difíceis de rastrear

### 4. ✅ Testes de Filtros e Busca (`filters-search.test.ts`)
**O que testar:**
- Busca de pacientes por nome, telefone, email
- Filtros de agendamentos (por profissional, status, período)
- Filtros de serviços
- Busca case-insensitive
- Busca parcial (contains)

**Por que é importante:**
- Funcionalidade crítica para UX
- Performance de buscas
- Validação de resultados

### 5. ✅ Testes de Ordenação (`sorting.test.ts`)
**O que testar:**
- Ordenação de agendamentos por data
- Ordenação de pacientes por nome
- Ordenação de profissionais
- Ordenação ascendente/descendente
- Ordenação múltipla (data + hora)

**Por que é importante:**
- Dados devem aparecer na ordem correta
- Performance de ordenação
- Validação de critérios

### 6. ✅ Testes de Timezone (`timezone.test.ts`)
**O que testar:**
- Conversão de UTC para America/Sao_Paulo
- Normalização de datas para timezone local
- Cálculo de diferença de horário
- Validação de DST (horário de verão)
- Formatação de data/hora com timezone

**Por que é importante:**
- Sistema usa timezone específico (America/Sao_Paulo)
- Erros de timezone causam agendamentos no horário errado
- Crítico para agendamentos

### 7. ✅ Testes de Templates de Mensagens (`message-templates.test.ts`)
**O que testar:**
- Substituição de parâmetros em templates
- Templates de confirmação
- Templates de lembrete
- Templates de cancelamento
- Validação de parâmetros obrigatórios

**Por que é importante:**
- Mensagens são enviadas automaticamente
- Erros aqui afetam comunicação com clientes
- Validação de conteúdo

### 8. ✅ Testes de Variantes de Telefone (`phone-variants.test.ts`)
**O que testar:**
- Geração de variantes de telefone
- Normalização de formatos diferentes
- Busca de paciente por telefone
- Validação de formato E.164
- Tratamento de 9º dígito

**Por que é importante:**
- Telefones podem vir em formatos diferentes
- Busca precisa encontrar mesmo com variações
- Crítico para identificação de pacientes

### 9. ✅ Testes de Cache (`cache.test.ts`)
**O que testar:**
- Armazenamento e recuperação de cache
- Expiração de cache (TTL)
- Invalidação de cache
- Cache por companyId
- Performance de cache

**Por que é importante:**
- Cache melhora performance
- Dados desatualizados causam bugs
- Validação de consistência

### 10. ✅ Testes de Integração (`integration.test.ts`)
**O que testar:**
- Fluxo completo: criar agendamento → enviar notificação → confirmar
- Fluxo: criar paciente → criar agendamento → concluir → calcular receita
- Fluxo: criar recorrência → gerar ocorrências → cancelar série
- Integração entre componentes
- Fluxos de erro e recuperação

**Por que é importante:**
- Testa interação entre partes do sistema
- Valida fluxos completos do usuário
- Detecta problemas de integração

### 11. ✅ Testes de Performance (`performance.test.ts`)
**O que testar:**
- Tempo de renderização de listas grandes
- Performance de cálculos financeiros
- Performance de filtros e buscas
- Performance de ordenação
- Uso de memória

**Por que é importante:**
- Sistema precisa ser rápido
- Valida otimizações
- Detecta problemas de performance

### 12. ✅ Testes de Acessibilidade (`accessibility.test.ts`)
**O que testar:**
- Navegação por teclado
- Screen readers
- Contraste de cores
- Labels de formulários
- ARIA attributes

**Por que é importante:**
- Inclusão e acessibilidade
- Conformidade com WCAG
- Melhor UX para todos

### 13. ✅ Testes de Formatação (`formatting.test.ts`)
**O que testar:**
- Formatação de moeda (formatCurrency)
- Formatação de duração (formatDuration)
- Formatação de data/hora
- Formatação de telefone para exibição
- Formatação de CPF/CNPJ

**Por que é importante:**
- Dados devem ser exibidos corretamente
- Consistência visual
- Validação de formatos

### 14. ✅ Testes de Validação de Formulários (`form-validation.test.ts`)
**O que testar:**
- Validação de campos obrigatórios
- Validação de formatos (email, telefone, CPF)
- Validação de ranges (preço, percentual, duração)
- Validação de datas
- Mensagens de erro

**Por que é importante:**
- Previne dados inválidos
- Melhora UX com feedback claro
- Validação client-side

### 15. ✅ Testes de LocalStorage/SessionStorage (`storage.test.ts`)
**O que testar:**
- Salvar/carregar preferências
- Salvar/carregar view de calendário
- Persistência de filtros
- Limpeza de storage
- Tratamento de storage cheio

**Por que é importante:**
- Preferências do usuário
- Estado da aplicação
- Validação de persistência

### 16. ✅ Testes de Feriados (`holidays.test.ts`)
**O que testar:**
- Busca de feriados nacionais
- Busca de feriados estaduais
- Formatação de datas de feriados
- Validação de feriados conhecidos
- Tratamento de erros de API

**Por que é importante:**
- Feriados aparecem no calendário
- Validação de datas especiais
- Integração com API externa

### 17. ✅ Testes de Erro Handling (`error-handling.test.ts`)
**O que testar:**
- Tratamento de erros de rede
- Tratamento de erros do Firebase
- Mensagens de erro amigáveis
- Fallbacks quando serviços falham
- Logging de erros

**Por que é importante:**
- Sistema deve ser resiliente
- UX mesmo em caso de erros
- Debugging facilitado

### 18. ✅ Testes de Paginação (`pagination.test.ts`)
**O que testar:**
- Navegação entre páginas
- Cálculo de total de páginas
- Limite de itens por página
- Validação de página atual
- Performance com muitos dados

**Por que é importante:**
- Listas grandes precisam paginação
- Performance
- UX de navegação

### 19. ✅ Testes de Exportação (`export.test.ts`)
**O que testar:**
- Exportação para CSV
- Exportação para Excel
- Formatação de dados exportados
- Validação de encoding
- Tratamento de caracteres especiais

**Por que é importante:**
- Relatórios exportados
- Compatibilidade com Excel
- Validação de dados

### 20. ✅ Testes de Responsividade (`responsiveness.test.ts`)
**O que testar:**
- Layout em diferentes tamanhos de tela
- Componentes mobile vs desktop
- Breakpoints
- Navegação mobile
- Touch events

**Por que é importante:**
- Sistema é usado em mobile
- UX em diferentes dispositivos
- Validação de design responsivo

## 📊 Prioridade de Implementação

### 🔴 Alta Prioridade
1. **Testes de Utilitários** - Funções críticas usadas em todo o sistema
2. **Testes de Hooks Customizados** - Camada de dados crítica
3. **Testes de Transformação de Dados** - Normalização é essencial
4. **Testes de Timezone** - Crítico para agendamentos
5. **Testes de Variantes de Telefone** - Busca de pacientes

### 🟡 Média Prioridade
6. **Testes de Filtros e Busca** - UX importante
7. **Testes de Templates de Mensagens** - Comunicação com clientes
8. **Testes de Cache** - Performance
9. **Testes de Formatação** - Consistência visual
10. **Testes de Validação de Formulários** - Prevenção de erros

### 🟢 Baixa Prioridade
11. **Testes de Integração** - Complexos, mas importantes
12. **Testes de Performance** - Otimização
13. **Testes de Acessibilidade** - Inclusão
14. **Testes de Feriados** - Funcionalidade específica
15. **Testes de Exportação** - Funcionalidade secundária

## 🎯 Recomendações

1. **Começar pelos testes de alta prioridade** - Maior impacto
2. **Focar em funções puras primeiro** - Mais fáceis de testar
3. **Adicionar testes de integração gradualmente** - Mais complexos
4. **Incluir testes de performance** - Otimização contínua
5. **Manter cobertura acima de 90%** - Qualidade do código

