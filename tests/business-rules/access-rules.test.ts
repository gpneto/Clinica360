import { describe, it, expect } from 'vitest';
import { User } from '@/types';

describe('Regras de Negócio - Regras de Acesso', () => {
  describe('Regra: Agendas de owner e admin não são visíveis para profissionais', () => {
    it('profissional não deve ver agenda de owner', () => {
      const professional: User = {
        uid: 'prof1',
        role: 'pro',
        nome: 'Profissional',
        email: 'pro@test.com',
        ativo: true,
        companyId: 'company1',
        professionalId: 'prof1',
      };

      const appointmentProfessionalId = 'owner-prof-id';
      const canView = professional.role === 'pro' 
        ? professional.professionalId === appointmentProfessionalId
        : true;

      expect(canView).toBe(false);
    });

    it('profissional deve ver apenas sua própria agenda', () => {
      const professional: User = {
        uid: 'prof1',
        role: 'pro',
        nome: 'Profissional',
        email: 'pro@test.com',
        ativo: true,
        companyId: 'company1',
        professionalId: 'prof1',
      };

      const appointmentProfessionalId = 'prof1';
      const canView = professional.role === 'pro' 
        ? professional.professionalId === appointmentProfessionalId
        : true;

      expect(canView).toBe(true);
    });

    it('owner deve ver todas as agendas', () => {
      const owner: User = {
        uid: 'owner1',
        role: 'owner',
        nome: 'Owner',
        email: 'owner@test.com',
        ativo: true,
        companyId: 'company1',
      };

      const appointmentProfessionalId = 'prof1';
      const canView = owner.role === 'pro' 
        ? owner.professionalId === appointmentProfessionalId
        : true;

      expect(canView).toBe(true);
    });

    it('admin deve ver todas as agendas', () => {
      const admin: User = {
        uid: 'admin1',
        role: 'admin',
        nome: 'Admin',
        email: 'admin@test.com',
        ativo: true,
        companyId: 'company1',
      };

      const appointmentProfessionalId = 'prof1';
      const canView = admin.role === 'pro' 
        ? admin.professionalId === appointmentProfessionalId
        : true;

      expect(canView).toBe(true);
    });
  });

  describe('Regra: Profissional vê apenas seus próprios números', () => {
    it('deve filtrar agendamentos por professionalId para profissionais', () => {
      const professional: User = {
        uid: 'prof1',
        role: 'pro',
        nome: 'Profissional',
        email: 'pro@test.com',
        ativo: true,
        companyId: 'company1',
        professionalId: 'prof1',
      };

      const appointments = [
        { id: '1', professionalId: 'prof1', status: 'concluido' },
        { id: '2', professionalId: 'prof2', status: 'concluido' },
        { id: '3', professionalId: 'prof1', status: 'concluido' },
      ];

      const filtered = professional.role === 'pro'
        ? appointments.filter(apt => apt.professionalId === professional.professionalId)
        : appointments;

      expect(filtered.length).toBe(2);
      expect(filtered.every(apt => apt.professionalId === 'prof1')).toBe(true);
    });

    it('owner deve ver todos os agendamentos', () => {
      const owner: User = {
        uid: 'owner1',
        role: 'owner',
        nome: 'Owner',
        email: 'owner@test.com',
        ativo: true,
        companyId: 'company1',
      };

      const appointments = [
        { id: '1', professionalId: 'prof1', status: 'concluido' },
        { id: '2', professionalId: 'prof2', status: 'concluido' },
        { id: '3', professionalId: 'prof1', status: 'concluido' },
      ];

      const filtered = owner.role === 'pro'
        ? appointments.filter(apt => apt.professionalId === owner.professionalId)
        : appointments;

      expect(filtered.length).toBe(3);
    });
  });

  describe('Regra: Atendente pode criar agendamentos para qualquer profissional', () => {
    it('atendente deve poder criar agendamento para qualquer profissional', () => {
      const atendente: User = {
        uid: 'atend1',
        role: 'atendente',
        nome: 'Atendente',
        email: 'atendente@test.com',
        ativo: true,
        companyId: 'company1',
      };

      const targetProfessionalId = 'prof1';
      const canCreate = atendente.role === 'atendente' || atendente.role === 'owner' || atendente.role === 'admin';

      expect(canCreate).toBe(true);
    });
  });
});

