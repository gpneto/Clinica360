'use client';

import { useState } from 'react';
import { GranularPermissions } from '@/types';
import { createDefaultPermissions } from '@/lib/permissions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { X } from 'lucide-react';

interface PermissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (permissions: GranularPermissions) => Promise<void>;
  initialPermissions?: GranularPermissions;
  userName: string;
}

export function PermissionsModal({
  isOpen,
  onClose,
  onSave,
  initialPermissions,
  userName,
}: PermissionsModalProps) {
  const [permissions, setPermissions] = useState<GranularPermissions>(
    initialPermissions || createDefaultPermissions()
  );
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(permissions);
      onClose();
    } catch (error) {
      console.error('Erro ao salvar permissões:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleCheckboxChange = (key: keyof GranularPermissions, value: boolean) => {
    setPermissions((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  // Validação: financeiroApenasProprios e financeiroAcessoCompleto são mutuamente exclusivos
  const handleFinancialAccessChange = (type: 'apenasProprios' | 'acessoCompleto', value: boolean) => {
    if (!value) {
      // Se desmarcando, apenas atualizar
      setPermissions((prev) => ({
        ...prev,
        financeiroApenasProprios: type === 'apenasProprios' ? false : prev.financeiroApenasProprios,
        financeiroAcessoCompleto: type === 'acessoCompleto' ? false : prev.financeiroAcessoCompleto,
      }));
    } else {
      // Se marcando, desmarcar o outro
      setPermissions((prev) => ({
        ...prev,
        financeiroApenasProprios: type === 'apenasProprios' ? true : false,
        financeiroAcessoCompleto: type === 'acessoCompleto' ? true : false,
      }));
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle>Configurar Permissões - {userName}</CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Agenda */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Agenda</h3>
            <div className="space-y-3 pl-4">
              <div className="flex items-start space-x-3">
                <Checkbox
                  id="agendaEdicao"
                  checked={permissions.agendaEdicao}
                  onCheckedChange={(checked) => handleCheckboxChange('agendaEdicao', checked as boolean)}
                />
                <div className="flex-1 space-y-1">
                  <Label htmlFor="agendaEdicao" className="font-medium cursor-pointer">
                    Edição de agendamentos
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Permite a criação, alteração e deleção de eventos das agendas de todos os profissionais
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <Checkbox
                  id="agendaVisualizacao"
                  checked={permissions.agendaVisualizacao}
                  onCheckedChange={(checked) => handleCheckboxChange('agendaVisualizacao', checked as boolean)}
                />
                <div className="flex-1 space-y-1">
                  <Label htmlFor="agendaVisualizacao" className="font-medium cursor-pointer">
                    Visualização da agenda
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Permite a visualização das agendas de todos os profissionais
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-200 my-4" />

          {/* Financeiro */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Financeiro</h3>
            <div className="space-y-3 pl-4">
              <div className="flex items-start space-x-3">
                <Checkbox
                  id="financeiroDebitosPacientes"
                  checked={permissions.financeiroDebitosPacientes}
                  onCheckedChange={(checked) => handleCheckboxChange('financeiroDebitosPacientes', checked as boolean)}
                />
                <div className="flex-1 space-y-1">
                  <Label htmlFor="financeiroDebitosPacientes" className="font-medium cursor-pointer">
                    Aba Débitos de Pacientes
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Permite acesso completo a todos os lançamentos da aba Débitos no perfil de qualquer paciente. Esta configuração é independente das configurações do Controle Financeiro.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <Checkbox
                  id="financeiroApenasProprios"
                  checked={permissions.financeiroApenasProprios}
                  onCheckedChange={(checked) => handleFinancialAccessChange('apenasProprios', checked as boolean)}
                />
                <div className="flex-1 space-y-1">
                  <Label htmlFor="financeiroApenasProprios" className="font-medium cursor-pointer">
                    Acesso apenas aos lançamentos do usuário
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Criar, editar e excluir apenas os lançamentos criados pelo próprio usuário. Marcar como pagos e emitir recibos somente para esses lançamentos. Não há acesso aos Relatórios e Resumo de Comissões.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <Checkbox
                  id="financeiroAcessoCompleto"
                  checked={permissions.financeiroAcessoCompleto}
                  onCheckedChange={(checked) => handleFinancialAccessChange('acessoCompleto', checked as boolean)}
                />
                <div className="flex-1 space-y-1">
                  <Label htmlFor="financeiroAcessoCompleto" className="font-medium cursor-pointer">
                    Acesso completo ao Controle Financeiro
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Usuário tem acesso completo a todas as funcionalidades do Controle Financeiro, incluindo Relatórios e Resumo de Comissões.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-200 my-4" />

          {/* Menus */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Menus</h3>
            <div className="space-y-3 pl-4">
              <div className="flex items-start space-x-3">
                <Checkbox
                  id="menuProfissionais"
                  checked={permissions.menuProfissionais}
                  onCheckedChange={(checked) => handleCheckboxChange('menuProfissionais', checked as boolean)}
                />
                <div className="flex-1 space-y-1">
                  <Label htmlFor="menuProfissionais" className="font-medium cursor-pointer">
                    Menu de Profissionais
                  </Label>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <Checkbox
                  id="menuClientes"
                  checked={permissions.menuClientes}
                  onCheckedChange={(checked) => handleCheckboxChange('menuClientes', checked as boolean)}
                />
                <div className="flex-1 space-y-1">
                  <Label htmlFor="menuClientes" className="font-medium cursor-pointer">
                    Menu de Clientes
                  </Label>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <Checkbox
                  id="menuServicos"
                  checked={permissions.menuServicos}
                  onCheckedChange={(checked) => handleCheckboxChange('menuServicos', checked as boolean)}
                />
                <div className="flex-1 space-y-1">
                  <Label htmlFor="menuServicos" className="font-medium cursor-pointer">
                    Menu de Serviços
                  </Label>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={onClose} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

