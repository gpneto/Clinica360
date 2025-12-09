'use client';

import { useState, useEffect } from 'react';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  onSnapshot,
  query,
  orderBy,
  where,
  Timestamp,
  QueryConstraint,
  DocumentData
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  Professional,
  Service,
  Patient,
  Appointment,
  Company,
  CompanyUser,
  PatientEvolution,
  PatientEvolutionImage,
  ProcedimentoOdontologico,
  Orcamento,
  DebitoPaciente,
  LancamentoDebito,
} from '@/types';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';
import moment from 'moment';
import { firestoreCache, CACHE_TTL } from '@/lib/firestore-cache';

// Hook para gerenciar profissionais
export function useProfessionals(companyId: string | null | undefined) {
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!companyId) {
      setProfessionals([]);
      setLoading(false);
      return;
    }

    const collectionPath = `companies/${companyId}/professionals`;
    
    // Tentar obter do cache primeiro
    const cachedData = firestoreCache.getQuery<Professional[]>(
      collectionPath,
      undefined,
      'apelido'
    );
    
    if (cachedData) {
      setProfessionals(cachedData);
      setLoading(false);
    }

    // Query já está isolada pelo caminho companies/${companyId}/professionals
    const q = query(
      collection(db, collectionPath),
      orderBy('apelido', 'asc')
    );

    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Professional[];
        
        // Atualizar cache
        firestoreCache.setQuery(
          collectionPath,
          data,
          undefined,
          'apelido',
          CACHE_TTL.PROFESSIONAL
        );
        
        setProfessionals(data);
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [companyId]);

  const createProfessional = async (data: Omit<Professional, 'id'>) => {
    if (!companyId) throw new Error('companyId é obrigatório');
    try {
      await addDoc(collection(db, `companies/${companyId}/professionals`), {
        ...data,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });
      // Invalidar cache
      firestoreCache.invalidateCollection(`companies/${companyId}/professionals`);
    } catch (err) {
      throw new Error('Erro ao criar profissional');
    }
  };

  const updateProfessional = async (id: string, data: Partial<Professional>) => {
    if (!companyId) throw new Error('companyId é obrigatório');
    try {
      const payload: Record<string, unknown> = {
        ...data,
        updatedAt: Timestamp.now()
      };
      
      // Remover valores undefined e null (Firestore não aceita undefined)
      Object.keys(payload).forEach((key) => {
        if (payload[key] === undefined) {
          delete payload[key];
        }
      });
      
      await updateDoc(doc(db, `companies/${companyId}/professionals`, id), payload);
      // Invalidar cache
      firestoreCache.invalidateCollection(`companies/${companyId}/professionals`);
      firestoreCache.invalidateDoc(`companies/${companyId}/professionals`, id);
    } catch (err: any) {
      console.error('[updateProfessional] Erro detalhado:', err);
      const errorMessage = err?.message || 'Erro ao atualizar profissional';
      throw new Error(errorMessage);
    }
  };

  const deleteProfessional = async (id: string) => {
    if (!companyId) throw new Error('companyId é obrigatório');
    try {
      await deleteDoc(doc(db, `companies/${companyId}/professionals`, id));
      // Invalidar cache
      firestoreCache.invalidateCollection(`companies/${companyId}/professionals`);
      firestoreCache.invalidateDoc(`companies/${companyId}/professionals`, id);
    } catch (err) {
      throw new Error('Erro ao deletar profissional');
    }
  };

  return {
    professionals,
    loading,
    error,
    createProfessional,
    updateProfessional,
    deleteProfessional
  };
}

// Hook para gerenciar serviços
export function useServices(companyId: string | null | undefined) {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!companyId) {
      setServices([]);
      setLoading(false);
      return;
    }

    const collectionPath = `companies/${companyId}/services`;
    
    // Tentar obter do cache primeiro
    const cachedData = firestoreCache.getQuery<Service[]>(
      collectionPath,
      undefined,
      'nome'
    );
    
    if (cachedData) {
      setServices(cachedData);
      setLoading(false);
    }

    // Adicionar filtro de companyId para segurança extra
    // Query já está isolada pelo caminho companies/${companyId}/services
    const q = query(
      collection(db, collectionPath),
      orderBy('nome', 'asc')
    );

    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Service[];
        
        // Atualizar cache
        firestoreCache.setQuery(
          collectionPath,
          data,
          undefined,
          'nome',
          CACHE_TTL.SERVICE
        );
        
        setServices(data);
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [companyId]);

  const createService = async (data: Omit<Service, 'id'>) => {
    if (!companyId) throw new Error('companyId é obrigatório');
    try {
      await addDoc(collection(db, `companies/${companyId}/services`), {
        ...data,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });
      // Invalidar cache
      firestoreCache.invalidateCollection(`companies/${companyId}/services`);
    } catch (err: any) {
      console.error('[createService] Erro detalhado:', err);
      const errorMessage = err?.message || 'Erro ao criar serviço';
      throw new Error(errorMessage);
    }
  };

  const updateService = async (id: string, data: Partial<Service>) => {
    if (!companyId) throw new Error('companyId é obrigatório');
    try {
      await updateDoc(doc(db, `companies/${companyId}/services`, id), {
        ...data,
        updatedAt: Timestamp.now()
      });
      // Invalidar cache
      firestoreCache.invalidateCollection(`companies/${companyId}/services`);
      firestoreCache.invalidateDoc(`companies/${companyId}/services`, id);
    } catch (err) {
      throw new Error('Erro ao atualizar serviço');
    }
  };

  const deleteService = async (id: string) => {
    if (!companyId) throw new Error('companyId é obrigatório');
    try {
      await deleteDoc(doc(db, `companies/${companyId}/services`, id));
      // Invalidar cache
      firestoreCache.invalidateCollection(`companies/${companyId}/services`);
      firestoreCache.invalidateDoc(`companies/${companyId}/services`, id);
    } catch (err) {
      throw new Error('Erro ao deletar serviço');
    }
  };

  return {
    services,
    loading,
    error,
    createService,
    updateService,
    deleteService
  };
}

// Hook para gerenciar clientes
export function usePatients(companyId: string | null | undefined) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!companyId) {
      setPatients([]);
      setLoading(false);
      return;
    }

    const collectionPath = `companies/${companyId}/patients`;
    
    // Tentar obter do cache primeiro
    const cachedData = firestoreCache.getQuery<Patient[]>(
      collectionPath,
      undefined,
      'nome'
    );
    
    if (cachedData) {
      setPatients(cachedData);
      setLoading(false);
    }

    // Query já está isolada pelo caminho companies/${companyId}/patients
    const q = query(
      collection(db, collectionPath),
      orderBy('nome', 'asc')
    );

    const unsubscribe = onSnapshot(q,
      (snapshot) => {
        const data = snapshot.docs.map(doc => {
          const docData = doc.data() as Partial<Patient> & {
            dataNascimento?: Timestamp | Date | string;
            ultimoProcedimentoDate?: Timestamp | Date | string;
          };
          
          // Converter dataNascimento do Firestore Timestamp para Date se existir
          let dataNascimento: Date | undefined;
          if (docData.dataNascimento) {
            if (docData.dataNascimento instanceof Date) {
              dataNascimento = docData.dataNascimento;
            } else if (docData.dataNascimento && typeof docData.dataNascimento === 'object' && 'toDate' in docData.dataNascimento) {
              // Firestore Timestamp
              dataNascimento = (docData.dataNascimento as Timestamp).toDate();
            } else {
              // String ou outro formato
              const parsedDate = new Date(docData.dataNascimento);
              if (!isNaN(parsedDate.getTime())) {
                dataNascimento = parsedDate;
              }
            }
          }

          // Converter ultimoProcedimentoDate do Firestore Timestamp para Date se existir
          let ultimoProcedimentoDate: Date | undefined;
          if (docData.ultimoProcedimentoDate) {
            if (docData.ultimoProcedimentoDate instanceof Date) {
              ultimoProcedimentoDate = docData.ultimoProcedimentoDate;
            } else if (docData.ultimoProcedimentoDate && typeof docData.ultimoProcedimentoDate === 'object' && 'toDate' in docData.ultimoProcedimentoDate) {
              // Firestore Timestamp
              ultimoProcedimentoDate = (docData.ultimoProcedimentoDate as Timestamp).toDate();
            } else {
              // String ou outro formato
              const parsedDate = new Date(docData.ultimoProcedimentoDate);
              if (!isNaN(parsedDate.getTime())) {
                ultimoProcedimentoDate = parsedDate;
              }
            }
          }
          
          return {
            id: doc.id,
            ...docData,
            dataNascimento: dataNascimento,
            ultimoProcedimentoDate: ultimoProcedimentoDate,
          } as Patient;
        });
        
        // Atualizar cache
        firestoreCache.setQuery(
          collectionPath,
          data,
          undefined,
          'nome',
          CACHE_TTL.PATIENT
        );
        
        setPatients(data);
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [companyId]);

  const createPatient = async (data: Omit<Patient, 'id'>) => {
    if (!companyId) throw new Error('companyId é obrigatório');
    try {
      const payload: Record<string, unknown> = {
        ...data,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };

      Object.keys(payload).forEach((key) => {
        if (payload[key] === undefined || payload[key] === null) {
          delete payload[key];
        }
      });

      const docRef = await addDoc(collection(db, `companies/${companyId}/patients`), payload);
      
      // Invalidar cache
      firestoreCache.invalidateCollection(`companies/${companyId}/patients`);
      
      return { id: docRef.id, ...data };
    } catch (err) {
      console.error('[createPatient] Erro detalhado:', err);
      throw new Error('Erro ao criar paciente');
    }
  };

  const updatePatient = async (id: string, data: Partial<Patient>) => {
    if (!companyId) throw new Error('companyId é obrigatório');
    try {
      await updateDoc(doc(db, `companies/${companyId}/patients`, id), {
        ...data,
        updatedAt: Timestamp.now()
      });
      // Invalidar cache
      firestoreCache.invalidateCollection(`companies/${companyId}/patients`);
      firestoreCache.invalidateDoc(`companies/${companyId}/patients`, id);
    } catch (err) {
      throw new Error('Erro ao atualizar paciente');
    }
  };

  const deletePatient = async (id: string) => {
    if (!companyId) throw new Error('companyId é obrigatório');
    try {
      await deleteDoc(doc(db, `companies/${companyId}/patients`, id));
      // Invalidar cache
      firestoreCache.invalidateCollection(`companies/${companyId}/patients`);
      firestoreCache.invalidateDoc(`companies/${companyId}/patients`, id);
    } catch (err: any) {
      console.error('[deletePatient] Erro detalhado:', err);
      const errorMessage = err?.message || 'Erro ao deletar paciente';
      throw new Error(errorMessage);
    }
  };

  return {
    patients,
    loading,
    error,
    createPatient,
    updatePatient,
    deletePatient
  };
}

