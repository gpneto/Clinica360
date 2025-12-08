'use client';

import { useMemo, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useCompany } from '@/hooks/useFirestore';

function formatDaysLeft(daysLeft: number) {
  if (daysLeft <= 0) return 'expirou';
  if (daysLeft === 1) return '1 dia';
  return `${daysLeft} dias`;
}

export default function TrialGuard() {
  const { companyId } = useAuth();
  const { company } = useCompany(companyId);
  const [dismissed, setDismissed] = useState(false);

  const { isExpired, daysLeft } = useMemo(() => {
    if (!company) return { isExpired: false, daysLeft: null as number | null };
    const active = Boolean(company.subscriptionActive);
    // Se assinatura ativa mas período acabou, considerar expirado
    if (active && company.subscriptionCurrentPeriodEnd) {
      const end = company.subscriptionCurrentPeriodEnd instanceof Date 
        ? company.subscriptionCurrentPeriodEnd 
        : new Date(company.subscriptionCurrentPeriodEnd);
      if (new Date().getTime() > end.getTime()) {
        return { isExpired: true, daysLeft: 0 };
      }
    }
    const endsAtDate = company.trialEndsAt 
      ? (company.trialEndsAt instanceof Date ? company.trialEndsAt : new Date(company.trialEndsAt))
      : null;
    if (active) return { isExpired: false, daysLeft: null };
    if (!endsAtDate) return { isExpired: false, daysLeft: null };
    const now = new Date();
    const diffMs = endsAtDate.getTime() - now.getTime();
    const days = Math.ceil(diffMs / (24 * 60 * 60 * 1000));
    return { isExpired: days <= 0, daysLeft: days };
  }, [company]);

  const whatsappHref = 'https://wa.me/5551981987430?text=Ol%C3%A1%2C%20quero%20assinar%20o%20Cl%C3%ADnica%20360';

  // Se expirou e não há assinatura, bloquear com overlay
  if (company && !company.subscriptionActive && isExpired) {
    return (
      <div className="fixed inset-0 z-[2000] bg-black/70 backdrop-blur-sm flex items-center justify-center p-6">
        <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl p-6 text-center">
          <h2 className="text-2xl font-bold text-slate-900">Período de teste encerrado</h2>
          <p className="text-slate-600 mt-2">
            Seu trial de 15 dias terminou. Para continuar utilizando, entre em contato.
          </p>
          <a
            href="/plano"
            className="mt-5 inline-flex items-center justify-center px-5 py-3 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition-colors w-full"
          >
            Assinar agora
          </a>
          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 inline-flex items-center justify-center px-5 py-3 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition-colors w-full"
          >
            Falar no WhatsApp (51) 981987430
          </a>
        </div>
      </div>
    );
  }

  // Se está em trial (faltam dias) e não foi dispensado, mostrar banner
  if (company && !company.subscriptionActive && daysLeft !== null && daysLeft <= 15 && !dismissed) {
    return (
      <div className="fixed left-0 right-0 top-0 z-[1500]">
        <div className="mx-auto max-w-screen-2xl p-3">
          <div className="rounded-xl border border-amber-300/60 bg-amber-50 text-amber-900 shadow">
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="flex-1">
                <span className="font-semibold">Período de teste ativo</span>
                <span className="mx-2">•</span>
                <span>restam {formatDaysLeft(daysLeft!)} de uso</span>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href="/plano"
                  className="inline-flex items-center px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700"
                >
                  Assinar agora
                </a>
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700"
                >
                  Contratar via WhatsApp
                </a>
                <button
                  onClick={() => setDismissed(true)}
                  className="inline-flex items-center px-3 py-1.5 rounded-lg border border-amber-300 bg-white/80 text-amber-900 text-sm hover:bg-white"
                  aria-label="Fechar aviso de trial"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}


