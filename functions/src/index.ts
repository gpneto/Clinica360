import * as admin from 'firebase-admin';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { handleWebhookAgendamento, getWhatsappConfig, normalizarTelefone, normalizePhoneForContact, type WhatsappConfig, type MetaWhatsappConfig } from './whatsapp/whatsappEnvio';
import { substituirParametros, templatesWhats } from './whatsapp/whatsappEnvio';
import { sendEvolutionTextMessage } from './whatsapp/evolutionClient';
import type { WebHookAgendamentoRequest } from './whatsapp/types/webhook-agendamento';
import OpenAI from 'openai';
export { whatsappWebhook } from './whatsapp/webhookWats';
export { evolutionWebhook, syncWhatsAppContacts, getWhatsAppContactsPhotos } from './whatsapp/evolutionWebhook';
export { aiAssistant } from './aiAssistant';
import Stripe from 'stripe';
import { onRequest } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';

// Inicializar Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

/**
 * Busca um paciente pelo número de telefone na empresa
 * @param companyId ID da empresa
 * @param phoneNumber Número de telefone no formato WhatsApp (ex: "5519999999999")
 * @returns Nome do paciente se encontrado, null caso contrário
 */
async function findPatientNameByPhone(
  companyId: string,
  phoneNumber: string
): Promise<string | null> {
  try {
    if (!phoneNumber || !companyId) return null;

    // Normalizar número (remover caracteres não numéricos)
    const normalizedPhone = phoneNumber.replace(/\D/g, "");

    // Gerar variantes do número para busca
    // Formato do WhatsApp: 55 (país) + DDD + número
    // Formato do paciente: telefoneE164 (pode estar com ou sem o 55)
    const variants = [
      normalizedPhone, // Ex: "5519999999999"
      normalizedPhone.startsWith("55") ? normalizedPhone.slice(2) : `55${normalizedPhone}`, // Sem/Com país
      normalizedPhone.length === 13 && normalizedPhone.startsWith("55")
        ? normalizedPhone.slice(0, 4) + normalizedPhone.slice(5) // Remover 9 se tiver
        : null,
      normalizedPhone.length === 13 && normalizedPhone.startsWith("55")
        ? normalizedPhone.slice(2) // Remover 55
        : null,
    ].filter(Boolean) as string[];

    // Buscar paciente na coleção de pacientes da empresa
    const patientsSnapshot = await db
      .collection(`companies/${companyId}/patients`)
      .where("telefoneE164", "in", variants)
      .limit(1)
      .get();

    if (!patientsSnapshot.empty) {
      const patientData = patientsSnapshot.docs[0].data();
      const patientName = patientData?.nome;
      if (patientName) {
        console.log(
          `[functions/index] Paciente encontrado para ${normalizedPhone}: ${patientName}`
        );
        // Verificar se o nome contém "Letícia Massoterapeuta" ou similar (pode ser um erro)
        if (patientName.toLowerCase().includes('letícia') || patientName.toLowerCase().includes('leticia') || patientName.toLowerCase().includes('massoterapeuta')) {
          console.warn(`[functions/index] ⚠️ ATENÇÃO: Nome do paciente contém "Letícia" ou "Massoterapeuta": ${patientName} para telefone ${phoneNumber}. Isso pode ser um erro!`);
        }
        return patientName as string;
      }
    }

    return null;
  } catch (error) {
    console.error(
      `[functions/index] Erro ao buscar paciente para ${phoneNumber}:`,
      error
    );
    return null;
  }
}

// --------- STRIPE SETUP (v2 params/secrets) ----------
const STRIPE_SECRET = defineSecret('STRIPE_SECRET');
const STRIPE_PRICE_ID = defineSecret('STRIPE_PRICE_ID');
const STRIPE_WEBHOOK_SECRET = defineSecret('STRIPE_WEBHOOK_SECRET');

// Cria sessão de checkout para assinatura
export const createStripeCheckoutSession = onCall({ secrets: [STRIPE_SECRET, STRIPE_PRICE_ID] }, async (request) => {
  const uid = request.auth?.uid;
  const { companyId } = request.data || {};

  if (!uid) {
    throw new HttpsError('unauthenticated', 'Usuário não autenticado');
  }
  if (!companyId) {
    throw new HttpsError('invalid-argument', 'companyId é obrigatório');
  }
  const secret = STRIPE_SECRET.value();
  const priceId = STRIPE_PRICE_ID.value();
  const baseUrl = process.env.APP_BASE_URL || 'https://webagendamentos.web.app';
  if (!secret || !priceId) {
    throw new HttpsError('failed-precondition', 'Stripe não configurado (segredos ausentes)');
  }
  const stripe = new Stripe(secret, { apiVersion: '2024-06-20' });

  // Carregar empresa
  const companyRef = db.collection('companies').doc(companyId);
  const companySnap = await companyRef.get();
  if (!companySnap.exists) {
    throw new HttpsError('not-found', 'Empresa não encontrada');
  }
  const company = companySnap.data() || {};

  // Garantir customer no Stripe
  let customerId = company.customerId as string | undefined;
  if (!customerId) {
    const customer = await stripe.customers.create({
      name: company.nome || undefined,
      email: company.email || undefined,
      metadata: {
        companyId,
      },
    });
    customerId = customer.id;
    await companyRef.set({ customerId, subscriptionProvider: 'stripe', subscriptionType: 'monthly' }, { merge: true });
  }

  // Criar sessão de checkout para assinatura
  const successUrl = `${baseUrl}/plano?status=success`;
  const cancelUrl = `${baseUrl}/plano?status=cancel`;

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      companyId,
    },
  });

  return { url: session.url };
});

// Constantes para cálculo de uso
const MONTHLY_WHATSAPP_FREE_LIMIT = 200;
const WHATSAPP_MESSAGE_UNIT_PRICE = 0.3; // R$ 0,30 por mensagem excedente

// Função para criar checkout de pagamento avulso baseado no uso
export const createUsageBasedCheckout = onCall({ secrets: [STRIPE_SECRET] }, async (request) => {
  const { companyId, monthStart, monthEnd } = request.data;
  const uid = request.auth?.uid;

  if (!uid) {
    throw new HttpsError('unauthenticated', 'Usuário não autenticado');
  }

  if (!companyId) {
    throw new HttpsError('invalid-argument', 'companyId é obrigatório');
  }

  const secret = STRIPE_SECRET.value();
  if (!secret) {
    throw new HttpsError('failed-precondition', 'Stripe não configurado');
  }

  const stripe = new Stripe(secret, { apiVersion: '2024-06-20' });
  const baseUrl = process.env.APP_BASE_URL || 'https://webagendamentos.web.app';

  // Buscar empresa
  const companyRef = db.collection('companies').doc(companyId);
  const companySnap = await companyRef.get();
  if (!companySnap.exists) {
    throw new HttpsError('not-found', 'Empresa não encontrada');
  }
  const company = companySnap.data() || {};

  // Calcular uso de mensagens no período
  const now = new Date();
  const startDate = monthStart ? new Date(monthStart) : new Date(now.getFullYear(), now.getMonth(), 1);
  const endDate = monthEnd ? new Date(monthEnd) : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  // Filtrar apenas mensagens automáticas (messageSource: 'automatic')
  const monthQuery = db.collection(`companies/${companyId}/whatsappMessages`)
    .where('messageSource', '==', 'automatic')
    .where('createdAt', '>=', admin.firestore.Timestamp.fromDate(startDate))
    .where('createdAt', '<', admin.firestore.Timestamp.fromDate(endDate));

  const monthSnapshot = await monthQuery.get();
  const monthCount = monthSnapshot.size;
  const extraCount = Math.max(0, monthCount - MONTHLY_WHATSAPP_FREE_LIMIT);
  const amount = Math.ceil(extraCount * WHATSAPP_MESSAGE_UNIT_PRICE * 100); // Converter para centavos

  if (amount <= 0) {
    throw new HttpsError('failed-precondition', 'Não há valor a cobrar. Uso dentro do limite gratuito.');
  }

  // Garantir customer no Stripe
  let customerId = company.customerId as string | undefined;
  if (!customerId) {
    const customer = await stripe.customers.create({
      name: company.nome || undefined,
      email: company.email || undefined,
      metadata: {
        companyId,
      },
    });
    customerId = customer.id;
    await companyRef.set({ customerId, subscriptionProvider: 'stripe', subscriptionType: 'pay-as-you-go' }, { merge: true });
  }

  // Criar sessão de checkout para pagamento único
  const successUrl = `${baseUrl}/plano?status=success&type=usage`;
  const cancelUrl = `${baseUrl}/plano?status=cancel&type=usage`;

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    customer: customerId,
    line_items: [
      {
        price_data: {
          currency: 'brl',
          product_data: {
            name: `Uso de Mensagens WhatsApp - ${startDate.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}`,
            description: `${monthCount} mensagens enviadas (${extraCount} excedentes após ${MONTHLY_WHATSAPP_FREE_LIMIT} gratuitas)`,
          },
          unit_amount: amount,
        },
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      companyId,
      type: 'usage-based',
      monthStart: startDate.toISOString(),
      monthEnd: endDate.toISOString(),
      messageCount: monthCount.toString(),
      extraCount: extraCount.toString(),
    },
  });

  return { url: session.url, amount, monthCount, extraCount };
});

