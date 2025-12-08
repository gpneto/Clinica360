"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendEvolutionTextMessage = exports.startEvolutionPairing = exports.getEvolutionInstanceStatus = exports.getEvolutionQRCode = exports.getOrCreateEvolutionInstance = void 0;
const admin = require("firebase-admin");
const firestore_1 = require("firebase-admin/firestore");
// Inicializar Firebase Admin se ainda não foi inicializado
if (!admin.apps.length) {
    admin.initializeApp();
}
const db = admin.firestore();
// Função helper para obter a chave da API
// Quando secrets são declarados no array ['evolution-api-key'], 
// o Firebase Functions v2 os disponibiliza como variáveis de ambiente
// Tentamos diferentes formatos de acesso
function getEvolutionApiKey() {
    // Firebase Functions v2 disponibiliza secrets declarados no array como env vars
    // Tentar diferentes formatos possíveis
    const env = process.env;
    return env['evolution-api-key'] ||
        env.EVOLUTION_API_KEY ||
        process.env.EVOLUTION_API_KEY ||
        '';
}
// Função helper para obter a URL da API
function getEvolutionApiUrl() {
    const env = process.env;
    return env['evolution-api-url'] ||
        env.EVOLUTION_API_URL ||
        process.env.EVOLUTION_API_URL ||
        'http://localhost:8080';
}
// Função helper para fazer fetch com suporte a certificados auto-assinados
async function fetchWithSelfSignedCert(url, options = {}) {
    const apiUrl = getEvolutionApiUrl();
    const isHttps = url.startsWith('https://') || apiUrl.startsWith('https://');
    // Se for HTTPS, usar variável de ambiente para aceitar certificados auto-assinados
    if (isHttps) {
        const originalRejectUnauthorized = process.env.NODE_TLS_REJECT_UNAUTHORIZED;
        try {
            // Desabilitar verificação de certificado temporariamente
            process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
            const response = await fetch(url, options);
            // Restaurar valor original
            if (originalRejectUnauthorized !== undefined) {
                process.env.NODE_TLS_REJECT_UNAUTHORIZED = originalRejectUnauthorized;
            }
            else {
                delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
            }
            return response;
        }
        catch (error) {
            // Restaurar valor original em caso de erro
            if (originalRejectUnauthorized !== undefined) {
                process.env.NODE_TLS_REJECT_UNAUTHORIZED = originalRejectUnauthorized;
            }
            else {
                delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
            }
            throw error;
        }
    }
    // Para HTTP, usar fetch normal
    return fetch(url, options);
}
// Função helper para obter opções de fetch com suporte a certificados auto-assinados
function getFetchOptions(apiKey, body) {
    const options = {
        headers: {
            'apikey': apiKey,
            'Content-Type': 'application/json',
        },
    };
    if (body) {
        options.body = typeof body === 'string' ? body : JSON.stringify(body);
    }
    return options;
}
/**
 * Cria ou obtém uma instância do Evolution API para uma empresa
 */