export function usePatient(companyId: string | null | undefined, patientId: string | null | undefined) {
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!companyId || !patientId) {
      setPatient(null);
      setLoading(false);
      return;
    }

    const docRef = doc(db, `companies/${companyId}/patients`, patientId);
    const unsubscribe = onSnapshot(
      docRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data() as Partial<Patient> & {
            createdAt?: Timestamp | Date;
            updatedAt?: Timestamp | Date;
            dataNascimento?: Timestamp | Date | string;
          };

          // Converter dataNascimento do Firestore Timestamp para Date se existir
          let dataNascimento: Date | undefined;
          if (data.dataNascimento) {
            if (data.dataNascimento instanceof Date) {
              dataNascimento = data.dataNascimento;
            } else if (data.dataNascimento && typeof data.dataNascimento === 'object' && 'toDate' in data.dataNascimento) {
              // Firestore Timestamp
              dataNascimento = (data.dataNascimento as Timestamp).toDate();
            } else {
              // String ou outro formato
              const parsedDate = new Date(data.dataNascimento);
              if (!isNaN(parsedDate.getTime())) {
                dataNascimento = parsedDate;
              }
            }
          }

          const normalized: Patient = {
            id: docSnap.id,
            companyId: data.companyId || companyId || '',
            nome: data.nome || '',
            telefoneE164: data.telefoneE164 || '',
            email: data.email,
            cpf: data.cpf,
            preferenciaNotificacao: data.preferenciaNotificacao || 'whatsapp',
            ownerUid: data.ownerUid || '',
            anamnese: data.anamnese,
            dataNascimento: dataNascimento,
          };

          setPatient(normalized);
        } else {
          setPatient(null);
        }
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [companyId, patientId]);

  const updatePatient = async (data: Partial<Patient>) => {
    if (!companyId || !patientId) throw new Error('companyId e patientId são obrigatórios');
    try {
      await updateDoc(doc(db, `companies/${companyId}/patients`, patientId), {
        ...data,
        updatedAt: Timestamp.now()
      });
    } catch (err) {
      throw new Error('Erro ao atualizar paciente');
    }
  };

  return { patient, loading, error, updatePatient };
}

