'use client';

import React from 'react';
import { Calendar, Clock, User, Briefcase, DollarSign, CheckCircle2, XCircle, AlertCircle, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';

// Componente para renderizar card de agendamento
export function AppointmentCard({ appointment, onAction }: { 
  appointment: any; 
  onAction?: (action: string, appointmentId: string) => void;
}) {
  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('pt-BR', {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const formatTime = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'confirmado':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'concluido':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'cancelado':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'agendado':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'confirmado':
      case 'concluido':
        return <CheckCircle2 className="w-4 h-4" />;
      case 'cancelado':
        return <XCircle className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-4 h-4 text-gray-500" />
            <span className="font-semibold text-gray-900">{formatDate(appointment.inicio)}</span>
            <Clock className="w-4 h-4 text-gray-500 ml-2" />
            <span className="text-gray-700">{formatTime(appointment.inicio)}</span>
          </div>
          
          <div className="space-y-1 text-sm">
            {appointment.patientName && (
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-gray-400" />
                <span className="text-gray-700">{appointment.patientName}</span>
              </div>
            )}
            {appointment.professionalName && (
              <div className="flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-gray-400" />
                <span className="text-gray-700">{appointment.professionalName}</span>
              </div>
            )}
            {appointment.serviceName && (
              <div className="flex items-center gap-2">
                <span className="text-gray-500">Serviço:</span>
                <span className="text-gray-700">{appointment.serviceName}</span>
              </div>
            )}
            {appointment.precoCentavos && (
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-gray-400" />
                <span className="text-gray-700">
                  R$ {(appointment.precoCentavos / 100).toFixed(2).replace('.', ',')}
                </span>
              </div>
            )}
          </div>
        </div>
        
        {appointment.status && (
          <div className={cn(
            'px-2 py-1 rounded-full text-xs font-medium border flex items-center gap-1',
            getStatusColor(appointment.status)
          )}>
            {getStatusIcon(appointment.status)}
            <span className="capitalize">{appointment.status}</span>
          </div>
        )}
      </div>

    </div>
  );
}

// Componente para renderizar estatísticas
export function StatisticsCard({ stats }: { stats: any }) {
  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
      <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
        <BarChart3 className="w-5 h-5 text-blue-600" />
        Estatísticas
      </h4>
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded p-2">
          <div className="text-xs text-gray-500">Total</div>
          <div className="text-lg font-bold text-gray-900">{stats.totalAgendamentos || 0}</div>
        </div>
        <div className="bg-white rounded p-2">
          <div className="text-xs text-gray-500">Concluídos</div>
          <div className="text-lg font-bold text-green-600">{stats.concluidos || 0}</div>
        </div>
        {stats.valorRecebidoReais !== undefined && (
          <div className="bg-white rounded p-2 col-span-2">
            <div className="text-xs text-gray-500">Valor Recebido</div>
            <div className="text-xl font-bold text-green-600">
              R$ {stats.valorRecebidoReais.toFixed(2).replace('.', ',')}
            </div>
          </div>
        )}
        {stats.valorPrevisaoReais !== undefined && (
          <div className="bg-white rounded p-2 col-span-2">
            <div className="text-xs text-gray-500">Previsão</div>
            <div className="text-xl font-bold text-blue-600">
              R$ {stats.valorPrevisaoReais.toFixed(2).replace('.', ',')}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Componente para renderizar lista de pacientes/profissionais/serviços
export function ListCard({ items, title, onSelect }: { 
  items: Array<{ id: string; nome?: string; apelido?: string }>; 
  title: string;
  onSelect?: (id: string) => void;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <h4 className="font-semibold text-gray-900 mb-3">{title}</h4>
      <div className="space-y-2">
        {items.slice(0, 10).map((item, index) => (
          <div
            key={item.id}
            className={cn(
              'p-2 rounded hover:bg-gray-50 transition-colors cursor-pointer',
              onSelect && 'hover:bg-blue-50'
            )}
            onClick={() => onSelect?.(item.id)}
          >
            <div className="flex items-center gap-2">
              <span className="text-gray-500 text-sm">{index + 1}.</span>
              <span className="text-gray-900">{item.nome || item.apelido || 'Sem nome'}</span>
            </div>
          </div>
        ))}
        {items.length > 10 && (
          <div className="text-xs text-gray-500 text-center pt-2">
            +{items.length - 10} mais
          </div>
        )}
      </div>
    </div>
  );
}