async function getOrCreateEvolutionInstance(companyId, integrationType = 'WHATSAPP-BAILEYS', number) {
    const instanceName = `smartdoctor_${companyId}`;
    try {
        const apiKey = getEvolutionApiKey();
        const apiUrl = getEvolutionApiUrl();
        // Validar chave da API
        if (!apiKey || apiKey === '') {
            throw new Error('EVOLUTION_API_KEY não configurada. Configure no Firebase Console em Configurações > Variáveis de ambiente');
        }
        // Verificar se a instância já existe
        const instanceResponse = await fetchWithSelfSignedCert(`${apiUrl}/instance/fetchInstances`, {
            method: 'GET',
            ...getFetchOptions(apiKey),
        });
        if (!instanceResponse.ok) {
            const errorText = await instanceResponse.text();
            console.error('[Evolution] Erro ao buscar instâncias:', {
                status: instanceResponse.status,
                statusText: instanceResponse.statusText,
                error: errorText,
                url: `${apiUrl}/instance/fetchInstances`,
                hasApiKey: !!apiKey,
                apiKeyLength: apiKey?.length || 0,
            });
            throw new Error(`Erro ao buscar instâncias: ${instanceResponse.status} ${errorText}`);
        }
        const instances = (await instanceResponse.json());
        // A API retorna objetos com 'name' diretamente, não 'instance.instanceName'
        const instanceExists = instances?.find((inst) => {
            // Tentar diferentes formatos de resposta da API
            const name = inst.name || inst.instance?.instanceName || inst.instanceName;
            return name === instanceName;
        });
        if (instanceExists) {
            console.log(`[Evolution] Instância ${instanceName} já existe`);
            // Garantir que o webhook está configurado mesmo se a instância já existe
            const webhookUrl = `https://us-central1-agendamentointeligente-4405f.cloudfunctions.net/evolutionWebhook/agendamentointeligente_${companyId}`;
            console.log(`[Evolution] Verificando/configurando webhook para instância existente ${instanceName}`, { webhookUrl });
            try {
                const webhookResponse = await fetchWithSelfSignedCert(`${apiUrl}/webhook/set/${instanceName}`, {
                    method: 'POST',
                    ...getFetchOptions(apiKey, {
                        webhook: {
                            enabled: true,
                            url: webhookUrl,
                            webhook_by_events: false,
                            webhook_base64: false,
                            events: [
                                'MESSAGES_UPSERT',
                                'CONNECTION_UPDATE',
                                'QRCODE_UPDATED',
                                'CONTACTS_UPDATE',
                                'MESSAGES_UPDATE',
                                'MESSAGES_DELETE',
                                'SEND_MESSAGE',
                                'CONTACTS_SET',
                                'CONTACTS_UPSERT',
                                'PRESENCE_UPDATE',
                                'CHATS_UPDATE',
                                'CHATS_UPSERT',
                                'CHATS_DELETE',
                                'GROUPS_UPSERT',
                                'GROUP_UPDATE',
                                'GROUP_PARTICIPANTS_UPDATE',
                                'LABELS_EDIT',
                                'LABELS_ASSOCIATION',
                                'CALL',
                                'TYPEBOT_START',
                                'TYPEBOT_CHANGE_STATUS',
                                // Removido: CHAMA_AI_ACTION não existe na lista de eventos válidos
                            ],
                        },
                    }),
                });
                if (!webhookResponse.ok) {
                    const webhookErrorText = await webhookResponse.text();
                    console.warn(`[Evolution] Erro ao configurar webhook para instância existente: ${webhookResponse.status} ${webhookErrorText}`);
                }
                else {
                    const webhookResult = await webhookResponse.json();
                    console.log(`[Evolution] Webhook configurado para instância existente`, { instanceName, webhookUrl, result: webhookResult });
                }
            }
            catch (webhookError) {
                console.warn(`[Evolution] Erro ao configurar webhook para instância existente (não crítico):`, webhookError);
            }
            return instanceName;
        }
        // Criar nova instância
        console.log(`[Evolution] Criando instância ${instanceName} com integração ${integrationType}`, { number });
        const createBody = {
            instanceName,
            token: `token_${companyId}_${Date.now()}`,
            integration: integrationType,
        };
        // Para WhatsApp Business, não enviar qrcode na criação (integração é baseada em token)
        // Para Baileys, enviar qrcode: true para gerar QR code automaticamente
        if (integrationType === 'WHATSAPP-BAILEYS') {
            createBody.qrcode = true;
        }
        // Para WhatsApp Business, o QR code será gerado via /instance/connect após a criação
        // Adicionar número se fornecido (obrigatório para WhatsApp Business)
        if (number) {
            createBody.number = number;
        }
        else if (integrationType === 'WHATSAPP-BUSINESS') {
            throw new Error('Número do WhatsApp é obrigatório para WhatsApp Business');
        }
        const createResponse = await fetchWithSelfSignedCert(`${apiUrl}/instance/create`, {
            method: 'POST',
            ...getFetchOptions(apiKey, createBody),
        });
        if (!createResponse.ok) {
            const errorText = await createResponse.text();
            throw new Error(`Erro ao criar instância: ${createResponse.status} ${errorText}`);
        }
        const createResult = await createResponse.json();
        console.log(`[Evolution] Instância criada`, { instanceName, result: createResult });
        // Para WhatsApp Business, forçar geração de QR code via /instance/connect após criar
        // (não enviamos qrcode: true na criação porque a integração é baseada em token)
        if (integrationType === 'WHATSAPP-BUSINESS') {
            console.log(`[Evolution] WhatsApp Business: Forçando geração de QR code após criação...`);
            try {
                // Aguardar um pouco para a instância estar pronta
                await new Promise(resolve => setTimeout(resolve, 2000));
                // Chamar /instance/connect para forçar geração do QR code
                const connectResponse = await fetchWithSelfSignedCert(`${apiUrl}/instance/connect/${instanceName}`, {
                    method: 'GET',
                    ...getFetchOptions(apiKey),
                });
                if (connectResponse.ok) {
                    const connectResult = await connectResponse.json().catch(() => ({}));
                    console.log(`[Evolution] WhatsApp Business: Resposta do connect após criação:`, {
                        hasQrcode: !!connectResult.qrcode,
                        keys: Object.keys(connectResult),
                    });
                }
                else {
                    const errorText = await connectResponse.text().catch(() => 'Erro desconhecido');
                    console.warn(`[Evolution] WhatsApp Business: Erro ao conectar após criação: ${connectResponse.status} ${errorText}`);
                }
            }
            catch (error) {
                console.warn(`[Evolution] WhatsApp Business: Erro ao forçar QR code após criação (não crítico):`, error);
            }
        }
        // Configurar webhook automaticamente após criar a instância
        const webhookUrl = `https://us-central1-agendamentointeligente-4405f.cloudfunctions.net/evolutionWebhook/agendamentointeligente_${companyId}`;
        console.log(`[Evolution] Configurando webhook para ${instanceName}`, { webhookUrl });
        try {
            const webhookResponse = await fetchWithSelfSignedCert(`${apiUrl}/webhook/set/${instanceName}`, {
                method: 'POST',
                ...getFetchOptions(apiKey, {
                    webhook: {
                        enabled: true,
                        url: webhookUrl,
                        webhook_by_events: false,
                        webhook_base64: false,
                        events: [
                            'MESSAGES_UPSERT',
                            'CONNECTION_UPDATE',
                            'QRCODE_UPDATED',
                            'CONTACTS_UPDATE',
                            'MESSAGES_UPDATE',
                            'MESSAGES_DELETE',
                            'SEND_MESSAGE',
                            'CONTACTS_SET',
                            'CONTACTS_UPSERT',
                            'PRESENCE_UPDATE',
                            'CHATS_UPDATE',
                            'CHATS_UPSERT',
                            'CHATS_DELETE',
                            'GROUPS_UPSERT',
                            'GROUP_UPDATE',
                            'GROUP_PARTICIPANTS_UPDATE',
                            'LABELS_EDIT',
                            'LABELS_ASSOCIATION',
                            'CALL',
                            'TYPEBOT_START',
                            'TYPEBOT_CHANGE_STATUS',
                            // Removido: CHAMA_AI_ACTION não existe na lista de eventos válidos
                        ],
                    },
                }),
            });
            if (!webhookResponse.ok) {
                const webhookErrorText = await webhookResponse.text();
                console.warn(`[Evolution] Erro ao configurar webhook: ${webhookResponse.status} ${webhookErrorText}`);
                // Não falhar a criação da instância se o webhook falhar
            }
            else {
                const webhookResult = await webhookResponse.json();
                console.log(`[Evolution] Webhook configurado com sucesso`, { instanceName, webhookUrl, result: webhookResult });
            }
        }
        catch (webhookError) {
            console.warn(`[Evolution] Erro ao configurar webhook (não crítico):`, webhookError);
            // Não falhar a criação da instância se o webhook falhar
        }
        return instanceName;
    }
    catch (error) {
        console.error(`[Evolution] Erro ao obter/criar instância`, error);
        throw error;
    }
}
exports.getOrCreateEvolutionInstance = getOrCreateEvolutionInstance;
/**
 * Obtém o QR Code de uma instância
 */