export function usePatientEvolutions(
  companyId: string | null | undefined,
  patientId: string | null | undefined
) {
  const [evolutions, setEvolutions] = useState<PatientEvolution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!companyId || !patientId) {
      setEvolutions([]);
      setLoading(false);
      return;
    }

    const evolutionsRef = collection(
      db,
      `companies/${companyId}/patients/${patientId}/evolutions`
    );
    const evolutionsQuery = query(evolutionsRef, orderBy('date', 'desc'));

    const unsubscribe = onSnapshot(
      evolutionsQuery,
      (snapshot) => {
        const items = snapshot.docs.map((docSnap) => {
          const data = docSnap.data() as any;

          const mapImages = Array.isArray(data.images)
            ? (data.images as any[]).map((image): PatientEvolutionImage => ({
                url: image.url,
                storagePath: image.storagePath,
                name: image.name,
                size: typeof image.size === 'number' ? image.size : Number(image.size ?? 0),
                contentType: image.contentType || undefined,
                uploadedAt: image.uploadedAt?.toDate
                  ? image.uploadedAt.toDate()
                  : image.uploadedAt
                  ? new Date(image.uploadedAt)
                  : new Date(),
              }))
            : [];

          const dateValue = data.date?.toDate
            ? data.date.toDate()
            : data.date
            ? new Date(data.date)
            : new Date();

          const createdAtValue = data.createdAt?.toDate
            ? data.createdAt.toDate()
            : data.createdAt
            ? new Date(data.createdAt)
            : new Date();

          const updatedAtValue = data.updatedAt?.toDate
            ? data.updatedAt.toDate()
            : data.updatedAt
            ? new Date(data.updatedAt)
            : createdAtValue;

          const evolution: PatientEvolution = {
            id: docSnap.id,
            companyId: companyId || '',
            patientId: patientId || '',
            date: dateValue,
            notes: data.notes || '',
            images: mapImages,
            createdAt: createdAtValue,
            updatedAt: updatedAtValue,
            createdByUid: data.createdByUid || undefined,
          };

          return evolution;
        });

        setEvolutions(items);
        setLoading(false);
      },
      (err) => {
        console.error('[usePatientEvolutions] Erro na snapshot:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [companyId, patientId]);

  const serializeImages = (images: PatientEvolutionImage[]) =>
    images.map((image) => ({
      url: image.url,
      storagePath: image.storagePath,
      name: image.name,
      size: image.size,
      contentType: image.contentType ?? null,
      uploadedAt: Timestamp.fromDate(image.uploadedAt ?? new Date()),
    }));

  const addEvolution = async (data: {
    date: Date;
    notes: string;
    images?: PatientEvolutionImage[];
    createdByUid?: string | null;
  }) => {
    if (!companyId || !patientId) throw new Error('companyId e patientId são obrigatórios');

    const payload: Record<string, unknown> = {
      date: Timestamp.fromDate(data.date),
      notes: data.notes,
      images: data.images ? serializeImages(data.images) : [],
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    if (data.createdByUid) {
      payload.createdByUid = data.createdByUid;
    }

    const docRef = await addDoc(
      collection(db, `companies/${companyId}/patients/${patientId}/evolutions`),
      payload
    );

    return docRef.id;
  };

  const updateEvolution = async (
    evolutionId: string,
    data: Partial<Omit<PatientEvolution, 'id' | 'companyId' | 'patientId'>>
  ) => {
    if (!companyId || !patientId) throw new Error('companyId e patientId são obrigatórios');

    const payload: Record<string, unknown> = {
      updatedAt: Timestamp.now(),
    };

    if (data.notes !== undefined) {
      payload.notes = data.notes;
    }

    if (data.date instanceof Date) {
      payload.date = Timestamp.fromDate(data.date);
    }

    if (data.images) {
      payload.images = serializeImages(data.images);
    }

    if (data.createdByUid !== undefined) {
      payload.createdByUid = data.createdByUid;
    }

    await updateDoc(
      doc(db, `companies/${companyId}/patients/${patientId}/evolutions`, evolutionId),
      payload
    );
  };

  const deleteEvolution = async (evolutionId: string) => {
    if (!companyId || !patientId) throw new Error('companyId e patientId são obrigatórios');
    await deleteDoc(
      doc(db, `companies/${companyId}/patients/${patientId}/evolutions`, evolutionId)
    );
  };

  return {
    evolutions,
    loading,
    error,
    addEvolution,
    updateEvolution,
    deleteEvolution,
  };
}

// Hook para gerenciar agendamentos
export function useAppointments(
  companyId: string | null | undefined,
  filters?: { professionalId?: string; clientId?: string },
  dateRange?: { start?: Date | null; end?: Date | null }
) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Função para normalizar datas para horário local
  // Garante que datas vindas do Firestore ou strings ISO sejam sempre interpretadas como local time
  const normalizeToLocalDate = (date: Date | string | Timestamp | undefined, fallback: Date = new Date()): Date => {
    if (!date) return fallback;
    
    let dateObj: Date;
    if (date instanceof Date) {
      dateObj = date;
    } else if (date && typeof date === 'object' && 'toDate' in date) {
      // Firestore Timestamp - toDate() já retorna no timezone local
      dateObj = (date as Timestamp).toDate();
    } else if (typeof date === 'string') {
      // String ISO - pode ser interpretada como UTC em alguns navegadores
      dateObj = new Date(date);
    } else {
      return fallback;
    }
    
    if (isNaN(dateObj.getTime())) {
      return fallback;
    }
    
    // Normalizar usando componentes locais para garantir interpretação local
    return new Date(
      dateObj.getFullYear(),
      dateObj.getMonth(),
      dateObj.getDate(),
      dateObj.getHours(),
      dateObj.getMinutes(),
      dateObj.getSeconds(),
      dateObj.getMilliseconds()
    );
  };

  const toAppointment = (id: string, raw: any): Appointment => {
    const inicio = normalizeToLocalDate(raw?.inicio);
    const fim = normalizeToLocalDate(raw?.fim, new Date(inicio.getTime()));
    const createdAt = normalizeToLocalDate(raw?.createdAt);
    const updatedAt = normalizeToLocalDate(raw?.updatedAt);
    const isBlock = raw?.isBlock ?? raw?.status === 'bloqueio';
    const status: Appointment['status'] =
      raw?.status ?? (isBlock ? 'bloqueio' : 'agendado');

    const recurrenceOriginalStart = raw?.recurrenceOriginalStart
      ? normalizeToLocalDate(raw.recurrenceOriginalStart)
      : undefined;
    const recurrenceEndsAt = raw?.recurrenceEndsAt
      ? normalizeToLocalDate(raw.recurrenceEndsAt)
      : undefined;

    return {
      id,
      companyId: raw?.companyId || companyId || '',
      professionalId: raw?.professionalId || '',
      clientId: raw?.clientId || '',
      serviceId: raw?.serviceId || '',
      serviceIds: Array.isArray(raw?.serviceIds) ? raw.serviceIds : undefined,
      inicio,
      fim,
      precoCentavos: raw?.precoCentavos ?? 0,
      comissaoPercent: raw?.comissaoPercent ?? 0,
      status,
      observacoes: raw?.observacoes || '',
      valorPagoCentavos: raw?.valorPagoCentavos,
      formaPagamento: raw?.formaPagamento,
      clientePresente: raw?.clientePresente,
      isBlock,
      blockDescription: raw?.blockDescription || '',
      blockScope: raw?.blockScope || 'single',
      createdByUid: raw?.createdByUid || 'unknown-user',
      createdAt,
      updatedAt,
      recurrenceGroupId: raw?.recurrenceGroupId || undefined,
      recurrenceFrequency: raw?.recurrenceFrequency || undefined,
      recurrenceOrder:
        typeof raw?.recurrenceOrder === 'number'
          ? raw.recurrenceOrder
          : undefined,
      recurrenceOriginalStart,
      recurrenceEndsAt,
    };
  };

  useEffect(() => {
    if (!companyId) {
      setAppointments([]);
      setLoading(false);
      return;
    }

    const constraints: QueryConstraint[] = [];

    setAppointments([]);
    setLoading(true);

    if (filters?.professionalId) {
      constraints.push(where('professionalId', '==', filters.professionalId));
    }

    if (filters?.clientId) {
      constraints.push(where('clientId', '==', filters.clientId));
    }

    if (dateRange?.start) {
      const startTimestamp = Timestamp.fromDate(dateRange.start);
      constraints.push(where('inicio', '>=', startTimestamp));
    }

    if (dateRange?.end) {
      const endTimestamp = Timestamp.fromDate(dateRange.end);
      constraints.push(where('inicio', '<=', endTimestamp));
    }

    // Query já está isolada pelo caminho companies/${companyId}/appointments
    // Apenas aplicar os filtros específicos (professionalId, clientId, dateRange)
    const q = query(
      collection(db, `companies/${companyId}/appointments`),
      ...constraints,
      orderBy('inicio', 'asc')
    );

    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const data = snapshot.docs.map((doc) => {
          const appointment = toAppointment(doc.id, doc.data());
          return appointment;
        });
        setAppointments(data);
        setLoading(false);
      },
      (err) => {
        console.error('[useAppointments] Erro na query:', err);
        console.error('[useAppointments] Query que falhou:', q);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [
    companyId,
    filters?.professionalId,
    filters?.clientId,
    dateRange?.start?.getTime(),
    dateRange?.end?.getTime(),
  ]);

  const createAppointment = async (
    data: Omit<Appointment, 'id' | 'createdAt' | 'updatedAt'>,
    enviarNotificacao: boolean = true
  ): Promise<string> => {
    if (!companyId) throw new Error('companyId é obrigatório');
    
    // Validar dados obrigatórios
    if (!data.professionalId || data.professionalId.trim() === '') {
      throw new Error('professionalId é obrigatório');
    }
    if (!data.clientId || data.clientId.trim() === '') {
      throw new Error('clientId é obrigatório');
    }
    if (!data.serviceId || data.serviceId.trim() === '') {
      throw new Error('serviceId é obrigatório');
    }
    if (!data.inicio || !data.fim) {
      throw new Error('inicio e fim são obrigatórios');
    }
    if (data.fim < data.inicio) {
      throw new Error('fim deve ser posterior ou igual a inicio');
    }
    
    try {
      // Verificar conflitos de horário (apenas para agendamentos não-bloqueio)
      if (!data.isBlock && data.professionalId !== '__all__') {
        const startTimestamp = Timestamp.fromDate(data.inicio);
        const endTimestamp = Timestamp.fromDate(data.fim);
        
        // Buscar agendamentos existentes do mesmo profissional com status ativo
        // Usar duas queries porque Firestore não suporta 'in' com múltiplos valores em uma única query
        const [agendadosQuery, confirmadosQuery] = await Promise.all([
          getDocs(query(
            collection(db, `companies/${companyId}/appointments`),
            where('professionalId', '==', data.professionalId),
            where('status', '==', 'agendado'),
            where('inicio', '<', endTimestamp)
          )),
          getDocs(query(
            collection(db, `companies/${companyId}/appointments`),
            where('professionalId', '==', data.professionalId),
            where('status', '==', 'confirmado'),
            where('inicio', '<', endTimestamp)
          ))
        ]);
        
        // Combinar resultados das duas queries
        const allConflictingDocs = [...agendadosQuery.docs, ...confirmadosQuery.docs];
        
        const newStart = data.inicio.getTime();
        const newEnd = data.fim.getTime();
        
        const hasConflict = allConflictingDocs.some(doc => {
          const appointment = doc.data();
          const appointmentStart = appointment.inicio?.toDate ? appointment.inicio.toDate() : new Date(appointment.inicio);
          const appointmentEnd = appointment.fim?.toDate ? appointment.fim.toDate() : new Date(appointment.fim);
          
          const existingStart = appointmentStart.getTime();
          const existingEnd = appointmentEnd.getTime();
          
          // Verificar sobreposição de horários
          return (
            (newStart >= existingStart && newStart < existingEnd) ||
            (newEnd > existingStart && newEnd <= existingEnd) ||
            (newStart <= existingStart && newEnd >= existingEnd)
          );
        });
        
        if (hasConflict) {
          throw new Error('Horário já ocupado para este profissional');
        }
      }
      
      const payload: any = {
        ...data,
        professionalId: data.professionalId,
        clientId: data.clientId,
        serviceId: data.serviceId,
        precoCentavos: data.precoCentavos ?? 0,
        comissaoPercent: data.comissaoPercent ?? 0,
        status: data.status ?? (data.isBlock ? 'bloqueio' : 'agendado'),
        isBlock: data.isBlock ?? false,
        blockDescription: data.blockDescription ?? '',
        blockScope: data.blockScope ?? (data.professionalId === '__all__' ? 'all' : 'single'),
        inicio: Timestamp.fromDate(data.inicio),
        fim: Timestamp.fromDate(data.fim),
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };

      // Só incluir serviceIds se for um array válido (não incluir se for undefined)
      if (Array.isArray(data.serviceIds) && data.serviceIds.length > 0) {
        payload.serviceIds = data.serviceIds;
      }

      if (data.recurrenceGroupId) {
        payload.recurrenceGroupId = data.recurrenceGroupId;
      }
      if (data.recurrenceFrequency) {
        payload.recurrenceFrequency = data.recurrenceFrequency;
      }
      if (typeof data.recurrenceOrder === 'number') {
        payload.recurrenceOrder = data.recurrenceOrder;
      }
      if (data.recurrenceOriginalStart) {
        payload.recurrenceOriginalStart = Timestamp.fromDate(
          data.recurrenceOriginalStart
        );
      }
      if (data.recurrenceEndsAt) {
        payload.recurrenceEndsAt = Timestamp.fromDate(data.recurrenceEndsAt);
      }

      // Criar o agendamento no Firestore
      const docRef = await addDoc(collection(db, `companies/${companyId}/appointments`), payload);
      
      // Invalidar cache de agendamentos (não cacheamos agendamentos, mas invalidamos queries relacionadas)
      firestoreCache.invalidateCollection(`companies/${companyId}/appointments`);
      
      // Chamar webhook via Firebase Functions (seguro) - assíncrono, não bloqueante
      if (!payload.isBlock) {
        // Executar em background de forma completamente assíncrona
        setTimeout(() => {
          const callAltegioWebhook = httpsCallable(functions, 'callAltegioWebhook');
          callAltegioWebhook({
            appointmentData: data,
            companyId: companyId,
            appointmentId: docRef.id,
            status: 'create', // Indicar que é uma criação
            enviarNotificacao: enviarNotificacao
          }).catch((webhookError) => {
            console.error('[createAppointment] Erro ao chamar callAltegioWebhook (não bloqueante):', webhookError);
          });
        }, 0);
      }
      
      return docRef.id;
    } catch (err: any) {
      console.error('[createAppointment] Erro ao criar agendamento:', err);
      const errorMessage = err?.message || 'Erro ao criar agendamento';
      throw new Error(errorMessage);
    }
  };

  const updateAppointment = async (id: string, data: Partial<Appointment>, enviarNotificacao: boolean = true) => {
    if (!companyId) throw new Error('companyId é obrigatório');
    try {
      // Buscar dados atuais do agendamento antes de atualizar
      const appointmentDoc = await getDoc(doc(db, `companies/${companyId}/appointments`, id));
      if (!appointmentDoc.exists()) {
        throw new Error('Agendamento não encontrado');
      }
      
      const currentAppointmentData = appointmentDoc.data();
      
      const updateData: any = { ...data };
      if (data.inicio) updateData.inicio = Timestamp.fromDate(data.inicio);
      if (data.fim) updateData.fim = Timestamp.fromDate(data.fim);
      if (data.recurrenceOriginalStart) {
        updateData.recurrenceOriginalStart = Timestamp.fromDate(
          data.recurrenceOriginalStart
        );
      }
      if (data.recurrenceEndsAt) {
        updateData.recurrenceEndsAt = Timestamp.fromDate(data.recurrenceEndsAt);
      }
      // Garantir que serviceIds seja tratado corretamente
      if ('serviceIds' in data) {
        if (Array.isArray(data.serviceIds) && data.serviceIds.length > 0) {
          updateData.serviceIds = data.serviceIds;
        } else if (data.serviceIds === null) {
          updateData.serviceIds = null;
        } else {
          // Se for undefined ou não for um array válido, remover do payload
          delete updateData.serviceIds;
        }
      }
      Object.keys(updateData).forEach((key) => {
        // Remover campos undefined (Firestore não aceita undefined)
        if (updateData[key] === undefined) {
          delete updateData[key];
        }
      });
      
      // Atualizar o agendamento no Firestore
      await updateDoc(doc(db, `companies/${companyId}/appointments`, id), {
        ...updateData,
        updatedAt: Timestamp.now()
      });
      
      // Invalidar cache de agendamentos
      firestoreCache.invalidateCollection(`companies/${companyId}/appointments`);
      
      // Buscar dados atualizados do agendamento para o webhook
      const updatedAppointmentDoc = await getDoc(doc(db, `companies/${companyId}/appointments`, id));
      if (!updatedAppointmentDoc.exists()) {
        throw new Error('Agendamento não encontrado após atualização');
      }
      
      const updatedAppointmentData = updatedAppointmentDoc.data();
      
      // Converter timestamps para Date se necessário
      const processedAppointmentData: any = {
        ...updatedAppointmentData,
        id: id,
        inicio: updatedAppointmentData?.inicio?.toDate ? updatedAppointmentData.inicio.toDate() : updatedAppointmentData?.inicio,
        fim: updatedAppointmentData?.fim?.toDate ? updatedAppointmentData.fim.toDate() : updatedAppointmentData?.fim,
        createdAt: updatedAppointmentData?.createdAt?.toDate ? updatedAppointmentData.createdAt.toDate() : updatedAppointmentData?.createdAt,
        updatedAt: updatedAppointmentData?.updatedAt?.toDate ? updatedAppointmentData.updatedAt.toDate() : updatedAppointmentData?.updatedAt,
        recurrenceOriginalStart: updatedAppointmentData?.recurrenceOriginalStart?.toDate
          ? updatedAppointmentData.recurrenceOriginalStart.toDate()
          : updatedAppointmentData?.recurrenceOriginalStart,
        recurrenceEndsAt: updatedAppointmentData?.recurrenceEndsAt?.toDate
          ? updatedAppointmentData.recurrenceEndsAt.toDate()
          : updatedAppointmentData?.recurrenceEndsAt,
      };
      
      // Chamar webhook via Firebase Functions (seguro) - sempre chamar, passando enviarNotificacao
      const isBlockAppointment =
        processedAppointmentData.isBlock ||
        processedAppointmentData.status === 'bloqueio';

      const statusAntesAtualizacao = currentAppointmentData?.status;
      const statusDepoisAtualizacao = processedAppointmentData?.status;
      const atualizacaoDeConclusao =
        statusDepoisAtualizacao === 'concluido' && statusAntesAtualizacao !== 'concluido';
      const atualizacaoDeConfirmacao =
        statusDepoisAtualizacao === 'confirmado' && statusAntesAtualizacao !== 'confirmado';

      // Se o agendamento foi concluído e o cliente compareceu, atualizar a data do último procedimento no paciente
      if (atualizacaoDeConclusao && processedAppointmentData?.clientePresente !== false && processedAppointmentData?.clientId) {
        try {
          const patientRef = doc(db, `companies/${companyId}/patients`, processedAppointmentData.clientId);
          const appointmentDate = processedAppointmentData?.inicio;
          
          if (appointmentDate) {
            const dateToSave = appointmentDate instanceof Date 
              ? Timestamp.fromDate(appointmentDate)
              : appointmentDate instanceof Timestamp 
                ? appointmentDate
                : Timestamp.fromDate(new Date(appointmentDate));
            
            await updateDoc(patientRef, {
              ultimoProcedimentoDate: dateToSave
            });
          }
        } catch (patientUpdateError) {
          console.error('[updateAppointment] Erro ao atualizar data do último procedimento no paciente:', patientUpdateError);
          // Não bloquear a atualização do agendamento se falhar ao atualizar o paciente
        }
      }

      // Não chamar webhook se:
      // 1. É um bloqueio
      // 2. Está sendo concluído agora (atualizacaoDeConclusao)
      // 3. Está sendo confirmado agora (atualizacaoDeConfirmacao)
      // 4. JÁ ESTAVA concluído antes da atualização (não enviar notificação ao editar agendamento concluído)
      const jaEstavaConcluido = statusAntesAtualizacao === 'concluido';
      
      if (!isBlockAppointment && !atualizacaoDeConclusao && !atualizacaoDeConfirmacao && !jaEstavaConcluido) {
        // Executar em background de forma completamente assíncrona
        setTimeout(() => {
          const callAltegioWebhook = httpsCallable(functions, 'callAltegioWebhook');
          callAltegioWebhook({
            appointmentData: processedAppointmentData,
            companyId: companyId,
            appointmentId: id,
            status: 'update', // Indicar que é uma atualização
            enviarNotificacao: enviarNotificacao
          }).catch((webhookError) => {
            console.error('[updateAppointment] Erro ao chamar callAltegioWebhook (não bloqueante):', webhookError);
          });
        }, 0);
      }
      
    } catch (err: any) {
      console.error('[updateAppointment] Erro ao atualizar agendamento:', err);
      const errorMessage = err?.message || 'Erro ao atualizar agendamento';
      throw new Error(errorMessage);
    }
  };

  const deleteAppointment = async (id: string, enviarNotificacao: boolean = true) => {
    if (!companyId) throw new Error('companyId é obrigatório');
    if (!id) throw new Error('ID do agendamento é obrigatório');
    
    try {
      // Forçar refresh do token para garantir que as claims estejam atualizadas
      const { auth } = await import('@/lib/firebase');
      if (auth.currentUser) {
        try {
          await auth.currentUser.getIdToken(true);
        } catch (tokenError) {
          console.warn('[deleteAppointment] Erro ao atualizar token (continuando mesmo assim):', tokenError);
        }
      }
      
      console.log('[deleteAppointment] Iniciando exclusão do agendamento:', { id, companyId });
      
      // Buscar dados do agendamento antes de deletar
      const appointmentRef = doc(db, `companies/${companyId}/appointments`, id);
      const appointmentDoc = await getDoc(appointmentRef);
      
      if (!appointmentDoc.exists()) {
        throw new Error('Agendamento não encontrado');
      }
      
      const appointmentData = appointmentDoc.data();
      console.log('[deleteAppointment] Dados do agendamento encontrados:', { 
        id, 
        isBlock: appointmentData?.isBlock,
        status: appointmentData?.status 
      });
      
      // Converter timestamps para Date se necessário (apenas para webhook)
      let processedAppointmentData: any = null;
      try {
        processedAppointmentData = {
          ...appointmentData,
          id: id,
          inicio: appointmentData?.inicio?.toDate ? appointmentData.inicio.toDate() : appointmentData?.inicio,
          fim: appointmentData?.fim?.toDate ? appointmentData.fim.toDate() : appointmentData?.fim,
          createdAt: appointmentData?.createdAt?.toDate ? appointmentData.createdAt.toDate() : appointmentData?.createdAt,
          updatedAt: appointmentData?.updatedAt?.toDate ? appointmentData.updatedAt.toDate() : appointmentData?.updatedAt,
          recurrenceOriginalStart: appointmentData?.recurrenceOriginalStart?.toDate
            ? appointmentData.recurrenceOriginalStart.toDate()
            : appointmentData?.recurrenceOriginalStart,
          recurrenceEndsAt: appointmentData?.recurrenceEndsAt?.toDate
            ? appointmentData.recurrenceEndsAt.toDate()
            : appointmentData?.recurrenceEndsAt,
        };
      } catch (conversionError) {
        console.warn('[deleteAppointment] Erro ao converter timestamps (continuando mesmo assim):', conversionError);
        processedAppointmentData = { ...appointmentData, id: id };
      }
      
      // Deletar o agendamento do Firestore
      console.log('[deleteAppointment] Deletando documento...');
      await deleteDoc(appointmentRef);
      console.log('[deleteAppointment] Documento deletado com sucesso');
      
      // Invalidar cache de agendamentos
      try {
        firestoreCache.invalidateCollection(`companies/${companyId}/appointments`);
      } catch (cacheError) {
        console.warn('[deleteAppointment] Erro ao invalidar cache (continuando mesmo assim):', cacheError);
      }
      
      const isBlockAppointment =
        processedAppointmentData?.isBlock ||
        processedAppointmentData?.status === 'bloqueio';

      if (!isBlockAppointment && processedAppointmentData) {
        // Executar em background de forma completamente assíncrona
        setTimeout(() => {
          try {
            const callAltegioWebhook = httpsCallable(functions, 'callAltegioWebhook');
            callAltegioWebhook({
              appointmentData: processedAppointmentData,
              companyId: companyId,
              appointmentId: id,
              status: 'delete', // Indicar que é uma exclusão
              enviarNotificacao: enviarNotificacao
            }).catch((webhookError) => {
              console.error('[deleteAppointment] Erro ao chamar callAltegioWebhook (não bloqueante):', webhookError);
            });
          } catch (webhookInitError) {
            console.error('[deleteAppointment] Erro ao inicializar webhook (não bloqueante):', webhookInitError);
          }
        }, 0);
      }
      
      console.log('[deleteAppointment] Exclusão concluída com sucesso');
      
    } catch (err: any) {
      console.error('[deleteAppointment] Erro ao deletar agendamento:', err);
      const errorMessage = err?.message || 'Erro desconhecido ao deletar agendamento';
      console.error('[deleteAppointment] Detalhes do erro:', {
        message: errorMessage,
        code: err?.code,
        stack: err?.stack
      });
      throw new Error(errorMessage);
    }
  };

  const fetchRecurringFutureAppointments = async (
    groupId: string,
    fromDate: Date,
    includeCurrent: boolean = true
  ): Promise<Appointment[]> => {
    const startTimestamp = Timestamp.fromDate(fromDate);
    // Query já está isolada pelo caminho companies/${companyId}/appointments
    const recurringQuery = query(
      collection(db, `companies/${companyId}/appointments`),
      where('recurrenceGroupId', '==', groupId),
      where('inicio', '>=', startTimestamp),
      orderBy('inicio', 'asc')
    );
    const snapshot = await getDocs(recurringQuery);
    const startTime = fromDate.getTime();
    return snapshot.docs
      .map((docSnap) => toAppointment(docSnap.id, docSnap.data()))
      .filter((appointment) =>
        includeCurrent
          ? appointment.inicio.getTime() >= startTime
          : appointment.inicio.getTime() > startTime
      );
  };

  const createRecurringAppointments = async (
    baseData: Omit<Appointment, 'id' | 'createdAt' | 'updatedAt'>,
    options: {
      frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'custom';
      endDate: Date;
      startOrder?: number;
      customIntervalDays?: number; // Intervalo em dias para frequência personalizada
    },
    enviarNotificacao: boolean = true
  ): Promise<string> => {
    if (!companyId) throw new Error('companyId é obrigatório');

    const frequency = options.frequency;
    const groupId =
      baseData.recurrenceGroupId || `rec_${companyId}_${Date.now()}`;
    const startOrder = options.startOrder ?? 0;
    const startMoment = moment(baseData.inicio);
    const durationMinutes = Math.max(
      1,
      moment(baseData.fim).diff(startMoment, 'minutes')
    );
    const limitMoment = moment.min(
      moment(options.endDate).endOf('day'),
      startMoment.clone().add(1, 'year')
    );

    const occurrences: {
      start: Date;
      end: Date;
      order: number;
    }[] = [];

    let cursor = startMoment.clone();
    let orderPointer = startOrder;
    let guard = 0;

    while (cursor.isSameOrBefore(limitMoment) && guard < 400) {
      const occurrenceStart = cursor.clone();
      occurrences.push({
        start: occurrenceStart.toDate(),
        end: occurrenceStart.clone().add(durationMinutes, 'minutes').toDate(),
        order: orderPointer,
      });

      switch (frequency) {
        case 'daily':
          cursor.add(1, 'day');
          break;
        case 'weekly':
          cursor.add(1, 'week');
          break;
        case 'biweekly':
          cursor.add(2, 'week');
          break;
        case 'monthly':
          cursor.add(1, 'month');
          break;
        case 'custom':
          const intervalDays = options.customIntervalDays || 7; // Padrão: 7 dias se não especificado
          cursor.add(intervalDays, 'day');
          break;
        default:
          cursor.add(1, 'week');
          break;
      }

      orderPointer += 1;
      guard += 1;
    }

    let isFirstOccurrence = true;

    for (const occurrence of occurrences) {
      await createAppointment(
        {
          ...baseData,
          inicio: occurrence.start,
          fim: occurrence.end,
          recurrenceGroupId: groupId,
          recurrenceFrequency: frequency,
          recurrenceOrder: occurrence.order,
          recurrenceOriginalStart:
            baseData.recurrenceOriginalStart ?? baseData.inicio,
          recurrenceEndsAt: options.endDate,
        },
        isFirstOccurrence ? enviarNotificacao : false
      );

      if (isFirstOccurrence) {
        isFirstOccurrence = false;
      }
    }

    return groupId;
  };

  const deleteRecurringAppointments = async (
    appointmentId: string,
    enviarNotificacao: boolean = true
  ) => {
    if (!companyId) throw new Error('companyId é obrigatório');

    const appointmentDoc = await getDoc(
      doc(db, `companies/${companyId}/appointments`, appointmentId)
    );
    if (!appointmentDoc.exists()) {
      throw new Error('Agendamento não encontrado');
    }

    const baseAppointment = toAppointment(
      appointmentDoc.id,
      appointmentDoc.data()
    );

    if (!baseAppointment.recurrenceGroupId) {
      await deleteAppointment(appointmentId, enviarNotificacao);
      return;
    }

    const instances = await fetchRecurringFutureAppointments(
      baseAppointment.recurrenceGroupId,
      baseAppointment.inicio,
      true
    );

    let isFirstInstance = true;

    for (const instance of instances) {
      await deleteDoc(
        doc(db, `companies/${companyId}/appointments`, instance.id)
      );

      const isBlockAppointment =
        instance.isBlock || instance.status === 'bloqueio';

      if (!isBlockAppointment) {
        const shouldNotifyInstance =
          isFirstInstance && enviarNotificacao ? true : false;
        // Executar em background de forma completamente assíncrona
        setTimeout(() => {
          const callAltegioWebhook = httpsCallable(
            functions,
            'callAltegioWebhook'
          );
          callAltegioWebhook({
            appointmentData: instance,
            companyId,
            appointmentId: instance.id,
            status: 'delete',
            enviarNotificacao: shouldNotifyInstance,
          }).catch((webhookError) => {
            console.error(
              '[deleteRecurringAppointments] Erro ao chamar callAltegioWebhook (não bloqueante):',
              webhookError
            );
          });
        }, 0);
        if (isFirstInstance) {
          isFirstInstance = false;
        }
      }
    }
  };

  const updateRecurringAppointments = async (
    appointmentId: string,
    baseData: Omit<Appointment, 'id' | 'createdAt' | 'updatedAt'>,
    options: {
      frequency?: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'custom';
      endDate?: Date;
      customIntervalDays?: number;
    } = {},
    enviarNotificacao: boolean = true
  ) => {
    if (!companyId) throw new Error('companyId é obrigatório');

    const appointmentDoc = await getDoc(
      doc(db, `companies/${companyId}/appointments`, appointmentId)
    );
    if (!appointmentDoc.exists()) {
      throw new Error('Agendamento não encontrado');
    }

    const currentAppointment = toAppointment(
      appointmentDoc.id,
      appointmentDoc.data()
    );

    if (!currentAppointment.recurrenceGroupId) {
      await updateAppointment(appointmentId, baseData, enviarNotificacao);
      return;
    }

    const frequency =
      options.frequency || currentAppointment.recurrenceFrequency;
    const endDate =
      options.endDate ||
      currentAppointment.recurrenceEndsAt ||
      baseData.recurrenceEndsAt ||
      baseData.inicio;

    if (!frequency || !endDate) {
      await updateAppointment(appointmentId, baseData, enviarNotificacao);
      return;
    }

    const groupId = currentAppointment.recurrenceGroupId;
    const startOrder = currentAppointment.recurrenceOrder ?? 0;

    const instances = await fetchRecurringFutureAppointments(
      groupId,
      currentAppointment.inicio,
      true
    );

    let isFirstDeletion = true;

    for (const instance of instances) {
      await deleteDoc(
        doc(db, `companies/${companyId}/appointments`, instance.id)
      );

      const isBlockAppointment =
        instance.isBlock || instance.status === 'bloqueio';

      if (!isBlockAppointment) {
        const shouldNotifyDelete =
          isFirstDeletion && enviarNotificacao ? true : false;
        // Executar em background de forma completamente assíncrona
        setTimeout(() => {
          const callAltegioWebhook = httpsCallable(
            functions,
            'callAltegioWebhook'
          );
          callAltegioWebhook({
            appointmentData: instance,
            companyId,
            appointmentId: instance.id,
            status: 'delete',
            enviarNotificacao: shouldNotifyDelete,
          }).catch((webhookError) => {
            console.error(
              '[updateRecurringAppointments] Erro ao remover instância recorrente:',
              webhookError
            );
          });
        }, 0);
        if (isFirstDeletion) {
          isFirstDeletion = false;
        }
      }
    }

    const recurrenceOriginalStart =
      currentAppointment.recurrenceOriginalStart ?? baseData.inicio;

    await createRecurringAppointments(
      {
        ...baseData,
        companyId,
        recurrenceGroupId: groupId,
        recurrenceOriginalStart,
        recurrenceEndsAt: endDate,
        createdByUid:
          baseData.createdByUid ?? currentAppointment.createdByUid,
      },
      {
        frequency,
        endDate,
        startOrder,
        customIntervalDays: options.customIntervalDays,
      },
      enviarNotificacao
    );
  };

  return {
    appointments,
    loading,
    error,
    createAppointment,
    updateAppointment,
    deleteAppointment,
    createRecurringAppointments,
    updateRecurringAppointments,
    deleteRecurringAppointments
  };
}

// Hook para buscar uma empresa específica
export function useCompany(companyId: string | null | undefined) {
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!companyId) {
      setCompany(null);
      setLoading(false);
      return;
    }

    // Tentar obter do cache primeiro
    const cachedData = firestoreCache.getDoc<Company>('companies', companyId);
    if (cachedData) {
      setCompany(cachedData);
      setLoading(false);
    }

    const unsubscribe = onSnapshot(
      doc(db, 'companies', companyId),
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          const companyData = {
            id: docSnap.id,
            ...data,
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
            trialStartedAt: data.trialStartedAt?.toDate?.() || data.trialStartedAt || undefined,
            trialEndsAt: data.trialEndsAt?.toDate?.() || data.trialEndsAt || undefined,
            subscriptionCurrentPeriodEnd: data.subscriptionCurrentPeriodEnd?.toDate?.() || data.subscriptionCurrentPeriodEnd || undefined,
          } as Company;
          
          // Atualizar cache
          firestoreCache.setDoc('companies', companyId, companyData, CACHE_TTL.COMPANY);
          
          setCompany(companyData);
        } else {
          setCompany(null);
        }
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [companyId]);

  return { company, loading, error };
}

export interface CompanySettings extends DocumentData {
  customerLabel?: 'paciente' | 'cliente';
}

export function useCompanySettings(companyId: string | null | undefined) {
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!companyId) {
      setSettings(null);
      setLoading(false);
      return;
    }

    const collectionPath = `companies/${companyId}/settings`;
    const docId = 'general';
    
    // Tentar obter do cache primeiro
    const cachedData = firestoreCache.getDoc<CompanySettings>(collectionPath, docId);
    if (cachedData) {
      setSettings(cachedData);
      setLoading(false);
    }

    const settingsRef = doc(db, collectionPath, docId);
    const unsubscribe = onSnapshot(
      settingsRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const settingsData = docSnap.data() as CompanySettings;
          
          // Atualizar cache
          firestoreCache.setDoc(collectionPath, docId, settingsData, CACHE_TTL.COMPANY_SETTINGS);
          
          setSettings(settingsData);
        } else {
          setSettings(null);
        }
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [companyId]);

  return { settings, loading, error };
}

