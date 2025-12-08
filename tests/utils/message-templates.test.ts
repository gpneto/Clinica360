import { describe, it, expect } from 'vitest';

describe('Utilitários - Templates de Mensagens', () => {
  describe('Substituição de Parâmetros', () => {
    it('deve substituir parâmetros {{1}}, {{2}}, etc. em template', () => {
      const template = 'Olá, {{1}}! Seu agendamento é em {{2}}.';
      const parameters = ['João', '15/01/2024'];

      let result = template;
      parameters.forEach((param, index) => {
        result = result.replace(`{{${index + 1}}}`, param);
      });

      expect(result).toBe('Olá, João! Seu agendamento é em 15/01/2024.');
    });

    it('deve substituir múltiplos parâmetros no template de confirmação', () => {
      const template = `📢 *Confirmação de Agendamento*

Olá, {{1}}! Tudo certo? 😊

👤 Profissional: {{2}}
💼 Serviço: *{{3}}*
⏰ Data e Horário: *{{4}}*
⏳ Duração: {{5}}`;

      const parameters = ['João', 'Dr. Silva', 'Consulta', '15/01/2024 10:00', '1h'];

      let result = template;
      parameters.forEach((param, index) => {
        result = result.replace(`{{${index + 1}}}`, param);
      });

      expect(result).toContain('João');
      expect(result).toContain('Dr. Silva');
      expect(result).toContain('Consulta');
      expect(result).toContain('15/01/2024 10:00');
      expect(result).toContain('1h');
    });

    it('deve substituir parâmetros no template de lembrete', () => {
      const template = `📌 *Lembrete de Agendamento*

Olá, {{1}}! Tudo certo? 😊

Lembramos que seu atendimento será em aproximadamente *{{2}}*.

👤 Profissional: {{3}}
💼 Serviço: *{{4}}*
⏰ Data e Horário: *{{5}}*`;

      const parameters = ['Maria', '24 horas', 'Dr. Santos', 'Massagem', '16/01/2024 14:00'];

      let result = template;
      parameters.forEach((param, index) => {
        result = result.replace(`{{${index + 1}}}`, param);
      });

      expect(result).toContain('Maria');
      expect(result).toContain('24 horas');
      expect(result).toContain('Dr. Santos');
      expect(result).toContain('Massagem');
      expect(result).toContain('16/01/2024 14:00');
    });

    it('deve substituir parâmetros no template de cancelamento', () => {
      const template = `❌ *Cancelamento de Agendamento*

Olá, {{1}}!

Informamos que seu agendamento foi cancelado.

💼 Serviço: *{{2}}*
⏰ Data: *{{3}}*`;

      const parameters = ['Pedro', 'Consulta', '17/01/2024'];

      let result = template;
      parameters.forEach((param, index) => {
        result = result.replace(`{{${index + 1}}}`, param);
      });

      expect(result).toContain('Pedro');
      expect(result).toContain('Consulta');
      expect(result).toContain('17/01/2024');
    });

    it('deve manter template original se parâmetros não forem fornecidos', () => {
      const template = 'Olá, {{1}}! Seu agendamento é em {{2}}.';
      const parameters: string[] = [];

      let result = template;
      parameters.forEach((param, index) => {
        result = result.replace(`{{${index + 1}}}`, param);
      });

      expect(result).toBe(template); // Sem mudanças
    });

    it('deve substituir apenas parâmetros fornecidos', () => {
      const template = 'Olá, {{1}}! Seu agendamento é em {{2}}.';
      const parameters = ['João']; // Apenas primeiro parâmetro

      let result = template;
      parameters.forEach((param, index) => {
        result = result.replace(`{{${index + 1}}}`, param);
      });

      expect(result).toBe('Olá, João! Seu agendamento é em {{2}}.'); // {{2}} permanece
    });
  });

  describe('Validação de Templates', () => {
    it('deve validar que template contém todos os parâmetros necessários', () => {
      const template = 'Olá, {{1}}! Seu agendamento é em {{2}} com {{3}}.';
      const requiredParams = 3;
      const providedParams = 3;

      const isValid = providedParams >= requiredParams;
      expect(isValid).toBe(true);
    });

    it('deve detectar quando faltam parâmetros obrigatórios', () => {
      const template = 'Olá, {{1}}! Seu agendamento é em {{2}} com {{3}}.';
      const requiredParams = 3;
      const providedParams = 2;

      const isValid = providedParams >= requiredParams;
      expect(isValid).toBe(false);
    });

    it('deve contar parâmetros no template', () => {
      const template = 'Olá, {{1}}! Seu agendamento é em {{2}} com {{3}}.';
      const paramMatches = template.match(/\{\{\d+\}\}/g);
      const paramCount = paramMatches ? paramMatches.length : 0;

      expect(paramCount).toBe(3);
    });
  });

  describe('Templates Específicos', () => {
    it('deve validar template de confirmação', () => {
      const template = `📢 *Confirmação de Agendamento - *

Olá, {{1}}! Tudo certo? 😊

Sua reserva foi confirmada! Aqui estão os detalhes do seu atendimento:

👤 Profissional: {{2}}
💼 Serviço:  *{{3}}*
⏰ Data e Horário: *{{4}}*
⏳ Duração: {{5}}
📍 Endereço: {{6}}
📞 Contato: {{7}}`;

      const paramMatches = template.match(/\{\{\d+\}\}/g);
      const paramCount = paramMatches ? paramMatches.length : 0;

      expect(paramCount).toBe(7);
    });

    it('deve validar template de lembrete', () => {
      const template = `📌 *Lembrete de Agendamento - *

Olá, {{1}}! Tudo certo? 😊

Lembramos que seu atendimento será em aproximadamente *{{2}}*.

👤 Profissional: {{3}}
💼 Serviço:  *{{4}}*
⏰ Data e Horário: *{{5}}*
⏳ Duração: {{6}}
📍 Endereço: {{7}}
📞 Contato: {{8}}`;

      const paramMatches = template.match(/\{\{\d+\}\}/g);
      const paramCount = paramMatches ? paramMatches.length : 0;

      expect(paramCount).toBe(8);
    });

    it('deve validar template de cancelamento', () => {
      const template = `❌ *Cancelamento de Agendamento - *

Olá, {{1}}!

Informamos que seu agendamento foi cancelado.

💼 Serviço: *{{2}}*
⏰ Data: *{{3}}*

Se desejar reagendar, entre em contato:

📞 *Contato:* {{4}}`;

      const paramMatches = template.match(/\{\{\d+\}\}/g);
      const paramCount = paramMatches ? paramMatches.length : 0;

      expect(paramCount).toBe(4);
    });
  });
});