async function getEvolutionQRCode(instanceName) {
    try {
        const apiKey = getEvolutionApiKey();
        const apiUrl = getEvolutionApiUrl();
        if (!apiKey || apiKey === '') {
            console.error('[Evolution] EVOLUTION_API_KEY não configurada');
            return null;
        }
        // Tentar primeiro com GET (padrão)
        let response = await fetchWithSelfSignedCert(`${apiUrl}/instance/connect/${instanceName}`, {
            method: 'GET',
            ...getFetchOptions(apiKey),
        });
        // Se retornar apenas {count: 0}, o QR code ainda não foi gerado
        // Isso é normal - o QR code será enviado via webhook quando disponível
        if (response.ok) {
            const testResult = await response.json().catch(() => ({}));
            if (testResult && Object.keys(testResult).length === 1 && testResult.count === 0) {
                console.log(`[Evolution] QR Code ainda não disponível (count: 0). Será enviado via webhook quando gerado.`);
                // Não tentar POST - o QR code será enviado via webhook
                return null;
            }
        }
        if (!response.ok) {
            const errorText = await response.text();
            console.warn(`[Evolution] Erro ao obter QR Code: ${response.status} ${errorText}`);
            return null;
        }
        const result = (await response.json());
        // O QR Code pode vir em diferentes formatos
        // Verificar primeiro em result.qrcode
        if (result.qrcode) {
            if (result.qrcode.code) {
                return result.qrcode.code;
            }
            if (result.qrcode.base64) {
                // Se for base64, pode vir com ou sem prefixo data:image
                const base64 = result.qrcode.base64;
                return base64.startsWith('data:') ? base64 : `data:image/png;base64,${base64}`;
            }
            if (result.qrcode.qr) {
                return result.qrcode.qr;
            }
        }
        // Verificar diretamente no result
        if (result.code) {
            return result.code;
        }
        if (result.base64) {
            const base64 = result.base64;
            return base64.startsWith('data:') ? base64 : `data:image/png;base64,${base64}`;
        }
        if (result.qr) {
            return result.qr;
        }
        // Verificar se há uma URL do QR code
        if (result.qrcode?.url) {
            return result.qrcode.url;
        }
        console.warn(`[Evolution] QR Code não encontrado na resposta`, {
            keys: Object.keys(result),
            hasQrcode: !!result.qrcode,
            qrcodeKeys: result.qrcode ? Object.keys(result.qrcode) : [],
        });
        return null;
    }
    catch (error) {
        console.error(`[Evolution] Erro ao obter QR Code`, error);
        return null;
    }
}
exports.getEvolutionQRCode = getEvolutionQRCode;
/**
 * Obtém o status de uma instância
 */
