'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Filter, X, Calendar, Users, Clock, DollarSign, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Professional, Service, Patient } from '@/types';
import { useAuth } from '@/lib/auth-context';
import { cn } from '@/lib/utils';

interface AdvancedFiltersProps {
  professionals: Professional[];
  services: Service[];
  patients: Patient[];
  selectedProfessionals: string[];
  selectedServices: string[];
  selectedPatients: string[];
  selectedStatus: string[];
  dateRange: { start: Date | null; end: Date | null };
  priceRange: { min: number; max: number };
  onProfessionalsChange: (professionals: string[]) => void;
  onServicesChange: (services: string[]) => void;
  onPatientsChange: (patients: string[]) => void;
  onStatusChange: (status: string[]) => void;
  onDateRangeChange: (range: { start: Date | null; end: Date | null }) => void;
  onPriceRangeChange: (range: { min: number; max: number }) => void;
  onClearFilters: () => void;
}

export function AdvancedFilters({
  professionals,
  services,
  patients,
  selectedProfessionals,
  selectedServices,
  selectedPatients,
  selectedStatus,
  dateRange,
  priceRange,
  onProfessionalsChange,
  onServicesChange,
  onPatientsChange,
  onStatusChange,
  onDateRangeChange,
  onPriceRangeChange,
  onClearFilters
}: AdvancedFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isMounted, setIsMounted] = useState(false);
  const { themePreference } = useAuth();
  const isVibrant = themePreference === 'vibrant';

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const statusOptions = [
    { value: 'agendado', label: 'Agendado', color: 'bg-blue-500' },
    { value: 'pendente', label: 'Pendente', color: 'bg-yellow-500' },
    { value: 'concluido', label: 'Concluído', color: 'bg-green-500' },
    { value: 'cancelado', label: 'Cancelado', color: 'bg-gray-500' },
    { value: 'no_show', label: 'Faltou', color: 'bg-rose-500' },
    { value: 'bloqueio', label: 'Bloqueio', color: 'bg-violet-500' },
  ];

  const toggleSelection = (
    value: string,
    selected: string[],
    onChange: (values: string[]) => void
  ) => {
    if (selected.includes(value)) {
      onChange(selected.filter(item => item !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  const filteredProfessionals = professionals.filter(pro =>
    pro.apelido.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Filtrar apenas serviços ativos
  const activeServices = services.filter(s => s.ativo);
  const filteredServices = activeServices.filter(service =>
    service.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredPatients = patients.filter(patient =>
    patient.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const hasActiveFilters = 
    selectedProfessionals.length > 0 ||
    selectedServices.length > 0 ||
    selectedPatients.length > 0 ||
    selectedStatus.length > 0 ||
    dateRange.start ||
    dateRange.end ||
    priceRange.min > 0 ||
    priceRange.max < 10000;

  return (
    <div className="relative">
      <Button
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center gap-2',
          isVibrant ? 'border-white/30 text-slate-700 hover:bg-white/40' : ''
        )}
      >
        <Filter className="w-4 h-4" />
        Filtros Avançados
        {hasActiveFilters && (
          <Badge
            variant="secondary"
            className={cn('ml-1', isVibrant ? 'bg-white/40 text-slate-700' : '')}
          >
            {selectedProfessionals.length + selectedServices.length + selectedPatients.length + selectedStatus.length}
          </Badge>
        )}
      </Button>

      {isMounted &&
        createPortal(
          <AnimatePresence>
            {isOpen && (
              <>
                {/* Overlay */}
                <div 
                  className={cn(
                    'fixed inset-0 z-[999998]',
                    isVibrant ? 'bg-slate-900/40 backdrop-blur-lg' : 'bg-black/20'
                  )}
                  onClick={() => setIsOpen(false)}
                />
                {/* Modal */}
                <motion.div
                  initial={{ opacity: 0, y: -12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  className={cn(
                    'fixed z-[999999] top-16 left-1/2 w-full max-w-[min(480px,90vw)] -translate-x-1/2 sm:top-20',
                    isVibrant ? 'backdrop-blur-xl' : ''
                  )}
                  style={{ 
                    position: 'fixed',
                    zIndex: 999999,
                    isolation: 'isolate'
                  }}
                >
                <Card
                  className={cn(
                    'mx-auto w-full shadow-xl max-h-[80vh] overflow-hidden',
                    isVibrant ? 'border border-white/20 bg-white/90 backdrop-blur-2xl' : 'border border-slate-200 bg-white'
                  )}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base sm:text-lg">Filtros Avançados</CardTitle>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsOpen(false)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-3 sm:space-y-6 p-3 sm:p-6 max-h-[60vh] overflow-y-auto">
                {/* Search */}
                <div>
                  <label className={cn(
                    'block text-sm font-medium mb-2',
                    isVibrant ? 'text-slate-700' : 'text-slate-600'
                  )}>
                    Buscar
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      placeholder="Buscar profissionais, serviços, pacientes..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* Professionals */}
                <div>
                  <label className={cn(
                    'block text-sm font-medium mb-2 flex items-center gap-2',
                    isVibrant ? 'text-slate-700' : 'text-slate-600'
                  )}>
                    <Users className="w-4 h-4" />
                    Profissionais
                  </label>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {filteredProfessionals.map(professional => {
                      const isSelected = selectedProfessionals.includes(professional.id);
                      return (
                        <button
                          key={professional.id}
                          type="button"
                          onClick={() => toggleSelection(professional.id, selectedProfessionals, onProfessionalsChange)}
                          className={cn(
                            'flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left transition-colors',
                            isSelected
                              ? 'border-indigo-400 bg-indigo-500/10 text-slate-900'
                              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100/80'
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: professional.corHex }} />
                            <span className="text-sm font-medium">{professional.apelido}</span>
                          </div>
                          <div
                            className={cn(
                              'flex h-5 w-5 items-center justify-center rounded-full border text-xs font-bold transition-colors',
                              isSelected ? 'border-indigo-500 bg-indigo-500 text-white' : 'border-slate-300 text-transparent'
                            )}
                          >
                            ✓
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Services */}
                <div>
                  <label className={cn(
                    'block text-sm font-medium mb-2 flex items-center gap-2',
                    isVibrant ? 'text-slate-700' : 'text-slate-600'
                  )}>
                    <Calendar className="w-4 h-4" />
                    Serviços
                  </label>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {services.length === 0 ? (
                      <div className="text-center py-8 px-4">
                        <p className="text-sm text-slate-500 mb-3">
                          Nenhum serviço cadastrado
                        </p>
                        <p className="text-xs text-slate-400">
                          Cadastre serviços em Configurações → Serviços
                        </p>
                      </div>
                    ) : filteredServices.length === 0 ? (
                      <div className="text-center py-4">
                        <p className="text-xs text-slate-400">
                          Nenhum serviço encontrado para "{searchTerm}"
                        </p>
                      </div>
                    ) : (
                      filteredServices.map(service => {
                        const isSelected = selectedServices.includes(service.id);
                        return (
                          <button
                            key={service.id}
                            type="button"
                            onClick={() => toggleSelection(service.id, selectedServices, onServicesChange)}
                            className={cn(
                              'flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left transition-colors',
                              isSelected
                                ? 'border-indigo-400 bg-indigo-500/10 text-slate-900'
                                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100/80'
                            )}
                          >
                            <span className="text-sm font-medium">
                              {service.nome} - R$ {(service.precoCentavos / 100).toFixed(2)}
                            </span>
                            <div
                              className={cn(
                                'flex h-5 w-5 items-center justify-center rounded-full border text-xs font-bold transition-colors',
                                isSelected ? 'border-indigo-500 bg-indigo-500 text-white' : 'border-slate-300 text-transparent'
                              )}
                            >
                              ✓
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Clients */}
                <div>
                  <label className={cn(
                    'block text-sm font-medium mb-2 flex items-center gap-2',
                    isVibrant ? 'text-slate-700' : 'text-slate-600'
                  )}>
                    <Users className="w-4 h-4" />
                    Pacientes
                  </label>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {filteredPatients.map(patient => {
                      const isSelected = selectedPatients.includes(patient.id);
                      return (
                        <button
                          key={patient.id}
                          type="button"
                          onClick={() => toggleSelection(patient.id, selectedPatients, onPatientsChange)}
                          className={cn(
                            'flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left transition-colors',
                            isSelected
                              ? 'border-indigo-400 bg-indigo-500/10 text-slate-900'
                              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100/80'
                          )}
                        >
                          <span className="text-sm font-medium">{patient.nome}</span>
                          <div
                            className={cn(
                              'flex h-5 w-5 items-center justify-center rounded-full border text-xs font-bold transition-colors',
                              isSelected ? 'border-indigo-500 bg-indigo-500 text-white' : 'border-slate-300 text-transparent'
                            )}
                          >
                            ✓
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Status */}
                <div>
                  <label className={cn(
                    'block text-sm font-medium mb-2 flex items-center gap-2',
                    isVibrant ? 'text-slate-700' : 'text-slate-600'
                  )}>
                    <Clock className="w-4 h-4" />
                    Status
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {statusOptions.map(status => {
                      const isSelected = selectedStatus.includes(status.value);
                      return (
                        <button
                          key={status.value}
                          type="button"
                          onClick={() => toggleSelection(status.value, selectedStatus, onStatusChange)}
                          className={cn(
                            'flex items-center justify-between rounded-lg border px-3 py-2 text-left transition-colors',
                            isSelected
                              ? 'border-indigo-400 bg-indigo-500/10 text-slate-900'
                              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100/80'
                          )}
                        >
                          <div className="flex items-center gap-2 text-sm">
                            <div className={`w-2 h-2 rounded-full ${status.color}`} />
                            {status.label}
                          </div>
                          <div
                            className={cn(
                              'flex h-5 w-5 items-center justify-center rounded-full border text-xs font-bold transition-colors',
                              isSelected ? 'border-indigo-500 bg-indigo-500 text-white' : 'border-slate-300 text-transparent'
                            )}
                          >
                            ✓
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Date Range */}
                <div>
                  <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Período
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      type="date"
                      value={dateRange.start ? dateRange.start.toISOString().split('T')[0] : ''}
                      onChange={(e) => onDateRangeChange({
                        ...dateRange,
                        start: e.target.value ? new Date(e.target.value) : null
                      })}
                    />
                    <Input
                      type="date"
                      value={dateRange.end ? dateRange.end.toISOString().split('T')[0] : ''}
                      onChange={(e) => onDateRangeChange({
                        ...dateRange,
                        end: e.target.value ? new Date(e.target.value) : null
                      })}
                    />
                  </div>
                </div>

                {/* Price Range */}
                <div>
                  <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    Faixa de Preço
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      type="number"
                      placeholder="Mínimo"
                      value={priceRange.min || ''}
                      onChange={(e) => onPriceRangeChange({
                        ...priceRange,
                        min: Number(e.target.value) || 0
                      })}
                    />
                    <Input
                      type="number"
                      placeholder="Máximo"
                      value={priceRange.max || ''}
                      onChange={(e) => onPriceRangeChange({
                        ...priceRange,
                        max: Number(e.target.value) || 10000
                      })}
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className={cn('flex gap-2 pt-3 border-t', isVibrant ? 'border-white/20' : 'border-slate-200')}>
                  <Button
                    variant="outline"
                    onClick={onClearFilters}
                    className={cn(
                      'flex-1 h-10 sm:h-12 text-xs sm:text-sm',
                      isVibrant ? 'border-white/25 text-slate-700 hover:bg-white/40' : ''
                    )}
                  >
                    Limpar Filtros
                  </Button>
                  <Button
                    onClick={() => setIsOpen(false)}
                    className={cn(
                      'flex-1 h-10 sm:h-12 text-xs sm:text-sm text-white',
                      isVibrant
                        ? 'bg-gradient-to-r from-indigo-500 via-purple-500 to-rose-500 hover:from-indigo-600 hover:via-purple-600 hover:to-rose-600'
                        : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700'
                    )}
                  >
                    Aplicar
                  </Button>
                </div>
                  </CardContent>
                </Card>
                </motion.div>
              </>
            )}
          </AnimatePresence>,
          document.body
        )}
    </div>
  );
}
