'use client';

import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Clock, MapPin, DollarSign, User, Scissors, Edit, Trash2, Phone, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Appointment, Professional, Service, Patient } from '@/types';

interface AppointmentListProps {
  appointments: Appointment[];
  professionals: Professional[];
  services: Service[];
  patients: Patient[];
  onEdit: (appointment: Appointment) => void;
  onDelete: (appointment: Appointment) => void;
}

export function AppointmentList({
  appointments,
  professionals,
  services,
  patients,
  onEdit,
  onDelete
}: AppointmentListProps) {
  
  const getStatusColor = (appointment: Appointment) => {
    // PRIORIDADE: Se o paciente não veio, sempre vermelho (no-show)
    if (appointment.clientePresente === false) {
      return 'bg-red-100 text-red-800 border-red-300';
    }
    
    // Se o cliente veio, usar classe baseada no status
    switch (appointment.status) {
      case 'concluido':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'pendente':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'cancelado':
        return 'bg-gray-100 text-gray-800 border-gray-300';
      case 'agendado':
      default:
        return 'bg-blue-100 text-blue-800 border-blue-300';
    }
  };

  const getStatusLabel = (appointment: Appointment) => {
    // PRIORIDADE: Se o paciente não veio, sempre "Paciente não veio"
    if (appointment.clientePresente === false) {
      return 'Paciente não veio';
    }
    
    // Se o cliente veio, usar label baseado no status
    switch (appointment.status) {
      case 'concluido':
        return 'Concluído';
      case 'pendente':
        return 'Pendente';
      case 'cancelado':
        return 'Cancelado';
      case 'agendado':
      default:
        return 'Agendado';
    }
  };

  return (
    <div className="space-y-3">
      {appointments.length === 0 ? (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-16"
        >
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl mb-6 shadow-lg">
            <Clock className="w-10 h-10 text-gray-500" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-3">
            Nenhum agendamento encontrado
          </h3>
          <p className="text-gray-600 max-w-md mx-auto">
            Não há agendamentos para exibir com os filtros aplicados.
          </p>
        </motion.div>
      ) : (
        appointments.map((appointment, index) => {
          const professional = professionals.find(p => p.id === appointment.professionalId);
          // Buscar todos os serviços do agendamento
          const appointmentServiceIds = appointment.serviceIds && appointment.serviceIds.length > 0
            ? appointment.serviceIds
            : [appointment.serviceId];
          const appointmentServices = services.filter(s => appointmentServiceIds.includes(s.id));
          const service = appointmentServices[0]; // Primeiro serviço para compatibilidade
          const patient = patients.find(c => c.id === appointment.clientId);
          const isBlock = appointment.isBlock || appointment.status === 'bloqueio';

          const startDate = appointment.inicio;
          const endDate = appointment.fim;

          return (
            <motion.div
              key={appointment.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.03 }}
              className="group bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden"
            >
              <div className={`h-1 w-full ${
                isBlock ? 'bg-violet-500' :
                appointment.clientePresente === false ? 'bg-red-500' :
                appointment.status === 'concluido' ? 'bg-green-500' :
                appointment.status === 'pendente' ? 'bg-yellow-500' :
                appointment.status === 'cancelado' ? 'bg-gray-500' :
                'bg-blue-500'
              }`} />

              <div className="p-4">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-sm ${
                        isBlock ? 'bg-violet-600 text-white' : 'bg-slate-900 text-white'
                      }`}>
                        {isBlock ? 'B' : <User className="w-4 h-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-bold text-gray-900 truncate">
                          {isBlock ? 'Bloqueio de agenda' : (patient?.nome || 'Paciente não encontrado')}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <Clock className="w-3 h-3 text-gray-500" />
                          <span className="text-sm text-gray-600">
                            {format(startDate, "dd/MM 'às' HH:mm", { locale: ptBR })} - {format(endDate, 'HH:mm', { locale: ptBR })}
                          </span>
                        </div>
                      </div>
                    </div>
                    {isBlock && (
                      <p className="text-xs text-violet-700 font-medium">
                        {appointment.blockScope === 'all' || appointment.professionalId === '__all__'
                          ? 'Aplica-se a todos os profissionais'
                          : 'Bloqueio para profissional específico'}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <Badge className={`${getStatusColor(appointment)} text-xs px-2 py-1 font-semibold`}>
                      {getStatusLabel(appointment)}
                    </Badge>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit(appointment)}
                        className="h-8 w-8 p-0 hover:bg-blue-100 hover:text-blue-700"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDelete(appointment)}
                        className="h-8 w-8 p-0 hover:bg-red-100 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {isBlock ? (
                    <>
                      <div className="flex items-center gap-3 p-3 bg-violet-50 rounded-xl border border-violet-200">
                        <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center text-white shadow-sm">
                          <Clock className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-violet-700 mb-0.5">Horário</p>
                          <p className="text-sm font-semibold text-violet-900">
                            {format(startDate, 'HH:mm')} - {format(endDate, 'HH:mm')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 bg-violet-50 rounded-xl border border-violet-200">
                        <div className="w-8 h-8 rounded-lg bg-violet-500 flex items-center justify-center text-white shadow-sm">
                          <MapPin className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-violet-700 mb-0.5">Escopo</p>
                          <p className="text-sm font-semibold text-violet-900 truncate">
                            {appointment.blockScope === 'all' || appointment.professionalId === '__all__'
                              ? 'Todos os profissionais'
                              : (professional?.apelido || 'Profissional não informado')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 bg-violet-50 rounded-xl border border-violet-200">
                        <div className="w-8 h-8 rounded-lg bg-violet-400 flex items-center justify-center text-white shadow-sm">
                          <Scissors className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-violet-700 mb-0.5">Descrição</p>
                          <p className="text-sm text-violet-900 truncate">
                            {appointment.blockDescription || 'Bloqueio de agenda'}
                          </p>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      {professional && (
                        <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                          <div 
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-sm"
                            style={{ backgroundColor: professional.corHex }}
                          >
                            {professional.apelido.charAt(0)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-gray-500 mb-0.5">Profissional</p>
                            <p className="text-sm font-semibold text-gray-900 truncate">
                              {professional.apelido}
                            </p>
                          </div>
                        </div>
                      )}
                      {service && (
                        <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                          <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center text-white shadow-sm">
                            <Scissors className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-gray-500 mb-0.5">
                              Serviço{appointmentServices.length > 1 ? 's' : ''}
                            </p>
                            <p className="text-sm font-semibold text-gray-900 truncate">
                              {appointmentServices.length > 0
                                ? appointmentServices.length === 1
                                  ? appointmentServices[0].nome
                                  : `${appointmentServices.length} serviços`
                                : service?.nome || 'Serviço não encontrado'}
                            </p>
                          </div>
                        </div>
                      )}
                      <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                        <div className="w-8 h-8 rounded-lg bg-slate-200 flex items-center justify-center text-slate-700 shadow-sm">
                          <DollarSign className="w-4 h-4" />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-medium text-gray-500 mb-0.5">Valor</p>
                          <p className="text-sm font-semibold text-gray-900">
                            R$ {(appointment.precoCentavos / 100).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {!isBlock && patient && (patient.telefoneE164 || patient.email) && (
                  <div className="mt-4 pt-3 border-t border-gray-200">
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      {patient.telefoneE164 && (
                        <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg">
                          <Phone className="w-4 h-4 text-gray-500" />
                          <span className="font-medium">{patient.telefoneE164}</span>
                        </div>
                      )}
                      {patient.email && (
                        <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg">
                          <Mail className="w-4 h-4 text-gray-500" />
                          <span className="font-medium truncate">{patient.email}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {!isBlock && appointment.observacoes && (
                  <div className="mt-4 pt-3 border-t border-gray-200">
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3 italic leading-relaxed">
                        "{appointment.observacoes}"
                      </p>
                    </div>
                  </div>
                )}

                <div className="mt-4 flex items-center justify-between border-t pt-4">
                  <div className="flex items-center gap-3 text-sm text-gray-500">
                    <Clock className="w-4 h-4" />
                    <span>
                      {format(startDate, "dd 'de' MMMM", { locale: ptBR })} •{' '}
                      {format(startDate, 'HH:mm', { locale: ptBR })} - {format(endDate, 'HH:mm', { locale: ptBR })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onEdit(appointment)}
                      className="border-2 hover:bg-blue-50 hover:border-blue-300 transition-all duration-200"
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Editar
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => onDelete(appointment)}
                      className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      {isBlock ? 'Remover' : 'Cancelar'}
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })
      )}
    </div>
  );
}