async function getEvolutionInstanceStatus(instanceName) {
    try {
        const apiKey = getEvolutionApiKey();
        const apiUrl = getEvolutionApiUrl();
        if (!apiKey || apiKey === '') {
            console.error('[Evolution] EVOLUTION_API_KEY não configurada');
            return null;
        }
        const response = await fetchWithSelfSignedCert(`${apiUrl}/instance/fetchInstances`, {
            method: 'GET',
            ...getFetchOptions(apiKey),
        });
        if (!response.ok) {
            const errorText = await response.text();
            console.warn(`[Evolution] Erro ao buscar status: ${response.status} ${errorText}`);
            return null;
        }
        const instances = (await response.json());
        // A API retorna objetos com 'name' diretamente, não 'instance.instanceName'
        const instance = instances?.find((inst) => {
            const name = inst.name || inst.instance?.instanceName || inst.instanceName;
            return name === instanceName;
        });
        if (!instance) {
            return null;
        }
        // Mapear a resposta da API para o formato esperado
        return {
            instanceName: instance.name || instance.instanceName || instanceName,
            status: instance.connectionStatus === 'open' ? 'connected' :
                instance.connectionStatus === 'close' ? 'disconnected' :
                    'connecting',
            connection: {
                state: instance.connectionStatus,
            },
        };
    }
    catch (error) {
        console.error(`[Evolution] Erro ao obter status da instância`, error);
        return null;
    }
}
exports.getEvolutionInstanceStatus = getEvolutionInstanceStatus;
/**
 * Inicia o pareamento via Evolution API
 */
