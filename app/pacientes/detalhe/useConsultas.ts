import { useMemo } from 'react';
import type { Professional, Service, Appointment } from '@/types';
import { formatDateTime } from './utils';

export function useConsultas(
  professionals: Professional[] | undefined,
  services: Service[] | undefined,
  servicesLoading: boolean,
  appointments: Appointment[] | undefined
) {
  const professionalNameById = useMemo(() => {
    const map = new Map<string, string>();
    professionals?.forEach((professional) => {
      map.set(
        professional.id,
        professional.apelido?.trim() ? professional.apelido : 'Profissional sem nome'
      );
    });
    return map;
  }, [professionals]);

  const serviceNameById = useMemo(() => {
    const map = new Map<string, string>();
    if (services && Array.isArray(services) && services.length > 0) {
      services.forEach((service) => {
        if (service && service.id && service.nome) {
          map.set(service.id, service.nome);
        }
      });
      // Debug: log do mapeamento
      if (process.env.NODE_ENV === 'development') {
        console.log('[serviceNameById] Mapeamento criado:', {
          totalServices: services.length,
          mappedServices: map.size,
          serviceIds: Array.from(map.keys()),
          serviceNames: Array.from(map.values())
        });
      }
    } else {
      if (process.env.NODE_ENV === 'development') {
        console.log('[serviceNameById] Nenhum serviço disponível:', {
          services: services,
          isArray: Array.isArray(services),
          length: services?.length
        });
      }
    }
    return map;
  }, [services]);

  const getProfessionalLabel = (professionalId: string) => {
    if (!professionalId) return 'Não informado';
    return professionalNameById.get(professionalId) || professionalId;
  };

  const getServiceLabel = (serviceId: string) => {
    if (!serviceId || !serviceId.trim()) return 'Não informado';
    
    // Tentar encontrar o serviço no mapeamento
    const serviceName = serviceNameById.get(serviceId);
    if (serviceName) {
      return serviceName;
    }
    
    // Se não encontrou e os serviços ainda estão carregando, retornar "Carregando..."
    if (servicesLoading) {
      return 'Carregando...';
    }
    
    // Se não encontrou e os serviços já foram carregados, tentar buscar diretamente no array
    if (services && Array.isArray(services) && services.length > 0) {
      const service = services.find(s => s.id === serviceId);
      if (service && service.nome) {
        // Atualizar o mapeamento para próxima vez (mas não podemos modificar o Map diretamente aqui)
        // O useMemo vai recriar o mapa quando services mudar
        return service.nome;
      }
    }
    
    // Se não encontrou e os serviços já foram carregados, pode ser que o serviço foi deletado
    // Retornar o ID como fallback, mas isso não deveria acontecer normalmente
    if (process.env.NODE_ENV === 'development') {
      console.warn('[getServiceLabel] Serviço não encontrado:', {
        serviceId,
        totalServices: serviceNameById.size,
        servicesArrayLength: services?.length || 0,
        servicesLoaded: !servicesLoading,
        availableServiceIds: Array.from(serviceNameById.keys())
      });
    }
    
    return serviceId; // Retornar o ID como último recurso
  };

  const upcomingAppointments = useMemo(() => {
    if (!appointments) return [];
    const now = new Date();
    return [...appointments]
      .filter(appointment => appointment.inicio >= now)
      .sort((a, b) => a.inicio.getTime() - b.inicio.getTime());
  }, [appointments]);

  const pastAppointments = useMemo(() => {
    if (!appointments) return [];
    const now = new Date();
    return [...appointments]
      .filter(appointment => appointment.inicio < now)
      .sort((a, b) => b.inicio.getTime() - a.inicio.getTime());
  }, [appointments]);

  return {
    professionalNameById,
    serviceNameById,
    getProfessionalLabel,
    getServiceLabel,
    upcomingAppointments,
    pastAppointments,
  };
}

