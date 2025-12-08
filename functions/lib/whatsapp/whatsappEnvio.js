"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleWebhookAgendamento = exports.sendWhatsAppMessage = exports.generatePhoneVariants = exports.normalizePhoneForContact = exports.normalizarTelefone = exports.substituirParametros = exports.templatesWhats = exports.getWhatsappConfig = exports.getCompanySettings = void 0;
const admin = require("firebase-admin");
const luxon_1 = require("luxon");
const evolutionClient_1 = require("./evolutionClient");
if (!admin.apps.length) {
    admin.initializeApp();
}
const db = admin.firestore();
const { FieldValue } = admin.firestore;
const DEFAULT_COMPANY_SETTINGS = {
    customerLabel: "paciente",
    confirmacaoAutomatica: true,
    lembrete1h: true,
    lembrete24h: true,
    whatsappProvider: "disabled",
    whatsappIntegrationType: "WHATSAPP-BAILEYS",
};
async function getCompanySettings(companyId) {
    if (!companyId) {
        return { ...DEFAULT_COMPANY_SETTINGS };
    }
    try {
        const settingsSnap = await db
            .collection(`companies/${companyId}/settings`)
            .doc("general")
            .get();
        const settingsData = settingsSnap.exists ? settingsSnap.data() ?? {} : {};
        return { ...DEFAULT_COMPANY_SETTINGS, ...settingsData };
    }
    catch (error) {
        console.error(`[Settings] Falha ao obter configurações da empresa ${companyId}:`, error);
        return { ...DEFAULT_COMPANY_SETTINGS };
    }
}
exports.getCompanySettings = getCompanySettings;
const STATIC_WHATSAPP_CONFIG = {
    provider: "meta",
    webhookVerifyToken: "1a6e341ee409ea59122ee0b09b765128bf80d5c1eba9def1bbed5a666e035dcf",
    whatsappApiPhoneNumberId: "585260501335809",
    whatsappAccessToken: "EAAQ0AKOhLVcBO6gWsncBmGeQgI3SNJCZAFq9SbGrVVZAALH5a8Djval14sKrPjwzMyTuZB3DGqIZAVWYOG1YPDvOcjscZAYzS2CCVx1QTmPvXxFnijm0ZAXg9R0jfZAOaZCihTPnZAXB4PVpgiQewvNVhZAqEIjk8EQlv4x24e235Q4S1yQNTa6kQdgGiZC76baNPZAExQZDZD",
    facebookAppSecret: "799aad4206a54108d97529191d27d857",
};
async function getWhatsappConfig(companyId) {
    if (!companyId) {
        return STATIC_WHATSAPP_CONFIG;
    }
    const settingsData = await getCompanySettings(companyId);
    const provider = settingsData.whatsappProvider;
    const rawNumber = settingsData.telefoneSalao || "";
    const normalizedDigits = normalizarTelefone(rawNumber);
    const e164 = normalizedDigits
        ? normalizedDigits.startsWith("55")
            ? normalizedDigits
            : `55${normalizedDigits}`
        : "";
    // Se provider está desabilitado ou não está definido, retornar config desabilitado
    if (provider === "disabled" || !provider) {
        console.log("[getWhatsappConfig] WhatsApp desabilitado", { companyId, motivo: !provider ? "não configurado" : "explicitamente desabilitado" });
        return {
            provider: "disabled",
            companyId,
        };
    }
    console.log("[getWhatsappConfig] Provider selecionado", {
        companyId,
        providerConfigurado: provider,
        temNumero: !!e164,
        rawNumber,
    });
    if (provider === "evolution") {
        console.log("[getWhatsappConfig] Usando Evolution", { companyId, evolutionNumber: e164 });
        return {
            provider: "evolution",
            companyId,
            evolutionNumber: e164,
            telefoneOriginal: rawNumber,
        };
    }
    // Fallback para Meta apenas se provider for explicitamente "meta"
    if (provider === "meta") {
        console.log("[getWhatsappConfig] Usando Meta", { companyId });
        return STATIC_WHATSAPP_CONFIG;
    }
    // Se provider é inválido, retornar desabilitado
    console.log("[getWhatsappConfig] Provider inválido, desabilitando", { companyId, provider });
    return {
        provider: "disabled",
        companyId,
    };
}
exports.getWhatsappConfig = getWhatsappConfig;
exports.templatesWhats = {
    agendamento_informar_v2: `📢 *Confirmação de Agendamento - *

Olá, {{1}}! Tudo certo? 😊

Sua reserva foi confirmada! Aqui estão os detalhes do seu atendimento:

👤 Profissional: {{2}}
💼 Serviço:  *{{3}}*
⏰ Data e Horário: *{{4}}*
⏳ Duração: {{5}}
📍 Endereço: {{6}}
📞 Contato: {{7}}

Se precisar reagendar ou tiver dúvidas, fale conosco! 💆‍♂️✨

Nos vemos em breve!`,
    agendamento_atualizar_v1: `🔔 *Atualização no Seu Agendamento - *

Olá, {{1}}! Tudo certo? 😊

Seu agendamento foi atualizado! Aqui estão os novos detalhes:

👤 Profissional: {{2}}
💼 Serviço:  *{{3}}*
⏰ Data e Horário: *{{4}}*
⏳ Duração: {{5}}
📍 Endereço: {{6}}
📞 Contato: {{7}}

Se precisar reagendar ou tiver dúvidas, fale conosco! 💆‍♂️✨

Nos vemos em breve!`,
    agendamento_deletar_v2: `❌ *Cancelamento de Agendamento - *

Olá, {{1}}!

Informamos que seu agendamento foi cancelado.

💼 Serviço: *{{2}}*
⏰ Data: *{{3}}*

Se desejar reagendar, entre em contato:

📞 *Contato:* {{4}}

Aguardamos seu retorno! 🙂`,
    agendamento_lembrar_v2: `📌 *Lembrete de Agendamento - *

Olá, {{1}}! Tudo certo? 😊

Lembramos que seu atendimento será em aproximadamente *{{2}}*.

👤 Profissional: {{3}}
💼 Serviço:  *{{4}}*
⏰ Data e Horário: *{{5}}*
⏳ Duração: {{6}}
📍 Endereço: {{7}}
📞 Contato: {{8}}

Para reagendar ou esclarecer dúvidas, entre em contato pelo número acima.

Nos vemos em breve!`,
    aniversario_v1: `🎉 *Feliz Aniversário, {{1}}!* 🎉

{{2}}

Agradecemos sua confiança em nossos serviços e desejamos um novo ano cheio de saúde, alegria e realizações! 🎂✨

Parabéns pelo seu dia especial! 🎈`
};
function substituirParametros(template, parameters) {
    return template.replace(/{{(\d+)}}/g, (_, index) => parameters[parseInt(index, 10) - 1]?.text || "");
}
exports.substituirParametros = substituirParametros;
function formatarDataLuxon(datetimeString) {
    return luxon_1.DateTime.fromISO(datetimeString, { zone: "America/Sao_Paulo" })
        .setLocale("pt-BR")
        .toFormat("dd 'de' MMMM 'de' yyyy 'às' HH:mm");
}
function formatarDuracao(segundos) {
    const horas = Math.floor(segundos / 3600);
    const minutos = Math.floor((segundos % 3600) / 60);
    return `${horas > 0 ? `${horas}h` : ""}${minutos > 0 ? ` ${minutos}min` : ""}`.trim() || "0min";
}
function normalizarTelefone(tel) {
    return tel?.replace(/\D/g, "") || "";
}
exports.normalizarTelefone = normalizarTelefone;
/**
 * Normaliza número de telefone para formato consistente usado como ID de contato
 * Sempre usa formato com dígito 9 para números brasileiros (se aplicável)
 * Exemplo: 555181987429 -> 5551981987429
 */