// Hook para gerenciar empresas
export function useCompanies() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = query(
      collection(db, 'companies'),
      orderBy('nome', 'asc')
    );

    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const data = snapshot.docs.map(doc => {
          const docData = doc.data();
          return {
            id: doc.id,
            ...docData,
            createdAt: docData.createdAt?.toDate() || new Date(),
            updatedAt: docData.updatedAt?.toDate() || new Date(),
            trialStartedAt: docData.trialStartedAt?.toDate() || undefined,
            trialEndsAt: docData.trialEndsAt?.toDate() || undefined,
            subscriptionCurrentPeriodEnd: docData.subscriptionCurrentPeriodEnd?.toDate() || undefined,
          } as Company;
        });
        setCompanies(data);
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const createCompany = async (data: Omit<Company, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const now = Timestamp.now();
      const trialEnds = Timestamp.fromDate(new Date(now.toDate().getTime() + 15 * 24 * 60 * 60 * 1000));
      await addDoc(collection(db, 'companies'), {
        ...data,
        ativo: data.ativo ?? true,
        trialStartedAt: now,
        trialEndsAt: trialEnds,
        subscriptionActive: false,
        createdAt: now,
        updatedAt: now
      });
    } catch (err) {
      throw new Error('Erro ao criar empresa');
    }
  };

  const updateCompany = async (id: string, data: Partial<Company>) => {
    try {
      await updateDoc(doc(db, 'companies', id), {
        ...data,
        updatedAt: Timestamp.now()
      });
    } catch (err) {
      throw new Error('Erro ao atualizar empresa');
    }
  };

  const deleteCompany = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'companies', id));
    } catch (err) {
      throw new Error('Erro ao deletar empresa');
    }
  };

  return {
    companies,
    loading,
    error,
    createCompany,
    updateCompany,
    deleteCompany
  };
}

