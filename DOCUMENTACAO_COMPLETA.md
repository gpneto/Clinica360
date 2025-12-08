# Documentação Completa do Sistema SmartDoctor

## Índice

1. [Visão Geral](#visão-geral)
2. [Funcionalidades Principais](#funcionalidades-principais)
3. [Guia de Uso Detalhado](#guia-de-uso-detalhado)
4. [Papéis e Permissões](#papéis-e-permissões)
5. [Configuração Inicial](#configuração-inicial)
6. [Integrações](#integrações)
7. [Dicas e Boas Práticas](#dicas-e-boas-práticas)

---

## Visão Geral

O **SmartDoctor** é um sistema completo de gestão para clínicas, consultórios e estabelecimentos de saúde. Desenvolvido com tecnologias modernas (Next.js 15, React 19, TypeScript, Firebase), oferece uma solução robusta para gerenciamento de agendamentos, pacientes, finanças e comunicação.

### Características Principais

- ✅ **Agendamento Inteligente**: Sistema de agenda completo com múltiplas visualizações
- ✅ **Gestão Multi-Profissional**: Controle de múltiplos profissionais com agendas individuais
- ✅ **Prontuário Eletrônico**: Anamneses, evoluções e histórico completo
- ✅ **Gestão Financeira**: Controle de receitas, comissões e repasses
- ✅ **Comunicação Automática**: WhatsApp, SMS e E-mail automáticos
- ✅ **Assistente IA**: Inteligência artificial para auxiliar nas tarefas
- ✅ **Relatórios Completos**: Análises financeiras e estatísticas detalhadas
- ✅ **Mobile-First**: Interface responsiva que funciona perfeitamente no celular
- ✅ **Multi-Empresa**: Suporte para múltiplas empresas com temas personalizados

---

## Funcionalidades Principais

### 1. Dashboard (Página Inicial)

A página inicial oferece uma visão geral do dia com:

- **Agendamentos do Dia**: Lista todos os agendamentos do dia atual organizados por horário
- **Estatísticas**: Total de agendamentos, concluídos, pendentes e receita do dia
- **Aniversariantes**: Lista de pacientes que fazem aniversário no dia
- **Estatísticas Gerais**: Receita dos últimos 30 dias, total de atendimentos e pacientes

**Como acessar**: Clique em "Inicial" no menu lateral

**Dicas**:
- Use o botão de olho para mostrar/ocultar valores monetários
- Clique em um agendamento para ver detalhes completos
- Acesse a agenda completa clicando em "Ver todos"

---

### 2. Agenda

Sistema completo de agendamento com múltiplas funcionalidades.

#### Visualizações

- **Dia**: Visualização detalhada de um único dia
- **Semana**: Visualização semanal com todos os profissionais
- **Mês**: Visão mensal do calendário
- **Lista**: Lista de agendamentos do dia atual

**Como usar**:
1. Use os botões "Dia", "Semana" ou "Mês" no topo da agenda
2. Navegue entre períodos usando as setas ou clicando diretamente nas datas
3. Alterne entre visualização em grade (calendário) ou lista

#### Criar Agendamento

1. Clique no botão "Novo agendamento" ou clique diretamente em um horário no calendário
2. Selecione o profissional responsável
3. Escolha o paciente (ou crie um novo)
4. Selecione um ou múltiplos serviços
5. Defina data, horário e duração
6. Configure preço e comissão (se aplicável)
7. Adicione observações se necessário
8. Marque se deseja enviar notificação ao paciente
9. Clique em "Salvar"

**Dicas**:
- O sistema valida automaticamente conflitos de horário
- Você pode criar agendamentos recorrentes usando a opção de recorrência
- Aniversários de pacientes aparecem automaticamente no calendário

#### Editar Agendamento

1. Clique em um agendamento no calendário
2. Faça as alterações necessárias
3. Escolha se deseja enviar notificação sobre a mudança
4. Salve as alterações

#### Bloquear Horários

Para bloquear horários (férias, eventos, indisponibilidade):

1. Crie um novo agendamento
2. Marque como "Bloqueio de agenda"
3. Escolha se o bloqueio é para um profissional específico ou todos
4. Defina data, horário e descrição
5. Salve o bloqueio

**Dicas**:
- Bloqueios aparecem em roxo no calendário
- Use bloqueios para marcar feriados ou eventos especiais

#### Filtros Avançados

1. Clique no botão de filtros (ícone de funil)
2. Selecione profissionais, serviços, pacientes ou status
3. Defina intervalo de datas
4. Configure faixa de preço
5. Aplique os filtros

**Dicas**:
- Você pode combinar múltiplos filtros
- Use "Limpar filtros" para resetar

#### Status de Agendamentos

- **Agendado**: Agendamento criado, aguardando confirmação
- **Confirmado**: Paciente confirmou presença
- **Concluído**: Atendimento realizado com sucesso
- **Cancelado**: Agendamento cancelado
- **Não Compareceu**: Paciente faltou ao atendimento

**Dicas**:
- Ao concluir um agendamento, informe valor pago e forma de pagamento
- Marque se o cliente compareceu ou não

#### Agendamentos Recorrentes

1. Ao criar um agendamento, ative a opção de recorrência
2. Escolha a frequência: diária, semanal, quinzenal ou mensal
3. Defina data de término da recorrência
4. Salve o agendamento

**Dicas**:
- Você pode editar ou cancelar toda a série de agendamentos
- Cada agendamento da série pode ser modificado individualmente

---

### 3. Pacientes

Gestão completa da base de pacientes com histórico e documentos.

#### Cadastrar Paciente

1. Clique em "Pacientes" no menu lateral
2. Clique no botão "Novo Paciente"
3. Preencha nome completo (obrigatório)
4. Informe telefone (obrigatório)
5. Adicione e-mail (opcional)
6. Informe CPF (opcional)
7. Defina data de nascimento (opcional - aparece no calendário como aniversário)
8. Escolha preferência de notificação: WhatsApp, SMS ou E-mail
9. Adicione anamnese inicial se necessário
10. Salve o paciente

**Dicas**:
- O telefone deve estar no formato E.164 (ex: +5511999999999)
- A data de nascimento faz o aniversário aparecer automaticamente no calendário
- A preferência de notificação é usada para envio automático de lembretes

#### Buscar Paciente

1. Use a barra de busca no topo da lista de pacientes
2. Digite nome, telefone ou e-mail
3. Os resultados são filtrados em tempo real

#### Ficha Completa do Paciente

A ficha do paciente contém várias abas:

**Dados do Paciente**
- Informações pessoais e de contato
- Edição de dados cadastrais

**Anamnese**
- Visualize anamneses existentes
- Crie novas anamneses usando modelos pré-configurados
- Edite ou exclua anamneses
- Assine anamneses digitalmente

**Evoluções**
- Adicione novas evoluções com data e descrição
- Visualize histórico completo de evoluções
- Edite ou exclua evoluções

**Consultas**
- Veja todas as consultas do paciente
- Acesse detalhes de cada consulta
- Visualize status e valores

**Orçamentos**
- Crie novos orçamentos
- Adicione procedimentos e valores
- Envie orçamento por WhatsApp ou e-mail
- Gere link compartilhável
- Assine orçamentos digitalmente

**Financeiro**
- Visualize débitos pendentes
- Registre novos débitos
- Registre pagamentos
- Acompanhe histórico financeiro

**Documentos**
- Faça upload de documentos
- Organize por categorias
- Visualize e baixe documentos
- Exclua documentos quando necessário

**Interações**
- Veja todas as mensagens enviadas
- Acompanhe interações via WhatsApp
- Visualize histórico de comunicações

---

### 4. Mensagens

Central de mensagens WhatsApp com histórico completo.

#### Visualizar Conversas

1. Clique em "Mensagens" no menu lateral
2. Veja lista de contatos com mensagens
3. Clique em um contato para ver a conversa

**Dicas**:
- As conversas são sincronizadas automaticamente
- Mensagens automáticas são marcadas com ícone de bot

#### Enviar Mensagem

1. Selecione um contato
2. Digite sua mensagem no campo inferior
3. Pressione Enter ou clique no botão de enviar

**Dicas**:
- Você pode enviar texto, imagens, vídeos e documentos
- Mensagens enviadas manualmente são marcadas como "Manual"

#### Sincronizar Contatos

1. Clique no botão "Sincronizar" no topo da lista
2. Aguarde a sincronização completar
3. Fotos e nomes serão atualizados

#### Filtrar Mensagens Automáticas

1. Marque a opção "Apenas mensagens automáticas"
2. A lista será filtrada automaticamente

---

### 5. Assistente IA

Assistente inteligente para ajudar com tarefas do sistema.

#### Usar Assistente IA

1. Clique no botão flutuante do assistente (ícone de estrelas)
2. Digite sua pergunta ou solicitação
3. O assistente responderá e pode executar ações

**Dicas**:
- Você pode pedir para criar agendamentos
- Pergunte sobre pacientes, serviços ou profissionais
- Peça estatísticas e relatórios
- O assistente está disponível em todas as páginas

#### Exemplos de Uso

- "Criar agendamento para João Silva amanhã às 14h"
- "Quantos pacientes temos cadastrados?"
- "Mostrar agendamentos de hoje"
- "Qual a receita do mês?"

---

### 6. Relatórios Financeiros

Relatórios detalhados de receita, comissões e repasses.

#### Relatórios por Período

1. Clique em "Relatórios" no menu lateral
2. Escolha entre "Semanal" ou "Mensal"
3. Selecione a semana ou mês desejado
4. Visualize os dados

**Acesso**: Owner e Admin

#### Relatório por Profissionais

1. Selecione "Profissionais" no tipo de relatório
2. Visualize atendimentos, valor bruto, comissão e repasse
3. Veja totais consolidados

#### Relatório por Pacientes

1. Selecione "Pacientes" no tipo de relatório
2. Veja total de atendimentos e valor pago por paciente
3. Identifique últimos atendimentos

#### Relatório por Serviços

1. Selecione "Serviços" no tipo de relatório
2. Veja quantidade de atendimentos por serviço
3. Acompanhe valor total e médio por atendimento

#### Previsão Mensal

1. Ative a opção "Previsão mensal"
2. Visualize valores realizados e previstos
3. Acompanhe comissões e repasses estimados

**Dicas**:
- A previsão considera agendamentos com status agendado, confirmado ou pendente
- Valores realizados são de atendimentos concluídos

#### Exportar Relatórios

1. Configure o período e tipo de relatório desejado
2. Clique no botão "Exportar CSV"
3. O arquivo será baixado automaticamente

---

### 7. Configurações

Configure o sistema conforme suas necessidades.

#### Informações da Empresa

1. Acesse "Configurações" > "Geral"
2. Preencha nome, telefone, e-mail e endereço
3. Selecione tipo de estabelecimento
4. Escolha como chamar clientes (Pacientes ou Clientes)
5. Faça upload do logo da empresa
6. Salve as alterações

**Acesso**: Owner e Admin

#### Horário de Funcionamento

1. Configure horário de abertura e fechamento
2. Selecione os dias da semana em que atende
3. Salve as configurações

#### Configurações Financeiras

1. Configure comissão padrão (%)
2. Defina taxa de cancelamento (%)
3. Configure dias de antecedência para cancelamento
4. Ative/desative exibição de informações de comissão

#### Notificações Automáticas

1. Ative/desative lembrete 24h antes
2. Ative/desative lembrete 1h antes
3. Configure confirmação automática ao criar agendamento

#### Integração WhatsApp

1. Escolha o provedor: Meta (API oficial) ou Evolution API
2. Para Evolution API, escaneie o QR Code
3. Aguarde conexão ser estabelecida
4. Monitore status da conexão

**Dicas**:
- Evolution API permite usar seu próprio número WhatsApp
- As primeiras 200 mensagens do mês são gratuitas
- Mensagens excedentes têm custo adicional

#### Profissionais

1. Acesse "Configurações" > "Profissionais"
2. Adicione novos profissionais
3. Configure apelido, cor e horários de atendimento
4. Ative/desative profissionais

**Acesso**: Owner, Admin e Recepcionista (com permissão)

#### Serviços

1. Acesse "Configurações" > "Serviços"
2. Crie novos serviços
3. Configure nome, duração, preço e comissão
4. Ative/desative serviços

**Acesso**: Owner, Admin e Recepcionista (com permissão)

#### Usuários

1. Acesse "Configurações" > "Usuários"
2. Veja lista de usuários
3. Configure permissões granulares
4. Ative/desative usuários

**Acesso**: Owner e Admin

#### Modelos de Anamnese

1. Acesse "Configurações" > "Modelos de anamnese"
2. Crie novos modelos
3. Edite modelos existentes
4. Use modelos ao criar anamneses para pacientes

**Acesso**: Owner e Admin

#### Plano e Assinatura

1. Acesse "Configurações" > "Plano"
2. Veja informações do plano atual
3. Gerencie renovação e pagamento

**Acesso**: Owner e Admin

---

## Papéis e Permissões

### Owner (Proprietário)
- Acesso total ao sistema
- Gerencia configurações, finanças, usuários, serviços, relatórios
- Acesso a billing do provedor

### Admin (Administrador)
- Acesso total, exceto billing do provedor
- Gerencia configurações, finanças, usuários, serviços, relatórios

### Pro (Profissional)
- Acesso apenas à própria agenda
- Cadastro de pacientes próprios
- Vê apenas seus números
- Sem acesso às agendas de owner e admin

### Atendente
- Pode criar agendamentos para qualquer profissional
- Acesso a pacientes
- Sem acesso a relatórios financeiros

### Recepcionista (Outro)
- Permissões granulares configuráveis
- Pode ter acesso a agenda, pacientes, profissionais e serviços conforme permissões
- Sem acesso a relatórios financeiros (exceto com permissão específica)

### Super Admin
- Acesso a todas as empresas do sistema
- Gerenciamento de empresas

---

## Configuração Inicial

### 1. Primeiro Acesso

1. Faça login com sua conta Google
2. Selecione ou crie uma empresa
3. Complete o setup inicial

### 2. Configuração Básica

1. Configure informações da empresa
2. Adicione profissionais
3. Cadastre serviços
4. Configure horário de funcionamento
5. Configure integração WhatsApp (se necessário)

### 3. Importar Dados

- Cadastre pacientes manualmente ou importe de planilha
- Configure modelos de anamnese
- Defina comissões padrão

---

## Integrações

### WhatsApp

O sistema suporta dois provedores:

1. **Meta (API Oficial)**: API oficial do WhatsApp Business
2. **Evolution API**: Permite usar seu próprio número WhatsApp

**Configuração**:
- Acesse Configurações > Notificações
- Escolha o provedor
- Para Evolution API, escaneie o QR Code
- Monitore status da conexão

**Limites**:
- 200 mensagens gratuitas por mês
- Mensagens excedentes: R$ 0,30 por mensagem

### SMS e E-mail

- Configuração via variáveis de ambiente
- Suporte a Twilio (SMS) e Resend (E-mail)

---

## Dicas e Boas Práticas

### Agendamentos

1. **Sempre confirme agendamentos**: Use a função de confirmação para reduzir faltas
2. **Use bloqueios**: Marque feriados e eventos especiais como bloqueios
3. **Aproveite recorrências**: Para pacientes frequentes, use agendamentos recorrentes
4. **Valide conflitos**: O sistema valida automaticamente, mas sempre verifique

### Pacientes

1. **Complete os dados**: Quanto mais informações, melhor o atendimento
2. **Use anamneses**: Registre histórico clínico completo
3. **Organize documentos**: Use categorias para organizar documentos
4. **Acompanhe financeiro**: Mantenha débitos e pagamentos atualizados

### Finanças

1. **Revise relatórios regularmente**: Acompanhe receita semanalmente
2. **Use previsão mensal**: Planeje com base em agendamentos futuros
3. **Exporte relatórios**: Faça backup dos relatórios importantes
4. **Configure comissões**: Defina comissões padrão para facilitar

### Comunicação

1. **Configure preferências**: Defina preferência de notificação por paciente
2. **Use mensagens automáticas**: Configure lembretes automáticos
3. **Monitore uso**: Acompanhe consumo de mensagens
4. **Sincronize contatos**: Mantenha lista de contatos atualizada

### Sistema

1. **Use o Assistente IA**: Aproveite a IA para agilizar tarefas
2. **Configure permissões**: Defina permissões granulares para cada usuário
3. **Personalize**: Configure logo, cores e rótulos
4. **Faça backup**: Exporte dados importantes regularmente

---

## Suporte

Para suporte e dúvidas:

1. **Central de Ajuda**: Clique no botão de ajuda (ícone de interrogação) em qualquer página
2. **Tutorial Interativo**: Acesse Configurações > Tutorial
3. **Documentação**: Consulte este documento completo

---

## Atualizações e Novidades

O sistema é atualizado regularmente com novas funcionalidades e melhorias. Fique atento às notificações de atualização.

---

**Última atualização**: Dezembro 2024

**Versão do Sistema**: 1.0.0

