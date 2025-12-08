'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { format, subMonths, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MessageCircle, User, Calendar, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectItem } from '@/components/ui/select';
import { useAppointments, useServices, usePatients } from '@/hooks/useFirestore';
import { useAuth } from '@/lib/auth-context';
import { cn } from '@/lib/utils';

interface PatientLastAppointment {
  patientId: string;
  patientName: string;
  lastAppointmentDate: Date;
  lastServiceName: string;
  lastServiceId: string;
}

interface ReturnSuggestionsProps {
  isOpen?: boolean;
}

export function ReturnSuggestions({ isOpen = false }: ReturnSuggestionsProps) {
  const { companyId } = useAuth();
  const router = useRouter();
  const [selectedMonths, setSelectedMonths] = useState<string>('1');

  // Buscar todos os agendamentos concluídos apenas quando o componente estiver aberto
  // Se isOpen for false, ainda buscar dados para evitar problemas de renderização
  const { appointments, loading: appointmentsLoading } = useAppointments(
    companyId, // Sempre buscar quando companyId estiver disponível
    undefined,
    undefined // Sem filtro de data para buscar todos
  );
  const { services } = useServices(companyId);
  const { patients } = usePatients(companyId);

  // Calcular a data de corte baseada na seleção
  // Se selecionar "6 meses atrás", queremos pacientes cuja última consulta foi há 6 meses ou MAIS
  // Então a data de corte é 6 meses atrás de hoje
  const cutoffDate = useMemo(() => {
    const months = parseInt(selectedMonths);
    const today = new Date();
    const cutoff = subMonths(today, months);
    return startOfDay(cutoff);
  }, [selectedMonths]);

  // Processar pacientes para encontrar última consulta
  // Primeiro consulta na collection do paciente, depois nos agendamentos
  const patientsWithLastAppointment = useMemo(() => {
    if (!services || !patients || !appointments) return [];

    const patientMap = new Map<string, PatientLastAppointment>();

    // Primeiro: processar pacientes que têm ultimoProcedimentoDate na collection
    patients.forEach((patient) => {
      if (patient.ultimoProcedimentoDate) {
        const lastDate = patient.ultimoProcedimentoDate instanceof Date
          ? patient.ultimoProcedimentoDate
          : new Date(patient.ultimoProcedimentoDate);

        // Buscar o serviço do último agendamento concluído deste paciente
        let serviceName = 'Serviço não encontrado';
        let serviceId = '';

        if (appointments) {
          // Encontrar o agendamento mais recente concluído deste paciente
          const patientAppointments = appointments.filter(
            (apt) =>
              apt.clientId === patient.id &&
      
              apt.clientePresente !== false &&
              apt.inicio
          );

          if (patientAppointments.length > 0) {
            // Ordenar por data e pegar o mais recente
            const sortedAppointments = patientAppointments.sort((a, b) => {
              const dateA = a.inicio instanceof Date ? a.inicio : new Date(a.inicio);
              const dateB = b.inicio instanceof Date ? b.inicio : new Date(b.inicio);
              return dateB.getTime() - dateA.getTime();
            });

            const lastAppointment = sortedAppointments[0];
            
            if (lastAppointment.serviceIds && lastAppointment.serviceIds.length > 0) {
              const serviceIds = lastAppointment.serviceIds;
              const serviceNames = serviceIds
                .map((id) => {
                  const service = services.find((s) => s.id === id);
                  return service?.nome;
                })
                .filter(Boolean);
              serviceName = serviceNames.length > 0 
                ? serviceNames.join(', ') 
                : 'Serviço não encontrado';
              serviceId = serviceIds[0] || '';
            } else if (lastAppointment.serviceId) {
              const service = services.find((s) => s.id === lastAppointment.serviceId);
              serviceName = service?.nome || 'Serviço não encontrado';
              serviceId = lastAppointment.serviceId;
            }
          }
        }

        patientMap.set(patient.id, {
          patientId: patient.id,
          patientName: patient.nome,
          lastAppointmentDate: lastDate,
          lastServiceName: serviceName,
          lastServiceId: serviceId,
        });
      }
    });

    // Segundo: processar TODOS os pacientes com agendamentos concluídos (atualizar ou adicionar)
    // Isso garante que mesmo pacientes com ultimoProcedimentoDate sejam atualizados com dados mais recentes
    if (appointments) {
      // Filtrar apenas agendamentos concluídos onde o cliente compareceu
      const concludedAppointments = appointments.filter(
        (apt) =>
  
          apt.clientePresente !== false &&
          apt.inicio &&
          apt.clientId
      );

      concludedAppointments.forEach((apt) => {
        if (!apt.clientId || !apt.inicio) return;

        // Encontrar o paciente
        const patient = patients.find((p) => p.id === apt.clientId);
        if (!patient) return;

        const appointmentDate = apt.inicio instanceof Date 
          ? apt.inicio 
          : new Date(apt.inicio);

        const existing = patientMap.get(apt.clientId);

        // Se não existe ou se esta consulta é mais recente que a existente
        if (!existing || appointmentDate > existing.lastAppointmentDate) {
          // Encontrar o nome do serviço
          let serviceName = 'Serviço não encontrado';
          let serviceId = '';
          
          if (apt.serviceIds && apt.serviceIds.length > 0) {
            const serviceIds = apt.serviceIds;
            const serviceNames = serviceIds
              .map((id) => {
                const service = services.find((s) => s.id === id);
                return service?.nome;
              })
              .filter(Boolean);
            serviceName = serviceNames.length > 0 
              ? serviceNames.join(', ') 
              : 'Serviço não encontrado';
            serviceId = serviceIds[0] || '';
          } else if (apt.serviceId) {
            const service = services.find((s) => s.id === apt.serviceId);
            serviceName = service?.nome || 'Serviço não encontrado';
            serviceId = apt.serviceId;
          }

          patientMap.set(apt.clientId, {
            patientId: apt.clientId,
            patientName: patient.nome,
            lastAppointmentDate: appointmentDate,
            lastServiceName: serviceName,
            lastServiceId: serviceId,
          });
        }
      });
    }

    // Filtrar pacientes que tiveram última consulta há MAIS de X meses
    // A data de corte é X meses atrás de hoje
    // Queremos pacientes cuja última consulta foi ANTES da data de corte (não igual)
    // Exemplo: se hoje é 15/12/2024 e seleciona "6 meses atrás" (15/06/2024),
    // queremos pacientes cuja última consulta foi ANTES de 15/06/2024 (há mais de 6 meses)
    const filtered = Array.from(patientMap.values()).filter((item) => {
      // Normalizar as datas para comparação (usar apenas data, sem hora)
      const itemDate = startOfDay(item.lastAppointmentDate);
      const cutoff = startOfDay(cutoffDate);
      
      // A última consulta deve ser ANTES da data de corte (não igual)
      // Isso significa que a consulta foi há MAIS de X meses
      const isBeforeCutoff = itemDate.getTime() < cutoff.getTime();
      
      return isBeforeCutoff;
    });

    // Ordenar por data da última consulta (mais recente primeiro)
    return filtered.sort(
      (a, b) => b.lastAppointmentDate.getTime() - a.lastAppointmentDate.getTime()
    );
  }, [appointments, services, patients, cutoffDate]);

  const handleTalkToClient = (patientId: string) => {
    router.push(`/pacientes/detalhe?patientId=${patientId}&tab=interacoes`);
  };

  const getMonthsLabel = (months: string) => {
    const num = parseInt(months);
    if (num === 1) return '1 mês atrás';
    return `${num} meses atrás`;
  };

  if (appointmentsLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Retorno
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-slate-500">Carregando...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full" style={{ position: 'relative', zIndex: 10 }}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Retorno
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Combobox para selecionar período */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">
            Mostrar pacientes com última consulta há:
          </label>
          <Select
            value={selectedMonths}
            onValueChange={setSelectedMonths}
            className="w-full"
          >
            <SelectItem value="1">1 mês atrás</SelectItem>
            <SelectItem value="3">3 meses atrás</SelectItem>
            <SelectItem value="6">6 meses atrás</SelectItem>
            <SelectItem value="12">12 meses atrás</SelectItem>
          </Select>
        </div>

        {/* Lista de pacientes */}
        {patientsWithLastAppointment.length === 0 ? (
          <div className="text-sm text-slate-500 text-center py-4">
            Nenhum paciente encontrado com última consulta há {getMonthsLabel(selectedMonths)}.
          </div>
        ) : (
          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {patientsWithLastAppointment.map((item) => (
              <div
                key={item.patientId}
                className="p-3 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <User className="h-4 w-4 text-slate-500 flex-shrink-0" />
                      <h4 className="font-semibold text-slate-900 truncate">
                        {item.patientName}
                      </h4>
                    </div>
                    <div className="flex items-center gap-2 mb-1 text-sm text-slate-600">
                      <Clock className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                      <span>
                        Último serviço: {item.lastServiceName}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500">
                      Última consulta: {format(item.lastAppointmentDate, "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleTalkToClient(item.patientId)}
                    className="flex items-center gap-2 flex-shrink-0"
                  >
                    <MessageCircle className="h-4 w-4" />
                    <span className="hidden sm:inline">Falar</span>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