async function startEvolutionPairing(companyId, integrationType, number, retryCount = 0) {
    try {
        console.log(`[Evolution] Iniciando pareamento para empresa ${companyId} com integração ${integrationType}`);
        // Validar tipo de integração
        if (!integrationType || (integrationType !== 'WHATSAPP-BUSINESS' && integrationType !== 'WHATSAPP-BAILEYS')) {
            const errorMessage = `Tipo de integração inválido. Deve ser "WHATSAPP-BAILEYS" ou "WHATSAPP-BUSINESS".`;
            console.error(`[Evolution] ${errorMessage}`, {
                companyId,
                integrationType
            });
            await updateEvolutionStatus(companyId, {
                status: 'error',
                lastError: errorMessage,
            });
            return {
                status: 'error',
                error: errorMessage,
            };
        }
        // Garantir que a instância existe
        const instanceName = await getOrCreateEvolutionInstance(companyId, integrationType, number);
        // Atualizar status inicial
        await updateEvolutionStatus(companyId, {
            status: 'initializing',
            qrCode: firestore_1.FieldValue.delete(),
            lastDisconnectReason: firestore_1.FieldValue.delete(),
            lastError: firestore_1.FieldValue.delete(),
        });
        // Obter status atual da instância
        const instanceStatus = await getEvolutionInstanceStatus(instanceName);
        if (instanceStatus) {
            let connectionState = instanceStatus.connection?.state;
            console.log(`[Evolution] Status da instância ${instanceName}:`, {
                connectionState,
                integrationType,
                instanceStatus
            });
            // Para WhatsApp Business, sempre ignorar status "open" inicial e forçar geração de QR code
            // O status "open" inicial não significa que está realmente conectado
            const shouldForceQRCode = integrationType === 'WHATSAPP-BUSINESS';
            // Se é WhatsApp Business e status é "open", fazer logout para forçar geração de QR code
            // Se após logout o status ainda for "open", aguardar mais tempo pelo QR code via webhook
            if (shouldForceQRCode && connectionState === 'open') {
                console.log(`[Evolution] WhatsApp Business com status 'open' inicial - fazendo logout para forçar QR code`);
                try {
                    const apiKey = getEvolutionApiKey();
                    const apiUrl = getEvolutionApiUrl();
                    // Fazer logout da instância (não deletar)
                    const logoutResponse = await fetchWithSelfSignedCert(`${apiUrl}/instance/logout/${instanceName}`, {
                        method: 'DELETE',
                        ...getFetchOptions(apiKey),
                    });
                    if (!logoutResponse.ok) {
                        const errorText = await logoutResponse.text().catch(() => 'Erro desconhecido');
                        console.warn(`[Evolution] Erro ao fazer logout: ${logoutResponse.status} ${errorText}`);
                    }
                    else {
                        console.log(`[Evolution] Logout realizado com sucesso`);
                    }
                    // Aguardar mais tempo após logout para a instância processar completamente
                    await new Promise(resolve => setTimeout(resolve, 5000));
                    // Verificar status após logout
                    const newStatus = await getEvolutionInstanceStatus(instanceName);
                    console.log(`[Evolution] Status após logout:`, newStatus?.connection?.state);
                    // Atualizar connectionState para continuar o fluxo
                    if (newStatus) {
                        connectionState = newStatus.connection?.state;
                    }
                    // Se ainda está "open" após logout, pode ser que a Evolution API esteja tentando conectar automaticamente
                    // Nesse caso, vamos aguardar mais tempo pelo QR code via webhook
                    if (connectionState === 'open') {
                        console.log(`[Evolution] WhatsApp Business: Status ainda 'open' após logout. Aguardando QR code via webhook (pode demorar mais)...`);
                        // Aguardar mais tempo para o QR code ser gerado
                        await new Promise(resolve => setTimeout(resolve, 10000));
                        // Verificar se o QR code chegou via webhook
                        const statusDocAfterLogout = await db.collection(`companies/${companyId}/integrations`).doc('whatsappEvolution').get();
                        const qrCodeAfterLogout = statusDocAfterLogout.data()?.qrCode;
                        if (qrCodeAfterLogout) {
                            console.log(`[Evolution] QR Code recebido via webhook após logout`);
                            return { status: 'pending_qr', qrCode: qrCodeAfterLogout };
                        }
                    }
                }
                catch (error) {
                    console.warn(`[Evolution] Erro ao fazer logout (continuando):`, error);
                }
            }
            // Se já está conectado E não é WhatsApp Business (ou está realmente conectado há tempo)
            if (connectionState === 'open' && !shouldForceQRCode) {
                // Verificar se realmente está conectado (aguardar um pouco para confirmar)
                await new Promise(resolve => setTimeout(resolve, 2000));
                const verifyStatus = await getEvolutionInstanceStatus(instanceName);
                if (verifyStatus?.connection?.state === 'open') {
                    await updateEvolutionStatus(companyId, {
                        status: 'connected',
                        qrCode: firestore_1.FieldValue.delete(),
                        lastConnectedAt: firestore_1.FieldValue.serverTimestamp(),
                    });
                    return { status: 'connected' };
                }
            }
            // Sempre tentar gerar QR Code para WhatsApp Business, ou se não está conectado
            if (shouldForceQRCode || connectionState === 'close' || !connectionState || connectionState === 'connecting') {
                // Verificar se o QR code já foi salvo via webhook
                const statusDoc = await db.collection(`companies/${companyId}/integrations`).doc('whatsappEvolution').get();
                const existingQrCode = statusDoc.data()?.qrCode;
                if (existingQrCode) {
                    console.log(`[Evolution] QR Code já disponível via webhook`);
                    return { status: 'pending_qr', qrCode: existingQrCode };
                }
                // Aguardar um pouco para o QR code ser gerado e enviado via webhook
                // Para WhatsApp Business, aguardar mais tempo pois pode demorar mais
                const waitTime = shouldForceQRCode ? 5000 : 3000;
                console.log(`[Evolution] Aguardando geração do QR Code para ${instanceName} (será enviado via webhook)...`, { waitTime, integrationType });
                await new Promise(resolve => setTimeout(resolve, waitTime));
                // Verificar novamente se o QR code chegou via webhook
                const statusDocAfterWait = await db.collection(`companies/${companyId}/integrations`).doc('whatsappEvolution').get();
                const qrCodeAfterWait = statusDocAfterWait.data()?.qrCode;
                if (qrCodeAfterWait) {
                    console.log(`[Evolution] QR Code recebido via webhook após aguardar`);
                    return { status: 'pending_qr', qrCode: qrCodeAfterWait };
                }
                // Tentar conectar para forçar geração do QR Code
                // O endpoint /instance/connect só aceita GET, não POST
                console.log(`[Evolution] Tentando conectar instância para gerar QR Code...`, { integrationType });
                const apiKeyForQR = getEvolutionApiKey();
                const apiUrlForQR = getEvolutionApiUrl();
                let connectResponse = await fetchWithSelfSignedCert(`${apiUrlForQR}/instance/connect/${instanceName}`, {
                    method: 'GET',
                    ...getFetchOptions(apiKeyForQR),
                });
                console.log(`[Evolution] Resposta do connect:`, {
                    status: connectResponse.status,
                    ok: connectResponse.ok,
                    integrationType
                });
                // Processar resposta
                if (!connectResponse.ok) {
                    const errorText = await connectResponse.text().catch(() => 'Erro desconhecido');
                    console.error(`[Evolution] Erro ao conectar instância: ${connectResponse.status} ${errorText}`);
                    // Continuar para tentar outras formas de obter QR code
                }
                else {
                    const testResult = await connectResponse.json().catch(() => ({}));
                    console.log(`[Evolution] Resposta do connect parseada:`, {
                        keys: Object.keys(testResult),
                        hasCount: 'count' in testResult,
                        count: testResult.count,
                        hasQrcode: !!testResult.qrcode,
                        integrationType
                    });
                    // Se retornar apenas {count: 0}, o QR code ainda não foi gerado
                    // Isso é normal - o QR code será enviado via webhook quando disponível
                    if (testResult && Object.keys(testResult).length === 1 && testResult.count === 0) {
                        console.log(`[Evolution] Resposta retornou count:0 - QR Code ainda não disponível. Aguardando webhook...`);
                        // Continuar para aguardar mais tempo e verificar webhook
                    }
                    else {
                        // Tem dados válidos, processar normalmente
                        const connectResult = testResult;
                        console.log(`[Evolution] Resposta do connect:`, {
                            keys: Object.keys(connectResult),
                            hasQrcode: !!connectResult.qrcode,
                            qrcodeKeys: connectResult.qrcode ? Object.keys(connectResult.qrcode) : [],
                        });
                        // Tentar obter QR Code em diferentes formatos
                        let qrCode = null;
                        if (connectResult.qrcode) {
                            qrCode = connectResult.qrcode.code ||
                                connectResult.qrcode.base64 ||
                                connectResult.qrcode.qr;
                        }
                        if (!qrCode) {
                            qrCode = connectResult.code || connectResult.base64 || connectResult.qr;
                        }
                        if (qrCode) {
                            // Adicionar prefixo data: se for base64 sem prefixo
                            if (qrCode && !qrCode.startsWith('data:') && !qrCode.startsWith('http')) {
                                qrCode = `data:image/png;base64,${qrCode}`;
                            }
                            await updateEvolutionStatus(companyId, {
                                status: 'pending_qr',
                                qrCode: qrCode,
                                qrCodeGeneratedAt: firestore_1.FieldValue.serverTimestamp(),
                            });
                            return { status: 'pending_qr', qrCode };
                        }
                    }
                }
                // O código acima já processou a resposta se tiver dados válidos
                // Se chegou aqui e retornou count:0, apenas aguardar webhook
                // Aguardar mais um pouco e verificar novamente o webhook
                // Para WhatsApp Business, aguardar muito mais tempo (pode demorar até 30 segundos)
                const secondWaitTime = shouldForceQRCode ? 20000 : 5000;
                console.log(`[Evolution] Aguardando mais ${secondWaitTime / 1000} segundos para QR Code via webhook...`, { integrationType });
                await new Promise(resolve => setTimeout(resolve, secondWaitTime));
                const finalStatusDoc = await db.collection(`companies/${companyId}/integrations`).doc('whatsappEvolution').get();
                const finalQrCode = finalStatusDoc.data()?.qrCode;
                if (finalQrCode) {
                    console.log(`[Evolution] QR Code recebido via webhook após segunda espera`);
                    return { status: 'pending_qr', qrCode: finalQrCode };
                }
            }
        }
        // Se não conseguiu obter QR Code, retornar erro
        const errorMessage = integrationType === 'WHATSAPP-BUSINESS'
            ? 'Não foi possível gerar QR Code para WhatsApp Business. Isso pode ocorrer se a Evolution API estiver tentando conectar automaticamente via token. Verifique se a Evolution API está configurada corretamente ou tente novamente em alguns instantes.'
            : 'Não foi possível gerar QR Code. Verifique se a Evolution API está rodando.';
        await updateEvolutionStatus(companyId, {
            status: 'error',
            lastError: errorMessage,
        });
        return {
            status: 'error',
            error: errorMessage,
        };
    }
    catch (error) {
        const message = error?.message || 'Erro desconhecido';
        console.error(`[Evolution] Erro ao iniciar pareamento`, error);
        await updateEvolutionStatus(companyId, {
            status: 'error',
            lastError: message,
        });
        return {
            status: 'error',
            error: message,
        };
    }
}
exports.startEvolutionPairing = startEvolutionPairing;
/**
 * Atualiza o status no Firestore
 */