// Webhook Stripe
export const stripeWebhook = onRequest({ cors: true, secrets: [STRIPE_SECRET, STRIPE_WEBHOOK_SECRET] }, async (req, res) => {
  const sig = req.headers['stripe-signature'] as string;
  let event: Stripe.Event;
  let stripe: Stripe;
  try {
    const webhookSecret = STRIPE_WEBHOOK_SECRET.value();
    const secret = STRIPE_SECRET.value();
    if (!webhookSecret || !secret) {
      console.error('[stripeWebhook] Segredos não configurados');
      res.status(500).send('Stripe não configurado');
      return;
    }
    stripe = new Stripe(secret, { apiVersion: '2024-06-20' });
    event = stripe.webhooks.constructEvent(req.rawBody, sig, webhookSecret);
  } catch (err: any) {
    console.error('[stripeWebhook] assinatura inválida', err?.message);
    res.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const companyId = (session.metadata?.companyId as string) || null;
        if (companyId) {
          // Se for pagamento avulso (usage-based), criar invoice
          if (session.metadata?.type === 'usage-based') {
            const monthStart = session.metadata.monthStart ? new Date(session.metadata.monthStart) : null;
            const monthEnd = session.metadata.monthEnd ? new Date(session.metadata.monthEnd) : null;
            const messageCount = parseInt(session.metadata.messageCount || '0', 10);
            const extraCount = parseInt(session.metadata.extraCount || '0', 10);
            
            // Buscar método de pagamento
            let paymentMethod = 'unknown';
            if (session.payment_intent) {
              try {
                const paymentIntent = await stripe.paymentIntents.retrieve(session.payment_intent as string);
                if (paymentIntent.payment_method) {
                  const pm = await stripe.paymentMethods.retrieve(paymentIntent.payment_method as string);
                  if (pm.type === 'card') {
                    paymentMethod = `Cartão ${pm.card?.brand || ''} ${pm.card?.last4 || ''}`.trim();
                  } else if (pm.type === 'pix') {
                    paymentMethod = 'PIX';
                  } else {
                    paymentMethod = pm.type;
                  }
                } else if (paymentIntent.latest_charge) {
                  const chargeId = typeof paymentIntent.latest_charge === 'string' 
                    ? paymentIntent.latest_charge 
                    : paymentIntent.latest_charge.id;
                  try {
                    const charge = await stripe.charges.retrieve(chargeId);
                    if (charge.payment_method_details) {
                      const details = charge.payment_method_details;
                      if (details.type === 'card') {
                        paymentMethod = `Cartão ${details.card?.brand || ''} ${details.card?.last4 || ''}`.trim();
                      } else if (details.type === 'pix') {
                        paymentMethod = 'PIX';
                      } else {
                        paymentMethod = details.type;
                      }
                    }
                  } catch (chargeErr) {
                    console.error('[stripeWebhook] Erro ao buscar charge:', chargeErr);
                  }
                }
              } catch (err) {
                console.error('[stripeWebhook] Erro ao buscar método de pagamento:', err);
                paymentMethod = 'Cartão';
              }
            }
            
            await db.collection(`companies/${companyId}/invoices`).doc(session.id).set({
              providerInvoiceId: session.id,
              amount: session.amount_total || 0,
              currency: session.currency || 'brl',
              status: 'paid',
              paymentMethod,
              periodStart: monthStart,
              periodEnd: monthEnd,
              metadata: {
                type: 'usage-based',
                messageCount,
                extraCount,
              },
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            
            // Atualizar empresa para indicar que está ativa (pay-as-you-go)
            await db.collection('companies').doc(companyId).set({
              subscriptionProvider: 'stripe',
              subscriptionType: 'pay-as-you-go',
              subscriptionActive: true,
              subscriptionStatus: 'active',
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            }, { merge: true });
          }
          
          await db.collection('auditLogs').add({
            entity: 'stripe',
            entityId: session.id,
            acao: 'checkout.session.completed',
            companyId,
            at: admin.firestore.FieldValue.serverTimestamp(),
          });
        }
        break;
      }
      case 'customer.subscription.updated':
      case 'customer.subscription.created': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        // Descobrir companyId pelo customer->metadata ou buscar empresas com customerId
        let companyId: string | null = null;
        if (subscription.metadata?.companyId) {
          companyId = subscription.metadata.companyId as string;
        } else {
          const companies = await db.collection('companies').where('customerId', '==', customerId).get();
          if (!companies.empty) {
            companyId = companies.docs[0].id;
          }
        }
        if (companyId) {
          const currentPeriodEnd = subscription.current_period_end ? new Date(subscription.current_period_end * 1000) : null;
          await db.collection('companies').doc(companyId).set({
            subscriptionProvider: 'stripe',
            subscriptionType: 'monthly',
            subscriptionId: subscription.id,
            subscriptionStatus: subscription.status,
            subscriptionActive: subscription.status === 'active' || subscription.status === 'trialing' || subscription.status === 'past_due',
            subscriptionCurrentPeriodEnd: currentPeriodEnd,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          }, { merge: true });
        }
        break;
      }
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;
        const companies = await db.collection('companies').where('customerId', '==', customerId).get();
        if (!companies.empty) {
          const companyDoc = companies.docs[0];
          const companyId = companyDoc.id;
          const periodStart = invoice.lines.data[0]?.period?.start ? new Date(invoice.lines.data[0].period.start * 1000) : null;
          const periodEnd = invoice.lines.data[0]?.period?.end ? new Date(invoice.lines.data[0].period.end * 1000) : null;
          
          // Buscar método de pagamento do PaymentIntent
          let paymentMethod = 'unknown';
          if (invoice.payment_intent) {
            try {
              const paymentIntent = await stripe.paymentIntents.retrieve(invoice.payment_intent as string);
              if (paymentIntent.payment_method) {
                const pm = await stripe.paymentMethods.retrieve(paymentIntent.payment_method as string);
                if (pm.type === 'card') {
                  paymentMethod = `Cartão ${pm.card?.brand || ''} ${pm.card?.last4 || ''}`.trim();
                } else if (pm.type === 'pix') {
                  paymentMethod = 'PIX';
                } else {
                  paymentMethod = pm.type;
                }
              } else if (paymentIntent.latest_charge) {
                // Buscar o charge mais recente
                const chargeId = typeof paymentIntent.latest_charge === 'string' 
                  ? paymentIntent.latest_charge 
                  : paymentIntent.latest_charge.id;
                try {
                  const charge = await stripe.charges.retrieve(chargeId);
                  if (charge.payment_method_details) {
                    const details = charge.payment_method_details;
                    if (details.type === 'card') {
                      paymentMethod = `Cartão ${details.card?.brand || ''} ${details.card?.last4 || ''}`.trim();
                    } else if (details.type === 'pix') {
                      paymentMethod = 'PIX';
                    } else {
                      paymentMethod = details.type;
                    }
                  } else if (charge.payment_method) {
                    const pm = typeof charge.payment_method === 'string' 
                      ? await stripe.paymentMethods.retrieve(charge.payment_method)
                      : charge.payment_method;
                    if (pm.type === 'card') {
                      paymentMethod = `Cartão ${pm.card?.brand || ''} ${pm.card?.last4 || ''}`.trim();
                    } else if (pm.type === 'pix') {
                      paymentMethod = 'PIX';
                    } else {
                      paymentMethod = pm.type;
                    }
                  }
                } catch (chargeErr) {
                  console.error('[stripeWebhook] Erro ao buscar charge:', chargeErr);
                }
              }
            } catch (err) {
              console.error('[stripeWebhook] Erro ao buscar método de pagamento:', err);
              paymentMethod = 'Cartão'; // Fallback
            }
          }
          
          await db.collection(`companies/${companyId}/invoices`).doc(invoice.id).set({
            providerInvoiceId: invoice.id,
            amount: invoice.amount_paid,
            currency: invoice.currency,
            status: invoice.status,
            paymentMethod,
            periodStart,
            periodEnd,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          }, { merge: true });
          // Garantir Active e período
          await db.collection('companies').doc(companyId).set({
            subscriptionActive: true,
            subscriptionStatus: 'active',
            subscriptionCurrentPeriodEnd: periodEnd,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          }, { merge: true });
        }
        break;
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;
        const companies = await db.collection('companies').where('customerId', '==', customerId).get();
        if (!companies.empty) {
          const companyDoc = companies.docs[0];
          const companyId = companyDoc.id;
          await db.collection(`companies/${companyId}/invoices`).doc(invoice.id).set({
            providerInvoiceId: invoice.id,
            amount: invoice.amount_due,
            currency: invoice.currency,
            status: invoice.status,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          }, { merge: true });
          await db.collection('companies').doc(companyId).set({
            subscriptionStatus: 'past_due',
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          }, { merge: true });
        }
        break;
      }
      default:
        // Outros eventos podem ser logados
        break;
    }
    res.json({ received: true });
  } catch (err) {
    console.error('[stripeWebhook] erro no handler', err);
    res.status(500).send('Erro interno');
  }
});