function normalizePhoneForContact(phone) {
    if (!phone)
        return "";
    // Remover caracteres não numéricos
    const digits = phone.replace(/\D/g, "");
    if (!digits || digits.length < 10) {
        return digits;
    }
    // Se começar com 55 (Brasil) e tiver 12 dígitos (55 + DDD + 8 dígitos), adicionar 9
    if (digits.startsWith("55") && digits.length === 12) {
        // Formato: 55 + DDD (2 dígitos) + número (8 dígitos)
        // Adicionar 9 após o DDD: 55 + DDD + 9 + número
        return digits.slice(0, 4) + "9" + digits.slice(4);
    }
    // Se começar com 55 e tiver 13 dígitos, já está correto (com 9)
    if (digits.startsWith("55") && digits.length === 13) {
        return digits;
    }
    // Se não começar com 55, adicionar 55 e normalizar
    if (!digits.startsWith("55")) {
        const withCountry = "55" + digits;
        // Se tiver 12 dígitos após adicionar 55, adicionar 9
        if (withCountry.length === 12) {
            return withCountry.slice(0, 4) + "9" + withCountry.slice(4);
        }
        return withCountry;
    }
    return digits;
}
exports.normalizePhoneForContact = normalizePhoneForContact;
function obterNomeStaff(staff) {
    if (!staff)
        return "Letícia Lima";
    if (typeof staff === "string")
        return staff;
    return staff.name || "Letícia Lima";
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
                console.log(`[whatsappEnvio] Paciente encontrado para ${normalizedPhone}: ${patientName}`);
                return patientName;
            }
        }
        return null;
    }
    catch (error) {
        console.error(`[whatsappEnvio] Erro ao buscar paciente para ${phoneNumber}:`, error);
        return null;
    }
}
async function salvarOuAtualizarContato(webhookBody, companyId) {
    try {
        console.log("   📝 [SALVAR CONTATO] Processando contato do agendamento...");
        const telefoneOriginal = webhookBody.data.client.phone;
        const nomeCliente = webhookBody.data.client.name || webhookBody.data.client.display_name || "Cliente Sem Nome";
        if (!telefoneOriginal) {
            console.warn("   ⚠️  Telefone não informado no webhook, pulando salvamento do contato");
            return;
        }
        const telefoneNormalizado = normalizarTelefone(telefoneOriginal);
        if (!telefoneNormalizado) {
            console.warn("   ⚠️  Não foi possível normalizar o telefone, pulando salvamento");
            return;
        }
        console.log("   📞 Telefone original:", telefoneOriginal);
        console.log("   📞 Telefone normalizado:", telefoneNormalizado);
        console.log("   🔢 WA_ID:", telefoneNormalizado);
        console.log("   👤 Nome do cliente:", nomeCliente);
        if (!companyId) {
            console.warn("   ⚠️ companyId não disponível, não é possível salvar contato");
            return;
        }
        const contatosCollection = db.collection(`companies/${companyId}/whatsappContacts`);
        const contatoDocRef = contatosCollection.doc(telefoneNormalizado);
        const contatoSnapshot = await contatoDocRef.get();
        // Buscar paciente pelo número de telefone para obter o nome
        const patientName = await findPatientNameByPhone(companyId, telefoneNormalizado);
        // Preparar dados do contato
        const contactData = {
            wa_id: telefoneNormalizado,
            profile_name: nomeCliente,
            last_message_at: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
            companyId: companyId,
        };
        // Se encontrou o paciente, adicionar o nome ao contato
        if (patientName) {
            contactData.name = patientName;
            contactData.patientName = patientName; // Campo adicional para compatibilidade
        }
        else {
            // Se não encontrou paciente, usar o nome do cliente do webhook
            contactData.name = nomeCliente;
        }
        if (contatoSnapshot.exists) {
            console.log("   ✅ Contato já existe, atualizando informações...");
            await contatoDocRef.set(contactData, { merge: true });
            console.log("   ✅ Contato atualizado com sucesso!");
        }
        else {
            console.log("   🆕 Criando novo contato...");
            await contatoDocRef.set({
                ...contactData,
                in_chat: true,
                createdAt: FieldValue.serverTimestamp(),
            });
            console.log("   ✅ Novo contato criado com sucesso!");
        }
    }
    catch (error) {
        console.error("   🚨 Erro ao processar contato:", error);
        // Não propagamos o erro para não quebrar o fluxo do webhook
    }
}
function generatePhoneVariants(raw) {
    const variants = new Set();
    const digits = normalizarTelefone(raw);
    if (!digits)
        return [];
    variants.add(digits);
    // Remove leading country code
    if (digits.startsWith("55") && digits.length > 2) {
        const withoutCountry = digits.slice(2);
        variants.add(withoutCountry);
        // Handle optional ninth digit after area code (Brazil)
        if (withoutCountry.length >= 9) {
            const area = withoutCountry.slice(0, 2);
            const rest = withoutCountry.slice(2);
            if (rest.length >= 9) {
                if (rest.startsWith("9")) {
                    variants.add(area + rest.slice(1));
                    variants.add("55" + area + rest.slice(1));
                }
                else {
                    variants.add(area + "9" + rest);
                    variants.add("55" + area + "9" + rest);
                }
            }
        }
    }
    return Array.from(variants);
}
exports.generatePhoneVariants = generatePhoneVariants;
async function sendWhatsAppMessage(webhookBody, template, config, options) {
    try {
        console.log("🚀 Preparando envio de mensagem WhatsApp");
        const companyIdFromWebhook = webhookBody?.companyId ??
            webhookBody.data?.companyId ??
            undefined;
        const resolvedConfig = config ?? await getWhatsappConfig(companyIdFromWebhook);
        let nameService = "Massagem";
        if (webhookBody.data.services.length === 1) {
            nameService = webhookBody.data.services[0].title;
        }
        const staffName = obterNomeStaff(webhookBody.data.staff);
        let parameters;
        if (template === "agendamento_deletar_v2") {
            parameters = [
                { type: "text", text: webhookBody.data.client.name.split(" ")[0] },
                { type: "text", text: nameService },
                { type: "text", text: formatarDataLuxon(webhookBody.data.datetime) },
                { type: "text", text: webhookBody.data.company_phone || "" },
            ];
        }
        else {
            const clientFirstName = webhookBody.data.client.name.split(" ")[0];
            const formattedDate = formatarDataLuxon(webhookBody.data.datetime);
            const durationText = formatarDuracao(webhookBody.data.seance_length || 0);
            const addressText = webhookBody.data.company_adress || "";
            const phoneText = webhookBody.data.company_phone || "";
            if (template === "agendamento_lembrar_v2") {
                const reminderWindowText = options?.reminderWindowText ?? "1 hora";
                parameters = [
                    { type: "text", text: clientFirstName },
                    { type: "text", text: reminderWindowText },
                    { type: "text", text: staffName },
                    { type: "text", text: nameService },
                    { type: "text", text: formattedDate },
                    { type: "text", text: durationText },
                    { type: "text", text: addressText },
                    { type: "text", text: phoneText },
                ];
            }
            else {
                parameters = [
                    { type: "text", text: clientFirstName },
                    { type: "text", text: staffName },
                    { type: "text", text: nameService },
                    { type: "text", text: formattedDate },
                    { type: "text", text: durationText },
                    { type: "text", text: addressText },
                    { type: "text", text: phoneText },
                ];
            }
        }
        const headerParameters = [{ type: "text", text: webhookBody.data.company_name || "" }];
        const mensagemFormatada = substituirParametros(exports.templatesWhats[template], parameters);
        console.log("[sendWhatsAppMessage] Provider selecionado:", {
            provider: resolvedConfig.provider,
            companyId: companyIdFromWebhook,
            template,
        });
        const messageSource = options?.messageSource || 'automatic'; // Padrão: automático
        // Verificar se WhatsApp está desabilitado
        if (resolvedConfig.provider === "disabled") {
            console.log("[sendWhatsAppMessage] ⚠️ WhatsApp desabilitado. Mensagem não será enviada.");
            return new Response("WhatsApp desabilitado", { status: 200 });
        }
        if (resolvedConfig.provider === "evolution") {
            console.log("[sendWhatsAppMessage] Enviando via Evolution");
            return await sendViaEvolution({
                webhookBody,
                template,
                mensagemFormatada,
                config: resolvedConfig,
                messageSource,
            });
        }
        console.log("[sendWhatsAppMessage] Enviando via Meta (fallback)");
        return await sendViaMeta({
            webhookBody,
            template,
            config: resolvedConfig,
            headerParameters,
            parameters,
            mensagemFormatada,
            companyId: companyIdFromWebhook,
            messageSource,
        });
    }
    catch (error) {
        console.error("🚨 Erro ao enviar mensagem:", error);
        throw (error instanceof Error ? error : new Error(String(error)));
    }
}
exports.sendWhatsAppMessage = sendWhatsAppMessage;
async function sendViaMeta(params) {
    const { webhookBody, template, config, headerParameters, parameters, mensagemFormatada, companyId, messageSource = 'automatic' } = params;
    const WHATSAPP_API_URL = `https://graph.facebook.com/v18.0/${config.whatsappApiPhoneNumberId}/messages`;
    const payload = {
        messaging_product: "whatsapp",
        to: webhookBody.data.client.phone,
        type: "template",
        template: {
            name: template,
            language: { code: "pt_BR" },
            components: [
                { type: "header", parameters: headerParameters },
                { type: "body", parameters },
            ],
        },
    };
    console.log("📤 Enviando requisição para o WhatsApp:", JSON.stringify(payload, null, 2));
    const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.whatsappAccessToken}`,
    };
    const response = await fetch(WHATSAPP_API_URL, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
    });
    console.log("📡 Status da resposta:", response.status);
    const responseText = await response.text();
    console.log("🔎 Resposta bruta da API:", responseText);
    let responseJson;
    try {
        responseJson = JSON.parse(responseText);
        console.log("✅ Resposta JSON:", responseJson);
    }
    catch (error) {
        console.error("🚨 Erro ao converter resposta para JSON:", error);
        return new Response("Erro ao processar JSON", { status: 500 });
    }
    if (!responseJson.messages?.length) {
        console.warn("⚠️ A resposta não contém um ID de mensagem válido.");
        return new Response("OK");
    }
    const wamId = responseJson.messages[0].id;
    console.log("✅ Mensagem enviada com sucesso. ID:", wamId);
    const mensagemParaSalvar = {
        id: wamId,
        to: webhookBody.data.client.phone.replace("+", ""),
        type: "template",
        provider: "meta",
        template: {
            name: template,
            language: { code: "pt_BR" },
        },
        text: {
            body: mensagemFormatada,
            preview_url: false,
        },
    };
    const chatIdRaw = responseJson.contacts?.[0]?.wa_id ?? null;
    // Normalizar para formato consistente usado como ID de contato
    const chatId = chatIdRaw ? normalizePhoneForContact(chatIdRaw) : null;
    // Salvar dentro da coleção da empresa se companyId estiver disponível
    if (companyId) {
        const messageRef = db.collection(`companies/${companyId}/whatsappMessages`).doc(wamId);
        await messageRef.set({
            message: mensagemParaSalvar,
            wam_id: wamId,
            chat_id: chatId,
            provider: "meta",
            companyId: companyId,
            messageSource,
            createdAt: FieldValue.serverTimestamp(),
        });
        // Verificar se foi salvo corretamente
        const savedDoc = await messageRef.get();
        if (savedDoc.exists) {
            const savedData = savedDoc.data();
            console.log("[Meta] ✅ Mensagem salva no Firestore:", {
                wamId,
                chatId,
                messageSource: savedData?.messageSource,
                direction: 'outbound',
                companyId,
            });
        }
        else {
            console.error("[Meta] ⚠️ Mensagem não foi salva no Firestore:", { wamId, chatId });
        }
    }
    else {
        // Fallback para coleção global se companyId não estiver disponível (compatibilidade)
        const messageRef = db.collection("whatsappMessages").doc(wamId);
        await messageRef.set({
            message: mensagemParaSalvar,
            wam_id: wamId,
            chat_id: chatId,
            provider: "meta",
            companyId: null,
            messageSource,
            createdAt: FieldValue.serverTimestamp(),
        });
        // Verificar se foi salvo corretamente
        const savedDoc = await messageRef.get();
        if (savedDoc.exists) {
            console.log("[Meta] ✅ Mensagem salva no Firestore (coleção global):", { wamId, chatId });
        }
        else {
            console.error("[Meta] ⚠️ Mensagem não foi salva no Firestore:", { wamId, chatId });
        }
    }
    if (chatId && companyId) {
        // Buscar paciente pelo número de telefone para obter o nome
        const patientName = await findPatientNameByPhone(companyId, chatId);
        // Preparar dados do contato
        const contactData = {
            wa_id: chatId,
            last_message_at: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
            companyId: companyId,
        };
        // Se encontrou o paciente, adicionar o nome ao contato
        if (patientName) {
            contactData.name = patientName;
            contactData.patientName = patientName; // Campo adicional para compatibilidade
        }
        await db.collection(`companies/${companyId}/whatsappContacts`).doc(chatId).set(contactData, { merge: true });
    }
    console.log("📌 Mensagem salva no Firestore ✅");
    return new Response("OK");
}
async function sendViaEvolution(params) {
    const { webhookBody, template, mensagemFormatada, config, messageSource = 'automatic' } = params;
    const rawPhone = webhookBody.data.client.phone || "";
    const normalized = normalizarTelefone(rawPhone);
    if (!normalized) {
        console.warn("⚠️ Telefone do cliente inválido para envio via Evolution:", rawPhone);
        return new Response("Telefone do cliente inválido", { status: 200 });
    }
    // Normalizar número para formato E.164 (com código do país)
    const destino = normalized.startsWith("55") ? normalized : `55${normalized}`;
    console.log("[Evolution] Enviando mensagem", {
        companyId: config.companyId,
        to: destino,
        template,
    });
    try {
        const resultadoEnvio = await (0, evolutionClient_1.sendEvolutionTextMessage)({
            companyId: config.companyId,
            to: destino,
            message: mensagemFormatada,
        });
        const wamId = resultadoEnvio.messageId || `evolution_${Date.now()}`;
        // Normalizar para formato consistente usado como ID de contato
        const chatId = normalizePhoneForContact(destino);
        const mensagemParaSalvar = {
            id: wamId,
            to: chatId,
            type: "text",
            provider: "evolution",
            template: {
                name: template,
                language: { code: "pt_BR" },
            },
            text: {
                body: mensagemFormatada,
                preview_url: false,
            },
        };
        const messageRef = db.collection(`companies/${config.companyId}/whatsappMessages`).doc(wamId);
        await messageRef.set({
            message: mensagemParaSalvar,
            wam_id: wamId,
            chat_id: chatId,
            provider: "evolution",
            companyId: config.companyId,
            direction: "outbound",
            messageSource,
            createdAt: FieldValue.serverTimestamp(),
        });
        // Verificar se foi salvo corretamente
        const savedDoc = await messageRef.get();
        if (savedDoc.exists) {
            const savedData = savedDoc.data();
            console.log("[Evolution] ✅ Mensagem salva no Firestore:", {
                wamId,
                chatId,
                messageSource: savedData?.messageSource,
                direction: savedData?.direction,
                companyId: config.companyId,
            });
        }
        else {
            console.error("[Evolution] ⚠️ Mensagem não foi salva no Firestore:", { wamId, chatId });
        }
        // Buscar paciente pelo número de telefone para obter o nome
        const patientName = await findPatientNameByPhone(config.companyId, chatId);
        // Preparar dados do contato
        const contactData = {
            wa_id: chatId,
            last_message_at: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
            companyId: config.companyId,
        };
        // Se encontrou o paciente, adicionar o nome ao contato
        if (patientName) {
            contactData.name = patientName;
            contactData.patientName = patientName; // Campo adicional para compatibilidade
        }
        await db.collection(`companies/${config.companyId}/whatsappContacts`).doc(chatId).set(contactData, { merge: true });
        await db
            .collection(`companies/${config.companyId}/integrations`)
            .doc("whatsappEvolution")
            .set({
            lastMessageAt: FieldValue.serverTimestamp(),
        }, { merge: true });
        console.log("📌 Mensagem enviada via Evolution e salva no Firestore ✅");
        return new Response("OK");
    }
    catch (error) {
        console.error("🚨 Erro ao enviar mensagem via Evolution:", error);
        throw error;
    }
}
async function saveWebhookAgendamento(webhookBody) {
    try {
        const logsCollection = db.collection("webhookLogAgendamento");
        await logsCollection.add({
            body: webhookBody,
            datetime_scheduler: webhookBody.data.datetime,
            status: webhookBody.status,
            createdAt: FieldValue.serverTimestamp()
        });
        const resourceId = webhookBody.resource_id ? String(webhookBody.resource_id) : `resource_${Date.now()}`;
        const agendamentoDocRef = db.collection("webhookAgendamentos").doc(resourceId);
        if (webhookBody.status === "delete") {
            await agendamentoDocRef.delete();
            console.log("🗑️  Webhook deletado do Firestore");
            return;
        }
        let phoneNormalized = normalizarTelefone(webhookBody.data?.client?.phone || "");
        if (phoneNormalized && !phoneNormalized.startsWith("55")) {
            phoneNormalized = `55${phoneNormalized}`;
        }
        const phoneVariants = generatePhoneVariants(webhookBody.data?.client?.phone || "");
        const baseData = {
            body: webhookBody,
            datetime_scheduler: webhookBody.data.datetime,
            notified: false,
            updatedAt: FieldValue.serverTimestamp(),
            companyId: webhookBody?.companyId || null,
            phoneNormalized: phoneNormalized || null,
            phoneVariants,
            customerPhone: webhookBody.data?.client?.phone || null,
            lastStatus: webhookBody.status
        };
        if (webhookBody.status === "update") {
            await agendamentoDocRef.set({
                ...baseData,
                reminder24hSent: false,
                reminder24hSentAt: null,
                reminder1hSent: false,
                reminder1hSentAt: null,
                notified: false,
                notifiedAt: null,
            }, { merge: true });
            console.log("🔄 Webhook atualizado no Firestore");
        }
        else {
            await agendamentoDocRef.set({
                ...baseData,
                createdAt: FieldValue.serverTimestamp()
            }, { merge: true });
            console.log("✅ Webhook salvo no Firestore");
        }
    }
    catch (error) {
        console.error("🚨 Erro ao processar webhook:", error);
    }
}
async function sendWhatsAppMessageCreate(webhookBody, config, companySettings) {
    const statusTemplateMap = {
        create: "agendamento_informar_v2",
        update: "agendamento_atualizar_v1",
        delete: "agendamento_deletar_v2"
    };
    const template = statusTemplateMap[webhookBody.status];
    if (!template)
        return;
    await sendWhatsAppMessage(webhookBody, template, config);
}
async function handleWebhookAgendamento(webhookBody, providedConfig, companyId) {
    const config = providedConfig ?? await getWhatsappConfig(companyId);
    console.log("📩 Webhook recebido:", webhookBody);
    const resolvedCompanyId = companyId ??
        webhookBody?.companyId ??
        webhookBody.data?.companyId ??
        undefined;
    const companySettings = await getCompanySettings(resolvedCompanyId);
    if (webhookBody.resource === "record") {
        console.log("\n🔄 [ETAPA 1] Salvando/atualizando contato...");
        await salvarOuAtualizarContato(webhookBody, resolvedCompanyId);
        console.log("\n💾 [ETAPA 2] Salvando webhook no banco...");
        await saveWebhookAgendamento(webhookBody);
        const enviarNotificacao = webhookBody.enviarNotificacao !== false;
        if (enviarNotificacao) {
            console.log("\n📱 [ETAPA 3] Enviando mensagem WhatsApp...");
            await sendWhatsAppMessageCreate(webhookBody, config, companySettings);
        }
        else {
            console.log("\n🔕 [ETAPA 3] Notificação desabilitada (enviarNotificacao: false)");
        }
    }
}
exports.handleWebhookAgendamento = handleWebhookAgendamento;
//# sourceMappingURL=whatsappEnvio.js.map