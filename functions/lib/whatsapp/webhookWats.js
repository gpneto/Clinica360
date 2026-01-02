"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.whatsappWebhook = void 0;
const admin = require("firebase-admin");
const https_1 = require("firebase-functions/v2/https");
const crypto_1 = require("crypto");
const luxon_1 = require("luxon");
const whatsappEnvio_1 = require("./whatsappEnvio");
if (!admin.apps.length) {
    admin.initializeApp();
}
const db = admin.firestore();
const { FieldValue } = admin.firestore;
const WHATSAPP_VERIFY_TOKEN = "EAAQ0AKOhLVcBO6gWsncBmGeQgI3SNJCZAFq9SbGrVVZAALH5a8Djval14sKrPjwzMyTuZB3DGqIZAVWYOG1YPDvOcjscZAYzS2CCVx1QTmPvXxFnijm0ZAXg9R0jfZAOaZCihTPnZAXB4PVpgiQewvNVhZAqEIjk8EQlv4x24e235Q4S1yQNTa6kQdgGiZC76baNPZAExQZDZD";
const CONFIRM_KEYWORDS = ["confirmar", "confirmado", "confirmo", "confirm", "confirmei", "ok", "certo", "sim", "confirmacao"];
const CANCEL_KEYWORDS = ["cancelar", "cancelado", "cancelo", "cancel", "desmarcar", "remover", "nao vou", "nao irei", "cancelamento"];
const FACEBOOK_APP_SECRET = "799aad4206a54108d97529191d27d857";
function verifySignature(rawBody, signature, config) {
    if (!signature) {
        console.warn("[verifySignature] Assinatura ausente");
        return false;
    }
    const [scheme, hash] = signature.split("=");
    if (scheme !== "sha256" || !hash)
        return false;
    const candidateSecrets = new Set();
    candidateSecrets.add(FACEBOOK_APP_SECRET);
    if (config.facebookAppSecret)
        candidateSecrets.add(config.facebookAppSecret);
    candidateSecrets.add(config.whatsappAccessToken);
    candidateSecrets.add(config.webhookVerifyToken);
    for (const secret of Array.from(candidateSecrets)) {
        if (!secret)
            continue;
        if (secret.startsWith("sha256=")) {
            if (secret.slice(7) === hash || secret === signature) {
                return true;
            }
            continue;
        }
        const expected = (0, crypto_1.createHmac)("sha256", secret).update(rawBody).digest("hex");
        if (expected === hash) {
            return true;
        }
    }
    console.warn("[verifySignature] Assinatura inválida", { received: hash, checkedSecrets: Array.from(candidateSecrets).map((s) => s.length) });
    return false;
}
async function logIncomingEntry(entry) {
    await db.collection("whatsappIncomingLogs").add({
        entry,
        receivedAt: FieldValue.serverTimestamp(),
    });
}
async function findCompanyIdByPhoneNumber(phoneNumber) {
    if (!phoneNumber)
        return null;
    try {
        // Normalizar o número de telefone
        const normalized = phoneNumber.replace(/\D/g, "");
        const variants = [
            normalized,
            normalized.startsWith("55") ? normalized.slice(2) : `55${normalized}`,
            normalized.length === 13 && normalized.startsWith("55") ? normalized.slice(0, 4) + normalized.slice(5) : null,
        ].filter(Boolean);
        // Buscar em todas as empresas por chat_id recente usando collection group query
        const messagesSnapshot = await db
            .collectionGroup("whatsappMessages")
            .where("chat_id", "in", variants)
            .where("provider", "==", "meta")
            .orderBy("createdAt", "desc")
            .limit(1)
            .get();
        if (!messagesSnapshot.empty) {
            const messageData = messagesSnapshot.docs[0].data();
            if (messageData?.companyId) {
                return messageData.companyId;
            }
            // Extrair companyId do caminho do documento se não estiver nos dados
            const docPath = messagesSnapshot.docs[0].ref.path;
            const pathParts = docPath.split("/");
            const companyIndex = pathParts.indexOf("companies");
            if (companyIndex !== -1 && pathParts[companyIndex + 1]) {
                return pathParts[companyIndex + 1];
            }
        }
    }
    catch (error) {
        console.warn(`[webhookWats] Erro ao buscar companyId por telefone (pode precisar de índice):`, error);
    }
    // Fallback: buscar todas as empresas que usam Meta e verificar qual tem o whatsappApiPhoneNumberId correspondente
    try {
        const companiesSnapshot = await db.collection("companies").get();
        for (const companyDoc of companiesSnapshot.docs) {
            const companyId = companyDoc.id;
            const settingsSnap = await db
                .collection(`companies/${companyId}/settings`)
                .doc("general")
                .get();
            if (settingsSnap.exists) {
                const settingsData = settingsSnap.data() || {};
                if (settingsData.whatsappProvider === "meta" && settingsData.whatsappApiPhoneNumberId) {
                    // Verificar se o whatsappApiPhoneNumberId corresponde ao config usado
                    // Por enquanto, retornar a primeira empresa que usa Meta
                    // (em produção, você pode querer verificar o whatsappApiPhoneNumberId específico)
                    return companyId;
                }
            }
        }
    }
    catch (error) {
        console.error(`[webhookWats] Erro ao buscar empresas que usam Meta:`, error);
    }
    return null;
}
/**
 * Busca um paciente pelo número de telefone na empresa
 * @param companyId ID da empresa
 * @param phoneNumber Número de telefone no formato WhatsApp (ex: "5519999999999")
 * @returns Nome do paciente se encontrado, null caso contrário
 */