async function updateEvolutionStatus(companyId, data) {
    try {
        await db
            .collection(`companies/${companyId}/integrations`)
            .doc('whatsappEvolution')
            .set({
            ...data,
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
        }, { merge: true });
    }
    catch (error) {
        console.warn(`[Evolution] Não foi possível atualizar status (${companyId}):`, error);
    }
}
/**
 * Envia mensagem de texto via Evolution API
 */
async function sendEvolutionTextMessage(params) {
    const { companyId, to, message } = params;
    const instanceName = `smartdoctor_${companyId}`;
    try {
        const apiKey = getEvolutionApiKey();
        const apiUrl = getEvolutionApiUrl();
        if (!apiKey || apiKey === '') {
            throw new Error('EVOLUTION_API_KEY não configurada. Configure no Firebase Console');
        }
        const response = await fetchWithSelfSignedCert(`${apiUrl}/message/sendText/${instanceName}`, {
            method: 'POST',
            ...getFetchOptions(apiKey, {
                number: to,
                text: message,
            }),
        });
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Erro ao enviar mensagem: ${response.status} ${errorText}`);
        }
        const result = (await response.json());
        return {
            messageId: result.key?.id || `evolution_${Date.now()}`,
            success: true,
        };
    }
    catch (error) {
        console.error(`[Evolution] Erro ao enviar mensagem`, error);
        throw error;
    }
}
exports.sendEvolutionTextMessage = sendEvolutionTextMessage;
//# sourceMappingURL=evolutionClient.js.map