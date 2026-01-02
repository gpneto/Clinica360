# Perfis e Permissões - SmartDoctor

Este documento descreve as permissões e capacidades de cada tipo de perfil no sistema SmartDoctor.

## 📋 Índice

1. [Owner](#owner)
2. [Admin](#admin)
3. [Profissional (Pro)](#profissional-pro)
4. [Atendente](#atendente)
5. [Outro (Personalizado)](#outro-personalizado)

---

## 👑 Owner

**Acesso Total - Sem Restrições**

O perfil **Owner** tem acesso completo a todas as funcionalidades do sistema, sem nenhuma restrição.

### ✅ Permissões Completas

- **Agenda**
  - ✅ Editar agendamentos de todos os profissionais
  - ✅ Visualizar agendas de todos os profissionais
  - ✅ Acesso ao menu Agenda

- **Pacientes/Clientes**
  - ✅ Acesso completo aos dados dos pacientes
  - ✅ Acesso ao menu Pacientes/Clientes
  - ✅ Acesso à aba Débitos de Pacientes

- **Serviços**
  - ✅ Criar, editar e ativar/desativar serviços
  - ✅ Acesso ao menu Serviços

- **Profissionais**
  - ✅ Gerenciar profissionais
  - ✅ Acesso ao menu Profissionais

- **Financeiro**
  - ✅ Acesso completo ao Controle Financeiro
  - ✅ Visualizar valores financeiros no Dashboard
  - ✅ Acesso a relatórios financeiros
  - ✅ Acesso à aba Débitos de Pacientes

- **Mensagens**
  - ✅ Acesso ao menu Mensagens

- **Configurações**
  - ✅ Acesso a todas as configurações
  - ✅ Acesso ao menu Perfil

---

## 🛡️ Admin

**Acesso Total - Sem Restrições**

O perfil **Admin** tem as mesmas permissões do Owner, com acesso completo a todas as funcionalidades.

### ✅ Permissões Completas

- **Agenda**
  - ✅ Editar agendamentos de todos os profissionais
  - ✅ Visualizar agendas de todos os profissionais
  - ✅ Acesso ao menu Agenda

- **Pacientes/Clientes**
  - ✅ Acesso completo aos dados dos pacientes
  - ✅ Acesso ao menu Pacientes/Clientes
  - ✅ Acesso à aba Débitos de Pacientes

- **Serviços**
  - ✅ Criar, editar e ativar/desativar serviços
  - ✅ Acesso ao menu Serviços

- **Profissionais**
  - ✅ Gerenciar profissionais
  - ✅ Acesso ao menu Profissionais

- **Financeiro**
  - ✅ Acesso completo ao Controle Financeiro
  - ✅ Visualizar valores financeiros no Dashboard
  - ✅ Acesso a relatórios financeiros
  - ✅ Acesso à aba Débitos de Pacientes

- **Mensagens**
  - ✅ Acesso ao menu Mensagens

- **Configurações**
  - ✅ Acesso a todas as configurações
  - ✅ Acesso ao menu Perfil

---

## 👨‍⚕️ Profissional (Pro)

**Acesso Limitado - Foco na Própria Agenda**

O perfil **Profissional** tem acesso limitado, focado principalmente em sua própria agenda e pacientes.

### ✅ Permissões

- **Agenda**
  - ✅ Editar apenas seus próprios agendamentos
  - ❌ **NÃO** visualiza agendas de outros profissionais (vê apenas a própria)
  - ✅ Acesso ao menu Agenda

- **Pacientes/Clientes**
  - ✅ Acesso aos dados dos pacientes
  - ✅ Acesso ao menu Pacientes/Clientes

- **Serviços**
  - ✅ Visualizar serviços disponíveis
  - ✅ Acesso ao menu Serviços
  - ❌ **NÃO** pode criar, editar ou ativar/desativar serviços

- **Profissionais**
  - ❌ **NÃO** tem acesso ao menu Profissionais

- **Financeiro**
  - ❌ **NÃO** tem acesso ao Controle Financeiro
  - ❌ **NÃO** visualiza valores financeiros no Dashboard
  - ❌ **NÃO** tem acesso a relatórios financeiros
  - ❌ **NÃO** tem acesso à aba Débitos de Pacientes

- **Mensagens**
  - ✅ Acesso ao menu Mensagens

- **Configurações**
  - ✅ Acesso ao menu Perfil (para editar seu próprio perfil)

---

## 👨‍💼 Atendente

**Acesso Intermediário - Foco em Atendimento**

O perfil **Atendente** tem acesso intermediário, focado em atendimento ao cliente e gestão de agendamentos.

### ✅ Permissões

- **Agenda**
  - ✅ Editar agendamentos de todos os profissionais
  - ✅ Visualizar agendas de todos os profissionais
  - ✅ Acesso ao menu Agenda

- **Pacientes/Clientes**
  - ✅ Acesso completo aos dados dos pacientes
  - ✅ Acesso ao menu Pacientes/Clientes

- **Serviços**
  - ✅ Visualizar serviços disponíveis
  - ✅ Acesso ao menu Serviços
  - ❌ **NÃO** pode criar, editar ou ativar/desativar serviços

- **Profissionais**
  - ❌ **NÃO** tem acesso ao menu Profissionais

- **Financeiro**
  - ❌ **NÃO** tem acesso ao Controle Financeiro
  - ❌ **NÃO** visualiza valores financeiros no Dashboard
  - ❌ **NÃO** tem acesso a relatórios financeiros
  - ❌ **NÃO** tem acesso à aba Débitos de Pacientes

- **Mensagens**
  - ✅ Acesso ao menu Mensagens

- **Configurações**
  - ✅ Acesso ao menu Perfil (para editar seu próprio perfil)

---

## 🔧 Outro (Personalizado)

**Acesso Personalizado - Permissões Granulares**

O perfil **Outro** permite configuração granular de permissões. Por padrão, **nenhuma permissão está habilitada**. O administrador deve configurar explicitamente cada permissão desejada.

### ⚙️ Permissões Configuráveis

#### **Agenda**

- **Edição de Agendamentos** (`agendaEdicao`)
  - ✅ Se habilitado: Pode criar, editar e deletar agendamentos de todos os profissionais
  - ❌ Se desabilitado: Não pode editar agendamentos

- **Visualização de Agendas** (`agendaVisualizacao`)
  - ✅ Se habilitado: Pode visualizar agendas de todos os profissionais
  - ❌ Se desabilitado: Não pode visualizar agendas

- **Menu de Agenda** (`menuAgenda`)
  - ✅ Se habilitado: O menu "Agenda" aparece na sidebar
  - ❌ Se desabilitado: O menu "Agenda" não aparece

#### **Financeiro**

- **Acesso à Aba Débitos de Pacientes** (`financeiroDebitosPacientes`)
  - ✅ Se habilitado: Pode acessar a aba "Débitos" na página de detalhes do paciente
  - ❌ Se desabilitado: Não pode acessar a aba Débitos

- **Acesso Apenas aos Próprios Lançamentos** (`financeiroApenasProprios`)
  - ✅ Se habilitado: Pode ver apenas seus próprios lançamentos financeiros
  - ❌ Se desabilitado: Não tem acesso a lançamentos financeiros próprios

- **Acesso Completo ao Financeiro** (`financeiroAcessoCompleto`)
  - ✅ Se habilitado: 
    - Acesso completo ao Controle Financeiro
    - Visualiza valores financeiros no Dashboard
    - Acesso a relatórios financeiros
  - ❌ Se desabilitado: Não tem acesso financeiro

#### **Menus**

- **Menu de Profissionais** (`menuProfissionais`)
  - ✅ Se habilitado: O menu "Profissionais" aparece na sidebar
  - ❌ Se desabilitado: O menu "Profissionais" não aparece

- **Menu de Clientes** (`menuClientes`)
  - ✅ Se habilitado: O menu "Pacientes/Clientes" aparece na sidebar
  - ❌ Se desabilitado: O menu "Pacientes/Clientes" não aparece

- **Menu de Serviços** (`menuServicos`)
  - ✅ Se habilitado: O menu "Serviços" (em Configurações) aparece
  - ❌ Se desabilitado: O menu "Serviços" não aparece

- **Menu de Mensagens** (`menuMensagens`)
  - ✅ Se habilitado: O menu "Mensagens" aparece na sidebar
  - ❌ Se desabilitado: O menu "Mensagens" não aparece

### 📝 Exemplo de Configurações Comuns

#### **Recepcionista Completo**
```
✅ agendaEdicao
✅ agendaVisualizacao
✅ menuAgenda
✅ menuClientes
✅ menuServicos
✅ menuMensagens
❌ Todas as permissões financeiras
❌ menuProfissionais
```

#### **Auxiliar Financeiro**
```
❌ Todas as permissões de agenda
✅ financeiroAcessoCompleto
✅ menuClientes (para acessar pacientes)
❌ Outros menus
```

#### **Auxiliar de Atendimento**
```
✅ agendaEdicao
✅ agendaVisualizacao
✅ menuAgenda
✅ menuClientes
✅ menuMensagens
❌ Todas as permissões financeiras
❌ menuProfissionais
❌ menuServicos
```

---

## 🔐 Resumo Comparativo

| Funcionalidade | Owner | Admin | Pro | Atendente | Outro |
|---------------|:-----:|:-----:|:---:|:---------:|:-----:|
| **Editar Agendamentos (todos)** | ✅ | ✅ | ⚠️* | ✅ | ⚙️ |
| **Ver Agendas (todos)** | ✅ | ✅ | ❌ | ✅ | ⚙️ |
| **Menu Agenda** | ✅ | ✅ | ✅ | ✅ | ⚙️ |
| **Menu Pacientes** | ✅ | ✅ | ✅ | ✅ | ⚙️ |
| **Menu Serviços** | ✅ | ✅ | ✅ | ✅ | ⚙️ |
| **Menu Profissionais** | ✅ | ✅ | ❌ | ❌ | ⚙️ |
| **Menu Mensagens** | ✅ | ✅ | ✅ | ✅ | ⚙️ |
| **Acesso Financeiro Completo** | ✅ | ✅ | ❌ | ❌ | ⚙️ |
| **Ver Valores no Dashboard** | ✅ | ✅ | ❌ | ❌ | ⚙️ |
| **Aba Débitos de Pacientes** | ✅ | ✅ | ❌ | ❌ | ⚙️ |
| **Menu Perfil** | ✅ | ✅ | ✅ | ✅ | ✅ |

**Legenda:**
- ✅ = Sempre permitido
- ❌ = Sempre negado
- ⚠️* = Apenas próprios agendamentos
- ⚙️ = Configurável (padrão: negado)

---

## 📌 Observações Importantes

1. **Profissional (Pro)**: Pode editar apenas seus próprios agendamentos, mas a validação é feita na operação específica, não apenas na verificação de permissão.

2. **Outro (Personalizado)**: 
   - Por padrão, **todas as permissões estão desabilitadas**
   - O administrador deve configurar explicitamente cada permissão
   - As permissões são independentes entre si
   - É possível ter permissões parciais (ex: apenas visualizar agendas, mas não editar)

3. **Valores Financeiros no Dashboard**: 
   - Apenas Owner, Admin e usuários com `financeiroAcessoCompleto` podem ver
   - Os cards de receita são ocultados para outros usuários

4. **Menu Perfil**: 
   - Todos os perfis têm acesso ao menu "Configurações > Perfil"
   - Permite editar o próprio perfil

5. **Serviços**: 
   - Pro e Atendente podem visualizar e usar serviços
   - Apenas Owner e Admin podem criar, editar e ativar/desativar serviços
   - Outro pode ter acesso ao menu se `menuServicos` estiver habilitado

---

## 🔄 Atualizações

Este documento reflete as permissões implementadas em: `lib/permissions.ts`

Última atualização: Dezembro 2024










