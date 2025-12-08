'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import {
  CalendarCheck2,
  CheckCircle2,
  ClipboardList,
  Sparkles,
  UsersRound,
  X,
  ChevronLeft,
  ChevronRight,
  Settings2,
  BarChart3,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTutorial } from './TutorialProvider';

interface TutorialStep {
  title: string;
  description: string;
  highlights: string[];
  actionLabel: string;
  actionHref: string;
  icon: LucideIcon;
}

const tutorialSteps: TutorialStep[] = [
  {
    title: 'Cadastre seus serviços',
    description: 'Comece registrando os serviços oferecidos pela clínica para liberar os agendamentos.',
    highlights: [
      'Defina duração, preço e profissionais habilitados por serviço.',
      'Organize por categorias para facilitar a busca na agenda.',
    ],
    actionLabel: 'Ir para serviços',
    actionHref: '/servicos',
    icon: ClipboardList,
  },
  {
    title: 'Cadastre sua equipe',
    description: 'Inclua os profissionais que atenderão os serviços e configure suas agendas.',
    highlights: [
      'Associe especialidades e serviços atendidos por cada profissional.',
      'Garanta que todos estejam ativos e com horários configurados.',
    ],
    actionLabel: 'Ir para profissionais',
    actionHref: '/profissionais',
    icon: UsersRound,
  },
  {
    title: 'Abra a agenda inteligente',
    description: 'Agora é só acessar a agenda para começar a marcar os atendimentos.',
    highlights: [
      'Visualize horários disponíveis por profissional ou por sala.',
      'Crie agendamentos rapidamente e envie notificações automáticas.',
    ],
    actionLabel: 'Ir para agenda',
    actionHref: '/agenda',
    icon: CalendarCheck2,
  },
  {
    title: 'Personalize as configurações',
    description: 'Ajuste notificações, integrações e preferências gerais do sistema.',
    highlights: [
      'Defina horários de funcionamento, padrões financeiros e envio automático de mensagens.',
      'Sincronize o WhatsApp corporativo e customize como os clientes são tratados no sistema.',
    ],
    actionLabel: 'Abrir configurações',
    actionHref: '/configuracoes',
    icon: Settings2,
  },
  {
    title: 'Acompanhe resultados e relatórios',
    description: 'Monitore a performance da clínica e tome decisões com base em dados.',
    highlights: [
      'Visualize indicadores de atendimento, faturamento e taxa de comparecimento.',
      'Exporte relatórios e filtre por período, profissional ou serviço.',
    ],
    actionLabel: 'Ir para relatórios',
    actionHref: '/relatorios',
    icon: BarChart3,
  },
];

export function TutorialGuide() {
  const {
    isOpen,
    currentStep,
    nextStep,
    previousStep,
    markAsCompleted,
    closeTutorial,
    skipTutorial,
  } = useTutorial();
  const router = useRouter();

  const totalSteps = tutorialSteps.length;
  const boundedStepIndex = Math.min(currentStep, totalSteps - 1);
  const step = tutorialSteps[boundedStepIndex];
  const progress = ((boundedStepIndex + 1) / totalSteps) * 100;
  const isLastStep = boundedStepIndex === totalSteps - 1;

  const handlePrimaryAction = useCallback(async () => {
    if (step.actionHref) {
      router.push(step.actionHref);
    }

    if (!isLastStep) {
      nextStep();
    } else {
      await markAsCompleted();
    }
  }, [isLastStep, markAsCompleted, nextStep, router, step.actionHref]);

  const handleSkip = useCallback(() => {
    void skipTutorial();
  }, [skipTutorial]);

  if (!isOpen) {
    return null;
  }

  const StepIcon = step.icon;

  return (
    <AnimatePresence>
      <motion.div
        key="tutorial-guide"
        initial={{ opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 32 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="fixed bottom-6 right-6 z-50 w-full max-w-md"
      >
        <div className="overflow-hidden rounded-2xl border border-primary/30 bg-background/95 shadow-2xl backdrop-blur">
          <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent px-6 py-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <span className="mt-1 flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-primary">
                  <StepIcon className="h-5 w-5" />
                </span>
                <div className="space-y-1">
                  <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary">
                    <Sparkles className="h-3 w-3" />
                    Tutorial Clínica 360
                  </p>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Etapa {boundedStepIndex + 1} de {totalSteps}
                    </p>
                    <h2 className="text-lg font-semibold text-foreground">
                      {step.title}
                    </h2>
                  </div>
                </div>
              </div>

              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={closeTutorial}>
                <X className="h-4 w-4" />
                <span className="sr-only">Fechar tutorial</span>
              </Button>
            </div>

            <div className="mt-4 h-1 w-full rounded-full bg-primary/10">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <div className="px-6 py-4">
            <p className="text-sm text-muted-foreground">
              {step.description}
            </p>

            <ul className="mt-4 space-y-2">
              {step.highlights.map((item, index) => (
                <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            <div className="mt-6 flex flex-wrap items-center gap-2">
              {boundedStepIndex > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1 text-muted-foreground"
                  onClick={previousStep}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Voltar
                </Button>
              )}

              <Button
                variant="ghost"
                size="sm"
                className="gap-1 text-muted-foreground"
                onClick={handleSkip}
              >
                Não mostrar novamente
              </Button>

              <div className="flex-1" />

              {!isLastStep && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1"
                  onClick={nextStep}
                >
                  Próxima etapa
                  <ChevronRight className="h-4 w-4" />
                </Button>
              )}

              <Button size="sm" onClick={handlePrimaryAction}>
                {isLastStep ? step.actionLabel ?? 'Concluir tutorial' : step.actionLabel}
              </Button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

