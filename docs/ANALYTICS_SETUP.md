# Configuração de Métricas de Acessos (Analytics)

Este documento descreve como configurar e usar o sistema de métricas de acessos implementado no SmartDoctor.

## Visão Geral

O sistema de analytics implementado inclui:
- **Google Analytics 4 (GA4)**: Rastreamento completo de páginas e eventos
- **Hook customizado `useAnalytics`**: Para rastrear eventos específicos da aplicação
- **Rastreamento automático de páginas**: Todas as navegações são rastreadas automaticamente

## Configuração Inicial

### 1. Criar uma propriedade no Google Analytics

1. Acesse [Google Analytics](https://analytics.google.com/)
2. Crie uma nova propriedade GA4
3. Copie o **Measurement ID** (formato: `G-XXXXXXXXXX`)

### 2. Configurar variável de ambiente

Adicione o Measurement ID ao seu arquivo `.env.local`:

```bash
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

**Importante**: A variável deve começar com `NEXT_PUBLIC_` para ser acessível no cliente.

### 3. Reiniciar o servidor de desenvolvimento

Após adicionar a variável de ambiente, reinicie o servidor:

```bash
npm run dev
```

## Como Funciona

### Rastreamento Automático

O sistema rastreia automaticamente:
- **Visualizações de página**: Toda vez que o usuário navega para uma nova página
- **Parâmetros de URL**: Query strings são incluídas no rastreamento
- **Informações do usuário**: ID do usuário e ID da empresa são incluídos (quando disponíveis)

### Componentes Implementados

#### `GoogleAnalytics`
Componente que carrega o script do Google Analytics e configura o rastreamento básico.

#### `PageViewTracker`
Componente que rastreia automaticamente as mudanças de página usando o hook `useAnalytics`.

#### `useAnalytics` Hook
Hook customizado que fornece funções para rastrear eventos específicos.

## Uso do Hook useAnalytics

### Exemplo Básico

```typescript
'use client';

import { useAnalytics } from '@/hooks/useAnalytics';
import { Button } from '@/components/ui/button';

export function MeuComponente() {
  const { trackEvent } = useAnalytics();

  const handleClick = () => {
    trackEvent('button_click', {
      event_category: 'interaction',
      event_label: 'meu_botao',
      value: 1,
    });
  };

  return <Button onClick={handleClick}>Clique aqui</Button>;
}
```

### Rastrear Eventos Personalizados

```typescript
const { trackEvent } = useAnalytics();

// Rastrear criação de agendamento
trackEvent('appointment_created', {
  event_category: 'appointments',
  event_label: 'new_appointment',
  appointment_type: 'consultation',
});

// Rastrear download de documento
trackEvent('document_downloaded', {
  event_category: 'documents',
  event_label: 'receipt',
  document_type: 'receipt',
});

// Rastrear uso de funcionalidade
trackEvent('feature_used', {
  event_category: 'features',
  event_label: 'ai_assistant',
  feature_name: 'ai_assistant',
});
```

### Rastrear Conversões

```typescript
const { trackConversion } = useAnalytics();

// Rastrear conversão de assinatura
trackConversion('AW-CONVERSION_ID/CONVERSION_LABEL', 99.90, 'BRL');
```

### Rastrear Visualização de Página Manualmente

```typescript
const { trackPageView } = useAnalytics();

// Rastrear página específica
trackPageView('/pagina-especial', 'Título da Página');
```

## Eventos Recomendados para Rastrear

### Eventos de Negócio
- `appointment_created` - Agendamento criado
- `appointment_cancelled` - Agendamento cancelado
- `appointment_completed` - Agendamento concluído
- `document_generated` - Documento gerado
- `message_sent` - Mensagem enviada

### Eventos de Funcionalidades
- `ai_assistant_opened` - Assistente IA aberto
- `ai_assistant_query` - Consulta ao assistente IA
- `calendar_view_changed` - Visualização do calendário alterada
- `filter_applied` - Filtro aplicado
- `search_performed` - Busca realizada

### Eventos de Conversão
- `trial_started` - Período de trial iniciado
- `subscription_started` - Assinatura iniciada
- `payment_completed` - Pagamento concluído

## Verificando os Dados

### Google Analytics Dashboard

1. Acesse [Google Analytics](https://analytics.google.com/)
2. Selecione sua propriedade
3. Navegue até **Relatórios** > **Tempo Real** para ver dados em tempo real
4. Use **Eventos** para ver eventos customizados

### Eventos Customizados

Para ver eventos customizados:
1. Vá para **Configuração** > **Eventos**
2. Ou use **Explorar** para criar relatórios personalizados

## Privacidade e LGPD

O sistema está configurado para:
- ✅ Rastrear apenas dados agregados
- ✅ Não coletar informações pessoais identificáveis (exceto IDs anônimos)
- ✅ Respeitar configurações de privacidade do navegador
- ✅ Incluir informações de usuário apenas quando autenticado

**Nota**: Certifique-se de atualizar sua política de privacidade para incluir informações sobre o uso do Google Analytics.

## Troubleshooting

### Analytics não está funcionando

1. Verifique se a variável `NEXT_PUBLIC_GA_MEASUREMENT_ID` está configurada
2. Verifique o console do navegador para erros
3. Use a extensão [Google Analytics Debugger](https://chrome.google.com/webstore/detail/google-analytics-debugger/jnkmfdileelhofjcijamephohjechhna) para debug
4. Verifique se o bloqueador de anúncios não está bloqueando o Google Analytics

### Eventos não aparecem

1. Eventos podem levar alguns minutos para aparecer no GA4
2. Use a visualização "Tempo Real" para ver eventos imediatamente
3. Verifique se o evento está sendo chamado corretamente usando o console do navegador

## Próximos Passos

- [ ] Configurar eventos de conversão no Google Ads (se aplicável)
- [ ] Criar relatórios personalizados no GA4
- [ ] Configurar alertas para eventos importantes
- [ ] Integrar com outras ferramentas de analytics (opcional)