async function findPatientNameByPhone(companyId, phoneNumber) {
    try {
        if (!phoneNumber || !companyId)
            return null;
        // Normalizar número (remover caracteres não numéricos)
        const normalizedPhone = phoneNumber.replace(/\D/g, "");
        // Gerar variantes do número para busca
        // Formato do WhatsApp: 55 (país) + DDD + número
        // Formato do paciente: telefoneE164 (pode estar com ou sem o 55)
        const variants = [
            normalizedPhone,
            normalizedPhone.startsWith("55") ? normalizedPhone.slice(2) : `55${normalizedPhone}`,
            normalizedPhone.length === 13 && normalizedPhone.startsWith("55")
                ? normalizedPhone.slice(0, 4) + normalizedPhone.slice(5) // Remover 9 se tiver
                : null,
            normalizedPhone.length === 13 && normalizedPhone.startsWith("55")
                ? normalizedPhone.slice(2) // Remover 55
                : null,
        ].filter(Boolean);
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
                console.log(`[webhookWats] Paciente encontrado para ${normalizedPhone}: ${patientName}`);
                return patientName;
            }
        }
        return null;
    }
    catch (error) {
        console.error(`[webhookWats] Erro ao buscar paciente para ${phoneNumber}:`, error);
        return null;
    }
}
async function upsertContact(contact, companyId) {
    const rawWaId = contact.wa_id ?? contact.id;
    if (!rawWaId)
        return;
    // Normalizar para formato consistente usado como ID de contato
    const waId = (0, whatsappEnvio_1.normalizePhoneForContact)(rawWaId);
    if (companyId) {
        // Buscar paciente pelo número de telefone para obter o nome
        const patientName = await findPatientNameByPhone(companyId, waId);
        // Preparar dados do contato
        const contactData = {
            profile_name: contact.profile?.name || contact.profile?.display_name || "",
            wa_id: waId,
            last_message_at: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
            companyId: companyId,
        };
        // Se encontrou o paciente, adicionar o nome ao contato
        if (patientName) {
            // Verificar se o nome contém "Letícia Massoterapeuta" ou similar (pode ser um erro)
            if (patientName.toLowerCase().includes('letícia') || patientName.toLowerCase().includes('leticia') || patientName.toLowerCase().includes('massoterapeuta')) {
                console.warn(`[webhookWats upsertContact] ⚠️ ATENÇÃO: Tentando definir nome do contato com "Letícia" ou "Massoterapeuta": ${patientName} para wa_id ${waId}. Usando profile_name ao invés disso.`);
                // Se o nome contém "Letícia" ou "Massoterapeuta", usar o profile_name ao invés
                contactData.name = contact.profile?.name || contact.profile?.display_name || "";
                contactData.patientName = contact.profile?.name || contact.profile?.display_name || "";
            }
            else {
                contactData.name = patientName;
                contactData.patientName = patientName; // Campo adicional para compatibilidade
            }
        }
        // Se não encontrou paciente, usar o profile_name
        if (!patientName) {
            contactData.name = contact.profile?.name || contact.profile?.display_name || "";
        }
        console.log(`[webhookWats upsertContact] Salvando contato: wa_id=${waId}, name=${contactData.name}, patientName=${contactData.patientName}, profile_name=${contactData.profile_name}`);
        await db.collection(`companies/${companyId}/whatsappContacts`).doc(waId).set(contactData, { merge: true });
    }
    else {
        // Fallback para coleção global se companyId não estiver disponível (compatibilidade)
        await db.collection("whatsappContacts").doc(waId).set({
            profile_name: contact.profile?.name || contact.profile?.display_name || "",
            wa_id: waId,
            last_message_at: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
            companyId: null,
        }, { merge: true });
    }
}
async function storeIncomingMessage(message, companyId) {
    if (!message?.id)
        return;
    // Normalizar para formato consistente usado como ID de contato
    const rawChatId = message.from || null;
    const chatId = rawChatId ? (0, whatsappEnvio_1.normalizePhoneForContact)(rawChatId) : null;
    // IMPORTANTE: Mensagens inbound (recebidas) NÃO devem ter o campo 'read' definido
    // Isso permite que sejam identificadas como não lidas no frontend
    // O campo 'read' será undefined por padrão, indicando que a mensagem não foi lida
    const messageData = {
        wam_id: message.id,
        message,
        chat_id: chatId,
        direction: "inbound",
        provider: "meta",
        companyId: companyId || null,
        createdAt: FieldValue.serverTimestamp(),
        messageTimestamp: message.timestamp
            ? luxon_1.DateTime.fromSeconds(Number.parseInt(message.timestamp, 10)).toJSDate()
            : FieldValue.serverTimestamp(),
        // Não definir 'read' - será undefined (não lida)
    };
    if (companyId) {
        await db.collection(`companies/${companyId}/whatsappMessages`).doc(message.id).set(messageData, { merge: true });
    }
    else {
        // Fallback para coleção global se companyId não estiver disponível (compatibilidade)
        await db.collection("whatsappMessages").doc(message.id).set(messageData, { merge: true });
    }
}
function decodeButtonPayload(id) {
    if (!id)
        return null;
    try {
        const decoded = Buffer.from(id, "base64").toString("utf-8");
        return JSON.parse(decoded);
    }
    catch (error) {
        console.warn("[whatsappWebhook] Falha ao decodificar payload do botão:", error);
        return null;
    }
}
async function handleInteractiveButtonPayload(payload) {
    if (!payload || typeof payload !== "object")
        return null;
    const action = payload.action;
    const resourceId = payload.resource_id ? String(payload.resource_id) : null;
    const companyId = payload.companyId ? String(payload.companyId) : null;
    if (!action || !resourceId) {
        return null;
    }
    const webhookRef = db.collection("webhookAgendamentos").doc(resourceId);
    const webhookSnap = await webhookRef.get();
    if (!webhookSnap.exists) {
        console.warn("[whatsappWebhook] Botão interativo com resource inexistente", { resourceId });
    }
    const updatePayload = {
        updatedAt: FieldValue.serverTimestamp(),
        customerResponseAt: FieldValue.serverTimestamp(),
        customerResponseSource: "whatsapp_button",
    };
    if (action === "confirm") {
        updatePayload.status = "confirmado";
        updatePayload.customerResponse = "confirmed";
    }
    else if (action === "cancel") {
        updatePayload.status = "cancelado";
        updatePayload.customerResponse = "cancelled";
        updatePayload.cancelReason = "customer_whatsapp";
    }
    else {
        return null;
    }
    if (!companyId) {
        console.error("[handleInteractiveButtonPayload] companyId é obrigatório para atualizar agendamento");
        return null;
    }
    const appointmentRefs = [];
    appointmentRefs.push(db.collection(`companies/${companyId}/appointments`).doc(resourceId));
    let updatedAppointment = false;
    for (const ref of appointmentRefs) {
        try {
            const snap = await ref.get();
            if (snap.exists) {
                await ref.set(updatePayload, { merge: true });
                updatedAppointment = true;
            }
        }
        catch (error) {
            console.error("[whatsappWebhook] Erro ao atualizar agendamento via botão:", error);
        }
    }
    try {
        await webhookRef.set({
            customerResponse: updatePayload.customerResponse,
            customerResponseAt: FieldValue.serverTimestamp(),
            customerResponseMessage: action === "confirm" ? "Botão confirmar" : "Botão cancelar",
            updatedAt: FieldValue.serverTimestamp(),
        }, { merge: true });
    }
    catch (error) {
        console.error("[whatsappWebhook] Erro ao atualizar webhookAgendamentos via botão:", error);
    }
    console.log("[whatsappWebhook] Botão interativo processado", {
        action,
        resourceId,
        companyId,
        updatedAppointment,
    });
    if (action === "confirm")
        return "confirmed";
    if (action === "cancel")
        return "cancelled";
    return null;
}
async function sendAutoReply(toPhone, config, responseType, companyId) {
    let body = `📢 Resposta Automática - Espaço Saúde e Bem-Estar

Olá! 😊

Este WhatsApp é utilizado apenas para notificações sobre agendamentos.

Para realizar um agendamento ou obter mais informações, entre em contato direto com o estabelecimento.

Obrigada pela compreensão.`;
    if (responseType === "confirmed") {
        body = `✅ *Agendamento confirmado!*

Sua confirmação foi registrada com sucesso. Qualquer dúvida ou mudança, fale conosco.

📞 *+55 51 98198-7429*
👩‍⚕️ *Letícia Lima*`;
    }
    else if (responseType === "cancelled") {
        body = `❌ *Agendamento cancelado!*

Seu atendimento foi cancelado conforme solicitado. Se quiser reagendar, entre em contato.

📞 *+55 51 98198-7429*
👩‍⚕️ *Letícia Lima*`;
    }
    const payload = {
        messaging_product: "whatsapp",
        to: toPhone,
        type: "text",
        text: {
            preview_url: false,
            body
        }
    };
    const response = await fetch(`https://graph.facebook.com/v18.0/${config.whatsappApiPhoneNumberId}/messages`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${config.whatsappAccessToken}`,
        },
        body: JSON.stringify(payload),
    });
    if (!response.ok) {
        const text = await response.text();
        throw new Error(`Erro ao enviar resposta automática: ${response.status} ${text}`);
    }
    const result = await response.json();
    const wamId = result?.messages?.[0]?.id;
    if (wamId) {
        // Normalizar para formato consistente usado como ID de contato
        const rawChatId = toPhone.replace("+", "");
        const chatId = (0, whatsappEnvio_1.normalizePhoneForContact)(rawChatId);
        const messageData = {
            wam_id: wamId,
            message: payload,
            chat_id: chatId,
            direction: "outbound",
            provider: "meta",
            companyId: companyId || null,
            createdAt: FieldValue.serverTimestamp(),
        };
        if (companyId) {
            await db.collection(`companies/${companyId}/whatsappMessages`).doc(wamId).set(messageData, { merge: true });
        }
        else {
            // Fallback para coleção global se companyId não estiver disponível (compatibilidade)
            await db.collection("whatsappMessages").doc(wamId).set(messageData, { merge: true });
        }
    }
}
exports.whatsappWebhook = (0, https_1.onRequest)({ region: "us-central1" }, async (req, res) => {
    try {
        const config = await (0, whatsappEnvio_1.getWhatsappConfig)();
        if (config.provider !== "meta") {
            console.warn("[whatsappWebhook] Provedor atual não é Meta. Ignorando requisição.");
            res.status(200).send("Provedor WhatsApp não suportado neste endpoint");
            return;
        }
        const metaConfig = config;
        // Inicializar companyId como null, será descoberto a partir das mensagens
        let globalCompanyId = null;
        if (req.method === "GET") {
            const mode = req.query["hub.mode"];
            const token = req.query["hub.verify_token"];
            const challenge = req.query["hub.challenge"];
            if (mode === "subscribe" && token === WHATSAPP_VERIFY_TOKEN) {
                res.status(200).send(challenge);
            }
            else {
                res.status(403).send("Forbidden");
            }
            return;
        }
        if (req.method !== "POST") {
            res.status(405).send("Method Not Allowed");
            return;
        }
        const signature = req.header("x-hub-signature-256");
        const rawBody = req.rawBody ??
            Buffer.from(typeof req.body === "string" ? req.body : JSON.stringify(req.body ?? {}));
        if (!verifySignature(rawBody, signature, metaConfig)) {
            console.warn("[whatsappWebhook] Assinatura inválida", signature);
            res.status(401).send("Invalid signature");
            return;
        }
        const webhookBody = JSON.parse(rawBody.toString());
        if (!webhookBody?.entry?.length) {
            res.status(200).send("OK");
            return;
        }
        for (const entry of webhookBody.entry) {
            await logIncomingEntry(entry);
            const changes = entry.changes || [];
            for (const change of changes) {
                if (change.field !== "messages")
                    continue;
                const value = (change.value ?? {});
                const contacts = value.contacts ?? [];
                const messages = value.messages ?? [];
                // Processar contatos primeiro para tentar descobrir companyId
                for (const contact of contacts) {
                    await upsertContact(contact, globalCompanyId);
                }
                for (const message of messages) {
                    // Tentar descobrir companyId a partir do número de telefone do remetente
                    const fromPhone = message.from ? `+${message.from}` : null;
                    let messageCompanyId = globalCompanyId;
                    if (!messageCompanyId && fromPhone) {
                        messageCompanyId = await findCompanyIdByPhoneNumber(fromPhone);
                        if (messageCompanyId && !globalCompanyId) {
                            globalCompanyId = messageCompanyId;
                            console.log(`[whatsappWebhook] CompanyId descoberto: ${messageCompanyId} para telefone ${fromPhone}`);
                        }
                    }
                    await storeIncomingMessage(message, messageCompanyId);
                    // fromPhone já foi definido acima
                    const phoneNormalized = fromPhone ? (0, whatsappEnvio_1.normalizarTelefone)(fromPhone) : null;
                    const messageText = extractMessageText(message);
                    console.log("[whatsappWebhook] Mensagem recebida", {
                        messageId: message.id,
                        fromPhone,
                        phoneNormalized,
                        messageText,
                        type: message.type,
                        hasButton: Boolean(message.button),
                        hasInteractive: Boolean(message.interactive),
                    });
                    let responseType = null;
                    let handledByButton = false;
                    const buttonId = message.interactive?.button_reply?.id;
                    if (buttonId) {
                        const payload = decodeButtonPayload(buttonId);
                        if (payload) {
                            try {
                                const buttonResult = await handleInteractiveButtonPayload(payload);
                                if (buttonResult) {
                                    responseType = buttonResult;
                                    handledByButton = true;
                                }
                            }
                            catch (error) {
                                console.error("[whatsappWebhook] Erro ao processar botão interativo:", error);
                            }
                        }
                    }
                    if (!handledByButton && phoneNormalized && messageText) {
                        try {
                            responseType = await processCustomerResponse(phoneNormalized, messageText);
                        }
                        catch (error) {
                            console.error("[whatsappWebhook] Erro ao processar resposta do cliente:", error);
                        }
                    }
                    if (fromPhone) {
                        try {
                            await sendAutoReply(fromPhone, metaConfig, responseType, messageCompanyId || globalCompanyId);
                            console.log("[whatsappWebhook] Resposta enviada", { to: fromPhone, responseType, companyId: messageCompanyId || globalCompanyId });
                        }
                        catch (error) {
                            console.error("[whatsappWebhook] Erro ao enviar auto-reply:", error);
                        }
                    }
                }
            }
        }
        res.status(200).send("OK");
    }
    catch (error) {
        console.error("[whatsappWebhook] Erro geral:", error);
        res.status(500).send("Internal Server Error");
    }
});
function extractMessageText(message) {
    if (!message)
        return null;
    if (message.text?.body)
        return String(message.text.body);
    if (message.button?.text)
        return String(message.button.text);
    if (message.interactive?.button_reply?.title)
        return String(message.interactive.button_reply.title);
    if (message.interactive?.list_reply?.title)
        return String(message.interactive.list_reply.title);
    return null;
}
function normalizeText(text) {
    return text
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}
async function findUpcomingAppointmentForPhone(phoneNormalized) {
    const now = luxon_1.DateTime.now().setZone("America/Sao_Paulo");
    const inicio = now.minus({ minutes: 5 }).toISO();
    const fim = now.plus({ days: 7 }).endOf("day").toISO();
    const variants = (0, whatsappEnvio_1.generatePhoneVariants)(phoneNormalized);
    variants.unshift(phoneNormalized);
    for (const variant of variants) {
        const queries = [
            db
                .collection("webhookAgendamentos")
                .where("phoneVariants", "array-contains", variant)
                .where("datetime_scheduler", ">=", inicio)
                .where("datetime_scheduler", "<=", fim)
                .orderBy("datetime_scheduler", "asc")
                .limit(10)
                .get(),
            db
                .collection("webhookAgendamentos")
                .where("phoneVariants", "array-contains", variant)
                .where("datetime_scheduler", ">=", inicio)
                .where("datetime_scheduler", "<=", fim)
                .orderBy("datetime_scheduler", "asc")
                .limit(10)
                .get(),
            db
                .collection("webhookAgendamentos")
                .where("phoneNormalized", "==", variant)
                .where("datetime_scheduler", ">=", inicio)
                .where("datetime_scheduler", "<=", fim)
                .orderBy("datetime_scheduler", "asc")
                .limit(10)
                .get(),
        ];
        for (const queryPromise of queries) {
            try {
                const snapshot = await queryPromise;
                console.log("[findUpcomingAppointmentForPhone] Resultado consulta", {
                    variant,
                    count: snapshot.size,
                });
                for (const doc of snapshot.docs) {
                    const data = doc.data() || {};
                    if (data.lastStatus === "delete")
                        continue;
                    const companyId = data.companyId;
                    if (!companyId) {
                        console.warn("[findUpcomingAppointmentForPhone] Agendamento sem companyId, ignorando:", doc.id);
                        continue;
                    }
                    const appointmentRef = db.collection(`companies/${companyId}/appointments`).doc(doc.id);
                    const appointmentSnap = await appointmentRef.get();
                    if (!appointmentSnap.exists)
                        continue;
                    return {
                        appointmentRef,
                        appointmentData: appointmentSnap.data() || {},
                        webhookRef: doc.ref,
                        webhookData: data,
                    };
                }
            }
            catch (error) {
                console.error("[findUpcomingAppointmentForPhone] Erro na consulta", {
                    variant,
                    message: error.message,
                });
            }
        }
    }
    return null;
}
async function processCustomerResponse(phoneNormalized, rawMessage) {
    const normalized = normalizeText(rawMessage);
    if (!normalized)
        return null;
    const isConfirm = CONFIRM_KEYWORDS.some((keyword) => normalized.includes(keyword));
    const isCancel = CANCEL_KEYWORDS.some((keyword) => normalized.includes(keyword));
    if (!isConfirm && !isCancel)
        return null;
    if (isConfirm && isCancel) {
        console.warn("[processCustomerResponse] Mensagem ambígua, ignorando:", rawMessage);
        return null;
    }
    const appointmentInfo = await findUpcomingAppointmentForPhone(phoneNormalized);
    if (!appointmentInfo) {
        console.warn("[processCustomerResponse] Nenhum agendamento encontrado para telefone:", phoneNormalized);
        return null;
    }
    const { appointmentRef, webhookRef } = appointmentInfo;
    const updatePayload = {
        updatedAt: FieldValue.serverTimestamp(),
        customerResponseAt: FieldValue.serverTimestamp(),
        customerResponseSource: "whatsapp",
    };
    if (isConfirm) {
        updatePayload.status = "confirmado";
        updatePayload.customerResponse = "confirmed";
    }
    else if (isCancel) {
        updatePayload.status = "cancelado";
        updatePayload.customerResponse = "cancelled";
        updatePayload.cancelReason = "customer_whatsapp";
    }
    await appointmentRef.set(updatePayload, { merge: true });
    await webhookRef.set({
        customerResponse: updatePayload.customerResponse,
        customerResponseAt: FieldValue.serverTimestamp(),
        customerResponseMessage: rawMessage,
    }, { merge: true });
    console.log(`[processCustomerResponse] Agendamento ${appointmentRef.id} atualizado para ${updatePayload.customerResponse}`);
    return isConfirm ? "confirmed" : "cancelled";
}
//# sourceMappingURL=webhookWats.js.map