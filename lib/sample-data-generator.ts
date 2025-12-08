import { 
  collection, 
  doc, 
  writeBatch, 
  Timestamp 
} from 'firebase/firestore';
import { db } from './firebase';

interface GenerateSampleDataOptions {
  companyId: string;
  userId: string;
  onProgress?: (message: string, totalCreated: number) => void;
}

interface GenerateSampleDataResult {
  patientsCreated: number;
  servicesCreated: number;
  professionalsCreated: number;
  appointmentsCreated: number;
}

export class SampleDataGenerator {
  private batchSize = 500; // Limite do Firestore
  private batch: ReturnType<typeof writeBatch>;
  private batchCount = 0;
  private totalCreated = 0;
  private onProgress?: (message: string, totalCreated: number) => void;

  // Arrays para armazenar IDs criados e dados dos serviços
  private patientIds: string[] = [];
  private serviceIds: string[] = [];
  private serviceDataMap: Map<string, { duracaoMin: number; precoCentavos: number; comissaoPercent: number }> = new Map();
  private professionalIds: string[] = [];

  constructor(private companyId: string, private userId: string) {
    this.batch = writeBatch(db);
  }

  private logProgress(message: string) {
    if (this.onProgress) {
      this.onProgress(message, this.totalCreated);
    }
    console.log(message);
  }

  private async commitBatchIfNeeded(): Promise<void> {
    if (this.batchCount >= this.batchSize) {
      await this.batch.commit();
      this.totalCreated += this.batchCount;
      this.logProgress(`Criados ${this.totalCreated} registros...`);
      this.batch = writeBatch(db); // Criar novo batch
      this.batchCount = 0;
    }
  }

  private async finalizeBatch(): Promise<void> {
    if (this.batchCount > 0) {
      await this.batch.commit();
      this.totalCreated += this.batchCount;
    }
  }

  private async createPatients(): Promise<void> {
    const nomesClientes = [
      'Ana Silva', 'Bruno Santos', 'Carla Oliveira', 'Diego Costa', 'Eduarda Lima',
      'Felipe Alves', 'Gabriela Souza', 'Henrique Martins', 'Isabela Ferreira', 'João Pedro',
      'Karina Rodrigues', 'Lucas Pereira', 'Mariana Araújo', 'Nicolas Barbosa', 'Olivia Rocha',
      'Pedro Henrique', 'Quésia Dias', 'Rafael Monteiro', 'Sophia Cardoso', 'Thiago Nunes',
      'Valentina Gomes', 'Wesley Ribeiro', 'Yasmin Carvalho', 'Zeca Moreira', 'Amanda Teixeira',
      'Bernardo Lopes', 'Camila Freitas', 'Daniel Castro', 'Elisa Moura', 'Fernando Ramos',
      'Giovanna Correia', 'Hugo Azevedo', 'Iara Mendes', 'Juliano Farias', 'Larissa Cunha',
      'Marcos Pires', 'Natália Rezende', 'Otávio Machado', 'Patrícia Viana', 'Rafaela Barros',
      'Sérgio Nascimento', 'Tatiana Campos', 'Ubirajara Dantas', 'Vanessa Melo', 'Wagner Pinheiro',
      'Ximena Torres', 'Yago Siqueira', 'Zara Vasconcelos', 'Adriana Brito', 'Breno Tavares',
      'Cíntia Aguiar', 'Débora Figueiredo', 'Emanuel Coelho', 'Fabiana Macedo', 'Gustavo Paiva',
      'Helena Queiroz', 'Igor Santana', 'Jéssica Vieira', 'Kleber Xavier', 'Luciana Bento'
    ];

    const telefones = Array.from({ length: 60 }, (_, i) => {
      const ddd = String(Math.floor(Math.random() * 90) + 11).padStart(2, '0');
      const numero = String(Math.floor(Math.random() * 90000000) + 10000000);
      return `+55${ddd}${numero}`;
    });

    const preferenciasNotificacao: ('whatsapp' | 'sms' | 'email')[] = ['whatsapp', 'sms', 'email'];

    for (let i = 0; i < 60; i++) {
      const patientRef = doc(collection(db, `companies/${this.companyId}/patients`));
      this.batch.set(patientRef, {
        companyId: this.companyId,
        nome: nomesClientes[i],
        telefoneE164: telefones[i],
        email: `${nomesClientes[i].toLowerCase().replace(/\s+/g, '.')}@exemplo.com`,
        preferenciaNotificacao: preferenciasNotificacao[Math.floor(Math.random() * preferenciasNotificacao.length)],
        ownerUid: this.userId,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });
      this.patientIds.push(patientRef.id);
      this.batchCount++;

      await this.commitBatchIfNeeded();
    }
  }