// Hook para gerenciar usuários da empresa
export function useCompanyUsers(companyId: string | null | undefined) {
  const [users, setUsers] = useState<CompanyUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!companyId) {
      setUsers([]);
      setLoading(false);
      return;
    }

    const collectionPath = `companies/${companyId}/users`;
    
    // Tentar obter do cache primeiro
    const cachedData = firestoreCache.getQuery<CompanyUser[]>(
      collectionPath,
      undefined,
      'nome'
    );
    
    if (cachedData) {
      setUsers(cachedData);
      setLoading(false);
    }

    const q = query(
      collection(db, collectionPath),
      orderBy('nome', 'asc')
    );

    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date(),
          updatedAt: doc.data().updatedAt?.toDate() || new Date(),
        })) as CompanyUser[];
        
        // Atualizar cache
        firestoreCache.setQuery(
          collectionPath,
          data,
          undefined,
          'nome',
          CACHE_TTL.COMPANY_USER
        );
        
        setUsers(data);
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [companyId]);

  const createCompanyUser = async (data: Omit<CompanyUser, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!companyId) throw new Error('companyId é obrigatório');
    try {
      await addDoc(collection(db, `companies/${companyId}/users`), {
        ...data,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });
      // Invalidar cache
      firestoreCache.invalidateCollection(`companies/${companyId}/users`);
    } catch (err) {
      throw new Error('Erro ao criar usuário da empresa');
    }
  };

  const updateCompanyUser = async (id: string, data: Partial<CompanyUser>) => {
    if (!companyId) throw new Error('companyId é obrigatório');
    try {
      await updateDoc(doc(db, `companies/${companyId}/users`, id), {
        ...data,
        updatedAt: Timestamp.now()
      });
      // Invalidar cache
      firestoreCache.invalidateCollection(`companies/${companyId}/users`);
      firestoreCache.invalidateDoc(`companies/${companyId}/users`, id);
    } catch (err) {
      throw new Error('Erro ao atualizar usuário da empresa');
    }
  };

  const deleteCompanyUser = async (id: string) => {
    if (!companyId) throw new Error('companyId é obrigatório');
    try {
      await deleteDoc(doc(db, `companies/${companyId}/users`, id));
      // Invalidar cache
      firestoreCache.invalidateCollection(`companies/${companyId}/users`);
      firestoreCache.invalidateDoc(`companies/${companyId}/users`, id);
    } catch (err) {
      throw new Error('Erro ao deletar usuário da empresa');
    }
  };

  return {
    users,
    loading,
    error,
    createCompanyUser,
    updateCompanyUser,
    deleteCompanyUser
  };
}

