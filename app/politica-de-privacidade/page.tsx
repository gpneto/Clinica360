import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Política de Privacidade | AllOne',
  description:
    'Conheça como a AllOne coleta, utiliza e protege os seus dados pessoais para oferecer uma experiência segura e transparente.',
};

export default function PoliticaDePrivacidadePage() {
  return (
    <main className="max-w-4xl mx-auto px-6 py-12 space-y-12">
      <section className="space-y-6">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900">
            Política de Privacidade
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Última atualização: {new Date().toLocaleDateString('pt-BR')}
          </p>
        </div>
        <p className="text-base leading-relaxed text-slate-700">
          A AllOne valoriza a proteção dos dados pessoais de clientes,
          pacientes e profissionais. Esta Política de Privacidade descreve de
          forma transparente como coletamos, utilizamos, armazenamos e
          compartilhamos as informações durante o uso da nossa plataforma de
          agendamento e gestão.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-slate-900">
          1. Dados que coletamos
        </h2>
        <p className="text-base leading-relaxed text-slate-700">
          Coletamos dados necessários para viabilizar o funcionamento da
          plataforma, incluindo:
        </p>
        <ul className="list-disc pl-6 space-y-2 text-base text-slate-700">
          <li>
            Informações de cadastro: nome, e-mail, telefone, CPF, CRM ou outros
            registros profissionais, quando aplicável.
          </li>
          <li>
            Dados de agenda e prontuário: informações sobre consultas,
            procedimentos, solicitações e orientações cadastradas no sistema.
          </li>
          <li>
            Dados técnicos: registros de acesso, endereço IP, dispositivos
            utilizados e dados de cookies para manter a sessão ativa e garantir
            segurança.
          </li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-slate-900">
          2. Como usamos os dados
        </h2>
        <p className="text-base leading-relaxed text-slate-700">
          Utilizamos os dados pessoais para:
        </p>
        <ul className="list-disc pl-6 space-y-2 text-base text-slate-700">
          <li>Fornecer, operar e aprimorar a plataforma AllOne.</li>
          <li>
            Personalizar a experiência de usuários, conforme seus
            consentimentos.
          </li>
          <li>
            Enviar notificações, lembretes e comunicações necessárias ao uso do
            serviço.
          </li>
          <li>
            Cumprir obrigações legais e regulatórias, especialmente na área da
            saúde.
          </li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-slate-900">
          3. Compartilhamento de dados
        </h2>
        <p className="text-base leading-relaxed text-slate-700">
          A AllOne não comercializa dados pessoais. Podemos compartilhar
          informações com terceiros estritamente necessários para a prestação
          dos serviços, tais como provedores de hospedagem, ferramentas de
          comunicação e integrações autorizadas pelo usuário. Todo
          compartilhamento segue acordos de confidencialidade e boas práticas de
          segurança.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-slate-900">
          4. Segurança da informação
        </h2>
        <p className="text-base leading-relaxed text-slate-700">
          Adotamos medidas de segurança técnicas, administrativas e organizacionais
          alinhadas à LGPD para proteger os dados contra acessos não autorizados,
          perda ou alteração indevida. Ainda assim, nenhuma transmissão na
          internet é completamente segura; por isso, incentivamos a adoção de
          práticas seguras pelos usuários.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-slate-900">
          5. Retenção e exclusão de dados
        </h2>
        <p className="text-base leading-relaxed text-slate-700">
          Mantemos os dados somente pelo tempo necessário para cumprir as finalidades
          desta política ou exigências legais. Usuários podem solicitar a exclusão
          ou anonimização de dados, respeitando obrigações relacionadas a prontuários
          e outras legislações específicas do setor.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-slate-900">
          6. Direitos dos titulares
        </h2>
        <p className="text-base leading-relaxed text-slate-700">
          Na forma da Lei Geral de Proteção de Dados (LGPD), você pode solicitar:
        </p>
        <ul className="list-disc pl-6 space-y-2 text-base text-slate-700">
          <li>Confirmação da existência de tratamento.</li>
          <li>Acesso, correção, portabilidade ou exclusão de dados.</li>
          <li>
            Informação sobre compartilhamento e revogação de consentimentos.
          </li>
          <li>Revisão de decisões automatizadas que afetem seus interesses.</li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-slate-900">
          7. Atualizações e contato
        </h2>
        <p className="text-base leading-relaxed text-slate-700">
          Esta Política pode ser atualizada para refletir melhorias na plataforma
          ou mudanças normativas. Recomendamos a leitura periódica. Em caso de
          dúvidas ou solicitações relacionadas ao tratamento de dados pessoais,
          entre em contato conosco pelo e-mail{' '}
          <a
            href="mailto:privacidade@SmartScheduler.com.br"
            className="text-primary underline"
          >
            privacidade@SmartScheduler.com.br
          </a>
          .
        </p>
      </section>
    </main>
  );
}

