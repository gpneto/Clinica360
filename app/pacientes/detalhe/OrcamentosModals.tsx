'use client';

import { X, Copy, Check, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { Patient } from '@/types';

interface OrcamentosModalsProps {
  sendOrcamentoModal: { orcamento: any; link: string } | null;
  setSendOrcamentoModal: (modal: { orcamento: any; link: string } | null) => void;
  copiedLink: boolean;
  handleCopyLink: () => Promise<void>;
  handleSendViaSystem: () => Promise<void>;
  patient: Patient | null;
  singularTitle: string;
  hasGradient: boolean;
  isCustom: boolean;
  gradientColors: { start: string; middle: string; end: string } | null | undefined;
  isVibrant: boolean;
}

export function OrcamentosModals({
  sendOrcamentoModal,
  setSendOrcamentoModal,
  copiedLink,
  handleCopyLink,
  handleSendViaSystem,
  patient,
  singularTitle,
  hasGradient,
  isCustom,
  gradientColors,
  isVibrant,
}: OrcamentosModalsProps) {
  if (!sendOrcamentoModal) return null;

  return (
    <div className="fixed inset-0 z-[1003] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Enviar Link de Assinatura</h2>
          <button
            type="button"
            onClick={() => setSendOrcamentoModal(null)}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Link de Assinatura
            </label>
            <div className="flex gap-2">
              <Input
                type="text"
                value={sendOrcamentoModal.link}
                readOnly
                className="flex-1 font-mono text-sm"
              />
              <Button
                type="button"
                onClick={handleCopyLink}
                variant="outline"
                className="flex-shrink-0"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Copiado!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-2" />
                    Copiar
                  </>
                )}
              </Button>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              type="button"
              onClick={handleSendViaSystem}
              className={cn(
                'flex-1 text-white',
                hasGradient
                  ? isCustom && gradientColors
                    ? ''
                    : isVibrant
                    ? 'bg-gradient-to-r from-indigo-500 to-rose-500 hover:from-indigo-600 hover:to-rose-600'
                    : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700'
                  : 'bg-gradient-to-r from-slate-600 to-blue-600 hover:from-slate-700 hover:to-blue-700'
              )}
              style={
                hasGradient && isCustom && gradientColors
                  ? {
                      background: `linear-gradient(90deg, ${gradientColors.start} 0%, ${gradientColors.middle} 50%, ${gradientColors.end} 100%)`,
                    }
                  : undefined
              }
              disabled={!patient?.telefoneE164}
            >
              <Send className="w-4 h-4 mr-2" />
              Enviar pelo Sistema
            </Button>
            <Button
              type="button"
              onClick={() => setSendOrcamentoModal(null)}
              variant="outline"
              className="flex-1"
            >
              Fechar
            </Button>
          </div>

          {!patient?.telefoneE164 && (
            <p className="text-xs text-gray-500 text-center">
              {singularTitle} sem telefone cadastrado. Use a opção de copiar o link.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