// Hook para gerenciar procedimentos odontológicos
export function useDentalProcedures(
  companyId: string | null | undefined,
  patientId: string | null | undefined
) {
  const [procedimentos, setProcedimentos] = useState<ProcedimentoOdontologico[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!companyId || !patientId) {
      setProcedimentos([]);
      setLoading(false);
      return;
    }

    const procedimentosRef = collection(
      db,
      `companies/${companyId}/patients/${patientId}/dentalProcedures`
    );
    const procedimentosQuery = query(procedimentosRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(
      procedimentosQuery,
      (snapshot) => {
        const items = snapshot.docs.map((docSnap) => {
          const data = docSnap.data() as any;

          const realizadoEm = data.realizadoEm?.toDate
            ? data.realizadoEm.toDate()
            : data.realizadoEm
            ? new Date(data.realizadoEm)
            : undefined;

          const createdAt = data.createdAt?.toDate
            ? data.createdAt.toDate()
            : data.createdAt
            ? new Date(data.createdAt)
            : new Date();

          const updatedAt = data.updatedAt?.toDate
            ? data.updatedAt.toDate()
            : data.updatedAt
            ? new Date(data.updatedAt)
            : createdAt;

          const legacySelectionType = (data as any).selectionType;
          const selectionTypes = data.selectionTypes || (legacySelectionType ? [legacySelectionType] : undefined);
          const procedimento: ProcedimentoOdontologico = {
            id: docSnap.id,
            companyId: companyId || '',
            patientId: patientId || '',
            procedimento: data.procedimento || '',
            valorCentavos: data.valorCentavos ?? 0,
            dentes: data.dentes || [],
            selectionTypes,
            profissionalId: data.profissionalId || '',
            estado: data.estado || 'a_realizar',
            realizadoEm,
            gerarPagamentoFinanceiro: data.gerarPagamentoFinanceiro ?? false,
            observacoes: data.observacoes || undefined,
            createdAt,
            updatedAt,
            createdByUid: data.createdByUid || undefined,
          };

          return procedimento;
        });

        setProcedimentos(items);
        setLoading(false);
      },
      (err) => {
        console.error('[useDentalProcedures] Erro na snapshot:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [companyId, patientId]);

  const addProcedimento = async (
    data: Omit<ProcedimentoOdontologico, 'id' | 'createdAt' | 'updatedAt'>,
    createDebitoCallback?: (debitoId: string) => Promise<void>
  ) => {
    if (!companyId || !patientId) throw new Error('companyId e patientId são obrigatórios');

    const payload: Record<string, unknown> = {
      companyId,
      patientId,
      procedimento: data.procedimento,
      valorCentavos: data.valorCentavos,
      dentes: data.dentes,
      profissionalId: data.profissionalId,
      estado: data.estado,
      gerarPagamentoFinanceiro: data.gerarPagamentoFinanceiro,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    if ((data as any).selectionTypes && (data as any).selectionTypes.length) {
      payload.selectionTypes = (data as any).selectionTypes;
    }

    if (data.realizadoEm) {
      payload.realizadoEm = Timestamp.fromDate(data.realizadoEm);
    }

    if (data.observacoes) {
      payload.observacoes = data.observacoes;
    }

    if (data.createdByUid) {
      payload.createdByUid = data.createdByUid;
    }

    const docRef = await addDoc(
      collection(db, `companies/${companyId}/patients/${patientId}/dentalProcedures`),
      payload
    );

    // Se deve gerar pagamento financeiro, criar débito
    if (data.gerarPagamentoFinanceiro && createDebitoCallback) {
      try {
        await createDebitoCallback(docRef.id);
      } catch (error) {
        console.error('[addProcedimento] Erro ao criar débito:', error);
        // Não falhar a criação do procedimento se o débito falhar
      }
    }

    return docRef.id;
  };

  const updateProcedimento = async (
    procedimentoId: string,
    data: Partial<Omit<ProcedimentoOdontologico, 'id' | 'companyId' | 'patientId' | 'createdAt' | 'updatedAt'>>
  ) => {
    if (!companyId || !patientId) throw new Error('companyId e patientId são obrigatórios');

    const payload: Record<string, unknown> = {
      updatedAt: Timestamp.now(),
    };

    if (data.procedimento !== undefined) {
      payload.procedimento = data.procedimento;
    }
    if (data.valorCentavos !== undefined) {
      payload.valorCentavos = data.valorCentavos;
    }
    if (data.dentes !== undefined) {
      payload.dentes = data.dentes;
    }
    if (data.profissionalId !== undefined) {
      payload.profissionalId = data.profissionalId;
    }
    if (data.estado !== undefined) {
      payload.estado = data.estado;
    }
    if (data.realizadoEm !== undefined) {
      payload.realizadoEm = data.realizadoEm ? Timestamp.fromDate(data.realizadoEm) : null;
    }
    if (data.gerarPagamentoFinanceiro !== undefined) {
      payload.gerarPagamentoFinanceiro = data.gerarPagamentoFinanceiro;
    }
    if (data.observacoes !== undefined) {
      payload.observacoes = data.observacoes || null;
    }

    await updateDoc(
      doc(
        db,
        `companies/${companyId}/patients/${patientId}/dentalProcedures`,
        procedimentoId
      ),
      payload
    );
  };

  const deleteProcedimento = async (procedimentoId: string) => {
    if (!companyId || !patientId) throw new Error('companyId e patientId são obrigatórios');
    await deleteDoc(
      doc(db, `companies/${companyId}/patients/${patientId}/dentalProcedures`, procedimentoId)
    );
  };

  return {
    procedimentos,
    loading,
    error,
    addProcedimento,
    updateProcedimento,
    deleteProcedimento,
  };
}

// Hook para gerenciar débitos de pacientes
export function usePatientDebits(
  companyId: string | null | undefined,
  patientId: string | null | undefined
) {
  const [debitos, setDebitos] = useState<DebitoPaciente[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!companyId || !patientId) {
      setDebitos([]);
      setLoading(false);
      return;
    }

    const debitosRef = collection(
      db,
      `companies/${companyId}/patients/${patientId}/debitos`
    );
    const debitosQuery = query(debitosRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(
      debitosQuery,
      (snapshot) => {
        const items = snapshot.docs.map((docSnap) => {
          const data = docSnap.data() as any;

          const lancamentos: LancamentoDebito[] = (data.lancamentos || []).map((l: any) => ({
            id: l.id || '',
            valorCentavos: l.valorCentavos ?? 0,
            data: l.data?.toDate ? l.data.toDate() : l.data ? new Date(l.data) : new Date(),
            formaPagamento: l.formaPagamento,
            observacoes: l.observacoes,
            createdAt: l.createdAt?.toDate ? l.createdAt.toDate() : l.createdAt ? new Date(l.createdAt) : new Date(),
            createdByUid: l.createdByUid,
          }));

          const createdAt = data.createdAt?.toDate
            ? data.createdAt.toDate()
            : data.createdAt
            ? new Date(data.createdAt)
            : new Date();

          const updatedAt = data.updatedAt?.toDate
            ? data.updatedAt.toDate()
            : data.updatedAt
            ? new Date(data.updatedAt)
            : createdAt;

          const dataVencimento = data.dataVencimento?.toDate
            ? data.dataVencimento.toDate()
            : data.dataVencimento
            ? new Date(data.dataVencimento)
            : undefined;

          const debito: DebitoPaciente = {
            id: docSnap.id,
            companyId: companyId || '',
            patientId: patientId || '',
            procedimento: data.procedimento || '',
            valorTotalCentavos: data.valorTotalCentavos ?? 0,
            saldoReceberCentavos: data.saldoReceberCentavos ?? data.valorTotalCentavos ?? 0,
            saldoRecebidoCentavos: data.saldoRecebidoCentavos ?? 0,
            lancamentos,
            status: data.status || 'pendente',
            profissionalId: data.profissionalId,
            observacoes: data.observacoes,
            dentalProcedureId: data.dentalProcedureId,
            serviceIds: data.serviceIds || undefined,
            dataVencimento,
            createdAt,
            updatedAt,
            createdByUid: data.createdByUid,
          };

          return debito;
        });

        setDebitos(items);
        setLoading(false);
      },
      (err) => {
        console.error('[usePatientDebits] Erro na snapshot:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [companyId, patientId]);

  const createDebito = async (data: Omit<DebitoPaciente, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!companyId || !patientId) throw new Error('companyId e patientId são obrigatórios');

    const lancamentosData = (data.lancamentos || []).map((l) => ({
      id: l.id || '',
      valorCentavos: l.valorCentavos,
      data: Timestamp.fromDate(l.data),
      formaPagamento: l.formaPagamento || null,
      observacoes: l.observacoes || null,
      createdAt: Timestamp.fromDate(l.createdAt),
      createdByUid: l.createdByUid || null,
    }));

    const payload: Record<string, unknown> = {
      companyId,
      patientId,
      procedimento: data.procedimento,
      valorTotalCentavos: data.valorTotalCentavos,
      saldoReceberCentavos: data.saldoReceberCentavos,
      saldoRecebidoCentavos: data.saldoRecebidoCentavos,
      lancamentos: lancamentosData,
      status: data.status,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    if (data.profissionalId) {
      payload.profissionalId = data.profissionalId;
    }
    if (data.observacoes) {
      payload.observacoes = data.observacoes;
    }
    if (data.dentalProcedureId) {
      payload.dentalProcedureId = data.dentalProcedureId;
    }
    if (data.createdByUid) {
      payload.createdByUid = data.createdByUid;
    }
    if ((data as any).serviceIds && Array.isArray((data as any).serviceIds)) {
      payload.serviceIds = (data as any).serviceIds;
    }
    if ((data as any).dataVencimento) {
      payload.dataVencimento = Timestamp.fromDate((data as any).dataVencimento);
    }

    const docRef = await addDoc(
      collection(db, `companies/${companyId}/patients/${patientId}/debitos`),
      payload
    );

    return docRef.id;
  };

  const addLancamento = async (debitoId: string, lancamento: Omit<LancamentoDebito, 'id' | 'createdAt'>) => {
    if (!companyId || !patientId) throw new Error('companyId e patientId são obrigatórios');

    const debitoDoc = await getDoc(
      doc(db, `companies/${companyId}/patients/${patientId}/debitos`, debitoId)
    );

    if (!debitoDoc.exists()) {
      throw new Error('Débito não encontrado');
    }

    const debitoData = debitoDoc.data();
    const lancamentosAtuais = debitoData.lancamentos || [];
    const novoSaldoRecebido = (debitoData.saldoRecebidoCentavos || 0) + lancamento.valorCentavos;
    const novoSaldoReceber = Math.max(0, (debitoData.valorTotalCentavos || 0) - novoSaldoRecebido);

    let novoStatus: DebitoPaciente['status'] = 'pendente';
    if (novoSaldoReceber === 0) {
      novoStatus = 'concluido';
    } else if (novoSaldoRecebido > 0) {
      novoStatus = 'parcial';
    }

    const novoLancamento = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      valorCentavos: lancamento.valorCentavos,
      data: Timestamp.fromDate(lancamento.data),
      formaPagamento: lancamento.formaPagamento || null,
      observacoes: lancamento.observacoes || null,
      createdAt: Timestamp.now(),
      createdByUid: lancamento.createdByUid || null,
    };

    await updateDoc(
      doc(db, `companies/${companyId}/patients/${patientId}/debitos`, debitoId),
      {
        lancamentos: [...lancamentosAtuais, novoLancamento],
        saldoRecebidoCentavos: novoSaldoRecebido,
        saldoReceberCentavos: novoSaldoReceber,
        status: novoStatus,
        updatedAt: Timestamp.now(),
      }
    );
  };

  const updateDebito = async (
    debitoId: string,
    data: Partial<Omit<DebitoPaciente, 'id' | 'companyId' | 'patientId' | 'createdAt' | 'updatedAt' | 'lancamentos' | 'saldoRecebidoCentavos' | 'saldoReceberCentavos' | 'status'>>
  ) => {
    if (!companyId || !patientId) throw new Error('companyId e patientId são obrigatórios');

    const debitoDoc = await getDoc(
      doc(db, `companies/${companyId}/patients/${patientId}/debitos`, debitoId)
    );

    if (!debitoDoc.exists()) {
      throw new Error('Débito não encontrado');
    }

    const debitoData = debitoDoc.data();
    const payload: Record<string, unknown> = {
      updatedAt: Timestamp.now(),
    };

    if (data.procedimento !== undefined) {
      payload.procedimento = data.procedimento;
    }
    if (data.valorTotalCentavos !== undefined) {
      // Se o valor total mudou, recalcular saldos
      const valorTotalAnterior = debitoData.valorTotalCentavos || 0;
      const saldoRecebidoAtual = debitoData.saldoRecebidoCentavos || 0;
      const novoValorTotal = data.valorTotalCentavos;
      
      payload.valorTotalCentavos = novoValorTotal;
      
      // Recalcular saldos baseado no novo valor total
      const novoSaldoRecebido = Math.min(saldoRecebidoAtual, novoValorTotal);
      const novoSaldoReceber = Math.max(0, novoValorTotal - novoSaldoRecebido);
      
      payload.saldoRecebidoCentavos = novoSaldoRecebido;
      payload.saldoReceberCentavos = novoSaldoReceber;
      
      // Atualizar status baseado nos novos saldos
      let novoStatus: DebitoPaciente['status'] = 'pendente';
      if (novoSaldoReceber === 0) {
        novoStatus = 'concluido';
      } else if (novoSaldoRecebido > 0) {
        novoStatus = 'parcial';
      }
      payload.status = novoStatus;
    }
    if (data.observacoes !== undefined) {
      payload.observacoes = data.observacoes || null;
    }
    if (data.profissionalId !== undefined) {
      payload.profissionalId = data.profissionalId || null;
    }
    if ((data as any).serviceIds !== undefined) {
      payload.serviceIds = (data as any).serviceIds || null;
    }
    if ((data as any).dataVencimento !== undefined) {
      payload.dataVencimento = (data as any).dataVencimento ? Timestamp.fromDate((data as any).dataVencimento) : null;
    }

    await updateDoc(
      doc(db, `companies/${companyId}/patients/${patientId}/debitos`, debitoId),
      payload
    );
  };

  const removeLancamento = async (debitoId: string, lancamentoId: string) => {
    if (!companyId || !patientId) throw new Error('companyId e patientId são obrigatórios');

    const debitoDoc = await getDoc(
      doc(db, `companies/${companyId}/patients/${patientId}/debitos`, debitoId)
    );

    if (!debitoDoc.exists()) {
      throw new Error('Débito não encontrado');
    }

    const debitoData = debitoDoc.data();
    const lancamentosAtuais = debitoData.lancamentos || [];
    
    // Encontrar o lançamento a ser removido
    const lancamentoRemover = lancamentosAtuais.find((l: any) => l.id === lancamentoId);
    if (!lancamentoRemover) {
      throw new Error('Lançamento não encontrado');
    }

    // Remover o lançamento do array
    const novosLancamentos = lancamentosAtuais.filter((l: any) => l.id !== lancamentoId);
    
    // Recalcular saldos
    const valorRemovido = lancamentoRemover.valorCentavos || 0;
    const novoSaldoRecebido = Math.max(0, (debitoData.saldoRecebidoCentavos || 0) - valorRemovido);
    const novoSaldoReceber = (debitoData.valorTotalCentavos || 0) - novoSaldoRecebido;

    // Atualizar status
    let novoStatus: DebitoPaciente['status'] = 'pendente';
    if (novoSaldoReceber === 0) {
      novoStatus = 'concluido';
    } else if (novoSaldoRecebido > 0) {
      novoStatus = 'parcial';
    }

    await updateDoc(
      doc(db, `companies/${companyId}/patients/${patientId}/debitos`, debitoId),
      {
        lancamentos: novosLancamentos,
        saldoRecebidoCentavos: novoSaldoRecebido,
        saldoReceberCentavos: novoSaldoReceber,
        status: novoStatus,
        updatedAt: Timestamp.now(),
      }
    );
  };

  return {
    debitos,
    loading,
    error,
    createDebito,
    addLancamento,
    updateDebito,
    removeLancamento,
  };
}

// Interface para Invoice/Fatura
export interface Invoice {
  id: string;
  companyId: string;
  status: 'paid' | 'open' | 'past_due' | 'canceled';
  amount: number; // em centavos
  currency: string;
  periodStart: Date | null;
  periodEnd: Date | null;
  paymentMethod?: string;
  providerInvoiceId?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Hook para buscar invoices/faturas da empresa
export function useCompanyInvoices(companyId: string | null | undefined) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!companyId) {
      setInvoices([]);
      setLoading(false);
      return;
    }

    // Query já está isolada pelo caminho companies/${companyId}/invoices
    const q = query(
      collection(db, `companies/${companyId}/invoices`),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map(doc => {
          const docData = doc.data();
          return {
            id: doc.id,
            companyId,
            status: docData.status || 'open',
            amount: docData.amount || 0,
            currency: docData.currency || 'brl',
            periodStart: docData.periodStart?.toDate?.() || docData.periodStart || null,
            periodEnd: docData.periodEnd?.toDate?.() || docData.periodEnd || null,
            paymentMethod: docData.paymentMethod || undefined,
            providerInvoiceId: docData.providerInvoiceId || undefined,
            createdAt: docData.createdAt?.toDate?.() || new Date(),
            updatedAt: docData.updatedAt?.toDate?.() || new Date(),
          } as Invoice;
        });
        setInvoices(data);
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [companyId]);

  return { invoices, loading, error };
}

export function useOrcamentos(
  companyId: string | null | undefined,
  patientId: string | null | undefined
) {
  const [orcamentos, setOrcamentos] = useState<Orcamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!companyId || !patientId) {
      setOrcamentos([]);
      setLoading(false);
      return;
    }

    const orcamentosRef = collection(
      db,
      `companies/${companyId}/patients/${patientId}/orcamentos`
    );
    const q = query(orcamentosRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data: Orcamento[] = [];
        snapshot.forEach((doc) => {
          const docData = doc.data() as Partial<Orcamento> & {
            createdAt?: Timestamp | Date;
            updatedAt?: Timestamp | Date;
            signedAt?: Timestamp | Date | { seconds: number; nanoseconds?: number } | string | number;
          };

          let createdAt: Date;
          if (docData.createdAt instanceof Date) {
            createdAt = docData.createdAt;
          } else if (docData.createdAt && typeof docData.createdAt === 'object' && 'toDate' in docData.createdAt) {
            createdAt = (docData.createdAt as Timestamp).toDate();
          } else {
            createdAt = new Date();
          }

          let updatedAt: Date;
          if (docData.updatedAt instanceof Date) {
            updatedAt = docData.updatedAt;
          } else if (docData.updatedAt && typeof docData.updatedAt === 'object' && 'toDate' in docData.updatedAt) {
            updatedAt = (docData.updatedAt as Timestamp).toDate();
          } else {
            updatedAt = new Date();
          }

          // Converter signedAt de Timestamp para Date se existir
          let signedAt: Date | undefined;
          if (docData.signedAt) {
            if (docData.signedAt instanceof Date) {
              signedAt = docData.signedAt;
            } else if (docData.signedAt && typeof docData.signedAt === 'object' && 'toDate' in docData.signedAt) {
              signedAt = (docData.signedAt as Timestamp).toDate();
            } else if (docData.signedAt && typeof docData.signedAt === 'object' && 'seconds' in docData.signedAt) {
              signedAt = new Date((docData.signedAt as any).seconds * 1000);
            } else if (typeof docData.signedAt === 'string') {
              const date = new Date(docData.signedAt);
              if (!isNaN(date.getTime())) {
                signedAt = date;
              }
            } else if (typeof docData.signedAt === 'number') {
              const timestamp = docData.signedAt > 1000000000000 ? docData.signedAt : docData.signedAt * 1000;
              signedAt = new Date(timestamp);
            }
          }

          data.push({
            id: doc.id,
            ...docData,
            createdAt,
            updatedAt,
            signedAt,
          } as Orcamento);
        });
        setOrcamentos(data);
        setLoading(false);
        setError(null);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [companyId, patientId]);

  const createOrcamento = async (orcamentoData: Omit<Orcamento, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!companyId || !patientId) {
      throw new Error('companyId e patientId são obrigatórios');
    }

    try {
      // Remover campos undefined para evitar problemas no Firestore
      const dataToSave: any = {
        companyId: orcamentoData.companyId,
        patientId: orcamentoData.patientId,
        procedimentos: orcamentoData.procedimentos.map(p => ({
          id: p.id,
          procedimento: p.procedimento,
          valorCentavos: p.valorCentavos,
          ...(p.valorCentavosEditado !== undefined && { valorCentavosEditado: p.valorCentavosEditado }),
          ...(p.comissaoPercent !== undefined && { comissaoPercent: p.comissaoPercent }),
          ...(p.comissaoPercentEditado !== undefined && { comissaoPercentEditado: p.comissaoPercentEditado }),
          ...(p.dentes && p.dentes.length > 0 && { dentes: p.dentes }),
          ...(p.selectionTypes && p.selectionTypes.length > 0 && { selectionTypes: p.selectionTypes }),
        })),
        descontoCentavos: orcamentoData.descontoCentavos,
        valorTotalCentavos: orcamentoData.valorTotalCentavos,
        ...(orcamentoData.observacoes && { observacoes: orcamentoData.observacoes }),
        formaPagamento: orcamentoData.formaPagamento,
        ...(orcamentoData.pagamentos && orcamentoData.pagamentos.length > 0 && { pagamentos: orcamentoData.pagamentos }),
        ...(orcamentoData.entrada && { entrada: orcamentoData.entrada }),
        ...(orcamentoData.parcelado && { parcelado: orcamentoData.parcelado }),
        status: orcamentoData.status,
        ...(orcamentoData.createdByUid && { createdByUid: orcamentoData.createdByUid }),
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };
      
      const docRef = await addDoc(
        collection(db, `companies/${companyId}/patients/${patientId}/orcamentos`),
        dataToSave
      );
      return docRef.id;
    } catch (err: any) {
      console.error('Erro detalhado ao criar orçamento:', err);
      throw new Error(`Erro ao criar orçamento: ${err.message || 'Erro desconhecido'}`);
    }
  };

  const updateOrcamento = async (orcamentoId: string, data: Partial<Orcamento>) => {
    if (!companyId || !patientId) {
      throw new Error('companyId e patientId são obrigatórios');
    }

    try {
      await updateDoc(
        doc(db, `companies/${companyId}/patients/${patientId}/orcamentos`, orcamentoId),
        {
          ...data,
          updatedAt: Timestamp.now(),
        }
      );
    } catch (err) {
      throw new Error('Erro ao atualizar orçamento');
    }
  };

  const deleteOrcamento = async (orcamentoId: string) => {
    if (!companyId || !patientId) {
      throw new Error('companyId e patientId são obrigatórios');
    }

    try {
      await deleteDoc(
        doc(db, `companies/${companyId}/patients/${patientId}/orcamentos`, orcamentoId)
      );
    } catch (err) {
      throw new Error('Erro ao excluir orçamento');
    }
  };

  return { orcamentos, loading, error, createOrcamento, updateOrcamento, deleteOrcamento };
}

// Hook para buscar medicamentos do Firestore (carrega uma vez e mantém em memória)
export function useMedicamentos() {
  const [medicamentos, setMedicamentos] = useState<Array<{
    id: string;
    name: string;
    posology?: string;
    measurement_type?: string;
    measurement_qty?: number;
    special_prescription_required?: boolean;
  }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    // Carregar apenas uma vez
    if (hasLoaded) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const medicamentosQuery = query(
      collection(db, 'medicamentos'),
      orderBy('name', 'asc')
    );

    const unsubscribe = onSnapshot(
      medicamentosQuery,
      (snapshot) => {
        const medicamentosData = snapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name || '',
          posology: doc.data().posology || '',
          measurement_type: doc.data().measurement_type || 'tubes',
          measurement_qty: doc.data().measurement_qty || 1,
          special_prescription_required: doc.data().special_prescription_required || false,
        }));
        setMedicamentos(medicamentosData);
        setLoading(false);
        setHasLoaded(true);
      },
      (err) => {
        console.error('Erro ao carregar medicamentos:', err);
        setError(err.message);
        setLoading(false);
        setHasLoaded(true); // Marcar como carregado mesmo com erro para não tentar novamente
      }
    );

    return () => unsubscribe();
  }, [hasLoaded]);

  return { medicamentos, loading, error };
}