  private async createServices(): Promise<void> {
    const servicos = [
      { nome: 'Consulta', duracaoMin: 30, precoCentavos: 15000, comissaoPercent: 30 },
      { nome: 'Limpeza', duracaoMin: 45, precoCentavos: 8000, comissaoPercent: 25 },
      { nome: 'Tratamento', duracaoMin: 60, precoCentavos: 25000, comissaoPercent: 35 },
      { nome: 'Avaliação', duracaoMin: 20, precoCentavos: 5000, comissaoPercent: 20 },
      { nome: 'Retorno', duracaoMin: 15, precoCentavos: 3000, comissaoPercent: 15 },
      { nome: 'Procedimento Especial', duracaoMin: 90, precoCentavos: 50000, comissaoPercent: 40 },
      { nome: 'Consulta de Urgência', duracaoMin: 40, precoCentavos: 20000, comissaoPercent: 30 },
      { nome: 'Acompanhamento', duracaoMin: 25, precoCentavos: 6000, comissaoPercent: 20 }
    ];

    for (let idx = 0; idx < servicos.length; idx++) {
      const servico = servicos[idx];
      const serviceRef = doc(collection(db, `companies/${this.companyId}/services`));
      this.batch.set(serviceRef, {
        companyId: this.companyId,
        ...servico,
        ativo: true,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });
      this.serviceIds.push(serviceRef.id);
      this.serviceDataMap.set(serviceRef.id, {
        duracaoMin: servico.duracaoMin,
        precoCentavos: servico.precoCentavos,
        comissaoPercent: servico.comissaoPercent
      });
      this.batchCount++;

      await this.commitBatchIfNeeded();
    }
  }

  private async createProfessionals(): Promise<void> {
    const profissionais = [
      { apelido: 'Dr. João', corHex: '#3B82F6' },
      { apelido: 'Dra. Maria', corHex: '#EF4444' },
      { apelido: 'Dr. Carlos', corHex: '#10B981' },
      { apelido: 'Dra. Ana', corHex: '#F59E0B' },
      { apelido: 'Dr. Pedro', corHex: '#8B5CF6' },
      { apelido: 'Dra. Julia', corHex: '#EC4899' },
      { apelido: 'Dr. Lucas', corHex: '#06B6D4' }
    ];

    for (const prof of profissionais) {
      const professionalRef = doc(collection(db, `companies/${this.companyId}/professionals`));
      this.batch.set(professionalRef, {
        companyId: this.companyId,
        ...prof,
        ativo: true,
        janelaAtendimento: {
          diasSemana: [1, 2, 3, 4, 5], // Segunda a sexta
          inicio: '08:00',
          fim: '18:00'
        },
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });
      this.professionalIds.push(professionalRef.id);
      this.batchCount++;

      await this.commitBatchIfNeeded();
    }
  }