// Função para criar agendamento
export const createAppointment = onCall(async (request) => {
  const { appointmentData, companyId } = request.data;
  const uid = request.auth?.uid;

  if (!uid) {
    throw new HttpsError('unauthenticated', 'Usuário não autenticado');
  }

  // Validar companyId
  const finalCompanyId = companyId || request.auth?.token?.companyId;
  if (!finalCompanyId) {
    throw new HttpsError('invalid-argument', 'companyId é obrigatório');
  }

  // Validar que o companyId do token corresponde ao fornecido (se fornecido)
  if (companyId && request.auth?.token?.companyId && companyId !== request.auth.token.companyId) {
    throw new HttpsError('permission-denied', 'Acesso negado: companyId não corresponde ao token');
  }

  try {
    // Validar dados do agendamento
    const {
      professionalId,
      clientId,
      serviceId,
      inicio,
      fim,
      precoCentavos,
      comissaoPercent,
      observacoes
    } = appointmentData;

    if (!professionalId || !clientId || !serviceId || !inicio || !fim) {
      throw new HttpsError('invalid-argument', 'Dados obrigatórios ausentes');
    }

    // Verificar conflitos de horário usando estrutura multi-tenant
    const appointmentsCollection = db.collection(`companies/${finalCompanyId}/appointments`);
    
    // Buscar agendamentos existentes do mesmo profissional com status ativo
    // Usar duas queries porque Firestore não suporta 'in' com múltiplos valores em uma única query
    const [agendadosSnapshot, confirmadosSnapshot] = await Promise.all([
      appointmentsCollection
        .where('professionalId', '==', professionalId)
        .where('status', '==', 'agendado')
        .where('inicio', '<', admin.firestore.Timestamp.fromDate(new Date(fim)))
        .get(),
      appointmentsCollection
        .where('professionalId', '==', professionalId)
        .where('status', '==', 'confirmado')
        .where('inicio', '<', admin.firestore.Timestamp.fromDate(new Date(fim)))
        .get()
    ]);

    // Combinar resultados das duas queries
    const allConflictingDocs = [...agendadosSnapshot.docs, ...confirmadosSnapshot.docs];

    const newStart = new Date(inicio).getTime();
    const newEnd = new Date(fim).getTime();

    const hasConflict = allConflictingDocs.some(doc => {
      const appointment = doc.data();
      const appointmentStart = appointment.inicio.toDate().getTime();
      const appointmentEnd = appointment.fim.toDate().getTime();

      return (
        (newStart >= appointmentStart && newStart < appointmentEnd) ||
        (newEnd > appointmentStart && newEnd <= appointmentEnd) ||
        (newStart <= appointmentStart && newEnd >= appointmentEnd)
      );
    });

    if (hasConflict) {
      throw new HttpsError('failed-precondition', 'Horário já ocupado');
    }

    // Criar agendamento usando estrutura multi-tenant
    const appointmentRef = await appointmentsCollection.add({
      companyId: finalCompanyId,
      professionalId,
      clientId,
      serviceId,
      inicio: admin.firestore.Timestamp.fromDate(new Date(inicio)),
      fim: admin.firestore.Timestamp.fromDate(new Date(fim)),
      precoCentavos,
      comissaoPercent,
      status: 'agendado',
      observacoes: observacoes || '',
      createdByUid: uid,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Log de auditoria
    await db.collection('auditLogs').add({
      actorUid: uid,
      entity: 'appointment',
      entityId: appointmentRef.id,
      companyId: finalCompanyId,
      acao: 'create',
      at: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Enviar confirmação (atualizar para usar estrutura multi-tenant)
    await sendConfirmation(appointmentRef.id, finalCompanyId);

    return { success: true, appointmentId: appointmentRef.id };
  } catch (error: any) {
    console.error('Erro ao criar agendamento:', error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError('internal', 'Erro interno do servidor');
  }
});

// Função para enviar confirmação
async function sendConfirmation(appointmentId: string, companyId: string) {
  try {
    const appointmentDoc = await db.collection(`companies/${companyId}/appointments`).doc(appointmentId).get();
    if (!appointmentDoc.exists) return;

    const appointment = appointmentDoc.data();
    if (!appointment) return;
    
    // Buscar dados do cliente e serviço usando estrutura multi-tenant
    const [clientDoc, serviceDoc] = await Promise.all([
      db.collection(`companies/${companyId}/patients`).doc(appointment.clientId).get(),
      db.collection(`companies/${companyId}/services`).doc(appointment.serviceId).get()
    ]);

    if (!clientDoc.exists || !serviceDoc.exists) return;

    const client = clientDoc.data();
    const service = serviceDoc.data();
    
    if (!client || !service) return;

    // Criar mensagem de confirmação
    const messageData = {
      appointmentId,
      companyId,
      tipo: 'confirmacao',
      canal: client.preferenciaNotificacao,
      status: 'enviado',
      payload: {
        nome: client.nome,
        servico: service.nome,
        data: appointment.inicio.toDate().toLocaleDateString('pt-BR'),
        hora: appointment.inicio.toDate().toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'America/Sao_Paulo'
        }),
      },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await db.collection(`companies/${companyId}/messages`).add(messageData);

    // Aqui você integraria com WhatsApp/SMS/Email
    // Por enquanto, apenas log
    console.log('Confirmação enviada:', messageData);

  } catch (error) {
    console.error('Erro ao enviar confirmação:', error);
  }
}

// Função para enviar lembretes (executada por cron job)
import { processarNotificacoesAgendamentos } from './whatsapp/notificarAgendamentos';

export const sendReminders = onSchedule({
  schedule: '*/10 * * * *',
  secrets: ['evolution-api-key', 'evolution-api-url'],
}, async () => {
  try {
    console.log('[sendReminders] Iniciando scheduler de lembretes');
    const resultado = await processarNotificacoesAgendamentos();

    console.log('[sendReminders] Resultado do processamento:', resultado);
  } catch (error) {
    console.error('[sendReminders] Erro ao processar lembretes:', error);
  }
});

// Função auxiliar para enviar lembrete
// Legacy reminder logic removed in favor of processarNotificacoesAgendamentos

// Função para chamar webhook do Altegio (chamada pelo cliente)
export const callAltegioWebhook = onCall({ 
  memory: '1GiB',
  secrets: ['evolution-api-key', 'evolution-api-url'],
}, async (request) => {
  const { appointmentData, companyId, appointmentId, status = 'create', enviarNotificacao = true } = request.data;
  const uid = request.auth?.uid;

  if (!uid) {
    throw new HttpsError('unauthenticated', 'Usuário não autenticado');
  }

  try {
    console.log('[callAltegioWebhook] Início', {
      uid,
      companyId,
      appointmentId,
      status,
      enviarNotificacao,
      appointmentKeys: appointmentData ? Object.keys(appointmentData) : null,
      inicio: appointmentData?.inicio,
      fim: appointmentData?.fim
    });

    // Validar dados obrigatórios
    if (!appointmentData) {
      console.error('[callAltegioWebhook] appointmentData é null/undefined');
      throw new HttpsError('invalid-argument', 'appointmentData é obrigatório');
    }

    if (!companyId) {
      console.error('[callAltegioWebhook] companyId é null/undefined');
      throw new HttpsError('invalid-argument', 'companyId é obrigatório');
    }

    console.log('[callAltegioWebhook] Validando appointmentData:', {
      hasProfessionalId: !!appointmentData.professionalId,
      hasServiceId: !!appointmentData.serviceId,
      hasClientId: !!appointmentData.clientId,
      professionalId: appointmentData.professionalId,
      serviceId: appointmentData.serviceId,
      clientId: appointmentData.clientId
    });

    if (!appointmentData.professionalId || !appointmentData.serviceId || !appointmentData.clientId) {
      console.error('[callAltegioWebhook] Dados obrigatórios ausentes:', {
        professionalId: appointmentData.professionalId,
        serviceId: appointmentData.serviceId,
        clientId: appointmentData.clientId
      });
      throw new HttpsError('invalid-argument', 'professionalId, serviceId e clientId são obrigatórios');
    }

    // Buscar dados da empresa, profissional, serviço(s), cliente e configurações da empresa
    // Verificar se há múltiplos serviços (serviceIds)
    const serviceIds = appointmentData.serviceIds && appointmentData.serviceIds.length > 0
      ? appointmentData.serviceIds
      : [appointmentData.serviceId]; // Fallback para serviceId único
    
    const [companyDoc, professionalDoc, clientDoc, settingsDoc, ...serviceDocs] = await Promise.all([
      db.collection('companies').doc(companyId).get(),
      db.collection(`companies/${companyId}/professionals`).doc(appointmentData.professionalId).get(),
      db.collection(`companies/${companyId}/patients`).doc(appointmentData.clientId).get(),
      db.collection(`companies/${companyId}/settings`).doc('general').get(),
      ...serviceIds.map((serviceId: string) => 
        db.collection(`companies/${companyId}/services`).doc(serviceId).get()
      )
    ]);

    if (!companyDoc.exists || !professionalDoc.exists || !clientDoc.exists) {
      throw new HttpsError('not-found', 'Dados não encontrados');
    }

    // Verificar se todos os serviços foram encontrados
    const services = serviceDocs
      .map(doc => doc.exists ? doc.data() : null)
      .filter((service): service is any => service !== null);

    if (services.length === 0) {
      throw new HttpsError('not-found', 'Nenhum serviço encontrado');
    }

    const company = companyDoc.data();
    const professional = professionalDoc.data();
    const client = clientDoc.data();
    const settings = settingsDoc.exists ? settingsDoc.data() : null;
    // Manter service para compatibilidade (primeiro serviço)
    const service = services[0];

    if (!company || !professional || !client) {
      throw new HttpsError('not-found', 'Dados inválidos');
    }

    console.log('[callAltegioWebhook] Dados carregados', {
      companyLoaded: !!company,
      professionalLoaded: !!professional,
      servicesLoaded: services.length,
      serviceLoaded: !!service,
      clientLoaded: !!client,
      hasSettings: !!settings
    });

    // Converter timestamps para Date se necessário
    console.log('[callAltegioWebhook] Dados de data recebidos:', {
      inicio: appointmentData.inicio,
      fim: appointmentData.fim,
      inicioType: typeof appointmentData.inicio,
      fimType: typeof appointmentData.fim,
      inicioIsDate: appointmentData.inicio instanceof Date,
      fimIsDate: appointmentData.fim instanceof Date
    });

    const inicioDate = appointmentData.inicio instanceof Date ? 
      appointmentData.inicio : 
      appointmentData.inicio.toDate ? appointmentData.inicio.toDate() : new Date(appointmentData.inicio);
    
    const fimDate = appointmentData.fim instanceof Date ? 
      appointmentData.fim : 
      appointmentData.fim.toDate ? appointmentData.fim.toDate() : new Date(appointmentData.fim);

    console.log('[callAltegioWebhook] Datas convertidas:', {
      inicioDate: inicioDate.toISOString(),
      fimDate: fimDate.toISOString()
    });

    // Calcular duração em segundos
    const durationMs = fimDate.getTime() - inicioDate.getTime();
    const seanceLength = Math.round(durationMs / 1000);

    // Formatar data no padrão ISO com timezone -03:00 ajustando o relógio
    const offsetMinutes = -180; // America/Sao_Paulo UTC-03:00 (sem DST)
    const localForIso = new Date(inicioDate.getTime() + offsetMinutes * 60 * 1000);
    const isoNoZ = localForIso.toISOString().slice(0, 19);
    const sign = offsetMinutes >= 0 ? '+' : '-';
    const abs = Math.abs(offsetMinutes);
    const hh = String(Math.floor(abs / 60)).padStart(2, '0');
    const mm = String(abs % 60).padStart(2, '0');
    const datetime = `${isoNoZ}${sign}${hh}:${mm}`;

    // Montar endereço (priorizar settings)
    const computedAddress = company.endereco ?
      `${company.endereco.rua}, ${company.endereco.numero}. ${company.endereco.bairro}/${company.endereco.estado}` : '';

    const webhookData: WebHookAgendamentoRequest = {
      resource_id: appointmentId || '',
      resource: 'record',
      status: status, // Usar o status recebido (create, update ou delete)
      enviarNotificacao: enviarNotificacao, // Incluir o parâmetro enviarNotificacao no payload
      companyId,
      data: {
        seance_length: seanceLength,
        company_name: settings?.nomeSalao || company.nome || 'Empresa',
        company_adress: settings?.enderecoSalao || computedAddress,
        company_phone: settings?.telefoneSalao || company.telefone || '',
        staff: professional.apelido || 'Profissional',
        services: services.map(s => ({ title: s.nome || 'Serviço' })),
        client: {
          name: client.nome || 'Cliente',
          phone: client.telefoneE164 || ''
        },
        datetime: datetime
      }
    };

    console.log('[callAltegioWebhook] Conteúdo que será enviado', {
      resource_id: webhookData.resource_id,
      resource: webhookData.resource,
      status: webhookData.status,
      enviarNotificacao: webhookData.enviarNotificacao,
      company_name: webhookData.data.company_name,
      company_adress: webhookData.data.company_adress,
      company_phone: webhookData.data.company_phone,
      staff: webhookData.data.staff,
      service: webhookData.data.services?.[0]?.title,
      client_name: webhookData.data.client?.name,
      client_phone: webhookData.data.client?.phone,
      datetime: webhookData.data.datetime,
      seance_length: webhookData.data.seance_length
    });

    console.log('[callAltegioWebhook] Processando webhook internamente');
    await handleWebhookAgendamento(webhookData, undefined, companyId);
    console.log('[callAltegioWebhook] Webhook Altegio processado com sucesso');
    return { success: true };

  } catch (error) {
    console.error('[callAltegioWebhook] Falha geral:', error);
    throw new HttpsError('internal', 'Erro interno do servidor');
  }
});


export const startEvolutionSession = onCall({ 
  memory: '1GiB',
  secrets: ['evolution-api-key', 'evolution-api-url'],
}, async (request) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError('unauthenticated', 'Usuário não autenticado');
  }

  const companyId = (request.data?.companyId ?? request.auth?.token?.companyId) as string | undefined;
  if (!companyId) {
    throw new HttpsError('invalid-argument', 'companyId é obrigatório');
  }

  const whatsappIntegrationType = request.data?.whatsappIntegrationType as 'WHATSAPP-BAILEYS' | 'WHATSAPP-BUSINESS' | undefined;
  const whatsappNumber = request.data?.whatsappNumber as string | undefined;
  
  // Validar se o tipo foi fornecido
  if (!whatsappIntegrationType || (whatsappIntegrationType !== 'WHATSAPP-BAILEYS' && whatsappIntegrationType !== 'WHATSAPP-BUSINESS')) {
    throw new HttpsError('invalid-argument', 'whatsappIntegrationType é obrigatório e deve ser "WHATSAPP-BAILEYS" ou "WHATSAPP-BUSINESS"');
  }

  // Validar se o número foi fornecido
  if (!whatsappNumber || whatsappNumber.trim() === '') {
    throw new HttpsError('invalid-argument', 'whatsappNumber é obrigatório');
  }

  // Validar formato do número (apenas números)
  const numberDigits = whatsappNumber.replace(/\D/g, '');
  if (numberDigits.length < 10) {
    throw new HttpsError('invalid-argument', 'Número de WhatsApp inválido. Deve conter pelo menos 10 dígitos.');
  }

  try {
    console.log('[startEvolutionSession] Iniciando pareamento', { uid, companyId, whatsappIntegrationType, whatsappNumber: numberDigits });
    const { startEvolutionPairing } = await import('./whatsapp/evolutionClient');
    const result = await startEvolutionPairing(companyId, whatsappIntegrationType, numberDigits);
    console.log('[startEvolutionSession] Pareamento concluído', { companyId, result });
    return {
      success: true,
      status: result.status,
      qrCode: result.qrCode ?? null,
      error: result.error ?? null,
    };
  } catch (error) {
    const message = (error as Error).message ?? 'Erro desconhecido';
    console.error('[startEvolutionSession] Falha ao iniciar pareamento', error);
    await admin
      .firestore()
      .collection(`companies/${companyId}/integrations`)
      .doc('whatsappEvolution')
      .set(
        {
          status: 'error',
          lastError: message,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    return {
      success: false,
      status: 'error',
      error: message,
    };
  }
});

export const checkEvolutionStatus = onCall({
  memory: '1GiB',
  secrets: ['evolution-api-key', 'evolution-api-url'],
}, async (request) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError('unauthenticated', 'Usuário não autenticado');
  }

  const companyId = (request.data?.companyId ?? request.auth?.token?.companyId);
  if (!companyId) {
    throw new HttpsError('invalid-argument', 'companyId é obrigatório');
  }

  try {
    const { getOrCreateEvolutionInstance, getEvolutionInstanceStatus } = await import('./whatsapp/evolutionClient');
    const { getCompanySettings } = await import('./whatsapp/whatsappEnvio');
    
    // Obter configurações da empresa para saber o tipo de integração
    const settings = await getCompanySettings(companyId);
    const integrationType = (settings?.whatsappIntegrationType as 'WHATSAPP-BAILEYS' | 'WHATSAPP-BUSINESS') || 'WHATSAPP-BAILEYS';
    const number = settings?.whatsappNumber as string | undefined;
    
    // Obter nome da instância
    const instanceName = await getOrCreateEvolutionInstance(companyId, integrationType, number);
    
    // Verificar status da instância
    const instanceStatus = await getEvolutionInstanceStatus(instanceName);
    
    if (!instanceStatus) {
      return {
        success: false,
        status: 'error',
        message: 'Instância não encontrada',
      };
    }

    const connectionState = instanceStatus.connection?.state;
    const statusDocRef = admin.firestore().collection(`companies/${companyId}/integrations`).doc('whatsappEvolution');
    const statusDoc = await statusDocRef.get();
    const currentStatus = statusDoc.data()?.status;

    // Se a conexão está aberta e o status atual não é 'connected', atualizar
    if (connectionState === 'open' && currentStatus !== 'connected') {
      await statusDocRef.update({
        status: 'connected',
        qrCode: admin.firestore.FieldValue.delete(),
        lastConnectedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      
      return {
        success: true,
        status: 'connected',
        message: 'WhatsApp conectado com sucesso',
      };
    }

    // Se a conexão está fechada e o status atual é 'connected', atualizar
    if (connectionState === 'close' && currentStatus === 'connected') {
      await statusDocRef.update({
        status: 'disconnected',
        lastDisconnectReason: 'Conexão fechada',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      
      return {
        success: true,
        status: 'disconnected',
        message: 'WhatsApp desconectado',
      };
    }

    // Retornar status atual sem mudanças
    return {
      success: true,
      status: currentStatus || 'unknown',
      connectionState,
      message: 'Status verificado',
    };
  } catch (error: any) {
    const message = error?.message || 'Erro desconhecido';
    console.error('[checkEvolutionStatus] Erro ao verificar status', error);
    throw new HttpsError('internal', `Erro ao verificar status: ${message}`);
  }
});

export const sendManualWhatsappMessage = onCall({ memory: '1GiB' }, async (request) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError('unauthenticated', 'Usuário não autenticado');
  }

  const companyId = (request.data?.companyId ?? request.auth?.token?.companyId) as string | undefined;
  const phone = request.data?.phone as string | undefined;
  const message = request.data?.message as string | undefined;
  const patientId = request.data?.patientId as string | undefined;

  if (!companyId) {
    throw new HttpsError('invalid-argument', 'companyId é obrigatório');
  }

  if (!phone || !message || !message.trim()) {
    throw new HttpsError('invalid-argument', 'Telefone e mensagem são obrigatórios');
  }

  try {
    const config = await getWhatsappConfig(companyId);
    if (config.provider === 'meta') {
      throw new HttpsError('failed-precondition', 'Envio manual disponível apenas para Evolution API.');
    }

    if (config.provider !== 'evolution') {
      throw new HttpsError('failed-precondition', 'Evolution API não configurada. Configure em Configurações > WhatsApp.');
    }

    const normalized = normalizarTelefone(phone);
    if (!normalized) {
      throw new HttpsError('invalid-argument', 'Telefone informado é inválido.');
    }

    const chatId = normalizePhoneForContact(normalized);
    const resultadoEnvio = await sendEvolutionTextMessage({
      companyId: (config as any).companyId || companyId,
      to: chatId,
      message: message.trim(),
    });

    const wamId = resultadoEnvio.messageId || `manual_${Date.now()}`;

    await db.collection(`companies/${(config as any).companyId || companyId}/whatsappMessages`).doc(wamId).set(
      {
        message: {
          id: wamId,
          to: chatId,
          type: 'text',
          provider: 'evolution',
          text: {
            body: message.trim(),
            preview_url: false,
          },
        },
        wam_id: wamId,
        chat_id: chatId,
        provider: 'evolution',
        companyId: config.companyId,
        direction: 'outbound',
        messageSource: 'manual',
        sentBy: uid,
        patientId: patientId ?? null,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    // Buscar paciente pelo número de telefone para obter o nome
    const finalCompanyId = (config as any).companyId || companyId;
    const patientName = await findPatientNameByPhone(finalCompanyId, chatId);

    // Preparar dados do contato
    const contactData: any = {
      wa_id: chatId,
        last_message_at: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      companyId: finalCompanyId,
    };

    // Se encontrou o paciente, adicionar o nome ao contato
    if (patientName) {
      contactData.name = patientName;
      contactData.patientName = patientName; // Campo adicional para compatibilidade
    }

    await db.collection(`companies/${finalCompanyId}/whatsappContacts`).doc(chatId).set(
      contactData,
      { merge: true }
    );

    return { success: true, wamId };
  } catch (error) {
    console.error('[sendManualWhatsappMessage] Falha ao enviar mensagem manual:', error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError('internal', 'Não foi possível enviar a mensagem.');
  }
});

// Função para gerar mensagem de aniversário via IA
export const generateBirthdayMessage = onCall(
  {
    secrets: ['OPENAI_API_KEY'],
  },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) {
      throw new HttpsError('unauthenticated', 'Usuário não autenticado');
    }

    const { patientId, patientFirstName, companyId } = request.data;

    if (!patientId || !patientFirstName || !companyId) {
      throw new HttpsError('invalid-argument', 'patientId, patientFirstName e companyId são obrigatórios');
    }

    try {
      // Obter e limpar a chave da API (remover espaços, quebras de linha, etc.)
      let openaiApiKey = process.env.OPENAI_API_KEY;
      if (openaiApiKey) {
        // Remover espaços em branco, quebras de linha e caracteres inválidos
        openaiApiKey = openaiApiKey.trim().replace(/\s+/g, '');
      }

    // Se não tiver chave da OpenAI, usar templates como fallback
    if (!openaiApiKey) {
      console.warn('[generateBirthdayMessage] OPENAI_API_KEY não configurada, usando templates');
      const templates = [
        `Que este novo ano de vida seja repleto de saúde, alegria e realizações! 🎂✨

É uma alegria ter você como nosso cliente e esperamos continuar cuidando de você com muito carinho.`,
        `Hoje é um dia muito especial para você! 🎂 Desejamos um aniversário repleto de felicidade, momentos inesquecíveis e muita saúde! 💚

Estamos felizes em fazer parte da sua jornada e esperamos continuar cuidando de você com dedicação.`,
        `Que seu dia seja repleto de sorrisos, carinho e momentos especiais ao lado de quem você ama! 🎂💫

Agradecemos sua confiança em nossos serviços e desejamos um novo ano cheio de conquistas e bem-estar.`
      ];

      const randomTemplate = templates[Math.floor(Math.random() * templates.length)];
      return { success: true, message: randomTemplate };
    }

    // Usar OpenAI para gerar mensagem personalizada
    const openai = new OpenAI({
      apiKey: openaiApiKey,
    });

    const prompt = `Crie uma mensagem de aniversário personalizada, calorosa e profissional em português brasileiro. 

A mensagem deve:
- Ser amigável e carinhosa, mas manter um tom profissional
- Incluir emojis relacionados a aniversário (🎉, 🎂, 🎊, etc.)
- NÃO mencionar o nome da pessoa (o nome será adicionado separadamente no template)
- Expressar bons votos de saúde, felicidade e realizações
- Ter entre 3 e 5 linhas
- Ser apropriada para um cliente de um estabelecimento comercial
- Começar diretamente com a mensagem de parabéns, sem saudações

Formate a mensagem de forma clara e legível.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o', // Modelo mais recente e funcional da OpenAI
      messages: [
        {
          role: 'system',
          content: 'Você é um assistente especializado em criar mensagens personalizadas de aniversário para clientes. Suas mensagens são calorosas, profissionais e amigáveis.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: 200,
      temperature: 0.8,
    });

    const generatedMessage = completion.choices[0]?.message?.content?.trim();

    if (!generatedMessage) {
      throw new Error('Resposta vazia da OpenAI');
    }

    return { success: true, message: generatedMessage };
  } catch (error) {
    console.error('[generateBirthdayMessage] Erro ao gerar mensagem:', error);
    
    // Fallback para templates em caso de erro
    const templates = [
      `Que este novo ano de vida seja repleto de saúde, alegria e realizações! 🎂✨

É uma alegria ter você como nosso cliente e esperamos continuar cuidando de você com muito carinho.`,
      `Hoje é um dia muito especial para você! 🎂 Desejamos um aniversário repleto de felicidade, momentos inesquecíveis e muita saúde! 💚

Estamos felizes em fazer parte da sua jornada e esperamos continuar cuidando de você com dedicação.`,
    ];

    const randomTemplate = templates[Math.floor(Math.random() * templates.length)];
    return { success: true, message: randomTemplate };
  }
  }
);

// Função para verificar se mensagem de aniversário já foi enviada
export const checkBirthdayMessageSent = onCall(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError('unauthenticated', 'Usuário não autenticado');
  }

  const { patientId, companyId, birthdayDate } = request.data;

  if (!patientId || !companyId) {
    throw new HttpsError('invalid-argument', 'patientId e companyId são obrigatórios');
  }

  try {
    // Verificar se já existe mensagem de aniversário enviada para este paciente nesta data
    // Converter birthdayDate para Date se for string
    let today: Date;
    if (typeof birthdayDate === 'string') {
      today = new Date(birthdayDate);
    } else if (birthdayDate && typeof birthdayDate.toDate === 'function') {
      // Firestore Timestamp
      today = birthdayDate.toDate();
    } else if (birthdayDate) {
      today = new Date(birthdayDate);
    } else {
      today = new Date();
    }
    today.setHours(0, 0, 0, 0);
    
    const birthdayMessages = await db
      .collection('birthdayMessages')
      .where('companyId', '==', companyId)
      .where('patientId', '==', patientId)
      .where('sentAt', '>=', admin.firestore.Timestamp.fromDate(today))
      .get();

    const alreadySent = !birthdayMessages.empty;

    let sentAtValue = null;
    if (alreadySent) {
      const sentAtData = birthdayMessages.docs[0].data().sentAt;
      // Converter Firestore Timestamp para formato serializável
      if (sentAtData && typeof sentAtData.toDate === 'function') {
        sentAtValue = sentAtData.toDate().toISOString();
      } else if (sentAtData) {
        sentAtValue = sentAtData.toISOString ? sentAtData.toISOString() : sentAtData;
      }
    }

    return { 
      success: true, 
      alreadySent,
      sentAt: sentAtValue
    };
  } catch (error) {
    console.error('[checkBirthdayMessageSent] Erro ao verificar:', error);
    throw new HttpsError('internal', 'Erro ao verificar mensagem de aniversário');
  }
});

// Função auxiliar para enviar mensagem de aniversário via template Meta
async function sendBirthdayTemplateViaMeta(
  config: MetaWhatsappConfig,
  phone: string,
  patientFirstName: string,
  aiMessage: string,
  companyId: string
): Promise<{ wamId: string; chatId: string }> {
  const WHATSAPP_API_URL = `https://graph.facebook.com/v18.0/${config.whatsappApiPhoneNumberId}/messages`;
  
  const phoneNumber = phone.replace(/\D/g, '');
  
  const template = templatesWhats.aniversario_v1;
  const parameters = [
    { type: 'text', text: patientFirstName },
    { type: 'text', text: aiMessage },
  ];
  
  const payload = {
    messaging_product: 'whatsapp',
    to: phoneNumber,
    type: 'template',
    template: {
      name: 'aniversario_v1',
      language: { code: 'pt_BR' },
      components: [
        { type: 'body', parameters },
      ],
    },
  };

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${config.whatsappAccessToken}`,
  };

  console.log('[sendBirthdayTemplateViaMeta] Enviando mensagem via template Meta', {
    phoneNumber,
    template: 'aniversario_v1',
    patientFirstName,
    aiMessageLength: aiMessage.length,
  });

  const response = await fetch(WHATSAPP_API_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  const responseText = await response.text();
  console.log('[sendBirthdayTemplateViaMeta] Resposta da API Meta', {
    status: response.status,
    statusText: response.statusText,
    responseText,
  });

  if (!response.ok) {
    let errorMessage = `Meta API error: ${response.status}`;
    try {
      const errorJson = JSON.parse(responseText);
      const errorDetails = errorJson.error || {};
      errorMessage = `${errorMessage} - ${errorDetails.message || responseText}`;
      console.error('[sendBirthdayTemplateViaMeta] Erro detalhado:', errorDetails);
    } catch (parseError) {
      errorMessage = `${errorMessage} - ${responseText}`;
    }
    throw new Error(errorMessage);
  }

  let responseJson: { messages?: Array<{ id?: string }>; contacts?: Array<{ wa_id?: string }>; error?: any };
  try {
    responseJson = JSON.parse(responseText);
  } catch (parseError) {
    throw new Error(`Erro ao processar resposta da API Meta: ${responseText}`);
  }

  if (responseJson.error) {
    const errorDetails = responseJson.error;
    throw new Error(`Erro na resposta da API Meta: ${errorDetails.message || 'Erro desconhecido'}`);
  }

  if (!responseJson.messages || !responseJson.messages[0]?.id) {
    throw new Error(`Resposta da API Meta não contém ID de mensagem: ${responseText}`);
  }

  const wamId = responseJson.messages[0].id;
  // Normalizar para formato consistente usado como ID de contato
  const rawChatId = responseJson.contacts?.[0]?.wa_id?.replace(/\D/g, '') || phoneNumber;
  const chatId = normalizePhoneForContact(rawChatId);
  const mensagemFormatada = substituirParametros(template, parameters);

  // Salvar no Firestore dentro da coleção da empresa
  await db.collection(`companies/${companyId}/whatsappMessages`).doc(wamId).set({
    message: {
      id: wamId,
      to: chatId,
      type: 'template' as const,
      provider: 'meta' as const,
      template: {
        name: 'aniversario_v1',
        language: { code: 'pt_BR' },
      },
      text: {
        body: mensagemFormatada,
        preview_url: false,
      },
    },
    wam_id: wamId,
    chat_id: chatId,
    provider: 'meta',
    companyId: companyId,
    messageSource: 'automatic',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  if (chatId) {
    // Buscar paciente pelo número de telefone para obter o nome
    const patientName = await findPatientNameByPhone(companyId, chatId);

    // Preparar dados do contato
    const contactData: any = {
      wa_id: chatId,
        last_message_at: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        companyId: companyId,
    };

    // Se encontrou o paciente, adicionar o nome ao contato
    if (patientName) {
      contactData.name = patientName;
      contactData.patientName = patientName; // Campo adicional para compatibilidade
    }

    await db.collection(`companies/${companyId}/whatsappContacts`).doc(chatId).set(
      contactData,
      { merge: true }
    );
  }

  console.log('[sendBirthdayTemplateViaMeta] Mensagem enviada com sucesso', { wamId, chatId });

  return { wamId, chatId };
}


// Função auxiliar para enviar mensagem de aniversário via ambos os provedores
async function sendBirthdayMessageViaProvider(
  config: WhatsappConfig,
  phone: string,
  normalizedPhone: string,
  patientFirstName: string,
  aiMessage: string,
  companyId: string
): Promise<{ wamId: string; chatId: string; provider: string }> {
  // Verificar se WhatsApp está desabilitado
  if (config.provider === 'disabled') {
    throw new Error('WhatsApp está desabilitado nas configurações');
  }
  
  if (config.provider === 'evolution') {
    const evolutionConfig = config as any; // EvolutionWhatsappConfig
    const destino = normalizedPhone.startsWith('55') ? normalizedPhone : `55${normalizedPhone}`;
    
    console.log('[sendBirthdayMessage] Enviando via Evolution', {
      destino,
      companyId: evolutionConfig.companyId,
    });

    const template = templatesWhats.aniversario_v1;
    const parameters = [
      { type: 'text', text: patientFirstName },
      { type: 'text', text: aiMessage },
    ];
    const mensagemFormatada = substituirParametros(template, parameters);

    const resultadoEnvio = await sendEvolutionTextMessage({
      companyId: evolutionConfig.companyId,
      to: destino,
      message: mensagemFormatada,
    });

    const wamId = resultadoEnvio.messageId || `birthday_evolution_${Date.now()}`;
    // Normalizar para formato consistente usado como ID de contato
    const chatId = normalizePhoneForContact(destino);
    
    console.log('[sendBirthdayMessage] Mensagem enviada via Evolution', {
      wamId,
      chatId,
    });
    
    return { wamId, chatId, provider: 'evolution' };
  } else if (config.provider === 'meta') {
    const metaConfig = config as MetaWhatsappConfig;
    // Para Meta, usar template oficial do WhatsApp
    const { wamId, chatId } = await sendBirthdayTemplateViaMeta(metaConfig, phone, patientFirstName, aiMessage, companyId);
    return { wamId, chatId, provider: 'meta' };
  } else {
    throw new Error(`Provedor não suportado: ${(config as any).provider}`);
  }
}

// Função para assinar orçamento pelo token (pública, sem autenticação)
export const signOrcamento = onCall(async (request) => {
  const { token, signedBy, signatureIP, signatureImageUrl, companyId: companyIdFromRequest, patientId: patientIdFromRequest } = request.data || {};

  if (!token || typeof token !== 'string') {
    throw new HttpsError('invalid-argument', 'Token é obrigatório');
  }

  if (!signedBy || typeof signedBy !== 'string' || !signedBy.trim()) {
    throw new HttpsError('invalid-argument', 'Nome do assinante é obrigatório');
  }

  if (!signatureImageUrl || typeof signatureImageUrl !== 'string') {
    throw new HttpsError('invalid-argument', 'Assinatura digital é obrigatória');
  }

  try {
    let orcamentoDoc: FirebaseFirestore.QueryDocumentSnapshot<FirebaseFirestore.DocumentData> | null = null;
    
    // Se tiver companyId e patientId, fazer busca direta (mais eficiente)
    if (companyIdFromRequest && typeof companyIdFromRequest === 'string' && 
        patientIdFromRequest && typeof patientIdFromRequest === 'string') {
      console.log('[signOrcamento] Buscando com companyId e patientId:', companyIdFromRequest, patientIdFromRequest);
      
      // Busca direta no orçamento do paciente específico
      const orcamentosRef = db.collection(`companies/${companyIdFromRequest}/patients/${patientIdFromRequest}/orcamentos`);
      const snapshot = await orcamentosRef
        .where('signatureToken', '==', token)
        .limit(1)
        .get();
      
      if (!snapshot.empty) {
        orcamentoDoc = snapshot.docs[0];
        console.log('[signOrcamento] Orçamento encontrado com companyId e patientId');
      }
    } 
    // Se tiver apenas companyId, buscar em todos os pacientes da empresa
    else if (companyIdFromRequest && typeof companyIdFromRequest === 'string') {
      console.log('[signOrcamento] Buscando com companyId:', companyIdFromRequest);
      
      // Buscar em todos os pacientes da empresa
      const patientsSnapshot = await db.collection(`companies/${companyIdFromRequest}/patients`).get();
      
      for (const patientDoc of patientsSnapshot.docs) {
        const patientId = patientDoc.id;
        const orcamentosRef = db.collection(`companies/${companyIdFromRequest}/patients/${patientId}/orcamentos`);
        const snapshot = await orcamentosRef
          .where('signatureToken', '==', token)
          .limit(1)
          .get();
        
        if (!snapshot.empty) {
          orcamentoDoc = snapshot.docs[0];
          console.log('[signOrcamento] Orçamento encontrado com companyId');
          break;
        }
      }
    } else {
      // Fallback: usar Collection Group Query (requer índice)
      console.log('[signOrcamento] Buscando sem companyId, usando Collection Group Query');
      
      try {
        const orcamentosSnapshot = await db.collectionGroup('orcamentos')
          .where('signatureToken', '==', token)
          .limit(1)
          .get();
        
        if (!orcamentosSnapshot.empty) {
          orcamentoDoc = orcamentosSnapshot.docs[0];
        }
      } catch (queryError: any) {
        console.error('[signOrcamento] Erro na Collection Group Query:', {
          code: queryError.code,
          message: queryError.message
        });
        throw queryError;
      }
    }
    
    if (!orcamentoDoc) {
      throw new HttpsError('not-found', 'Orçamento não encontrado');
    }
    
    const orcamentoData = orcamentoDoc.data();
    
    // Verificar se já está assinado
    if (orcamentoData.signedAt) {
      throw new HttpsError('failed-precondition', 'Orçamento já foi assinado');
    }
    
    // Atualizar orçamento com assinatura
    await orcamentoDoc.ref.update({
      signedAt: admin.firestore.Timestamp.now(),
      signedBy: signedBy.trim(),
      signatureIP: signatureIP || 'unknown',
      signatureImageUrl: signatureImageUrl,
      status: 'aprovado',
      updatedAt: admin.firestore.Timestamp.now(),
    });
    
    return { success: true };
  } catch (error: any) {
    console.error('[signOrcamento] Erro:', error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError('internal', 'Erro ao assinar orçamento');
  }
});

// Função para buscar orçamento pelo token de assinatura (pública, sem autenticação)
export const getOrcamentoByToken = onCall(async (request) => {
  const { token, companyId: companyIdFromRequest, patientId: patientIdFromRequest } = request.data || {};

  if (!token || typeof token !== 'string') {
    throw new HttpsError('invalid-argument', 'Token é obrigatório');
  }

  try {
    let orcamentosSnapshot: FirebaseFirestore.QuerySnapshot<FirebaseFirestore.DocumentData> | null = null;
    
    // Se tiver companyId e patientId na URL, fazer busca direta (mais eficiente)
    if (companyIdFromRequest && typeof companyIdFromRequest === 'string' && 
        patientIdFromRequest && typeof patientIdFromRequest === 'string') {
      console.log('[getOrcamentoByToken] Buscando com companyId e patientId:', companyIdFromRequest, patientIdFromRequest);
      
      // Busca direta no orçamento do paciente específico
      const orcamentosRef = db.collection(`companies/${companyIdFromRequest}/patients/${patientIdFromRequest}/orcamentos`);
      orcamentosSnapshot = await orcamentosRef
        .where('signatureToken', '==', token)
        .limit(1)
        .get();
      
      console.log('[getOrcamentoByToken] Orçamento encontrado com companyId e patientId, documentos:', orcamentosSnapshot.size);
    } 
    // Se tiver apenas companyId, buscar em todos os pacientes da empresa
    else if (companyIdFromRequest && typeof companyIdFromRequest === 'string') {
      console.log('[getOrcamentoByToken] Buscando com companyId:', companyIdFromRequest);
      
      // Buscar em todos os pacientes da empresa
      const patientsSnapshot = await db.collection(`companies/${companyIdFromRequest}/patients`).get();
      
      for (const patientDoc of patientsSnapshot.docs) {
        const patientId = patientDoc.id;
        const orcamentosRef = db.collection(`companies/${companyIdFromRequest}/patients/${patientId}/orcamentos`);
        const snapshot = await orcamentosRef
          .where('signatureToken', '==', token)
          .limit(1)
          .get();
        
        if (!snapshot.empty) {
          orcamentosSnapshot = snapshot;
          console.log('[getOrcamentoByToken] Orçamento encontrado com companyId');
          break;
        }
      }
    } else {
      // Fallback: usar Collection Group Query (requer índice)
      console.log('[getOrcamentoByToken] Buscando sem companyId, usando Collection Group Query');
      
      try {
        orcamentosSnapshot = await db.collectionGroup('orcamentos')
          .where('signatureToken', '==', token)
          .limit(1)
          .get();
        console.log('[getOrcamentoByToken] Query executada com sucesso, documentos encontrados:', orcamentosSnapshot.size);
      } catch (queryError: any) {
        console.error('[getOrcamentoByToken] Erro detalhado na query:', {
          code: queryError.code,
          message: queryError.message,
          details: queryError.details,
          name: queryError.name
        });
        // Re-throw para ser capturado pelo catch externo
        throw queryError;
      }
    }
    
    if (!orcamentosSnapshot || orcamentosSnapshot.empty) {
      throw new HttpsError('not-found', 'Orçamento não encontrado');
    }
    
    const orcamentoDoc = orcamentosSnapshot.docs[0];
    const orcamentoData = orcamentoDoc.data();
    
    // Extrair companyId e patientId do caminho do documento
    // O caminho será: companies/{companyId}/patients/{patientId}/orcamentos/{orcamentoId}
    const pathParts = orcamentoDoc.ref.path.split('/');
    const companyIdIndex = pathParts.indexOf('companies');
    const patientIdIndex = pathParts.indexOf('patients');
    
    if (companyIdIndex === -1 || patientIdIndex === -1 || companyIdIndex + 1 >= pathParts.length || patientIdIndex + 1 >= pathParts.length) {
      throw new HttpsError('internal', 'Erro ao extrair companyId e patientId do caminho do documento');
    }
    
    const companyId = pathParts[companyIdIndex + 1];
    const patientId = pathParts[patientIdIndex + 1];
    
    // Buscar empresa e paciente
    const companyDoc = await db.collection('companies').doc(companyId).get();
    if (!companyDoc.exists) {
      throw new HttpsError('not-found', 'Empresa não encontrada');
    }
    const companyData = companyDoc.data();
    
    const patientDoc = await db.collection(`companies/${companyId}/patients`).doc(patientId).get();
    if (!patientDoc.exists) {
      throw new HttpsError('not-found', 'Paciente não encontrado');
    }
    const patientData = patientDoc.data();
    
    // Converter timestamps do Firestore para formato serializável
    let signedAtISO: string | null = null;
    if (orcamentoData.signedAt) {
      if (orcamentoData.signedAt.toDate) {
        signedAtISO = orcamentoData.signedAt.toDate().toISOString();
      } else if (orcamentoData.signedAt.seconds) {
        signedAtISO = new Date(orcamentoData.signedAt.seconds * 1000).toISOString();
      } else if (typeof orcamentoData.signedAt === 'string') {
        signedAtISO = orcamentoData.signedAt;
      }
    }
    
    // Garantir que signatureImageUrl seja incluído explicitamente
    const signatureImageUrl = orcamentoData.signatureImageUrl || null;
    
    console.log('[getOrcamentoByToken] Dados do orçamento:', {
      id: orcamentoDoc.id,
      companyId,
      patientId,
      signedAt: orcamentoData.signedAt,
      signatureImageUrl: signatureImageUrl,
      signedBy: orcamentoData.signedBy,
      hasSignatureImageUrl: !!signatureImageUrl,
    });
    
    // Construir objeto do orçamento garantindo que signatureImageUrl, companyId e patientId sejam incluídos
    const orcamento: any = {
      id: orcamentoDoc.id,
      companyId: companyId, // Incluir companyId explicitamente
      patientId: patientId, // Incluir patientId explicitamente
      createdAt: orcamentoData.createdAt?.toDate ? orcamentoData.createdAt.toDate().toISOString() : (orcamentoData.createdAt?.seconds ? new Date(orcamentoData.createdAt.seconds * 1000).toISOString() : new Date().toISOString()),
      updatedAt: orcamentoData.updatedAt?.toDate ? orcamentoData.updatedAt.toDate().toISOString() : (orcamentoData.updatedAt?.seconds ? new Date(orcamentoData.updatedAt.seconds * 1000).toISOString() : new Date().toISOString()),
      signedAt: signedAtISO,
      signatureImageUrl: signatureImageUrl,
      signedBy: orcamentoData.signedBy || null,
      signatureIP: orcamentoData.signatureIP || null,
    };
    
    // Copiar outros campos do orçamento, mas garantir que campos importantes não sejam sobrescritos
    Object.keys(orcamentoData).forEach(key => {
      if (!['createdAt', 'updatedAt', 'signedAt', 'signatureImageUrl', 'signedBy', 'signatureIP', 'companyId', 'patientId'].includes(key)) {
        orcamento[key] = orcamentoData[key];
      }
    });
    
    return {
      orcamento,
      company: companyData,
      patient: patientData,
      companyId: companyId, // Incluir companyId na resposta
      patientId: patientId, // Incluir patientId na resposta
    };
  } catch (error: any) {
    console.error('[getOrcamentoByToken] Erro completo:', {
      code: error.code,
      message: error.message,
      details: error.details,
      name: error.name,
      stack: error.stack
    });
    
    // Se for erro de índice não encontrado, fornecer mensagem mais útil
    if (error.code === 9 || error.message?.includes('FAILED_PRECONDITION')) {
      console.error('[getOrcamentoByToken] Índice não encontrado ou não está pronto. Verifique o console do Firebase: https://console.firebase.google.com/project/agendamentointeligente-4405f/firestore/indexes');
      throw new HttpsError('failed-precondition', 'Índice do Firestore não está pronto. Por favor, aguarde alguns minutos ou verifique o console do Firebase.');
    }
    
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError('internal', 'Erro ao buscar orçamento');
  }
});

// Função para buscar anamnese pelo token de assinatura (pública, sem autenticação)
export const getAnamneseByToken = onCall(async (request) => {
  const { token, companyId: companyIdFromRequest, patientId: patientIdFromRequest } = request.data || {};

  if (!token || typeof token !== 'string') {
    throw new HttpsError('invalid-argument', 'Token é obrigatório');
  }

  try {
    let anamnesesSnapshot: FirebaseFirestore.QuerySnapshot<FirebaseFirestore.DocumentData> | null = null;
    
    // Se tiver companyId e patientId na URL, fazer busca direta (mais eficiente)
    if (companyIdFromRequest && typeof companyIdFromRequest === 'string' && 
        patientIdFromRequest && typeof patientIdFromRequest === 'string') {
      console.log('[getAnamneseByToken] Buscando com companyId e patientId:', companyIdFromRequest, patientIdFromRequest);
      
      // Busca direta na anamnese do paciente específico
      const anamnesesRef = db.collection(`companies/${companyIdFromRequest}/patients/${patientIdFromRequest}/anamneses`);
      anamnesesSnapshot = await anamnesesRef
        .where('signatureToken', '==', token)
        .limit(1)
        .get();
      
      console.log('[getAnamneseByToken] Anamnese encontrada com companyId e patientId, documentos:', anamnesesSnapshot.size);
    } 
    // Se tiver apenas companyId, buscar em todos os pacientes da empresa
    else if (companyIdFromRequest && typeof companyIdFromRequest === 'string') {
      console.log('[getAnamneseByToken] Buscando com companyId:', companyIdFromRequest);
      
      // Buscar em todos os pacientes da empresa
      const patientsSnapshot = await db.collection(`companies/${companyIdFromRequest}/patients`).get();
      
      for (const patientDoc of patientsSnapshot.docs) {
        const patientId = patientDoc.id;
        const anamnesesRef = db.collection(`companies/${companyIdFromRequest}/patients/${patientId}/anamneses`);
        const snapshot = await anamnesesRef
          .where('signatureToken', '==', token)
          .limit(1)
          .get();
        
        if (!snapshot.empty) {
          anamnesesSnapshot = snapshot;
          console.log('[getAnamneseByToken] Anamnese encontrada com companyId');
          break;
        }
      }
    } else {
      // Fallback: usar Collection Group Query (requer índice)
      console.log('[getAnamneseByToken] Buscando sem companyId, usando Collection Group Query');
      
      try {
        anamnesesSnapshot = await db.collectionGroup('anamneses')
          .where('signatureToken', '==', token)
          .limit(1)
          .get();
        console.log('[getAnamneseByToken] Query executada com sucesso, documentos encontrados:', anamnesesSnapshot.size);
      } catch (queryError: any) {
        console.error('[getAnamneseByToken] Erro detalhado na query:', {
          code: queryError.code,
          message: queryError.message,
          details: queryError.details,
          name: queryError.name
        });
        throw queryError;
      }
    }
    
    if (!anamnesesSnapshot || anamnesesSnapshot.empty) {
      throw new HttpsError('not-found', 'Anamnese não encontrada');
    }
    
    const anamneseDoc = anamnesesSnapshot.docs[0];
    const anamneseData = anamneseDoc.data();
    
    // Extrair companyId e patientId do caminho do documento
    const pathParts = anamneseDoc.ref.path.split('/');
    const companyIdIndex = pathParts.indexOf('companies');
    const patientIdIndex = pathParts.indexOf('patients');
    
    if (companyIdIndex === -1 || patientIdIndex === -1 || companyIdIndex + 1 >= pathParts.length || patientIdIndex + 1 >= pathParts.length) {
      throw new HttpsError('internal', 'Erro ao extrair companyId e patientId do caminho do documento');
    }
    
    const companyId = pathParts[companyIdIndex + 1];
    const patientId = pathParts[patientIdIndex + 1];
    
    // Buscar empresa e paciente
    const companyDoc = await db.collection('companies').doc(companyId).get();
    if (!companyDoc.exists) {
      throw new HttpsError('not-found', 'Empresa não encontrada');
    }
    const companyData = companyDoc.data();
    
    const patientDoc = await db.collection(`companies/${companyId}/patients`).doc(patientId).get();
    if (!patientDoc.exists) {
      throw new HttpsError('not-found', 'Paciente não encontrado');
    }
    const patientData = patientDoc.data();
    
    // Buscar modelo da anamnese
    let modeloData = null;
    if (anamneseData.modeloId) {
      try {
        const modeloDoc = await db.collection(`companies/${companyId}/anamneseModelos`).doc(anamneseData.modeloId).get();
        if (modeloDoc.exists) {
          modeloData = {
            id: modeloDoc.id,
            ...modeloDoc.data()
          };
        }
      } catch (modeloError) {
        console.warn('[getAnamneseByToken] Erro ao buscar modelo:', modeloError);
      }
    }
    
    // Converter timestamps do Firestore para formato serializável
    let signedAtISO: string | null = null;
    if (anamneseData.signedAt) {
      if (anamneseData.signedAt.toDate) {
        signedAtISO = anamneseData.signedAt.toDate().toISOString();
      } else if (anamneseData.signedAt.seconds) {
        signedAtISO = new Date(anamneseData.signedAt.seconds * 1000).toISOString();
      } else if (typeof anamneseData.signedAt === 'string') {
        signedAtISO = anamneseData.signedAt;
      }
    }
    
    // Garantir que signatureImageUrl seja incluído explicitamente
    const signatureImageUrl = anamneseData.signatureImageUrl || null;
    
    console.log('[getAnamneseByToken] Dados da anamnese:', {
      id: anamneseDoc.id,
      companyId,
      patientId,
      signedAt: anamneseData.signedAt,
      signatureImageUrl: signatureImageUrl,
      signedBy: anamneseData.signedBy,
      hasSignatureImageUrl: !!signatureImageUrl,
    });
    
    // Construir objeto da anamnese garantindo que signatureImageUrl, companyId e patientId sejam incluídos
    const anamnese: any = {
      id: anamneseDoc.id,
      companyId: companyId,
      patientId: patientId,
      createdAt: anamneseData.createdAt?.toDate ? anamneseData.createdAt.toDate().toISOString() : (anamneseData.createdAt?.seconds ? new Date(anamneseData.createdAt.seconds * 1000).toISOString() : new Date().toISOString()),
      updatedAt: anamneseData.updatedAt?.toDate ? anamneseData.updatedAt.toDate().toISOString() : (anamneseData.updatedAt?.seconds ? new Date(anamneseData.updatedAt.seconds * 1000).toISOString() : new Date().toISOString()),
      signedAt: signedAtISO,
      signatureImageUrl: signatureImageUrl,
      signedBy: anamneseData.signedBy || null,
      signatureIP: anamneseData.signatureIP || null,
    };
    
    // Copiar outros campos da anamnese
    Object.keys(anamneseData).forEach(key => {
      if (!['createdAt', 'updatedAt', 'signedAt', 'signatureImageUrl', 'signedBy', 'signatureIP', 'companyId', 'patientId'].includes(key)) {
        anamnese[key] = anamneseData[key];
      }
    });
    
    return {
      anamnese,
      company: companyData,
      patient: patientData,
      modelo: modeloData,
      companyId: companyId,
      patientId: patientId,
    };
  } catch (error: any) {
    console.error('[getAnamneseByToken] Erro completo:', {
      code: error.code,
      message: error.message,
      details: error.details,
      name: error.name,
      stack: error.stack
    });
    
    // Se for erro de índice não encontrado, fornecer mensagem mais útil
    if (error.code === 9 || error.message?.includes('FAILED_PRECONDITION')) {
      console.error('[getAnamneseByToken] Índice não encontrado ou não está pronto. Verifique o console do Firebase: https://console.firebase.google.com/project/agendamentointeligente-4405f/firestore/indexes');
      throw new HttpsError('failed-precondition', 'Índice do Firestore não está pronto. Por favor, aguarde alguns minutos ou verifique o console do Firebase.');
    }
    
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError('internal', 'Erro ao buscar anamnese');
  }
});

// Função para assinar anamnese
export const signAnamnese = onCall(async (request) => {
  const { token, signedBy, signatureIP, signatureImageUrl, companyId: companyIdFromRequest, patientId: patientIdFromRequest, respostas } = request.data || {};

  if (!token || typeof token !== 'string') {
    throw new HttpsError('invalid-argument', 'Token é obrigatório');
  }

  if (!signedBy || typeof signedBy !== 'string' || !signedBy.trim()) {
    throw new HttpsError('invalid-argument', 'Nome do assinante é obrigatório');
  }

  if (!signatureImageUrl || typeof signatureImageUrl !== 'string') {
    throw new HttpsError('invalid-argument', 'Assinatura digital é obrigatória');
  }

  try {
    let anamneseDoc: FirebaseFirestore.QueryDocumentSnapshot<FirebaseFirestore.DocumentData> | null = null;
    
    // Se tiver companyId e patientId, fazer busca direta (mais eficiente)
    if (companyIdFromRequest && typeof companyIdFromRequest === 'string' && 
        patientIdFromRequest && typeof patientIdFromRequest === 'string') {
      console.log('[signAnamnese] Buscando com companyId e patientId:', companyIdFromRequest, patientIdFromRequest);
      
      // Busca direta na anamnese do paciente específico
      const anamnesesRef = db.collection(`companies/${companyIdFromRequest}/patients/${patientIdFromRequest}/anamneses`);
      const snapshot = await anamnesesRef
        .where('signatureToken', '==', token)
        .limit(1)
        .get();
      
      if (!snapshot.empty) {
        anamneseDoc = snapshot.docs[0];
        console.log('[signAnamnese] Anamnese encontrada com companyId e patientId');
      }
    } 
    // Se tiver apenas companyId, buscar em todos os pacientes da empresa
    else if (companyIdFromRequest && typeof companyIdFromRequest === 'string') {
      console.log('[signAnamnese] Buscando com companyId:', companyIdFromRequest);
      
      // Buscar em todos os pacientes da empresa
      const patientsSnapshot = await db.collection(`companies/${companyIdFromRequest}/patients`).get();
      
      for (const patientDoc of patientsSnapshot.docs) {
        const patientId = patientDoc.id;
        const anamnesesRef = db.collection(`companies/${companyIdFromRequest}/patients/${patientId}/anamneses`);
        const snapshot = await anamnesesRef
          .where('signatureToken', '==', token)
          .limit(1)
          .get();
        
        if (!snapshot.empty) {
          anamneseDoc = snapshot.docs[0];
          console.log('[signAnamnese] Anamnese encontrada com companyId');
          break;
        }
      }
    } else {
      // Fallback: usar Collection Group Query (requer índice)
      console.log('[signAnamnese] Buscando sem companyId, usando Collection Group Query');
      
      try {
        const anamnesesSnapshot = await db.collectionGroup('anamneses')
          .where('signatureToken', '==', token)
          .limit(1)
          .get();
        
        if (!anamnesesSnapshot.empty) {
          anamneseDoc = anamnesesSnapshot.docs[0];
        }
      } catch (queryError: any) {
        console.error('[signAnamnese] Erro na Collection Group Query:', {
          code: queryError.code,
          message: queryError.message
        });
        throw queryError;
      }
    }
    
    if (!anamneseDoc) {
      throw new HttpsError('not-found', 'Anamnese não encontrada');
    }
    
    const anamneseData = anamneseDoc.data();
    
    // Verificar se já está assinada
    if (anamneseData.signedAt) {
      throw new HttpsError('failed-precondition', 'Anamnese já foi assinada');
    }
    
    // Atualizar anamnese com assinatura e respostas
    const updateData: any = {
      signedAt: admin.firestore.Timestamp.now(),
      signedBy: signedBy.trim(),
      signatureIP: signatureIP || 'unknown',
      signatureImageUrl: signatureImageUrl,
      status: 'assinada',
      updatedAt: admin.firestore.Timestamp.now(),
    };
    
    // Se houver respostas, incluir no update
    if (respostas && typeof respostas === 'object') {
      updateData.respostas = respostas;
    }
    
    await anamneseDoc.ref.update(updateData);
    
    return { success: true };
  } catch (error: any) {
    console.error('[signAnamnese] Erro:', error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError('internal', 'Erro ao assinar anamnese');
  }
});

export const sendBirthdayMessage = onCall({ 
  memory: '1GiB',
  secrets: ['evolution-api-key', 'evolution-api-url'],
}, async (request) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError('unauthenticated', 'Usuário não autenticado');
  }

  const { patientId, companyId, message, phone, patientFirstName } = request.data;

  if (!patientId || !companyId || !message || !phone || !patientFirstName) {
    throw new HttpsError('invalid-argument', 'patientId, companyId, message, phone e patientFirstName são obrigatórios');
  }

  try {
    const config = await getWhatsappConfig(companyId);
    
    // Verificar se WhatsApp está desabilitado
    if (config.provider === 'disabled') {
      console.log('[sendBirthdayMessage] ⚠️ WhatsApp desabilitado. Mensagem não será enviada.');
      return {
        success: false,
        wamId: null,
        sentAutomatically: false,
        message: 'WhatsApp está desabilitado nas configurações. A mensagem não foi enviada.',
      };
    }
    
    const normalized = normalizarTelefone(phone);
    if (!normalized) {
      throw new HttpsError('invalid-argument', 'Telefone informado é inválido.');
    }

    let destino = normalized.startsWith('55') ? normalized : `55${normalized}`;
    
    // Para Meta, manter formato completo (com dígito 9)
    if (config.provider === 'meta') {
      console.log('[sendBirthdayMessage] Mantendo formato completo para Meta', { destino });
    }

    let wamId: string;
    let chatId: string;
    let provider: string;
    let sentSuccessfully = false;

    // Tentar enviar via provedor configurado (Meta ou Baileys)
    let sendError: Error | null = null;
    try {
      const resultado = await sendBirthdayMessageViaProvider(config, destino, normalized, patientFirstName, message.trim(), companyId);
      wamId = resultado.wamId;
      chatId = resultado.chatId;
      provider = resultado.provider;
      sentSuccessfully = true;
      console.log('[sendBirthdayMessage] Mensagem enviada com sucesso', {
        provider,
        wamId,
        chatId,
      });
    } catch (error: any) {
      sendError = error;
      console.error('[sendBirthdayMessage] Erro ao enviar mensagem:', {
        error: error.message,
        stack: error.stack,
        provider: config.provider,
      });
      // Continuar para registrar mesmo que o envio tenha falhado
      wamId = `birthday_${Date.now()}`;
      // Normalizar para formato consistente usado como ID de contato
      chatId = normalizePhoneForContact(destino);
      provider = config.provider;
    }

    // Registrar no Firestore
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    await db.collection('birthdayMessages').add({
      companyId,
      patientId,
      patientFirstName: patientFirstName || '',
      phone: destino,
      message: message.trim(),
      wamId,
      chatId,
      sentBy: uid,
      sentAt: admin.firestore.Timestamp.fromDate(new Date()),
      birthdayDate: admin.firestore.Timestamp.fromDate(today),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Registrar também em whatsappMessages para histórico (apenas se enviado com sucesso)
    if (sentSuccessfully) {
      const configCompanyId = (config as any).companyId || companyId;
      await db.collection(`companies/${configCompanyId}/whatsappMessages`).doc(wamId).set(
        {
          message: {
            id: wamId,
            to: chatId,
            type: 'text',
            provider: provider as 'meta' | 'evolution',
            text: {
              body: message.trim(),
              preview_url: false,
            },
          },
          wam_id: wamId,
          chat_id: chatId,
          provider: provider as 'baileys' | 'meta',
          companyId: companyId,
          direction: 'outbound',
          messageSource: 'automatic',
          sentBy: uid,
          patientId: patientId,
          messageType: 'birthday',
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      // Buscar paciente pelo número de telefone para obter o nome (se companyId estiver disponível)
      let patientName: string | null = null;
      if (companyId) {
        patientName = await findPatientNameByPhone(companyId, chatId);
      }

      // Preparar dados do contato
      const contactData: any = {
          last_message_at: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          companyId: companyId,
      };

      // Se encontrou o paciente, adicionar o nome ao contato
      if (patientName) {
        contactData.wa_id = chatId;
        contactData.name = patientName;
        contactData.patientName = patientName; // Campo adicional para compatibilidade
      }

      await db.collection('whatsappContacts').doc(chatId).set(
        contactData,
        { merge: true }
      );
    }

    // Preparar mensagem de retorno
    let returnMessage = '';
    if (sentSuccessfully) {
      returnMessage = 'Mensagem enviada com sucesso!';
    } else if (sendError) {
      // Se houve erro, incluir a mensagem de erro
      returnMessage = sendError.message || 'Erro ao enviar mensagem. Use o botão copiar para enviar manualmente.';
    } else {
      returnMessage = 'Mensagem registrada. O envio automático não está disponível para seu provedor. Use o botão copiar para enviar manualmente.';
    }

    return { 
      success: true, 
      wamId,
      sentAutomatically: sentSuccessfully,
      message: returnMessage,
      error: sendError ? sendError.message : undefined,
    };
  } catch (error) {
    console.error('[sendBirthdayMessage] Erro ao enviar mensagem de aniversário:', error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError('internal', 'Não foi possível enviar a mensagem de aniversário.');
  }
});

// Função para obter imagem da assinatura como base64 (pública, sem autenticação)
export const getSignatureImageBase64 = onCall(async (request) => {
  const { storagePath } = request.data || {};

  if (!storagePath || typeof storagePath !== 'string') {
    throw new HttpsError('invalid-argument', 'storagePath é obrigatório');
  }

  try {
    // Obter bucket do Storage
    const bucket = admin.storage().bucket();
    
    // Fazer download do arquivo
    const file = bucket.file(storagePath);
    const [exists] = await file.exists();
    
    if (!exists) {
      throw new HttpsError('not-found', 'Arquivo não encontrado');
    }
    
    // Fazer download como buffer
    const [buffer] = await file.download();
    
    // Converter para base64
    const base64 = buffer.toString('base64');
    const dataUrl = `data:image/png;base64,${base64}`;
    
    return { base64: dataUrl };
  } catch (error: any) {
    console.error('[getSignatureImageBase64] Erro:', error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError('internal', 'Erro ao obter imagem da assinatura');
  }
});

// Função para enviar mensagem de texto simples via WhatsApp
export const sendWhatsappMessage = onCall({ 
  memory: '1GiB',
  secrets: ['evolution-api-key', 'evolution-api-url'],
}, async (request) => {
  const uid = request.auth?.uid;
  const { companyId, to, message } = request.data || {};

  if (!uid) {
    throw new HttpsError('unauthenticated', 'Usuário não autenticado');
  }

  if (!companyId || !to || !message) {
    throw new HttpsError('invalid-argument', 'companyId, to e message são obrigatórios');
  }

  try {
    const config = await getWhatsappConfig(companyId);
    
    // Verificar se WhatsApp está desabilitado
    if (config.provider === 'disabled') {
      console.log('[sendWhatsappMessage] ⚠️ WhatsApp desabilitado. Mensagem não será enviada.');
      return {
        success: false,
        messageId: null,
        message: 'WhatsApp está desabilitado nas configurações. A mensagem não foi enviada.',
      };
    }
    
    const normalizedPhone = normalizarTelefone(to);
    // Normalizar para formato consistente usado como ID de contato
    const chatId = normalizePhoneForContact(normalizedPhone.startsWith('55') ? normalizedPhone : `55${normalizedPhone}`);

    let sentSuccessfully = false;
    let wamId: string | null = null;
    let sendError: Error | null = null;

    if (config.provider === 'evolution') {
      try {
        const result = await sendEvolutionTextMessage({
          companyId,
          to: chatId,
          message: message.trim(),
        });
        sentSuccessfully = true;
        wamId = result.messageId || `evolution-${Date.now()}`;
      } catch (error: any) {
        sendError = error instanceof Error ? error : new Error(String(error));
        console.error('[sendWhatsappMessage] Erro ao enviar via Evolution:', sendError);
      }
    } else if (config.provider === 'meta') {
      try {
        const metaConfig = config as MetaWhatsappConfig;
        const WHATSAPP_API_URL = `https://graph.facebook.com/v18.0/${metaConfig.whatsappApiPhoneNumberId}/messages`;

        const payload = {
          messaging_product: 'whatsapp',
          to: chatId,
          type: 'text',
          text: {
            preview_url: false,
            body: message.trim(),
          },
        };

        const response = await fetch(WHATSAPP_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${metaConfig.whatsappAccessToken}`,
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Erro ao enviar mensagem: ${response.status} ${errorText}`);
        }

        const result: any = await response.json();
        wamId = result?.messages?.[0]?.id || `meta-${Date.now()}`;
        sentSuccessfully = true;
      } catch (error: any) {
        sendError = error instanceof Error ? error : new Error(String(error));
        console.error('[sendWhatsappMessage] Erro ao enviar via Meta:', sendError);
      }
    }

    // Salvar mensagem no Firestore
    const messageData: any = {
      wam_id: wamId || `msg-${Date.now()}`,
      message: {
        id: wamId || `msg-${Date.now()}`,
        to: chatId,
        type: 'text',
        text: {
          body: message.trim(),
          preview_url: false,
        },
      },
      messageSource: 'manual',
      chat_id: chatId,
      companyId: companyId,
      direction: 'outbound',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      read: false,
    };

    const configCompanyId = (config as any).companyId || companyId;
    if (wamId) {
      // Sempre forçar messageSource: 'manual' para mensagens enviadas manualmente
      // mesmo que a mensagem já exista (pode ter sido salva pelo webhook primeiro)
      const messageRef = db.collection(`companies/${configCompanyId}/whatsappMessages`).doc(wamId);
      await messageRef.set({
        ...messageData,
        messageSource: 'manual', // Sempre forçar como manual
      }, { merge: true });
      
      // Verificar se foi salvo corretamente
      const savedDoc = await messageRef.get();
      if (savedDoc.exists) {
        const savedData = savedDoc.data();
        console.log('[sendWhatsappMessage] ✅ Mensagem salva no Firestore:', {
          wamId,
          chatId,
          messageSource: savedData?.messageSource,
          direction: savedData?.direction,
          companyId: configCompanyId,
        });
      } else {
        console.error('[sendWhatsappMessage] ⚠️ Mensagem não foi salva no Firestore:', { wamId, chatId });
      }
    } else {
      const docRef = await db.collection(`companies/${configCompanyId}/whatsappMessages`).add(messageData);
      wamId = docRef.id;
      console.log('[sendWhatsappMessage] ✅ Mensagem salva no Firestore (novo documento):', {
        wamId,
        chatId,
        messageSource: 'manual',
        companyId: configCompanyId,
      });
    }

    // Atualizar contato dentro da coleção da empresa
    // Buscar paciente pelo número de telefone para obter o nome
    const patientName = await findPatientNameByPhone(configCompanyId, chatId);

    // Preparar dados do contato
    const contactData: any = {
      wa_id: chatId,
      last_message_at: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      companyId: configCompanyId,
    };

    // Se encontrou o paciente, adicionar o nome ao contato
    if (patientName) {
      contactData.name = patientName;
      contactData.patientName = patientName; // Campo adicional para compatibilidade
    }

    await db.collection(`companies/${configCompanyId}/whatsappContacts`).doc(chatId).set(
      contactData,
      { merge: true }
    );

    if (!sentSuccessfully && sendError) {
      throw sendError;
    }

    return {
      success: sentSuccessfully,
      messageId: wamId,
      message: sentSuccessfully ? 'Mensagem enviada com sucesso!' : 'Mensagem salva, mas não foi possível enviar automaticamente.',
    };
  } catch (error: any) {
    console.error('[sendWhatsappMessage] Erro geral:', error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError('internal', `Erro ao enviar mensagem: ${error.message || 'Erro desconhecido'}`);
  }
});

/**
 * Função helper para normalizar telefone
 */
function normalizarTelefoneHelper(telefone: string | null | undefined): string | null {
  if (!telefone) return null;
  return telefone.replace(/\D/g, '');
}

/**
 * Gera todas as variantes de um número de telefone
 */
function generatePhoneVariantsHelper(phoneNumber: string): Set<string> {
  const normalized = normalizarTelefoneHelper(phoneNumber);
  if (!normalized || normalized.length < 10) {
    return new Set();
  }

  const variants = new Set<string>();
  variants.add(normalized);
  
  if (!normalized.startsWith('55')) {
    variants.add(`55${normalized}`);
  } else {
    variants.add(normalized.slice(2));
  }
  
  if (normalized.length === 13 && normalized.startsWith('55')) {
    const without9 = normalized.slice(0, 4) + normalized.slice(5);
    variants.add(without9);
    variants.add(without9.slice(2));
  }

  return variants;
}

/**
 * Atualiza a collection whatsappPhoneNumbers quando as settings são salvas
 * Escuta mudanças em companies/{companyId}/settings/general
 */
export const syncWhatsappPhoneNumbers = onDocumentWritten(
  {
    document: 'companies/{companyId}/settings/general',
    region: 'us-central1',
  },
  async (event) => {
    try {
      const companyId = event.params.companyId;
      const afterData = event.data?.after?.data();
      
      if (!afterData) {
        console.log(`[syncWhatsappPhoneNumbers] Documento deletado, ignorando: ${companyId}`);
        return;
      }

      // Obter o número de telefone das settings
      const phoneNumber = afterData.whatsappBaileysNumber || afterData.telefoneSalao;
      
      if (!phoneNumber) {
        console.log(`[syncWhatsappPhoneNumbers] Nenhum número de telefone encontrado para empresa ${companyId}`);
        return;
      }

      const normalized = normalizarTelefoneHelper(phoneNumber);
      if (!normalized || normalized.length < 10) {
        console.log(`[syncWhatsappPhoneNumbers] Número inválido para empresa ${companyId}: ${phoneNumber}`);
        return;
      }

      // Gerar todas as variantes do número
      const variants = generatePhoneVariantsHelper(phoneNumber);
      
      // Salvar todas as variantes na collection whatsappPhoneNumbers
      const batch = db.batch();
      const timestamp = admin.firestore.FieldValue.serverTimestamp();
      
      for (const variant of Array.from(variants)) {
        const phoneRef = db.collection('whatsappPhoneNumbers').doc(variant);
        batch.set(phoneRef, {
          companyId,
          phoneNumber: normalized,
          originalPhoneNumber: phoneNumber,
          updatedAt: timestamp,
        }, { merge: true });
      }
      
      await batch.commit();
      console.log(`[syncWhatsappPhoneNumbers] ✅ Mapeamento atualizado: ${normalized} -> ${companyId} (${variants.size} variantes)`);
    } catch (error) {
      console.error('[syncWhatsappPhoneNumbers] Erro ao sincronizar número de telefone:', error);
    }
  }
);

/**
 * Atualiza custom claims do Firebase Auth quando um usuário é criado ou atualizado
 * Isso permite verificar permissões sem consultar Firestore (muito mais rápido!
 * 
 * IMPORTANTE: Esta função monitora a collection 'companies/{companyId}/users/{userId}'
 * que é onde os usuários realmente estão armazenados
 */
export const updateUserCustomClaims = onDocumentWritten(
  'companies/{companyId}/users/{userId}',
  async (event) => {
    const userId = event.params.userId;
    const companyId = event.params.companyId;
    const beforeData = event.data?.before?.data();
    const afterData = event.data?.after?.data();

    console.log(`[updateUserCustomClaims] 🔍 Trigger acionado para usuário ${userId} na empresa ${companyId}`);

    // Se o documento foi deletado, não fazer nada (ou remover claims se necessário)
    if (!afterData) {
      console.log(`[updateUserCustomClaims] Usuário ${userId} deletado da empresa ${companyId}`);
      // Não remover claims automaticamente, pois o usuário pode estar em outra empresa
      return;
    }

    // Verificar se houve mudanças relevantes
    const relevantFields = ['role', 'ativo'];
    const hasChanges = !beforeData || relevantFields.some(field => beforeData[field] !== afterData[field]);

    if (!hasChanges) {
      console.log(`[updateUserCustomClaims] Nenhuma mudança relevante para ${userId}, pulando atualização`);
      return;
    }

    try {
      const role = afterData.role || 'atendente';
      const ativo = afterData.ativo !== false; // Default true se não especificado

      // Atualizar custom claims com companyId da empresa
      const customClaims = {
        role,
        companyId: companyId, // Usar companyId do path
        ativo,
      };

      await admin.auth().setCustomUserClaims(userId, customClaims);
      
      console.log(`[updateUserCustomClaims] ✅ Custom claims atualizados para ${userId} na empresa ${companyId}:`, customClaims);
      
      // IMPORTANTE: O usuário precisa fazer refresh do token no frontend para receber os novos claims
      // Isso é feito automaticamente quando o token expira, ou pode ser forçado com getIdToken(true)
    } catch (error: any) {
      console.error(`[updateUserCustomClaims] ❌ Erro ao atualizar claims para ${userId}:`, error.message);
      
      // Se o usuário não existe no Auth, criar um registro básico
      if (error.code === 'auth/user-not-found') {
        console.log(`[updateUserCustomClaims] Usuário ${userId} não encontrado no Auth, isso é normal se ainda não fez login`);
      }
    }
  }
);

/**
 * Função para setar custom claims após login
 * Chamada automaticamente após o usuário fazer login
 * Esta é a forma mais eficiente - seta os claims no momento do login!
 */
/**
 * Função para setar custom claims baseado no contexto atual do usuário
 * IMPORTANTE: Um usuário pode estar em múltiplas empresas com roles diferentes
 * Os claims refletem o contexto ATUAL (empresa ativa) do usuário
 * 
 * @param companyId - ID da empresa (opcional, se não fornecido, usa o primeiro encontrado ou contexto salvo)
 */
export const setUserCustomClaimsOnLogin = onCall(async (request) => {
  const uid = request.auth?.uid;
  const userEmail = request.auth?.token?.email;
  const { companyId: requestedCompanyId } = request.data || {}; // CompanyId pode ser passado como parâmetro
  
  if (!uid) {
    console.error('[setUserCustomClaimsOnLogin] ❌ UID não encontrado no request');
    throw new HttpsError('unauthenticated', 'Usuário não autenticado');
  }

  console.log(`[setUserCustomClaimsOnLogin] 🔍 Iniciando set de custom claims para usuário: ${uid}, email: ${userEmail}, companyId solicitado: ${requestedCompanyId || 'não fornecido'}`);

  try {
    let userData: any = null;
    let foundCompanyId: string | null = requestedCompanyId || null;
    let foundRole: string | null = null;
    
    // Se companyId foi fornecido, buscar diretamente nessa empresa
    if (foundCompanyId) {
      console.log(`[setUserCustomClaimsOnLogin] 📋 Buscando usuário na empresa específica: ${foundCompanyId}`);
      const companyUserDoc = await db.collection(`companies/${foundCompanyId}/users`).doc(uid).get();
      
      if (companyUserDoc.exists) {
        userData = companyUserDoc.data();
        foundRole = userData?.role || null;
        console.log(`[setUserCustomClaimsOnLogin] ✅ Usuário encontrado na empresa ${foundCompanyId} com role: ${foundRole}`);
      } else if (userEmail) {
        // Tentar buscar por email na empresa
        const companyUsersQuery = db.collection(`companies/${foundCompanyId}/users`)
          .where('email', '==', userEmail.toLowerCase())
          .limit(1);
        const companyUsersSnapshot = await companyUsersQuery.get();
        
        if (!companyUsersSnapshot.empty) {
          userData = companyUsersSnapshot.docs[0].data();
          foundRole = userData?.role || null;
          console.log(`[setUserCustomClaimsOnLogin] ✅ Usuário encontrado por email na empresa ${foundCompanyId} com role: ${foundRole}`);
        }
      }
    }
    
    // Se não encontrou e não foi fornecido companyId, buscar em todas as empresas
    if (!userData && !foundCompanyId && userEmail) {
      console.log(`[setUserCustomClaimsOnLogin] 🔍 Buscando usuário em todas as empresas por email: ${userEmail}`);
      const companiesSnapshot = await db.collection('companies').limit(50).get();
      
      // Coletar todos os contextos do usuário
      const userContexts: Array<{ companyId: string; role: string; userData: any }> = [];
      
      for (const companyDoc of companiesSnapshot.docs) {
        const companyId = companyDoc.id;
        const companyUsersQuery = db.collection(`companies/${companyId}/users`)
          .where('email', '==', userEmail.toLowerCase())
          .limit(1);
        
        const companyUsersSnapshot = await companyUsersQuery.get();
        
        if (!companyUsersSnapshot.empty) {
          const companyUserDoc = companyUsersSnapshot.docs[0];
          const data = companyUserDoc.data();
          userContexts.push({
            companyId,
            role: data.role || 'atendente',
            userData: data
          });
        }
      }
      
      if (userContexts.length > 0) {
        // Se encontrou múltiplos contextos, usar o primeiro (ou pode ser melhorado para usar o mais recente)
        // Por enquanto, usar o primeiro encontrado
        const firstContext = userContexts[0];
        foundCompanyId = firstContext.companyId;
        foundRole = firstContext.role;
        userData = firstContext.userData;
        
        console.log(`[setUserCustomClaimsOnLogin] ✅ Encontrado ${userContexts.length} contexto(s). Usando o primeiro: empresa ${foundCompanyId}, role: ${foundRole}`);
        
        if (userContexts.length > 1) {
          console.log(`[setUserCustomClaimsOnLogin] ⚠️ Usuário está em ${userContexts.length} empresas. Claims serão setados para a primeira. Para trocar, use updateUserCustomClaimsForContext.`);
        }
      }
    }
    
    // FALLBACK: Se ainda não encontrou, tentar na collection raiz
    if (!userData) {
      const rootUserDoc = await db.collection('users').doc(uid).get();
      if (rootUserDoc.exists) {
        const rootUserData = rootUserDoc.data();
        userData = rootUserData;
        foundCompanyId = rootUserData?.companyId || null;
        foundRole = rootUserData?.role || null;
        console.log(`[setUserCustomClaimsOnLogin] ⚠️ Usando dados da collection raiz como fallback`);
      }
    }
    
    // Se ainda não encontrou, aguardar e tentar novamente
    if (!userData) {
      console.warn(`[setUserCustomClaimsOnLogin] ⚠️ Usuário não encontrado, aguardando criação...`);
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Tentar novamente (buscar em todas as empresas)
      if (userEmail) {
        const companiesSnapshot = await db.collection('companies').limit(50).get();
        for (const companyDoc of companiesSnapshot.docs) {
          const companyId = companyDoc.id;
          const companyUserDoc = await db.collection(`companies/${companyId}/users`).doc(uid).get();
          if (companyUserDoc.exists) {
            userData = companyUserDoc.data();
            foundCompanyId = companyId;
            foundRole = userData?.role || null;
            break;
          }
        }
      }
      
      if (!userData) {
        console.warn(`[setUserCustomClaimsOnLogin] ⚠️ Usuário ainda não encontrado após retry. Claims serão setados pelo trigger.`);
        return {
          success: false,
          message: 'Usuário ainda não criado, claims serão setados automaticamente pelo trigger',
          claimsSet: false,
        };
      }
    }

    const finalRole = foundRole || userData?.role || 'atendente';
    const finalCompanyId = foundCompanyId || userData?.companyId || null;

    console.log(`[setUserCustomClaimsOnLogin] 📝 Dados do usuário encontrados:`, {
      role: finalRole,
      companyId: finalCompanyId,
      ativo: userData?.ativo,
      email: userData?.email || userEmail,
      nome: userData?.nome
    });

    const customClaims = {
      role: finalRole,
      companyId: finalCompanyId,
      ativo: userData?.ativo !== false,
    };

    console.log(`[setUserCustomClaimsOnLogin] 🔧 Preparando para setar custom claims:`, customClaims);

    // Setar custom claims
    await admin.auth().setCustomUserClaims(uid, customClaims);
    
    console.log(`[setUserCustomClaimsOnLogin] ✅ Custom claims setados com sucesso para ${uid}:`, customClaims);
    
    // Verificar se foram setados corretamente
    try {
      const userRecord = await admin.auth().getUser(uid);
      console.log(`[setUserCustomClaimsOnLogin] ✅ Verificação: Claims no Auth:`, userRecord.customClaims);
    } catch (verifyError: any) {
      console.warn(`[setUserCustomClaimsOnLogin] ⚠️ Não foi possível verificar claims:`, verifyError.message);
    }
    
    return {
      success: true,
      message: 'Custom claims atualizados com sucesso',
      claims: customClaims,
      claimsSet: true,
    };
  } catch (error: any) {
    console.error(`[setUserCustomClaimsOnLogin] ❌ Erro ao setar claims:`, {
      error: error.message,
      code: error.code,
      stack: error.stack,
      uid,
      email: userEmail
    });
    
    // Se o usuário não existe no Auth ainda (caso raro), não é erro crítico
    if (error.code === 'auth/user-not-found') {
      console.warn(`[setUserCustomClaimsOnLogin] ⚠️ Usuário ${uid} não encontrado no Auth`);
      return {
        success: false,
        message: 'Usuário não encontrado no Auth (isso é normal em alguns casos)',
        claimsSet: false,
      };
    }
    
    throw new HttpsError('internal', `Erro ao setar custom claims: ${error.message}`);
  }
});

/**
 * Função para atualizar custom claims quando o usuário troca de contexto/empresa
 * IMPORTANTE: Deve ser chamada quando o usuário troca de empresa via switchContext
 */
export const updateUserCustomClaimsForContext = onCall(async (request) => {
  const uid = request.auth?.uid;
  const { companyId, role } = request.data;
  
  if (!uid) {
    throw new HttpsError('unauthenticated', 'Usuário não autenticado');
  }

  if (!companyId) {
    throw new HttpsError('invalid-argument', 'companyId é obrigatório');
  }

  console.log(`[updateUserCustomClaimsForContext] 🔄 Atualizando claims para contexto: uid=${uid}, companyId=${companyId}, role=${role}`);

  try {
    // Buscar dados do usuário na empresa específica
    let userData: any = null;
    const companyUserDoc = await db.collection(`companies/${companyId}/users`).doc(uid).get();
    
    if (companyUserDoc.exists) {
      userData = companyUserDoc.data();
    } else {
      // Tentar buscar por email
      const userEmail = request.auth?.token?.email;
      if (userEmail) {
        const companyUsersQuery = db.collection(`companies/${companyId}/users`)
          .where('email', '==', userEmail.toLowerCase())
          .limit(1);
        const companyUsersSnapshot = await companyUsersQuery.get();
        
        if (companyUsersSnapshot.empty) {
          throw new HttpsError('not-found', `Usuário não encontrado na empresa ${companyId}`);
        }
        
        userData = companyUsersSnapshot.docs[0].data();
      } else {
        throw new HttpsError('not-found', `Usuário não encontrado na empresa ${companyId}`);
      }
    }
    const finalRole = role || userData?.role || 'atendente';
    const ativo = userData?.ativo !== false;

    const customClaims = {
      role: finalRole,
      companyId: companyId,
      ativo: ativo,
    };

    await admin.auth().setCustomUserClaims(uid, customClaims);
    
    console.log(`[updateUserCustomClaimsForContext] ✅ Custom claims atualizados para contexto:`, customClaims);
    
    return {
      success: true,
      message: 'Custom claims atualizados para o novo contexto',
      claims: customClaims,
    };
  } catch (error: any) {
    console.error(`[updateUserCustomClaimsForContext] ❌ Erro:`, error);
    throw new HttpsError('internal', `Erro ao atualizar claims: ${error.message}`);
  }
});

/**
 * Função auxiliar para atualizar custom claims manualmente (útil para migração)
 * Pode ser chamada via HTTP ou como função administrativa
 */
export const syncUserCustomClaims = onCall(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError('unauthenticated', 'Usuário não autenticado');
  }

  // Verificar se é admin/owner (opcional - remover se quiser permitir para todos)
  const userDoc = await db.collection('users').doc(uid).get();
  if (!userDoc.exists) {
    throw new HttpsError('not-found', 'Usuário não encontrado');
  }

  const userData = userDoc.data();
  const userRole = userData?.role;
  
  if (userRole !== 'owner' && userRole !== 'admin') {
    throw new HttpsError('permission-denied', 'Apenas owners e admins podem sincronizar claims');
  }

  const { userId } = request.data;
  if (!userId) {
    throw new HttpsError('invalid-argument', 'userId é obrigatório');
  }

  try {
    const targetUserDoc = await db.collection('users').doc(userId).get();
    if (!targetUserDoc.exists) {
      throw new HttpsError('not-found', 'Usuário alvo não encontrado');
    }

    const targetUserData = targetUserDoc.data();
    const customClaims = {
      role: targetUserData?.role || 'atendente',
      companyId: targetUserData?.companyId || null,
      ativo: targetUserData?.ativo !== false,
    };

    await admin.auth().setCustomUserClaims(userId, customClaims);
    
    return {
      success: true,
      message: `Custom claims atualizados para ${userId}`,
      claims: customClaims,
    };
  } catch (error: any) {
    console.error(`[syncUserCustomClaims] Erro:`, error);
    throw new HttpsError('internal', `Erro ao sincronizar claims: ${error.message}`);
  }
});