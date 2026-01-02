'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { 
  Crown, 
  Shield, 
  User, 
  UserCheck, 
  Settings, 
  CheckCircle2, 
  XCircle,
  Calendar,
  Users,
  Package,
  MessageCircle,
  DollarSign,
  FileText
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProfilesInfoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  themePreference?: 'neutral' | 'vibrant' | 'custom';
}

export function ProfilesInfoModal({ open, onOpenChange, themePreference = 'neutral' }: ProfilesInfoModalProps) {
  const isNeutral = themePreference === 'neutral';

  const profiles = [
    {
      id: 'owner',
      name: 'Proprietário',
      icon: Crown,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200',
      description: 'Acesso total ao sistema, sem restrições. Ideal para o dono do negócio.',
      permissions: [
        { label: 'Gerenciar agendamentos de todos', icon: Calendar, allowed: true },
        { label: 'Ver agendas de todos os profissionais', icon: Calendar, allowed: true },
        { label: 'Gerenciar pacientes e clientes', icon: Users, allowed: true },
        { label: 'Criar e editar serviços', icon: Package, allowed: true },
        { label: 'Gerenciar profissionais', icon: User, allowed: true },
        { label: 'Acesso completo ao financeiro', icon: DollarSign, allowed: true },
        { label: 'Ver valores no dashboard', icon: DollarSign, allowed: true },
        { label: 'Enviar mensagens', icon: MessageCircle, allowed: true },
        { label: 'Acessar todas as configurações', icon: Settings, allowed: true },
      ]
    },
    {
      id: 'admin',
      name: 'Administrador',
      icon: Shield,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      description: 'Mesmas permissões do Proprietário. Ideal para gerentes e administradores.',
      permissions: [
        { label: 'Gerenciar agendamentos de todos', icon: Calendar, allowed: true },
        { label: 'Ver agendas de todos os profissionais', icon: Calendar, allowed: true },
        { label: 'Gerenciar pacientes e clientes', icon: Users, allowed: true },
        { label: 'Criar e editar serviços', icon: Package, allowed: true },
        { label: 'Gerenciar profissionais', icon: User, allowed: true },
        { label: 'Acesso completo ao financeiro', icon: DollarSign, allowed: true },
        { label: 'Ver valores no dashboard', icon: DollarSign, allowed: true },
        { label: 'Enviar mensagens', icon: MessageCircle, allowed: true },
        { label: 'Acessar todas as configurações', icon: Settings, allowed: true },
      ]
    },
    {
      id: 'pro',
      name: 'Profissional',
      icon: User,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      description: 'Acesso focado na própria agenda e pacientes. Ideal para médicos, dentistas e outros profissionais.',
      permissions: [
        { label: 'Gerenciar apenas seus próprios agendamentos', icon: Calendar, allowed: true },
        { label: 'Ver apenas sua própria agenda', icon: Calendar, allowed: false },
        { label: 'Ver pacientes e clientes', icon: Users, allowed: true },
        { label: 'Ver serviços (não pode criar/editar)', icon: Package, allowed: false },
        { label: 'Gerenciar profissionais', icon: User, allowed: false },
        { label: 'Acesso ao financeiro', icon: DollarSign, allowed: false },
        { label: 'Ver valores no dashboard', icon: DollarSign, allowed: false },
        { label: 'Enviar mensagens', icon: MessageCircle, allowed: true },
        { label: 'Editar seu próprio perfil', icon: Settings, allowed: true },
      ]
    },
    {
      id: 'atendente',
      name: 'Atendente',
      icon: UserCheck,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200',
      description: 'Acesso para atendimento ao cliente e gestão de agendamentos. Ideal para recepcionistas.',
      permissions: [
        { label: 'Gerenciar agendamentos de todos', icon: Calendar, allowed: true },
        { label: 'Ver agendas de todos os profissionais', icon: Calendar, allowed: true },
        { label: 'Gerenciar pacientes e clientes', icon: Users, allowed: true },
        { label: 'Ver serviços (não pode criar/editar)', icon: Package, allowed: false },
        { label: 'Gerenciar profissionais', icon: User, allowed: false },
        { label: 'Acesso ao financeiro', icon: DollarSign, allowed: false },
        { label: 'Ver valores no dashboard', icon: DollarSign, allowed: false },
        { label: 'Enviar mensagens', icon: MessageCircle, allowed: true },
        { label: 'Editar seu próprio perfil', icon: Settings, allowed: true },
      ]
    },
    {
      id: 'outro',
      name: 'Personalizado',
      icon: Settings,
      color: 'text-slate-600',
      bgColor: 'bg-slate-50',
      borderColor: 'border-slate-200',
      description: 'Permissões configuráveis individualmente. Você escolhe o que o usuário pode fazer.',
      permissions: [
        { label: 'Permissões configuráveis', icon: Settings, allowed: true, note: 'Você define cada permissão ao criar/editar o usuário' },
      ]
    }
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-slate-900">
            Tipos de Perfis e Permissões
          </DialogTitle>
          <DialogDescription className="text-base text-slate-600">
            Entenda o que cada tipo de perfil pode fazer no sistema
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {profiles.map((profile) => {
            const Icon = profile.icon;
            return (
              <div
                key={profile.id}
                className={cn(
                  'rounded-xl border-2 p-5 transition-all hover:shadow-md',
                  profile.bgColor,
                  profile.borderColor
                )}
              >
                <div className="flex items-start gap-4">
                  <div className={cn(
                    'p-3 rounded-lg',
                    profile.bgColor,
                    'border',
                    profile.borderColor
                  )}>
                    <Icon className={cn('w-6 h-6', profile.color)} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-slate-900">
                        {profile.name}
                      </h3>
                      {profile.id === 'owner' && (
                        <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">
                          Acesso Total
                        </Badge>
                      )}
                      {profile.id === 'admin' && (
                        <Badge className="bg-blue-100 text-blue-800 border-blue-300">
                          Acesso Total
                        </Badge>
                      )}
                      {profile.id === 'outro' && (
                        <Badge className="bg-slate-100 text-slate-800 border-slate-300">
                          Configurável
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-slate-600 mb-4">
                      {profile.description}
                    </p>

                    {profile.id === 'outro' ? (
                      <div className="bg-white rounded-lg p-4 border border-slate-200">
                        <p className="text-sm text-slate-700 mb-3">
                          <strong>Permissões que podem ser habilitadas:</strong>
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-green-600" />
                            <span>Editar agendamentos</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-green-600" />
                            <span>Ver agendas de todos</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-green-600" />
                            <span>Acesso ao financeiro</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-green-600" />
                            <span>Ver valores no dashboard</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-green-600" />
                            <span>Gerenciar profissionais</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-green-600" />
                            <span>Gerenciar serviços</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-green-600" />
                            <span>Enviar mensagens</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-green-600" />
                            <span>Acesso a pacientes</span>
                          </div>
                        </div>
                        <p className="text-xs text-slate-500 mt-3 italic">
                          💡 Dica: Ao criar um usuário "Personalizado", você poderá escolher exatamente quais permissões ele terá.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-slate-700 mb-2 uppercase tracking-wide">
                          O que este perfil pode fazer:
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {profile.permissions.map((permission, idx) => {
                            const PermissionIcon = permission.icon;
                            return (
                              <div
                                key={idx}
                                className={cn(
                                  'flex items-center gap-2 text-sm p-2 rounded',
                                  permission.allowed
                                    ? 'bg-white/60 text-slate-700'
                                    : 'bg-slate-100/50 text-slate-400'
                                )}
                              >
                                {permission.allowed ? (
                                  <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                                ) : (
                                  <XCircle className="w-4 h-4 text-slate-400 flex-shrink-0" />
                                )}
                                <PermissionIcon className="w-4 h-4 flex-shrink-0" />
                                <span className={permission.allowed ? '' : 'line-through'}>
                                  {permission.label}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-3">
            <FileText className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-blue-900 mb-1">
                💡 Dica Importante
              </p>
              <p className="text-sm text-blue-800">
                O perfil <strong>"Personalizado"</strong> permite que você configure exatamente o que cada usuário pode fazer. 
                Use este perfil quando precisar de permissões específicas que não se encaixam nos perfis padrão.
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}