  private async createAppointments(): Promise<number> {
    const hoje = new Date();
    const inicioMesAtual = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const fimPeriodo = new Date(hoje.getFullYear(), hoje.getMonth() + 4, 0); // 3 meses + mês atual
    let eventosCriados = 0;

    // Gerar eventos para cada dia do período
    for (let data = new Date(inicioMesAtual); data <= fimPeriodo; data.setDate(data.getDate() + 1)) {
      // Pular domingos (dia 0)
      if (data.getDay() === 0) continue;

      // Gerar 1 a 5 eventos por dia
      const numEventos = Math.floor(Math.random() * 5) + 1;

      for (let i = 0; i < numEventos; i++) {
        const professionalId = this.professionalIds[Math.floor(Math.random() * this.professionalIds.length)];
        const clientId = this.patientIds[Math.floor(Math.random() * this.patientIds.length)];
        const serviceId = this.serviceIds[Math.floor(Math.random() * this.serviceIds.length)];
        const service = this.serviceDataMap.get(serviceId);
        
        if (!service) continue; // Segurança

        // Horário aleatório entre 8h e 17h
        const hora = Math.floor(Math.random() * 9) + 8;
        const minuto = Math.random() < 0.5 ? 0 : 30;
        const inicio = new Date(data);
        inicio.setHours(hora, minuto, 0, 0);
        const fim = new Date(inicio);
        fim.setMinutes(fim.getMinutes() + service.duracaoMin);

        // Status aleatório, mas eventos passados têm mais chance de estar concluídos
        let status: 'agendado' | 'confirmado' | 'concluido' | 'cancelado' | 'no_show';
        if (inicio < hoje) {
          // Eventos passados: mais chance de concluído
          const rand = Math.random();
          if (rand < 0.6) status = 'concluido';
          else if (rand < 0.75) status = 'cancelado';
          else if (rand < 0.85) status = 'no_show';
          else if (rand < 0.95) status = 'confirmado';
          else status = 'agendado';
        } else {
          // Eventos futuros: mais chance de agendado/confirmado
          const rand = Math.random();
          if (rand < 0.4) status = 'agendado';
          else if (rand < 0.7) status = 'confirmado';
          else if (rand < 0.85) status = 'cancelado';
          else if (rand < 0.95) status = 'no_show';
          else status = 'concluido';
        }

        const appointmentRef = doc(collection(db, `companies/${this.companyId}/appointments`));
        this.batch.set(appointmentRef, {
          companyId: this.companyId,
          professionalId,
          clientId,
          serviceId,
          inicio: Timestamp.fromDate(inicio),
          fim: Timestamp.fromDate(fim),
          precoCentavos: service.precoCentavos,
          comissaoPercent: service.comissaoPercent,
          status,
          createdByUid: this.userId,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        });
        eventosCriados++;
        this.batchCount++;

        await this.commitBatchIfNeeded();
      }
    }

    return eventosCriados;
  }

  async generate(options?: { onProgress?: (message: string, totalCreated: number) => void }): Promise<GenerateSampleDataResult> {
    this.onProgress = options?.onProgress;

    try {
      this.logProgress('Criando clientes...');
      await this.createPatients();

      this.logProgress('Criando serviços...');
      await this.createServices();

      this.logProgress('Criando profissionais...');
      await this.createProfessionals();

      this.logProgress('Criando eventos na agenda...');
      const eventosCriados = await this.createAppointments();

      // Commit do batch final
      await this.finalizeBatch();

      return {
        patientsCreated: this.patientIds.length,
        servicesCreated: this.serviceIds.length,
        professionalsCreated: this.professionalIds.length,
        appointmentsCreated: eventosCriados
      };
    } catch (error) {
      // Tentar fazer commit do que foi criado até agora
      try {
        await this.finalizeBatch();
      } catch (commitError) {
        console.error('Erro ao fazer commit final:', commitError);
      }
      throw error;
    }
  }

  static async generateSampleData(
    options: GenerateSampleDataOptions
  ): Promise<GenerateSampleDataResult> {
    const generator = new SampleDataGenerator(options.companyId, options.userId);
    return generator.generate({ onProgress: options.onProgress });
  }
}




