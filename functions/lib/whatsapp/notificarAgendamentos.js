"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processarNotificacoesAgendamentos = void 0;
const admin = require("firebase-admin");
const luxon_1 = require("luxon");
const whatsappEnvio_1 = require("./whatsappEnvio");
if (!admin.apps.length) {
    admin.initializeApp();
}
const db = admin.firestore();
const { FieldValue } = admin.firestore;
const COLLECTION_WEBHOOKS = "webhookAgendamentos";
const DEBUG_PHONE = process.env.DEBUG_WHATSAPP_PHONE || null;
function normalizarTelefone(tel) {
    return tel?.replace(/\D/g, "") || "";
}
const REMINDER_WINDOWS = {
    oneHour: { min: 45, max: 75 },
    twentyFourHours: { min: 24 * 60 - 60, max: 24 * 60 + 60 },
};
async function ensureReminderFields(docRef) {
    await db.runTransaction(async (tx) => {
        const snap = await tx.get(docRef);
        if (!snap.exists)
            return;
        const data = snap.data() || {};
        const updates = {};
        if (typeof data.reminder1hSent === "undefined") {
            updates.reminder1hSent = false;
        }
        if (typeof data.reminder24hSent === "undefined") {
            updates.reminder24hSent = false;
        }
        if (Object.keys(updates).length > 0) {
            tx.update(docRef, updates);
        }
    });
}
async function reservarNotificacao(docRef, reminderField) {
    return db.runTransaction(async (tx) => {
        const snap = await tx.get(docRef);
        if (!snap.exists) {
            return false;
        }
        const data = snap.data() || {};
        if (data[reminderField]) {
            return false;
        }
        const lockedType = data.notificationLockedType;
        const lockedAt = data.notificationLockedAt;
        if (lockedType && lockedType !== reminderField && lockedAt) {
            const ageMs = Date.now() - lockedAt.toDate().getTime();
            if (ageMs < 2 * 60 * 1000) {
                return false;
            }
        }
        if (lockedType === reminderField && lockedAt) {
            const ageMs = Date.now() - lockedAt.toDate().getTime();
            if (ageMs < 2 * 60 * 1000) {
                return false;
            }
        }
        tx.update(docRef, {
            notificationLockedAt: FieldValue.serverTimestamp(),
            notificationLockedType: reminderField,
        });
        return true;
    });
}
function allRemindersCompleted(need24h, need1h, reminder24hSent, reminder1hSent) {
    return (!need24h || reminder24hSent) && (!need1h || reminder1hSent);
}
async function updateReminderStateOnSuccess(docRef, reminderField, need24h, need1h, reminder24hSent, reminder1hSent) {
    const updates = {
        notificationLockedAt: FieldValue.delete(),
        notificationLockedType: FieldValue.delete(),
        [`${reminderField}`]: true,
        [`${reminderField}At`]: FieldValue.serverTimestamp(),
    };
    const updated24h = reminderField === "reminder24hSent" ? true : reminder24hSent;
    const updated1h = reminderField === "reminder1hSent" ? true : reminder1hSent;
    const completed = allRemindersCompleted(need24h, need1h, updated24h, updated1h);
    if (completed) {
        updates.notified = true;
        updates.notifiedAt = FieldValue.serverTimestamp();
    }
    else {
        updates.notified = false;
    }
    await docRef.update(updates);
    return completed;
}
async function releaseReminderLockOnError(docRef, error) {
    await docRef.update({
        notified: false,
        notificationLockedAt: FieldValue.delete(),
        notificationLockedType: FieldValue.delete(),
        notificationError: error?.message ?? String(error),
        notificationRetryCount: FieldValue.increment(1),
    });
}
async function markReminderSkipped(docRef, reason) {
    await docRef.set({
        notified: true,
        notificationSkippedReason: reason,
        notificationSkippedAt: FieldValue.serverTimestamp(),
        notificationLockedAt: FieldValue.delete(),
        notificationLockedType: FieldValue.delete(),
    }, { merge: true });
}
async function buscarAgendamentosPendentes() {
    const now = luxon_1.DateTime.now().setZone("America/Sao_Paulo");
    const inicio = now.minus({ minutes: 30 }).toISO();
    const fim = now.plus({ hours: 28 }).toISO();
    const snapshot = await db
        .collection(COLLECTION_WEBHOOKS)
        .where("notified", "==", false)
        .where("datetime_scheduler", ">=", inicio)
        .where("datetime_scheduler", "<=", fim)
        .get();
    return { snapshot, now };
}
async function processarNotificacoesAgendamentos() {
    console.log("📡 Iniciando processamento de notificações de agendamentos (Firestore)");
    const { snapshot, now } = await buscarAgendamentosPendentes();
    console.log(`📦 Total de agendamentos encontrados: ${snapshot.size}`);
    const resultado = {
        analisados: snapshot.size,
        enviados: 0,
        ignorados: 0,
        erros: 0,
    };
    const configCache = new Map();
    const settingsCache = new Map();
    for (const doc of snapshot.docs) {
        const data = doc.data();
        const agendamentoId = doc.id;
        const datetime = data.datetime_scheduler;
        const webhookBody = data.body;
        if (!datetime || !webhookBody?.data?.client?.phone) {
            console.warn(`⚠️ Documento ${agendamentoId} sem dados necessários. Pulando.`);
            resultado.ignorados++;
            continue;
        }
        const agendamentoHorario = luxon_1.DateTime.fromISO(datetime, { zone: "America/Sao_Paulo" });
        const diffMin = agendamentoHorario.diff(now, "minutes").minutes ?? 0;
        if (diffMin < 0) {
            console.log(`🧹 Agendamento ${agendamentoId} já ocorreu. Removendo documento.`);
            await doc.ref.delete();
            resultado.ignorados++;
            continue;
        }
        const telefoneNormalizado = normalizarTelefone(webhookBody.data.client.phone);
        if (DEBUG_PHONE && telefoneNormalizado !== DEBUG_PHONE) {
            console.log(`🔕 Agendamento ${agendamentoId} ignorado (telefone ${telefoneNormalizado} não permitido).`);
            resultado.ignorados++;
            continue;
        }
        const companyId = data.companyId ||
            webhookBody?.companyId ||
            webhookBody?.data?.companyId ||
            undefined;
        const cacheKey = companyId ?? "__global__";
        if (!settingsCache.has(cacheKey)) {
            const companySettings = await (0, whatsappEnvio_1.getCompanySettings)(companyId);
            settingsCache.set(cacheKey, companySettings);
        }
        const companySettings = settingsCache.get(cacheKey);
        await ensureReminderFields(doc.ref);
        const reminder24hSent = Boolean(data.reminder24hSent);
        const reminder1hSent = Boolean(data.reminder1hSent);
        const need24h = companySettings?.lembrete24h !== false;
        const need1h = companySettings?.lembrete1h !== false;
        if (!need24h && !need1h) {
            console.log(`🔕 Empresa ${companyId || "sem id"} desativou todos os lembretes. Marcando como notificado.`);
            await markReminderSkipped(doc.ref, "reminders_disabled");
            resultado.ignorados++;
            continue;
        }
        if (allRemindersCompleted(need24h, need1h, reminder24hSent, reminder1hSent)) {
            await doc.ref.set({
                notified: true,
                notificationLockedAt: FieldValue.delete(),
                notificationLockedType: FieldValue.delete(),
            }, { merge: true });
            resultado.ignorados++;
            continue;
        }
        const shouldSend24h = need24h &&
            !reminder24hSent &&
            diffMin >= REMINDER_WINDOWS.twentyFourHours.min &&
            diffMin <= REMINDER_WINDOWS.twentyFourHours.max;
        const shouldSend1h = need1h &&
            !reminder1hSent &&
            diffMin >= REMINDER_WINDOWS.oneHour.min &&
            diffMin <= REMINDER_WINDOWS.oneHour.max;
        let reminderField = null;
        if (shouldSend24h) {
            reminderField = "reminder24hSent";
        }
        else if (shouldSend1h) {
            reminderField = "reminder1hSent";
        }
        if (!reminderField) {
            resultado.ignorados++;
            continue;
        }
        const reservado = await reservarNotificacao(doc.ref, reminderField);
        if (!reservado) {
            console.log(`🔄 Agendamento ${agendamentoId} não pôde ser reservado para ${reminderField}.`);
            resultado.ignorados++;
            continue;
        }
        try {
            if (!configCache.has(cacheKey)) {
                configCache.set(cacheKey, await (0, whatsappEnvio_1.getWhatsappConfig)(companyId));
            }
            const config = configCache.get(cacheKey);
            const reminderWindowText = reminderField === "reminder24hSent" ? "24 horas" : "1 hora";
            await (0, whatsappEnvio_1.sendWhatsAppMessage)(webhookBody, "agendamento_lembrar_v2", config, { reminderWindowText });
            const remindersCompleted = await updateReminderStateOnSuccess(doc.ref, reminderField, need24h, need1h, reminder24hSent, reminder1hSent);
            if (remindersCompleted) {
                await doc.ref.delete();
                console.log(`🧹 Documento ${agendamentoId} removido após completar lembretes.`);
            }
            console.log(`✅ Mensagem (${reminderField}) enviada para agendamento ${agendamentoId}`);
            resultado.enviados++;
        }
        catch (error) {
            console.error(`❌ Erro ao enviar mensagem para agendamento ${agendamentoId}:`, error);
            await releaseReminderLockOnError(doc.ref, error);
            resultado.erros++;
        }
    }
    console.log("📬 Processamento concluído:", resultado);
    return resultado;
}
exports.processarNotificacoesAgendamentos = processarNotificacoesAgendamentos;
//# sourceMappingURL=notificarAgendamentos.js.map