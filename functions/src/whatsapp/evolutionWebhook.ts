import * as admin from 'firebase-admin';
import { onRequest } from 'firebase-functions/v2/https';
import { onCall } from 'firebase-functions/v2/https';
import { FieldValue } from 'firebase-admin/firestore';
import { getCompanySettings, normalizePhoneForContact } from './whatsappEnvio';
import { getStorage } from 'firebase-admin/storage';

// Funções helper para acessar secrets do Evolution API
function getEvolutionApiKey(): string {
  const env = process.env as any;
  return env['evolution-api-key'] || 
         env.EVOLUTION_API_KEY || 
         process.env.EVOLUTION_API_KEY || 
         '';
}

function getEvolutionApiUrl(): string {
  const env = process.env as any;
  return env['evolution-api-url'] || 
         env.EVOLUTION_API_URL || 
         process.env.EVOLUTION_API_URL || 
         'http://localhost:8080';
}

// Função helper para fazer fetch com suporte a certificados auto-assinados e timeout
async function fetchWithSelfSignedCert(url: string, options: RequestInit = {}, timeoutMs: number = 30000): Promise<Response> {
  const apiUrl = getEvolutionApiUrl();
  const isHttps = url.startsWith('https://') || apiUrl.startsWith('https://');
  
  // Criar AbortController para timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    // Adicionar signal ao options
    const fetchOptions: RequestInit = {
      ...options,
      signal: controller.signal,
    };
    
    // Se for HTTPS, usar variável de ambiente para aceitar certificados auto-assinados
    if (isHttps) {
      const originalRejectUnauthorized = process.env.NODE_TLS_REJECT_UNAUTHORIZED;
      try {
        // Desabilitar verificação de certificado temporariamente
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
        const response = await fetch(url, fetchOptions);
        clearTimeout(timeoutId);
        // Restaurar valor original
        if (originalRejectUnauthorized !== undefined) {
          process.env.NODE_TLS_REJECT_UNAUTHORIZED = originalRejectUnauthorized;
        } else {
          delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
        }
        return response;
      } catch (error: any) {
        clearTimeout(timeoutId);
        // Restaurar valor original em caso de erro
        if (originalRejectUnauthorized !== undefined) {
          process.env.NODE_TLS_REJECT_UNAUTHORIZED = originalRejectUnauthorized;
        } else {
          delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
        }
        if (error.name === 'AbortError') {
          throw new Error(`Timeout ao conectar com ${url} (${timeoutMs}ms)`);
        }
        throw error;
      }
    }
    
    // Para HTTP, usar fetch normal
    const response = await fetch(url, fetchOptions);
    clearTimeout(timeoutId);
    return response;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error(`Timeout ao conectar com ${url} (${timeoutMs}ms)`);
    }
    throw error;
  }
}

// Função helper para obter opções de fetch com suporte a certificados auto-assinados
function getFetchOptions(apiKey: string, body?: any): RequestInit {
  const options: RequestInit = {
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

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const storage = getStorage();

/**
 * Normaliza um número de telefone removendo caracteres não numéricos
 */
function normalizarTelefone(telefone: string | null | undefined): string | null {
  if (!telefone) return null;
  return telefone.replace(/\D/g, '');
}

/**
 * Gera todas as variantes de um número de telefone para busca
 */
function generatePhoneVariants(phoneNumber: string): Set<string> {
  const normalized = normalizarTelefone(phoneNumber);
  if (!normalized || normalized.length < 10) {
    return new Set();
  }

  const variants = new Set<string>();
  
  // Adicionar o número normalizado
  variants.add(normalized);
  
  // Com código do país 55
  if (!normalized.startsWith('55')) {
    variants.add(`55${normalized}`);
  } else {
    variants.add(normalized.slice(2)); // Sem o 55
  }
  
  // Com/sem o 9 (se tiver 13 dígitos com 55)
  if (normalized.length === 13 && normalized.startsWith('55')) {
    const without9 = normalized.slice(0, 4) + normalized.slice(5);
    variants.add(without9);
    variants.add(without9.slice(2)); // Sem o 55 também
  }

  return variants;
}

/**
 * Busca o companyId pelo número de telefone usando a collection whatsappPhoneNumbers
 * @param phoneNumber Número de telefone a buscar (pode estar em vários formatos)
 * @returns companyId se encontrado, null caso contrário
 */
async function findCompanyIdByPhoneNumber(phoneNumber: string | null | undefined): Promise<string | null> {
  if (!phoneNumber) {
    return null;
  }

  const normalizedSearch = normalizarTelefone(phoneNumber);
  if (!normalizedSearch || normalizedSearch.length < 10) {
    return null;
  }

  // Gerar variantes do número para busca
  const variants = generatePhoneVariants(phoneNumber);

  try {
    // Tentar buscar diretamente na collection whatsappPhoneNumbers usando as variantes
    for (const variant of Array.from(variants)) {
      try {
        const phoneDoc = await db.collection('whatsappPhoneNumbers').doc(variant).get();
        if (phoneDoc.exists) {
          const data = phoneDoc.data();
          if (data?.companyId) {
            console.log(`[Evolution Webhook] ✅ Empresa encontrada na collection whatsappPhoneNumbers: ${data.companyId} (${variant})`);
            return data.companyId as string;
          }
        }
      } catch (error) {
        // Continuar tentando outras variantes
        continue;
      }
    }

    // Fallback: buscar todas as empresas e verificar o telefoneSalao
    // (isso pode acontecer se a collection ainda não foi populada)
    console.log(`[Evolution Webhook] ⚠️  Número não encontrado na collection whatsappPhoneNumbers, buscando em todas as empresas...`);
    
    const companiesSnapshot = await db.collection('companies').get();
    
    for (const companyDoc of companiesSnapshot.docs) {
      const companyId = companyDoc.id;
      
      try {
        const settings = await getCompanySettings(companyId);
        const phoneNumber = settings.telefoneSalao;
        
        if (!phoneNumber) continue;
        
        const normalizedPhone = normalizarTelefone(phoneNumber);
        if (!normalizedPhone) continue;
        
        // Gerar variantes do número cadastrado
        const phoneVariants = generatePhoneVariants(phoneNumber);
        
        // Verificar se algum variant do número buscado corresponde a algum variant do número cadastrado
        for (const searchVariant of Array.from(variants)) {
          if (phoneVariants.has(searchVariant)) {
            console.log(`[Evolution Webhook] ✅ Empresa encontrada pelo número (fallback): ${companyId} (${phoneNumber})`);
            
            // Atualizar a collection whatsappPhoneNumbers para próxima vez
            await updateWhatsappPhoneNumberMapping(phoneNumber, companyId).catch(console.error);
            
            return companyId;
          }
        }
      } catch (error) {
        console.warn(`[Evolution Webhook] Erro ao verificar empresa ${companyId}:`, error);
        continue;
      }
    }
  } catch (error) {
    console.error('[Evolution Webhook] Erro ao buscar empresa pelo número:', error);
  }

  return null;
}

/**
 * Atualiza a collection whatsappPhoneNumbers com o mapeamento número -> companyId
 * Salva todas as variantes do número para facilitar a busca
 */
async function updateWhatsappPhoneNumberMapping(phoneNumber: string, companyId: string): Promise<void> {
  try {
    const normalized = normalizarTelefone(phoneNumber);
    if (!normalized || normalized.length < 10) {
      return;
    }

    const variants = generatePhoneVariants(phoneNumber);
    
    // Salvar todas as variantes apontando para o mesmo companyId
    const batch = db.batch();
    const timestamp = FieldValue.serverTimestamp();
    
    for (const variant of Array.from(variants)) {
      const phoneRef = db.collection('whatsappPhoneNumbers').doc(variant);
      batch.set(phoneRef, {
        companyId,
        phoneNumber: normalized, // Número principal normalizado
        originalPhoneNumber: phoneNumber, // Número original
        updatedAt: timestamp,
      }, { merge: true });
    }
    
    await batch.commit();
    console.log(`[Evolution Webhook] ✅ Mapeamento de telefone atualizado na collection whatsappPhoneNumbers: ${normalized} -> ${companyId}`);
  } catch (error) {
    console.error('[Evolution Webhook] Erro ao atualizar mapeamento de telefone:', error);
  }
}

/**
 * Consulta a API do Evolution para obter o número real do remetente de uma mensagem
 */
async function getParticipantFromEvolutionAPI(
  instanceName: string,
  messageId: string,
  remoteJid: string
): Promise<string | null> {
  try {
    const apiKey = getEvolutionApiKey();
    const apiUrl = getEvolutionApiUrl();
    
    if (!apiKey || !apiUrl) {
      return null;
    }

    // Tentar buscar informações da mensagem através da API
    // Algumas versões da Evolution API têm endpoints para buscar detalhes da mensagem
    const response = await fetchWithSelfSignedCert(`${apiUrl}/message/fetchMessages/${instanceName}`, {
      method: 'POST',
      ...getFetchOptions(apiKey, {
        remoteJid: remoteJid,
        id: messageId,
      }),
    });

    if (response.ok) {
      const data = await response.json() as any;
      // Tentar extrair o participant de diferentes formatos de resposta
      if (data?.participant) {
        const participantId = data.participant.split('@')[0] || '';
        const participantDigits = participantId.replace(/\D/g, '');
        if (participantDigits.length >= 10 && participantDigits.length <= 15) {
          console.log(`[Evolution Webhook] ✅ Participant obtido da API: ${participantId}`);
          return participantId;
        }
      }
    }
  } catch (error) {
    console.warn(`[Evolution Webhook] Erro ao consultar API para obter participant:`, error);
  }

  return null;
}

/**
 * Busca um número de telefone pelo nome do paciente na empresa
 * Nota: Esta é uma solução alternativa quando o Evolution API não fornece o participant
 * para mensagens de listas de transmissão (@lid). Veja: https://github.com/EvolutionAPI/evolution-api/issues/1585
 */
async function findPhoneByPatientName(companyId: string, patientName: string): Promise<string | null> {
  try {
    if (!patientName || !companyId) return null;

    // Normalizar o nome para busca (remover acentos, lowercase, etc)
    const normalizedName = patientName.toLowerCase().trim();

    // Buscar pacientes com nome similar (busca por prefixo)
    const patientsSnapshot = await db
      .collection(`companies/${companyId}/patients`)
      .where('nome', '>=', normalizedName)
      .where('nome', '<=', normalizedName + '\uf8ff')
      .limit(20)
      .get();

    if (!patientsSnapshot.empty) {
      // Primeiro, tentar match exato (case-insensitive)
      for (const doc of patientsSnapshot.docs) {
        const patientData = doc.data();
        const patientNome = (patientData?.nome || '').toLowerCase().trim();
        if (patientNome === normalizedName) {
          const phone = patientData?.telefoneE164;
          if (phone) {
            console.log(`[Evolution Webhook] ✅ Número encontrado pelo nome (match exato): ${phone} (${patientName})`);
            return phone as string;
          }
        }
      }

      // Se não encontrou match exato, tentar match parcial (contém o nome)
      for (const doc of patientsSnapshot.docs) {
        const patientData = doc.data();
        const patientNome = (patientData?.nome || '').toLowerCase().trim();
        // Verificar se o nome do paciente contém o pushName ou vice-versa
        if (patientNome.includes(normalizedName) || normalizedName.includes(patientNome)) {
          const phone = patientData?.telefoneE164;
          if (phone) {
            console.log(`[Evolution Webhook] ✅ Número encontrado pelo nome (match parcial): ${phone} (${patientName} -> ${patientData?.nome})`);
            return phone as string;
          }
        }
      }

      // Se encontrou apenas um paciente na busca, usar mesmo sem match exato
      if (patientsSnapshot.docs.length === 1) {
        const patientData = patientsSnapshot.docs[0].data();
        const phone = patientData?.telefoneE164;
        if (phone) {
          console.log(`[Evolution Webhook] ⚠️ Número encontrado (único resultado, sem match exato): ${phone} (${patientName} -> ${patientData?.nome})`);
          return phone as string;
        }
      }
    }

    console.warn(`[Evolution Webhook] ⚠️ Nenhum paciente encontrado com o nome: ${patientName}`);
    return null;
  } catch (error) {
    console.error(`[Evolution Webhook] Erro ao buscar telefone pelo nome ${patientName}:`, error);
    return null;
  }
}

/**
 * Baixa mídia da Evolution API e faz upload para o Firebase Storage
 */
async function downloadAndUploadMedia(
  instanceName: string,
  messageId: string,
  remoteJid: string,
  mediaType: 'image' | 'video' | 'audio' | 'document',
  companyId: string,
  chatId: string,
  mediaUrl?: string,
  mediaMimetype?: string,
  mediaSize?: number
): Promise<{ url: string; storagePath: string; mimetype?: string; size?: number } | null> {
  try {
    const apiUrl = getEvolutionApiUrl();
    const apiKey = getEvolutionApiKey();

    // Sempre usar o endpoint da Evolution API para baixar mídia
    // URLs do WhatsApp (mmg.whatsapp.net) não podem ser acessadas diretamente
    // Endpoint correto: POST /chat/getBase64FromMediaMessage/{instanceName}
    // Documentação: https://doc.evolution-api.com/
    const downloadUrl = `${apiUrl}/chat/getBase64FromMediaMessage/${instanceName}`;
    console.log(`[Evolution Webhook] 📥 Baixando mídia via Evolution API: ${mediaType} (${messageId})`, {
      downloadUrl,
      remoteJid,
      messageId,
      hasMediaUrl: !!mediaUrl,
      mediaUrl: mediaUrl?.substring(0, 100),
    });
    
    // O endpoint espera o payload no formato:
    // {
    //   "message": {
    //     "key": {
    //       "id": "messageId"
    //     }
    //   },
    //   "convertToMp4": false
    // }
    // Usar timeout de 15 segundos para download de mídia (reduzido para evitar bloqueios)
    const response = await fetchWithSelfSignedCert(
      downloadUrl,
      {
        method: 'POST',
        ...getFetchOptions(apiKey, {
          message: {
            key: {
              id: messageId,
            },
          },
          convertToMp4: false,
        }),
      },
      15000 // 15 segundos de timeout (reduzido para evitar bloqueios)
    );

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Não foi possível ler o erro');
      const isMessageNotFound = response.status === 400 && errorText.includes('Message not found');
      
      if (isMessageNotFound) {
        // Mensagem não encontrada é um caso esperado (pode ter sido deletada ou processada muito tarde)
        console.warn(`[Evolution Webhook] ⚠️ Mídia não encontrada na API (continuando sem mídia): ${mediaType} (${messageId})`, {
          mediaType,
          messageId,
          remoteJid,
          status: response.status,
        });
      } else {
        console.error(`[Evolution Webhook] ❌ Erro ao baixar mídia: ${response.status} ${response.statusText}`, {
          mediaType,
          messageId,
          remoteJid,
          downloadUrl,
          errorText: errorText.substring(0, 500),
          fullErrorText: errorText,
        });
      }
      return null;
    }
    
    console.log(`[Evolution Webhook] ✅ Resposta OK do endpoint: ${response.status}`);

    // O endpoint /chat/getBase64FromMediaMessage retorna JSON com base64
    // Verificar o content-type da resposta
    const responseContentType = response.headers.get('content-type') || '';
    console.log(`[Evolution Webhook] 📥 Content-Type da resposta: ${responseContentType}`);

    let mediaBuffer: Buffer;
    let contentType: string;
    let size: number | undefined;

    // O endpoint sempre retorna JSON com base64
    console.log(`[Evolution Webhook] 📥 Processando resposta JSON do endpoint getBase64FromMediaMessage...`);
    const jsonData = await response.json() as any;
    console.log(`[Evolution Webhook] 📥 Resposta JSON recebida, campos:`, Object.keys(jsonData));
    
    // O endpoint retorna base64 em diferentes campos possíveis
    // Tentar: base64, data, media, base64Data, etc.
    const base64Data = jsonData.base64 || jsonData.data || jsonData.media || jsonData.base64Data || jsonData.content;
    
    if (!base64Data || typeof base64Data !== 'string') {
      console.warn(`[Evolution Webhook] ⚠️ JSON recebido mas sem campo base64 válido. Campos disponíveis:`, Object.keys(jsonData));
      console.warn(`[Evolution Webhook] ⚠️ Resposta completa:`, JSON.stringify(jsonData).substring(0, 500));
      return null;
    }
    
    // Remover prefixo data: se houver (ex: "data:image/jpeg;base64,...")
    const base64Clean = base64Data.includes(',') 
      ? base64Data.split(',')[1] 
      : base64Data;
    
    try {
      mediaBuffer = Buffer.from(base64Clean, 'base64');
      contentType = jsonData.mimetype || jsonData.mimeType || jsonData.contentType || mediaMimetype || 
        (mediaType === 'image' ? 'image/jpeg' : 
         mediaType === 'video' ? 'video/mp4' : 
         mediaType === 'audio' ? 'audio/ogg' : 
         'application/octet-stream');
      size = mediaBuffer.length;
      console.log(`[Evolution Webhook] 📥 Mídia decodificada de base64: ${size} bytes, contentType: ${contentType}`);
    } catch (error: any) {
      console.error(`[Evolution Webhook] ❌ Erro ao decodificar base64:`, error?.message);
      return null;
    }

    // Validar se o buffer não está vazio
    if (!mediaBuffer || mediaBuffer.length === 0) {
      console.warn(`[Evolution Webhook] ⚠️ Buffer de mídia está vazio`);
      return null;
    }

    // Validar se é uma imagem válida verificando os primeiros bytes (magic numbers)
    if (mediaType === 'image') {
      const firstBytes = mediaBuffer.slice(0, 4);
      const isValidImage = 
        firstBytes[0] === 0xFF && firstBytes[1] === 0xD8 && firstBytes[2] === 0xFF || // JPEG
        firstBytes[0] === 0x89 && firstBytes[1] === 0x50 && firstBytes[2] === 0x4E && firstBytes[3] === 0x47 || // PNG
        firstBytes[0] === 0x47 && firstBytes[1] === 0x49 && firstBytes[2] === 0x46; // GIF
      
      if (!isValidImage) {
        console.warn(`[Evolution Webhook] ⚠️ Buffer não parece ser uma imagem válida. Primeiros bytes:`, Array.from(firstBytes).map(b => `0x${b.toString(16)}`).join(' '));
        // Ainda assim, tentar salvar - pode ser um formato diferente
      }
    }

    // Determinar extensão do arquivo baseado no tipo de conteúdo
    let extension = 'bin';
    if (contentType.includes('image')) {
      if (contentType.includes('jpeg') || contentType.includes('jpg')) extension = 'jpg';
      else if (contentType.includes('png')) extension = 'png';
      else if (contentType.includes('gif')) extension = 'gif';
      else if (contentType.includes('webp')) extension = 'webp';
      else extension = 'jpg';
    } else if (contentType.includes('video')) {
      if (contentType.includes('mp4')) extension = 'mp4';
      else if (contentType.includes('webm')) extension = 'webm';
      else if (contentType.includes('quicktime')) extension = 'mov';
      else extension = 'mp4';
    } else if (contentType.includes('audio')) {
      if (contentType.includes('ogg')) extension = 'ogg';
      else if (contentType.includes('mp3')) extension = 'mp3';
      else if (contentType.includes('mpeg')) extension = 'mp3';
      else if (contentType.includes('wav')) extension = 'wav';
      else if (contentType.includes('aac')) extension = 'aac';
      else extension = 'ogg';
    } else if (contentType.includes('pdf')) {
      extension = 'pdf';
    } else if (contentType.includes('document') || contentType.includes('application')) {
      // Tentar extrair extensão do content-type
      const match = contentType.match(/\/(\w+)/);
      if (match && match[1] !== 'octet-stream') {
        extension = match[1];
      }
    }

    // Criar caminho no Storage
    const timestamp = Date.now();
    const fileName = `${messageId}-${timestamp}.${extension}`;
    const storagePath = `companies/${companyId}/whatsappMessages/${chatId}/${fileName}`;
    
    // Fazer upload para o Firebase Storage
    const bucket = storage.bucket();
    const file = bucket.file(storagePath);

    console.log(`[Evolution Webhook] 📤 Fazendo upload para Storage:`, {
      storagePath,
      contentType,
      size: mediaBuffer.length,
      bucketName: bucket.name,
    });

    // Salvar o arquivo com as opções corretas
    await file.save(mediaBuffer, {
      metadata: {
        contentType: contentType,
        cacheControl: 'public, max-age=31536000',
        metadata: {
          messageId: messageId,
          remoteJid: remoteJid,
          mediaType: mediaType,
          uploadedAt: new Date().toISOString(),
        },
      },
      resumable: false, // Upload não resumável para arquivos menores
    });

    // Tornar o arquivo público
    try {
      await file.makePublic();
      console.log(`[Evolution Webhook] ✅ Arquivo tornado público`);
    } catch (error: any) {
      console.warn(`[Evolution Webhook] ⚠️ Erro ao tornar arquivo público:`, error?.message);
      // Continuar mesmo se não conseguir tornar público - pode usar URL assinada
    }

    // Obter URL pública (ou gerar URL assinada se não for público)
    let url: string;
    try {
      // Tentar obter URL pública primeiro
      url = `https://storage.googleapis.com/${bucket.name}/${encodeURIComponent(storagePath)}`;
      // Verificar se o arquivo existe e está acessível
      const [exists] = await file.exists();
      if (!exists) {
        throw new Error('Arquivo não existe após upload');
      }
    } catch (error: any) {
      console.warn(`[Evolution Webhook] ⚠️ Erro ao obter URL pública, gerando URL assinada:`, error?.message);
      // Gerar URL assinada válida por 1 ano
      const [signedUrl] = await file.getSignedUrl({
        action: 'read',
        expires: Date.now() + 365 * 24 * 60 * 60 * 1000, // 1 ano
      });
      url = signedUrl;
    }

    console.log(`[Evolution Webhook] ✅ Mídia salva no Storage: ${storagePath} (${size ? `${(size / 1024).toFixed(2)} KB` : 'tamanho desconhecido'})`);

    return {
      url,
      storagePath,
      mimetype: contentType,
      size,
    };
  } catch (error: any) {
    const errorMessage = error?.message || String(error);
    const isNetworkError = errorMessage.includes('fetch failed') || 
                          errorMessage.includes('Timeout') ||
                          errorMessage.includes('ECONNREFUSED') ||
                          errorMessage.includes('ENOTFOUND') ||
                          errorMessage.includes('ETIMEDOUT');
    
    if (isNetworkError) {
      console.warn(`[Evolution Webhook] ⚠️ Erro de conexão ao baixar mídia (continuando sem mídia):`, {
        error: errorMessage,
        mediaType,
        messageId,
        remoteJid,
        instanceName,
        downloadUrl: `${getEvolutionApiUrl()}/chat/getBase64FromMediaMessage/${instanceName}`,
      });
    } else {
      console.error(`[Evolution Webhook] ❌ Erro ao baixar/fazer upload de mídia:`, {
        error: errorMessage,
        stack: error?.stack?.substring(0, 500),
        mediaType,
        messageId,
        remoteJid,
        instanceName,
        companyId,
        chatId,
        hasMediaUrl: !!mediaUrl,
      });
    }
    return null;
  }
}

/**
 * Busca um paciente pelo número de telefone na empresa
 */
async function findPatientNameByPhone(companyId: string, phoneNumber: string): Promise<string | null> {
  try {
    if (!phoneNumber || !companyId) return null;

    const normalizedPhone = normalizarTelefone(phoneNumber);
    if (!normalizedPhone) return null;

    // Gerar variantes do número para busca
    const variants = [
      normalizedPhone,
      normalizedPhone.startsWith('55') ? normalizedPhone.slice(2) : `55${normalizedPhone}`,
      normalizedPhone.length === 13 && normalizedPhone.startsWith('55')
        ? normalizedPhone.slice(0, 4) + normalizedPhone.slice(5)
        : null,
    ].filter(Boolean) as string[];

    // Buscar paciente na coleção de pacientes da empresa
    const patientsSnapshot = await db
      .collection(`companies/${companyId}/patients`)
      .where('telefoneE164', 'in', variants)
      .limit(1)
      .get();

    if (!patientsSnapshot.empty) {
      const patientData = patientsSnapshot.docs[0].data();
      const patientName = patientData?.nome;
      if (patientName) {
        return patientName as string;
      }
    }

    return null;
  } catch (error) {
    console.error(`[Evolution Webhook] Erro ao buscar paciente para ${phoneNumber}:`, error);
    return null;
  }
}

/**
 * Busca todos os contatos via Evolution API
 * A API retorna todos os contatos de uma vez
 */
async function fetchAllContacts(instanceName: string): Promise<Map<string, { profilePicUrl?: string; pushName?: string }>> {
  const contactsMap = new Map<string, { profilePicUrl?: string; pushName?: string }>();
  
  try {
    const apiKey = getEvolutionApiKey();
    const apiUrl = getEvolutionApiUrl();
    
    if (!apiKey || !apiUrl || !instanceName) {
      console.warn(`[Evolution Sync] ⚠️ Credenciais não configuradas para buscar contatos`);
      return contactsMap;
    }

    console.log(`[Evolution Sync] 🔍 Buscando todos os contatos via API...`);
    
    // Buscar todos os contatos (sem enviar remoteJid, a API retorna todos)
    const response = await fetchWithSelfSignedCert(`${apiUrl}/chat/findContacts/${instanceName}`, {
      method: 'POST',
      ...getFetchOptions(apiKey, {}), // Sem remoteJid para buscar todos
    }, 30000); // 30 segundos de timeout

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Não foi possível ler o erro');
      console.warn(`[Evolution Sync] ⚠️ Erro ao buscar contatos: ${response.status} ${response.statusText}`, {
        errorText: errorText.substring(0, 200),
      });
      return contactsMap;
    }

    const data = await response.json() as any;
    
    // A API pode retornar um array de contatos ou um objeto com array
    let contacts: any[] = [];
    
    console.log(`[Evolution Sync] 🔍 Estrutura da resposta da API:`, {
      isArray: Array.isArray(data),
      keys: data && typeof data === 'object' ? Object.keys(data) : [],
      sample: data && typeof data === 'object' ? JSON.stringify(data).substring(0, 300) : 'N/A',
    });
    
    if (Array.isArray(data)) {
      contacts = data;
    } else if (data?.contacts && Array.isArray(data.contacts)) {
      contacts = data.contacts;
    } else if (data?.data && Array.isArray(data.data)) {
      contacts = data.data;
    } else if (data && typeof data === 'object') {
      // Se for um único objeto, transformar em array
      contacts = [data];
    }
    
    console.log(`[Evolution Sync] 📋 Total de contatos extraídos: ${contacts.length}`);
    
    // Criar mapa de contatos por remoteJid
    let contactsWithPhotos = 0;
    for (const contact of contacts) {
      if (!contact.remoteJid) {
        console.warn(`[Evolution Sync] ⚠️ Contato sem remoteJid:`, {
          keys: Object.keys(contact),
          id: contact.id,
        });
        continue;
      }
      
      const remoteJid = contact.remoteJid;
      const profilePicUrl = contact.profilePicUrl || contact.imgUrl || undefined;
      
      if (profilePicUrl) {
        contactsWithPhotos++;
      }
      
      contactsMap.set(remoteJid, {
        profilePicUrl: profilePicUrl,
        pushName: contact.pushName || undefined,
      });
    }
    
    console.log(`[Evolution Sync] ✅ ${contactsMap.size} contato(s) carregado(s) no cache (${contactsWithPhotos} com foto)`);
    
    // Log de exemplo de alguns contatos para debug
    if (contactsMap.size > 0) {
      const sampleEntries = Array.from(contactsMap.entries()).slice(0, 3);
      console.log(`[Evolution Sync] 📋 Exemplo de contatos no cache:`, sampleEntries.map(([jid, data]) => ({
        remoteJid: jid,
        hasPhoto: !!data.profilePicUrl,
        photoLength: data.profilePicUrl?.length || 0,
      })));
    }
    
    return contactsMap;
  } catch (error: any) {
    const errorMessage = error?.message || String(error);
    const isNetworkError = errorMessage.includes('fetch failed') || 
                          errorMessage.includes('Timeout') ||
                          errorMessage.includes('ECONNREFUSED') ||
                          errorMessage.includes('ENOTFOUND') ||
                          errorMessage.includes('ETIMEDOUT');
    
    if (isNetworkError) {
      console.warn(`[Evolution Sync] ⚠️ Erro de conexão ao buscar contatos (continuando sem cache):`, {
        error: errorMessage,
        instanceName,
      });
    } else {
      console.error(`[Evolution Sync] ❌ Erro ao buscar contatos:`, {
        error: errorMessage,
        instanceName,
      });
    }
    return contactsMap;
  }
}

interface EvolutionMessage {
  key: {
    id: string;
    remoteJid: string;
    remoteJidAlt?: string; // Número alternativo quando remoteJid termina com @lid
    senderLid?: string; // LID do remetente quando remoteJid é o número normal (ex: 162457154768938@lid)
    fromMe: boolean;
  };
  message?: {
    conversation?: string;
    extendedTextMessage?: {
      text: string;
    };
    imageMessage?: {
      caption?: string;
      url?: string;
      mimetype?: string;
      fileLength?: number;
    };
    videoMessage?: {
      caption?: string;
      url?: string;
      mimetype?: string;
      fileLength?: number;
    };
    audioMessage?: {
      mimetype?: string;
      url?: string;
      fileLength?: number;
    };
    documentMessage?: {
      fileName?: string;
      mimetype?: string;
      url?: string;
      fileLength?: number;
    };
  };
  messageTimestamp?: number | any;
  pushName?: string;
  participant?: string;
  senderPn?: string; // Número do remetente quando remoteJid termina com @lid (Evolution API 2.3.0+)
}

interface EvolutionContact {
  id?: string;
  notify?: string;
  verifiedName?: string;
  imgUrl?: string;
}

interface EvolutionWebhookPayload {
  event: 'messages.upsert' | 'connection.update' | 'qrcode.updated' | 'contacts.update' | 'chats.upsert';
  instance: string;
  data?: {
    messages?: EvolutionMessage[];
    connection?: {
      state?: 'open' | 'close' | 'connecting';
    };
    qrcode?: {
      code?: string;
      base64?: string;
      count?: number;
    };
    contacts?: EvolutionContact[];
    // Quando messages.upsert envia mensagem única, os dados vêm diretamente em data
    key?: {
      id: string;
      remoteJid: string;
      senderLid?: string;
      fromMe: boolean;
    };
    message?: EvolutionMessage['message'];
    messageTimestamp?: number | any;
    pushName?: string;
    participant?: string;
    messageType?: string;
    instanceId?: string;
    source?: string;
  } | EvolutionMessage;
  // Algumas versões da Evolution API podem enviar messages diretamente no payload
  messages?: EvolutionMessage[];
}

function companyStatusDoc(companyId: string) {
  return db
    .collection(`companies/${companyId}/integrations`)
    .doc('whatsappEvolution');
}

async function updateStatus(companyId: string, data: Record<string, unknown>) {
  try {
    await companyStatusDoc(companyId).set(
      {
        ...data,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  } catch (error) {
    console.warn(`[Evolution Webhook] Erro ao atualizar status (${companyId}):`, error);
  }
}

async function handleMessage(companyId: string | null, message: EvolutionMessage, instanceName?: string) {
  try {
    const wamId = message.key.id;
    if (!wamId) {
      console.warn(`[Evolution Webhook] Mensagem sem ID`);
      return;
    }

    // Não ignorar mensagens próprias - podem ter sido enviadas de outro dispositivo
    // e precisam ser salvas para histórico completo

    // Ignorar mensagens de status
    if (message.key.remoteJid === 'status@broadcast') {
      console.log(`[Evolution Webhook] Ignorando mensagem de status: ${wamId}`);
      return;
    }

    // Extrair chat_id do remoteJid
    const remoteJid = message.key.remoteJid || '';
    let rawChatId = remoteJid.split('@')[0] || '';
    
    // Se for uma mensagem ENVIADA (fromMe: true) com remoteJid sendo LID, buscar o número real pelo senderLid salvo no contato
    if (message.key.fromMe && remoteJid.includes('@lid') && companyId) {
      console.log(`[Evolution Webhook] 🔍 Mensagem enviada com LID, buscando número real no contato... remoteJid: ${remoteJid}`);
      
      // Tentar buscar contato pelo senderLid (LID completo)
      // O senderLid foi salvo no contato quando recebemos uma mensagem deste número
      try {
        const contactsRef = db.collection(`companies/${companyId}/whatsappContacts`);
        const contactsSnapshot = await contactsRef.where('senderLid', '==', remoteJid).limit(1).get();
        
        if (!contactsSnapshot.empty) {
          const contactDoc = contactsSnapshot.docs[0];
          const contactData = contactDoc.data();
          const waId = contactData?.wa_id;
          
          if (waId) {
            console.log(`[Evolution Webhook] ✅ Número encontrado pelo senderLid salvo no contato: ${waId} (LID: ${remoteJid})`);
            rawChatId = waId;
          } else {
            console.warn(`[Evolution Webhook] ⚠️ Contato encontrado pelo senderLid mas sem wa_id: ${remoteJid}`);
          }
        } else {
          console.log(`[Evolution Webhook] ⚠️ Contato não encontrado pelo senderLid: ${remoteJid}. A mensagem será salva com o LID como chat_id.`);
          // Se não encontrar, vamos usar o próprio LID como chat_id temporariamente
          // Isso pode acontecer se a mensagem foi enviada antes de receber qualquer mensagem deste contato
        }
      } catch (error: any) {
        console.warn(`[Evolution Webhook] ⚠️ Erro ao buscar contato pelo senderLid: ${error?.message || error}`);
      }
    }
    
    // Se for uma lista de transmissão (@lid) ou grupo (@g.us)
    if (remoteJid.includes('@lid') || remoteJid.includes('@g.us')) {
      // Prioridade 1: Se remoteJid termina com @lid, usar remoteJidAlt se disponível
      if (remoteJid.includes('@lid') && message.key.remoteJidAlt) {
        const remoteJidAlt = message.key.remoteJidAlt;
        const remoteJidAltId = remoteJidAlt.split('@')[0] || '';
        const remoteJidAltDigits = remoteJidAltId.replace(/\D/g, '');
        
        if (remoteJidAltDigits.length >= 10 && remoteJidAltDigits.length <= 15) {
          console.log(`[Evolution Webhook] ✅ Usando remoteJidAlt como número real: ${remoteJidAltId} (remoteJid era: ${remoteJid})`);
          rawChatId = remoteJidAltId;
        } else {
          console.warn(`[Evolution Webhook] ⚠️ remoteJidAlt inválido (${remoteJidAltDigits.length} dígitos): ${remoteJidAltId}`);
        }
      }
      
      // Prioridade 2: Usar senderPn (Evolution API 2.3.0+) - número do remetente quando remoteJid termina com @lid
      if ((!rawChatId || rawChatId === remoteJid.split('@')[0]) && message.senderPn) {
        const senderPnDigits = message.senderPn.replace(/\D/g, '');
        if (senderPnDigits.length >= 10 && senderPnDigits.length <= 15) {
          console.log(`[Evolution Webhook] ✅ Usando senderPn como número real: ${message.senderPn} (remoteJid era: ${remoteJid})`);
          rawChatId = message.senderPn;
        } else {
          console.warn(`[Evolution Webhook] ⚠️ senderPn inválido (${senderPnDigits.length} dígitos): ${message.senderPn}`);
        }
      }
      
      // Prioridade 3: Se não tiver senderPn, tentar usar participant
      if (!rawChatId || rawChatId === remoteJid.split('@')[0]) {
        if (message.participant) {
          const participantId = message.participant.split('@')[0] || '';
          const participantDigits = participantId.replace(/\D/g, '');
          
          // Validar se o participant é um número válido
          if (participantDigits.length >= 10 && participantDigits.length <= 15) {
            console.log(`[Evolution Webhook] ✅ Usando participant como número real: ${participantId} (remoteJid era: ${remoteJid})`);
            rawChatId = participantId;
          }
        }
      }
      
      // Prioridade 4: Se ainda não tiver número, tentar consultar a API do Evolution
      if (!rawChatId || rawChatId === remoteJid.split('@')[0]) {
        if (instanceName) {
          console.log(`[Evolution Webhook] ⚠️ Sem senderPn/participant, consultando API do Evolution para obter número real...`);
          const participantFromAPI = await getParticipantFromEvolutionAPI(instanceName, wamId, remoteJid);
          if (participantFromAPI) {
            rawChatId = participantFromAPI;
            console.log(`[Evolution Webhook] ✅ Número obtido da API do Evolution: ${rawChatId}`);
          }
        }
      }
      
      // Prioridade 5: Se ainda não tiver número, tentar buscar pelo pushName
      if (!rawChatId || rawChatId === remoteJid.split('@')[0]) {
        if (message.pushName && companyId) {
          console.log(`[Evolution Webhook] ⚠️ Sem senderPn/participant/API, tentando buscar número pelo pushName: ${message.pushName}`);
          const phoneFromName = await findPhoneByPatientName(companyId, message.pushName);
          if (phoneFromName) {
            rawChatId = phoneFromName;
            console.log(`[Evolution Webhook] ✅ Número encontrado pelo pushName: ${rawChatId}`);
          } else {
            console.warn(`[Evolution Webhook] ⚠️ Mensagem de lista/grupo sem número identificável: ${wamId}, remoteJid: ${remoteJid}, pushName: ${message.pushName}, senderPn: ${message.senderPn || 'N/A'}, participant: ${message.participant || 'N/A'}`);
            return;
          }
        } else {
          console.warn(`[Evolution Webhook] ⚠️ Mensagem de lista/grupo sem número identificável e sem pushName: ${wamId}, remoteJid: ${remoteJid}, senderPn: ${message.senderPn || 'N/A'}, participant: ${message.participant || 'N/A'}`);
          return;
        }
      }
    } else if (!remoteJid.endsWith('@s.whatsapp.net') && !remoteJid.endsWith('@c.us')) {
      // Se não for mensagem individual nem lista/grupo conhecido, ignorar
      console.log(`[Evolution Webhook] Ignorando mensagem de tipo desconhecido: ${wamId}, remoteJid: ${remoteJid}`);
      return;
    }

    // Validar se é um número de telefone válido (apenas dígitos, entre 10 e 15 caracteres)
    const digitsOnly = rawChatId.replace(/\D/g, '');
    
    // Se o rawChatId ainda é um LID (não foi convertido para número), tentar buscar uma última vez
    if ((digitsOnly.length < 10 || digitsOnly.length > 15) && remoteJid.includes('@lid') && message.key.fromMe && companyId) {
      console.warn(`[Evolution Webhook] ⚠️ Mensagem enviada com LID mas número real não encontrado. Tentando buscar contato pelo número enviado...`);
      
      // Se for mensagem enviada com LID e não encontramos o número, a mensagem pode não ser salva
      // Mas vamos logar para debug
      console.warn(`[Evolution Webhook] ⚠️ Não foi possível identificar o número real para mensagem enviada com LID: ${remoteJid}. Mensagem não será salva.`);
      return;
    }
    
    if (!rawChatId) {
      console.warn(`[Evolution Webhook] Mensagem sem chat_id`);
      return;
    }

    if (digitsOnly.length < 10 || digitsOnly.length > 15) {
      console.warn(`[Evolution Webhook] chat_id não é um número de telefone válido: ${rawChatId} (${digitsOnly.length} dígitos)`);
      return;
    }
    
    // Validar se não é um ID de lista muito óbvio (mais de 15 dígitos ou padrões muito estranhos)
    // Números de telefone válidos têm entre 10 e 15 dígitos
    // IDs de lista podem ter padrões muito diferentes, mas vamos aceitar números válidos
    // mesmo que venham com @lid, desde que tenham formato de telefone
    
    // Normalizar para formato consistente (sempre com 9 para números brasileiros)
    const chatId = normalizePhoneForContact(rawChatId);

    // Se não tiver companyId, tentar buscar pelo número da instância
    if (!companyId && instanceName) {
      // Tentar extrair número do instance name ou buscar na Evolution API
      // Por enquanto, vamos tentar buscar pelo número que pode estar no instance name
      // ou usar uma busca alternativa
      console.log(`[Evolution Webhook] Tentando buscar empresa pelo instance name: ${instanceName}`);
      
      // Se o instance name contém um número, tentar buscar por ele
      const numberMatch = instanceName.match(/\d+/);
      if (numberMatch) {
        const possibleNumber = numberMatch[0];
        companyId = await findCompanyIdByPhoneNumber(possibleNumber);
      }
    }

    // Se ainda não tiver companyId, não podemos processar
    if (!companyId) {
      console.warn(`[Evolution Webhook] Não foi possível identificar a empresa para a mensagem ${wamId}`);
      return;
    }

    // Verificar se mensagem já existe (deduplicação)
    const messageRef = db.collection(`companies/${companyId}/whatsappMessages`).doc(wamId);
    const messageDoc = await messageRef.get();
    let existingMessageSource: 'automatic' | 'manual' | undefined = undefined;
    
    if (messageDoc.exists) {
      const existingData = messageDoc.data();
      existingMessageSource = existingData?.messageSource;
      // Se a mensagem já existe e tem messageSource, preservar e não sobrescrever
      if (existingMessageSource) {
        console.log(`[Evolution Webhook] Mensagem já existe com messageSource=${existingMessageSource}, preservando (${companyId}): ${wamId}`);
        return;
      }
      // Se existe mas não tem messageSource, vamos atualizar apenas campos que faltam
      console.log(`[Evolution Webhook] Mensagem já existe sem messageSource, atualizando campos faltantes (${companyId}): ${wamId}`);
    }

    // Extrair conteúdo da mensagem e processar mídias
    let messageText = '';
    let messageType = 'text';
    let mediaInfo: { url: string; storagePath: string; mimetype?: string; size?: number } | null = null;
    
    // Log detalhado da estrutura da mensagem para debug
    console.log(`[Evolution Webhook] 🔍 Analisando mensagem (${wamId}):`, {
      hasMessage: !!message.message,
      messageKeys: message.message ? Object.keys(message.message) : [],
      instanceName: instanceName || 'N/A',
      companyId: companyId || 'N/A',
    });
    
    if (message.message) {
      if (message.message.conversation) {
        messageText = message.message.conversation;
        messageType = 'text';
      } else if (message.message.extendedTextMessage?.text) {
        messageText = message.message.extendedTextMessage.text;
        messageType = 'text';
      } else if (message.message.imageMessage) {
        console.log(`[Evolution Webhook] 🖼️ Mensagem de imagem detectada:`, {
          hasUrl: !!message.message.imageMessage.url,
          url: message.message.imageMessage.url?.substring(0, 100),
          mimetype: message.message.imageMessage.mimetype,
          fileLength: message.message.imageMessage.fileLength,
          caption: message.message.imageMessage.caption,
        });
        messageText = message.message.imageMessage.caption || '';
        messageType = 'image';
        // Baixar e fazer upload da imagem
        if (instanceName && companyId) {
          console.log(`[Evolution Webhook] 📥 Iniciando download de imagem...`);
          try {
            mediaInfo = await downloadAndUploadMedia(
              instanceName,
              wamId,
              remoteJid,
              'image',
              companyId,
              chatId,
              message.message.imageMessage.url,
              message.message.imageMessage.mimetype,
              message.message.imageMessage.fileLength
            );
            console.log(`[Evolution Webhook] 📥 Resultado do download de imagem:`, mediaInfo ? '✅ Sucesso' : '❌ Falhou');
          } catch (mediaError: any) {
            console.error(`[Evolution Webhook] ❌ Erro ao baixar imagem (continuando sem mídia):`, mediaError?.message || mediaError);
            mediaInfo = null; // Garantir que seja null em caso de erro
          }
        } else {
          console.warn(`[Evolution Webhook] ⚠️ Não foi possível baixar imagem: instanceName=${instanceName}, companyId=${companyId}`);
        }
      } else if (message.message.videoMessage) {
        console.log(`[Evolution Webhook] 🎥 Mensagem de vídeo detectada:`, {
          hasUrl: !!message.message.videoMessage.url,
          url: message.message.videoMessage.url?.substring(0, 100),
          mimetype: message.message.videoMessage.mimetype,
          fileLength: message.message.videoMessage.fileLength,
          caption: message.message.videoMessage.caption,
        });
        messageText = message.message.videoMessage.caption || '';
        messageType = 'video';
        // Baixar e fazer upload do vídeo
        if (instanceName && companyId) {
          console.log(`[Evolution Webhook] 📥 Iniciando download de vídeo...`);
          try {
            mediaInfo = await downloadAndUploadMedia(
              instanceName,
              wamId,
              remoteJid,
              'video',
              companyId,
              chatId,
              message.message.videoMessage.url,
              message.message.videoMessage.mimetype,
              message.message.videoMessage.fileLength
            );
            console.log(`[Evolution Webhook] 📥 Resultado do download de vídeo:`, mediaInfo ? '✅ Sucesso' : '❌ Falhou');
          } catch (mediaError: any) {
            console.error(`[Evolution Webhook] ❌ Erro ao baixar vídeo (continuando sem mídia):`, mediaError?.message || mediaError);
            mediaInfo = null; // Garantir que seja null em caso de erro
          }
        } else {
          console.warn(`[Evolution Webhook] ⚠️ Não foi possível baixar vídeo: instanceName=${instanceName}, companyId=${companyId}`);
        }
      } else if (message.message.audioMessage) {
        console.log(`[Evolution Webhook] 🎵 Mensagem de áudio detectada:`, {
          hasUrl: !!message.message.audioMessage.url,
          url: message.message.audioMessage.url?.substring(0, 100),
          mimetype: message.message.audioMessage.mimetype,
          fileLength: message.message.audioMessage.fileLength,
        });
        messageType = 'audio';
        // Baixar e fazer upload do áudio
        if (instanceName && companyId) {
          console.log(`[Evolution Webhook] 📥 Iniciando download de áudio...`);
          try {
            mediaInfo = await downloadAndUploadMedia(
              instanceName,
              wamId,
              remoteJid,
              'audio',
              companyId,
              chatId,
              message.message.audioMessage.url,
              message.message.audioMessage.mimetype,
              message.message.audioMessage.fileLength
            );
            console.log(`[Evolution Webhook] 📥 Resultado do download de áudio:`, mediaInfo ? '✅ Sucesso' : '❌ Falhou');
          } catch (mediaError: any) {
            console.error(`[Evolution Webhook] ❌ Erro ao baixar áudio (continuando sem mídia):`, mediaError?.message || mediaError);
            mediaInfo = null; // Garantir que seja null em caso de erro
          }
        } else {
          console.warn(`[Evolution Webhook] ⚠️ Não foi possível baixar áudio: instanceName=${instanceName}, companyId=${companyId}`);
        }
      } else if (message.message.documentMessage) {
        console.log(`[Evolution Webhook] 📄 Mensagem de documento detectada:`, {
          hasUrl: !!message.message.documentMessage.url,
          url: message.message.documentMessage.url?.substring(0, 100),
          mimetype: message.message.documentMessage.mimetype,
          fileLength: message.message.documentMessage.fileLength,
          fileName: message.message.documentMessage.fileName,
        });
        messageText = message.message.documentMessage.fileName || '';
        messageType = 'document';
        // Baixar e fazer upload do documento
        if (instanceName && companyId) {
          console.log(`[Evolution Webhook] 📥 Iniciando download de documento...`);
          try {
            mediaInfo = await downloadAndUploadMedia(
              instanceName,
              wamId,
              remoteJid,
              'document',
              companyId,
              chatId,
              message.message.documentMessage.url,
              message.message.documentMessage.mimetype,
              message.message.documentMessage.fileLength
            );
            console.log(`[Evolution Webhook] 📥 Resultado do download de documento:`, mediaInfo ? '✅ Sucesso' : '❌ Falhou');
          } catch (mediaError: any) {
            console.error(`[Evolution Webhook] ❌ Erro ao baixar documento (continuando sem mídia):`, mediaError?.message || mediaError);
            mediaInfo = null; // Garantir que seja null em caso de erro
          }
        } else {
          console.warn(`[Evolution Webhook] ⚠️ Não foi possível baixar documento: instanceName=${instanceName}, companyId=${companyId}`);
        }
      } else {
        messageType = Object.keys(message.message)[0] || 'unknown';
        console.log(`[Evolution Webhook] ⚠️ Tipo de mensagem desconhecido: ${messageType}`);
      }
    } else {
      console.warn(`[Evolution Webhook] ⚠️ Mensagem sem campo 'message':`, { wamId, remoteJid });
    }

    // Extrair timestamp
    const timestampValue = message.messageTimestamp 
      ? (typeof message.messageTimestamp === 'number' 
          ? message.messageTimestamp 
          : Number(message.messageTimestamp))
      : Date.now() / 1000;
    const messageTimestamp = new Date(timestampValue * 1000);

    console.log(`[Evolution Webhook] 🎯 Processando mensagem de terceiro (${companyId}):`, {
      wamId,
      chatId,
      remoteJid: message.key.remoteJid,
      senderPn: message.senderPn || 'N/A',
      participant: message.participant || 'N/A',
      fromMe: message.key.fromMe,
      pushName: message.pushName,
      type: messageType,
      text: messageText.substring(0, 50),
      hasMedia: !!mediaInfo,
      mediaUrl: mediaInfo?.url?.substring(0, 100),
    });

    // Buscar nome do paciente pelo número de telefone
    const patientName = await findPatientNameByPhone(companyId, chatId);

    // Determinar direção da mensagem
    const direction = message.key.fromMe ? 'outbound' : 'inbound';

    // Salvar mensagem no Firestore
    const messageData: any = {
      wam_id: wamId,
      message: {
        id: wamId,
        to: chatId,
        type: messageType,
      },
      chat_id: chatId,
      companyId,
      direction: direction,
      provider: 'evolution',
      fromMe: message.key.fromMe || false,
      createdAt: FieldValue.serverTimestamp(),
      messageTimestamp: admin.firestore.Timestamp.fromDate(messageTimestamp),
      pushName: message.pushName || null,
      participant: message.participant || null,
    };

    // Adicionar texto apenas se houver (não usar undefined)
    if (messageText && messageText.trim()) {
      messageData.message.text = { body: messageText };
    }

    // Adicionar informações de mídia se disponível
    if (mediaInfo) {
      console.log(`[Evolution Webhook] ✅ Adicionando informações de mídia à mensagem:`, {
        url: mediaInfo.url.substring(0, 100),
        storagePath: mediaInfo.storagePath,
        mimetype: mediaInfo.mimetype,
        size: mediaInfo.size,
      });
      messageData.mediaUrl = mediaInfo.url;
      messageData.mediaStoragePath = mediaInfo.storagePath;
      messageData.mediaMimetype = mediaInfo.mimetype;
      messageData.mediaSize = mediaInfo.size;
      
      // Adicionar também no objeto message para compatibilidade
      if (messageData.message) {
        messageData.message.mediaUrl = mediaInfo.url;
        messageData.message.mediaStoragePath = mediaInfo.storagePath;
        messageData.message.mimetype = mediaInfo.mimetype;
        messageData.message.size = mediaInfo.size;
      }
    } else if (messageType !== 'text' && messageType !== 'unknown') {
      // Se é uma mensagem de mídia mas não conseguiu baixar, ainda salvar a mensagem
      console.warn(`[Evolution Webhook] ⚠️ Mensagem de mídia (${messageType}) não foi baixada, mas salvando mensagem mesmo assim`);
      // Adicionar flag indicando que a mídia não foi baixada
      messageData.mediaDownloadFailed = true;
      messageData.mediaDownloadError = 'Mídia não disponível na API do Evolution';
    }

    // Preservar messageSource apenas se já existir (mensagens enviadas manualmente)
    // Mensagens recebidas via webhook não devem ter messageSource definido
    if (existingMessageSource) {
      messageData.messageSource = existingMessageSource;
    }
    // Não definir messageSource para mensagens do webhook (nem automatic nem manual)

    console.log(`[Evolution Webhook] 💾 Salvando mensagem no Firestore (${companyId}):`, {
      wamId,
      chatId,
      messageType,
      hasMedia: !!mediaInfo,
      willSave: true,
    });

    await messageRef.set(messageData, { merge: true });

    // Verificar se foi salvo corretamente
    const savedDoc = await messageRef.get();
    if (savedDoc.exists) {
      const savedData = savedDoc.data();
      console.log(`[Evolution Webhook] ✅ Mensagem salva no Firestore (${companyId}):`, {
        wamId,
        chatId,
        messageSource: savedData?.messageSource,
        direction: savedData?.direction,
        fromMe: savedData?.fromMe,
      });
    } else {
      console.error(`[Evolution Webhook] ⚠️ Mensagem não foi salva no Firestore (${companyId}):`, { wamId, chatId });
    }

    // Preparar dados da última mensagem para salvar no contato
    const lastMessage: any = {
      wam_id: wamId,
      text: messageText || null,
      type: messageType,
      direction: direction,
      fromMe: message.key.fromMe || false,
      timestamp: admin.firestore.Timestamp.fromDate(messageTimestamp),
      createdAt: FieldValue.serverTimestamp(),
    };

    // Adicionar informações de mídia se disponível
    if (mediaInfo) {
      lastMessage.mediaUrl = mediaInfo.url;
      lastMessage.mediaMimetype = mediaInfo.mimetype;
      lastMessage.mediaSize = mediaInfo.size;
    }

    // Salvar/atualizar contato na collection whatsappContacts
    const contactData: any = {
      wa_id: chatId,
      remoteJid: remoteJid, // Salvar remoteJid para facilitar busca de foto durante sincronização
      last_message_at: FieldValue.serverTimestamp(),
      last_message: lastMessage, // Salvar última mensagem diretamente no contato
      updatedAt: FieldValue.serverTimestamp(),
      companyId,
    };

    // IMPORTANTE: Sempre salvar pushName da mensagem no contato (independente de fromMe)
    // O pushName da mensagem é mais confiável que o da API
    if (message.pushName) {
      contactData.pushName = message.pushName;
    }

    // Salvar senderLid no contato quando receber mensagem (fromMe: false) com senderLid
    // Isso permite vincular o LID ao número de telefone para mensagens futuras
    if (!message.key.fromMe && message.key.senderLid) {
      contactData.senderLid = message.key.senderLid;
      console.log(`[Evolution Webhook] 💾 Salvando senderLid no contato: ${message.key.senderLid} -> ${chatId}`);
    }

    // Se encontrou o paciente, adicionar o nome ao contato
    if (patientName) {
      // Verificar se o nome contém "Letícia Massoterapeuta" ou similar (pode ser um erro)
      if (patientName.toLowerCase().includes('letícia') || patientName.toLowerCase().includes('leticia') || patientName.toLowerCase().includes('massoterapeuta')) {
        console.warn(`[Evolution Webhook] ⚠️ ATENÇÃO: Nome do paciente contém "Letícia" ou "Massoterapeuta": ${patientName} para chatId ${chatId}. Não usando este nome.`);
        // Não usar este nome, deixar vazio ou usar profile_name se disponível
      } else {
        contactData.name = patientName;
        contactData.patientName = patientName; // Campo adicional para compatibilidade
      }
    }

    // IMPORTANTE: Não usar pushName quando fromMe: true para definir o nome do contato
    // Quando fromMe: true, a mensagem foi ENVIADA pela empresa, então:
    // - O chatId é o número do DESTINATÁRIO (quem recebeu a mensagem)
    // - O pushName é o nome do DESTINATÁRIO no WhatsApp da empresa
    // - Não devemos usar esse pushName para definir o nome do contato (name)
    // MAS ainda salvamos o pushName no campo pushName para referência
    if (!patientName && message.pushName && !message.key.fromMe) {
      // Só usar pushName como nome (name) se a mensagem NÃO foi enviada pela empresa (fromMe: false)
      // Nesse caso, pushName é o nome do remetente
      console.log(`[Evolution Webhook] Usando pushName como nome do contato: ${message.pushName} (fromMe: ${message.key.fromMe})`);
      contactData.name = message.pushName;
    } else if (!patientName && message.pushName && message.key.fromMe) {
      console.log(`[Evolution Webhook] ⚠️ Ignorando pushName para nome porque fromMe: true. pushName=${message.pushName}, chatId=${chatId}`);
      // Não definir name quando fromMe: true e não tem patientName
      // O nome será definido apenas se encontrar o paciente no banco
    }

    console.log(`[Evolution Webhook] Salvando contato: wa_id=${chatId}, name=${contactData.name || 'N/A'}, patientName=${contactData.patientName || 'N/A'}, pushName=${contactData.pushName || 'N/A'}, fromMe=${message.key.fromMe}, hasLastMessage=${!!contactData.last_message}`);
    
    await db.collection(`companies/${companyId}/whatsappContacts`).doc(chatId).set(contactData, { merge: true });
    console.log(`[Evolution Webhook] ✅ Contato salvo/atualizado (${companyId}): ${chatId}`);

    // Foto do contato será atualizada apenas durante a sincronização manual
    // Não atualizar foto automaticamente no webhook para evitar fotos incorretas
  } catch (error) {
    console.error(`[Evolution Webhook] Erro ao processar mensagem (${companyId || 'unknown'}):`, error);
  }
}

/**
 * Processa atualizações de contatos do WhatsApp
 */
async function handleContactsUpdate(companyId: string | null, contacts: EvolutionContact[]): Promise<void> {
  if (!companyId || !contacts || contacts.length === 0) {
    return;
  }

  try {
    const batch = db.batch();
    let updatedCount = 0;

    for (const contact of contacts) {
      if (!contact.id) {
        continue;
      }

      // Normalizar o ID do contato (remover @s.whatsapp.net se presente)
      const rawChatId = contact.id.replace('@s.whatsapp.net', '').replace('@c.us', '');
      
      // Normalizar para formato consistente (sempre com 9 para números brasileiros)
      const chatId = normalizePhoneForContact(rawChatId);
      
      const contactRef = db.collection(`companies/${companyId}/whatsappContacts`).doc(chatId);
      
      const contactData: any = {
        wa_id: chatId,
        updatedAt: FieldValue.serverTimestamp(),
        companyId,
      };

      // Atualizar nome se fornecido
      if (contact.notify) {
        contactData.name = contact.notify;
      }

      // Atualizar nome verificado se fornecido
      if (contact.verifiedName) {
        contactData.verifiedName = contact.verifiedName;
        // Se não tiver nome, usar o nome verificado
        if (!contactData.name) {
          contactData.name = contact.verifiedName;
        }
      }

      // Atualizar foto se fornecido
      if (contact.imgUrl) {
        contactData.imgUrl = contact.imgUrl;
      }

      batch.set(contactRef, contactData, { merge: true });
      updatedCount++;
    }

    if (updatedCount > 0) {
      await batch.commit();
      console.log(`[Evolution Webhook] ✅ ${updatedCount} contato(s) atualizado(s) (${companyId})`);
    }
  } catch (error) {
    console.error(`[Evolution Webhook] Erro ao processar atualização de contatos (${companyId || 'unknown'}):`, error);
  }
}

/**
 * Processa atualizações de chats do WhatsApp
 */
async function handleChatsUpsert(companyId: string | null, chats: any[]): Promise<void> {
  if (!companyId || !chats || chats.length === 0) {
    return;
  }

  try {
    const batch = db.batch();
    let updatedCount = 0;

    for (const chat of chats) {
      if (!chat.remoteJid) {
        continue;
      }

      // Extrair chat_id do remoteJid
      const remoteJid = chat.remoteJid;
      let rawChatId = remoteJid.split('@')[0] || '';
      
      // Ignorar grupos e listas de transmissão (já são tratados em handleMessage)
      if (remoteJid.includes('@g.us') || remoteJid.includes('@lid') || remoteJid.includes('@broadcast')) {
        continue;
      }

      // Validar se é um número de telefone válido
      const digitsOnly = rawChatId.replace(/\D/g, '');
      if (digitsOnly.length < 10 || digitsOnly.length > 15) {
        continue;
      }

      // Normalizar para formato consistente
      const chatId = normalizePhoneForContact(rawChatId);
      
      const chatRef = db.collection(`companies/${companyId}/whatsappContacts`).doc(chatId);
      
      const chatData: any = {
        wa_id: chatId,
        updatedAt: FieldValue.serverTimestamp(),
        companyId,
      };

      // Atualizar número de mensagens não lidas se fornecido
      if (typeof chat.unreadMessages === 'number') {
        chatData.unreadMessages = chat.unreadMessages;
      }

      // Atualizar last_message_at se houver mensagens não lidas
      if (chat.unreadMessages > 0) {
        chatData.last_message_at = FieldValue.serverTimestamp();
      }

      batch.set(chatRef, chatData, { merge: true });
      updatedCount++;
    }

    if (updatedCount > 0) {
      await batch.commit();
      console.log(`[Evolution Webhook] ✅ ${updatedCount} chat(s) atualizado(s) (${companyId})`);
    }
  } catch (error) {
    console.error(`[Evolution Webhook] Erro ao processar atualização de chats (${companyId || 'unknown'}):`, error);
  }
}

async function processEvolutionWebhook(payload: EvolutionWebhookPayload): Promise<{ companyId: string | null; processed: boolean }> {
  try {
    const instanceName = payload.instance;
    if (!instanceName) {
      console.warn(`[Evolution Webhook] Instance name não fornecido`);
      return { companyId: null, processed: false };
    }

    let companyId: string | null = null;

    // Tentar 1: Extrair companyId do instanceName (formato: smartdoctor_{companyId})
    if (instanceName.startsWith('smartdoctor_')) {
      companyId = instanceName.replace('smartdoctor_', '');
      console.log(`[Evolution Webhook] CompanyId extraído do instance name: ${companyId}`);
    } else {
      // Tentar 2: Buscar empresa pelo número de telefone cadastrado em settings/general.telefoneSalao
      // Para isso, precisamos obter o número da instância da Evolution API
      console.log(`[Evolution Webhook] Instance name não segue padrão smartdoctor_, tentando buscar pelo número...`);
      
      // Tentar buscar o número da instância na Evolution API
      const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || 'http://localhost:8080';
      const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || '';
      
      try {
        const instanceResponse = await fetchWithSelfSignedCert(`${EVOLUTION_API_URL}/instance/fetchInstances`, {
          method: 'GET',
          ...getFetchOptions(EVOLUTION_API_KEY),
        });

        if (instanceResponse.ok) {
          const instances = (await instanceResponse.json()) as any[];
          const instance = instances?.find((inst: any) => inst.instance?.instanceName === instanceName);
          
          if (instance?.instance?.owner) {
            // O owner pode conter o número de telefone
            const phoneNumber = instance.instance.owner;
            companyId = await findCompanyIdByPhoneNumber(phoneNumber);
            if (companyId) {
              console.log(`[Evolution Webhook] ✅ Empresa encontrada pelo número da instância: ${companyId}`);
            }
          }
        }
      } catch (error) {
        console.warn(`[Evolution Webhook] Erro ao buscar número da instância na Evolution API:`, error);
      }

      // Se ainda não encontrou, tentar extrair número do instance name
      if (!companyId) {
        const numberMatch = instanceName.match(/\d+/);
        if (numberMatch) {
          const possibleNumber = numberMatch[0];
          companyId = await findCompanyIdByPhoneNumber(possibleNumber);
          if (companyId) {
            console.log(`[Evolution Webhook] ✅ Empresa encontrada pelo número extraído do instance name: ${companyId}`);
          }
        }
      }
    }

    // Processar evento
    if (payload.event === 'messages.upsert') {
      // A Evolution API pode enviar mensagens de duas formas:
      // 1. Array de mensagens em payload.data.messages
      // 2. Dados da mensagem diretamente em payload.data (estrutura atual)
      let messages: EvolutionMessage[] = [];
      
      if (payload.data && typeof payload.data === 'object' && 'messages' in payload.data && Array.isArray((payload.data as any).messages)) {
        // Formato 1: Array de mensagens
        messages = (payload.data as any).messages;
      } else if (payload.data && typeof payload.data === 'object' && 'key' in payload.data) {
        // Formato 2: Mensagem única diretamente em data
        messages = [payload.data as EvolutionMessage];
      } else if ((payload as any).messages && Array.isArray((payload as any).messages)) {
        // Formato alternativo: messages diretamente no payload
        messages = (payload as any).messages;
      }
      
        if (messages.length > 0) {
          // Extrair senderPn das mensagens para log
          const senderPns = messages.map(m => m.senderPn || 'N/A').filter(p => p !== 'N/A');
          const senderPnLog = senderPns.length > 0 ? senderPns.join(', ') : 'N/A';
          
          console.log(`[Evolution Webhook] 🔔 Webhook recebido: ${payload.event} (${companyId || 'empresa não identificada'}), ${messages.length} mensagem(ns), senderPn: ${senderPnLog}`);
          
          // Processar mensagens de forma assíncrona (não aguardar)
          const processMessages = async () => {
            for (const message of messages) {
              try {
                console.log(`[Evolution Webhook] 📨 Processando mensagem individual:`, {
                  wamId: message.key?.id,
                  instanceName: instanceName || 'N/A',
                  companyId: companyId || 'N/A',
                });
                await handleMessage(companyId, message, instanceName);
              } catch (error) {
                console.error(`[Evolution Webhook] Erro ao processar mensagem do webhook (${companyId || 'unknown'}):`, error);
              }
            }
          };
          
          // Iniciar processamento assíncrono (não aguardar)
          processMessages().catch((error) => {
            console.error(`[Evolution Webhook] Erro no processamento assíncrono de mensagens (${companyId || 'unknown'}):`, error);
          });
        
        return { companyId, processed: true };
      } else {
        console.log(`[Evolution Webhook] ⚠️  Evento messages.upsert recebido mas sem mensagens válidas (${companyId || 'unknown'})`);
        return { companyId, processed: false };
      }
    }

    if (payload.event === 'connection.update' && payload.data && typeof payload.data === 'object' && 'connection' in payload.data) {
      const connectionState = (payload.data as any).connection?.state;
      const lastDisconnectReason = (payload.data as any).connection?.lastDisconnect?.error?.message || 
                                   (payload.data as any).connection?.lastDisconnect?.error?.toString() ||
                                   (payload.data as any).connection?.lastDisconnect?.reason ||
                                   null;
      console.log(`[Evolution Webhook] 🔄 Webhook connection.update (${companyId || 'unknown'}): ${connectionState}`, {
        lastDisconnectReason,
        connection: (payload.data as any).connection,
      });

      if (companyId) {
        if (connectionState === 'open') {
          // WhatsApp conectado com sucesso
          updateStatus(companyId, {
            status: 'connected',
            qrCode: FieldValue.delete(),
            lastConnectedAt: FieldValue.serverTimestamp(),
            lastError: FieldValue.delete(),
            lastDisconnectReason: FieldValue.delete(),
          }).catch(console.error);
          console.log(`[Evolution Webhook] ✅ Status atualizado para 'connected' (${companyId})`);
        } else if (connectionState === 'close') {
          // WhatsApp desconectado
          const updateData: any = {
            status: 'disconnected',
            lastDisconnectAt: FieldValue.serverTimestamp(),
            qrCode: FieldValue.delete(), // Limpar QR code quando desconectar
          };
          
          if (lastDisconnectReason) {
            updateData.lastDisconnectReason = lastDisconnectReason;
          }
          
          updateStatus(companyId, updateData).catch(console.error);
          console.log(`[Evolution Webhook] ⚠️ Status atualizado para 'disconnected' (${companyId})`, {
            reason: lastDisconnectReason,
          });
        } else if (connectionState === 'connecting') {
          // WhatsApp está tentando conectar
          updateStatus(companyId, {
            status: 'initializing',
            // Não limpar QR code ainda, pode estar aguardando
          }).catch(console.error);
          console.log(`[Evolution Webhook] 🔄 Status atualizado para 'initializing' (${companyId})`);
        }
      }

      return { companyId, processed: true };
    }

    if (payload.event === 'qrcode.updated' && payload.data && typeof payload.data === 'object' && 'qrcode' in payload.data) {
      const qrCode = (payload.data as any).qrcode?.code || (payload.data as any).qrcode?.base64;
      console.log(`[Evolution Webhook] 📱 Webhook qrcode.updated (${companyId || 'unknown'})`);

      if (qrCode && companyId) {
        updateStatus(companyId, {
          status: 'pending_qr',
          qrCode: qrCode,
          qrCodeGeneratedAt: FieldValue.serverTimestamp(), // Usar nome consistente com o frontend
        }).catch(console.error);
        console.log(`[Evolution Webhook] 📱 QR Code atualizado e timestamp salvo (${companyId})`);
      }

      return { companyId, processed: true };
    }

    if (payload.event === 'contacts.update' && payload.data && typeof payload.data === 'object' && 'contacts' in payload.data) {
      const contacts = (payload.data as any).contacts;
      if (Array.isArray(contacts)) {
        console.log(`[Evolution Webhook] 👥 Webhook contacts.update (${companyId || 'unknown'}), ${contacts.length} contato(s)`);
        await handleContactsUpdate(companyId, contacts);
      }
      
      return { companyId, processed: true };
    }

    return { companyId, processed: false };
  } catch (error) {
    console.error('[Evolution Webhook] Erro ao processar webhook:', error);
    return { companyId: null, processed: false };
  }
}

/**
 * Webhook para receber eventos da Evolution API (versão com companyId no path)
 * 
 * URL: /evolutionWebhook/{companyId}
 * 
 * A Evolution API envia eventos quando há:
 * - Novas mensagens recebidas
 * - Atualizações de conexão
 * - QR codes atualizados
 */
export const evolutionWebhook = onRequest({ 
  region: 'us-central1',
  memory: '512MiB', // Aumentado para melhor processamento de mídia
  timeoutSeconds: 60, // Timeout de 60 segundos
  maxInstances: 40, // Limitar concorrência para evitar esgotamento de instâncias
  cors: true,
  secrets: ['evolution-api-key', 'evolution-api-url'],
}, async (req, res) => {
  try {
    // Verificar método HTTP
    if (req.method !== 'POST') {
      res.status(405).send('Method Not Allowed');
      return;
    }

    const payload = req.body as EvolutionWebhookPayload;

    // Log completo do payload recebido
    console.log('[Evolution Webhook] 📥 Payload completo recebido:', JSON.stringify(payload, null, 2));

    // Extrair companyId do path (se disponível)
    // Path pode ser: /evolutionWebhook/{companyId} ou apenas /{companyId}
    // O Firebase Functions pode remover o prefixo da função do path
    const pathParts = req.path.split('/').filter(Boolean);
    let companyIdFromPath: string | null = null;
    
    // Tentar encontrar companyId no path
    const webhookIndex = pathParts.indexOf('evolutionWebhook');
    if (webhookIndex !== -1 && pathParts.length > webhookIndex + 1) {
      // Path tem formato: /evolutionWebhook/{companyId}
      companyIdFromPath = pathParts[webhookIndex + 1];
      console.log(`[Evolution Webhook] CompanyId extraído do path (com evolutionWebhook): ${companyIdFromPath}`);
    } else if (pathParts.length > 0) {
      // Path pode ser apenas /{companyId} (Firebase Functions remove o prefixo)
      // Pegar o último segmento do path como companyId
      const lastPart = pathParts[pathParts.length - 1];
      // Verificar se não é um caminho conhecido (como 'health', 'favicon.ico', etc)
      if (lastPart && !lastPart.includes('.') && lastPart.length > 5) {
        companyIdFromPath = lastPart;
        console.log(`[Evolution Webhook] CompanyId extraído do path (sem evolutionWebhook): ${companyIdFromPath}`);
      }
    }

    // Remover prefixo do projeto se presente (ex: agendamentointeligente_zBcnXoogl5sJUKIcbZFb -> zBcnXoogl5sJUKIcbZFb)
    if (companyIdFromPath && companyIdFromPath.includes('_')) {
      const parts = companyIdFromPath.split('_');
      // Se tiver mais de uma parte, remover a primeira (prefixo do projeto)
      // O companyId real geralmente vem depois do primeiro underscore
      if (parts.length > 1) {
        // Pegar tudo depois do primeiro underscore como companyId
        companyIdFromPath = parts.slice(1).join('_');
        console.log(`[Evolution Webhook] Prefixo do projeto removido, companyId: ${companyIdFromPath}`);
      }
    }

    // Log do webhook recebido
    const dataAny = payload.data as any;
    console.log('[Evolution Webhook] Webhook recebido:', {
      event: payload.event,
      instance: payload.instance,
      hasData: !!payload.data,
      hasMessages: !!(dataAny?.messages),
      messagesLength: Array.isArray(dataAny?.messages) ? dataAny.messages.length : (dataAny?.key ? 1 : 0),
      dataKeys: payload.data ? Object.keys(payload.data) : [],
      companyIdFromPath,
      path: req.path,
    });

    // Se tiver companyId no path, usar diretamente
    let companyId: string | null = companyIdFromPath;
    let processed = false;

    if (companyId) {
      // Processar diretamente com o companyId do path
      if (payload.event === 'messages.upsert') {
        // A Evolution API pode enviar mensagens de duas formas:
        // 1. Array de mensagens em payload.data.messages
        // 2. Dados da mensagem diretamente em payload.data (estrutura atual)
        let messages: EvolutionMessage[] = [];
        
      if (payload.data && typeof payload.data === 'object' && 'messages' in payload.data && Array.isArray((payload.data as any).messages)) {
        // Formato 1: Array de mensagens
        messages = (payload.data as any).messages;
      } else if (payload.data && typeof payload.data === 'object' && 'key' in payload.data) {
        // Formato 2: Mensagem única diretamente em data
        messages = [payload.data as EvolutionMessage];
      } else if ((payload as any).messages && Array.isArray((payload as any).messages)) {
        // Formato alternativo: messages diretamente no payload
        messages = (payload as any).messages;
      }
        
        if (messages.length > 0) {
          console.log(`[Evolution Webhook] 🔔 Webhook recebido: ${payload.event} (${companyId}), ${messages.length} mensagem(ns)`);
          
          // Processar mensagens de forma assíncrona após responder ao webhook
          // Isso evita que a função fique bloqueada esperando o processamento
          const processMessages = async () => {
            for (const message of messages) {
              try {
                await handleMessage(companyId, message, payload.instance);
              } catch (error) {
                console.error(`[Evolution Webhook] Erro ao processar mensagem do webhook (${companyId}):`, error);
              }
            }
          };
          
          // Iniciar processamento assíncrono (não aguardar)
          processMessages().catch((error) => {
            console.error(`[Evolution Webhook] Erro no processamento assíncrono de mensagens (${companyId}):`, error);
          });
          
          processed = true;
        } else {
          console.log(`[Evolution Webhook] ⚠️  Evento messages.upsert recebido mas sem mensagens válidas (${companyId})`);
        }
      } else if (payload.event === 'connection.update' && payload.data && typeof payload.data === 'object' && 'connection' in payload.data) {
        const connectionState = (payload.data as any).connection?.state;
        const lastDisconnectReason = (payload.data as any).connection?.lastDisconnect?.error?.message || 
                                     (payload.data as any).connection?.lastDisconnect?.error?.toString() ||
                                     (payload.data as any).connection?.lastDisconnect?.reason ||
                                     null;
        console.log(`[Evolution Webhook] 🔄 Webhook connection.update (${companyId}): ${connectionState}`, {
          lastDisconnectReason,
          connection: (payload.data as any).connection,
        });

        if (companyId) {
          // Processar atualização de status de forma assíncrona para não bloquear
          (async () => {
            try {
              if (connectionState === 'open') {
                // WhatsApp conectado com sucesso
                await updateStatus(companyId, {
                  status: 'connected',
                  qrCode: FieldValue.delete(),
                  lastConnectedAt: FieldValue.serverTimestamp(),
                  lastError: FieldValue.delete(),
                  lastDisconnectReason: FieldValue.delete(),
                });
                console.log(`[Evolution Webhook] ✅ Status atualizado para 'connected' (${companyId})`);
              } else if (connectionState === 'close') {
                // WhatsApp desconectado
                const updateData: any = {
                  status: 'disconnected',
                  lastDisconnectAt: FieldValue.serverTimestamp(),
                  qrCode: FieldValue.delete(), // Limpar QR code quando desconectar
                };
                
                if (lastDisconnectReason) {
                  updateData.lastDisconnectReason = lastDisconnectReason;
                }
                
                await updateStatus(companyId, updateData);
                console.log(`[Evolution Webhook] ⚠️ Status atualizado para 'disconnected' (${companyId})`, {
                  reason: lastDisconnectReason,
                });
              } else if (connectionState === 'connecting') {
                // WhatsApp está tentando conectar
                await updateStatus(companyId, {
                  status: 'initializing',
                  // Não limpar QR code ainda, pode estar aguardando
                });
                console.log(`[Evolution Webhook] 🔄 Status atualizado para 'initializing' (${companyId})`);
              }
            } catch (error) {
              console.error(`[Evolution Webhook] Erro ao atualizar status (${companyId}):`, error);
            }
          })();
        }

        processed = true;
      } else if (payload.event === 'qrcode.updated' && payload.data && typeof payload.data === 'object' && 'qrcode' in payload.data) {
        const qrCode = (payload.data as any).qrcode?.code || (payload.data as any).qrcode?.base64;
        console.log(`[Evolution Webhook] 📱 Webhook qrcode.updated (${companyId})`);

        if (qrCode && companyId) {
          // Processar atualização de QR code de forma assíncrona para não bloquear
          updateStatus(companyId, {
            status: 'pending_qr',
            qrCode: qrCode,
            qrCodeGeneratedAt: FieldValue.serverTimestamp(), // Usar nome consistente com o frontend
          }).catch((error) => {
            console.error(`[Evolution Webhook] Erro ao atualizar QR code (${companyId}):`, error);
          });
          console.log(`[Evolution Webhook] 📱 QR Code atualizado e timestamp salvo (${companyId})`);
        }

        processed = true;
      } else if (payload.event === 'contacts.update' && payload.data && typeof payload.data === 'object' && 'contacts' in payload.data) {
        const contacts = (payload.data as any).contacts;
        if (Array.isArray(contacts)) {
          console.log(`[Evolution Webhook] 👥 Webhook contacts.update (${companyId}), ${contacts.length} contato(s)`);
          // Processar de forma assíncrona para não bloquear
          handleContactsUpdate(companyId, contacts).catch((error) => {
            console.error(`[Evolution Webhook] Erro ao processar contacts.update (${companyId}):`, error);
          });
        }
        
        processed = true;
      } else if (payload.event === 'chats.upsert' && payload.data && Array.isArray(payload.data)) {
        console.log(`[Evolution Webhook] 💬 Webhook chats.upsert (${companyId}), ${payload.data.length} chat(s)`);
        // Processar de forma assíncrona para não bloquear
        handleChatsUpsert(companyId, payload.data).catch((error) => {
          console.error(`[Evolution Webhook] Erro ao processar chats.upsert (${companyId}):`, error);
        });
        
        processed = true;
      }
    } else {
      // Fallback: processar sem companyId (busca pelo número)
      const result = await processEvolutionWebhook(payload);
      companyId = result.companyId;
      processed = result.processed;
    }

    if (processed && companyId) {
      console.log(`[Evolution Webhook] ✅ Webhook processado com sucesso (${companyId})`);
      res.status(200).json({ success: true, companyId });
    } else if (processed) {
      console.log('[Evolution Webhook] ⚠️  Webhook processado mas sem companyId');
      res.status(200).json({ success: true, message: 'Processed but no companyId' });
    } else {
      console.log('[Evolution Webhook] ⏭️  Webhook ignorado (evento não suportado)');
      res.status(200).json({ success: true, message: 'Event ignored' });
    }
  } catch (error) {
    console.error('[Evolution Webhook] Erro ao processar webhook:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Erro desconhecido' 
    });
  }
});

/**
 * Busca mensagens de um contato via Evolution API
 */
async function fetchMessagesFromAPI(
  instanceName: string,
  remoteJid: string,
  page: number = 1,
  offset: number = 10
): Promise<EvolutionMessage[]> {
  try {
    const apiKey = getEvolutionApiKey();
    const apiUrl = getEvolutionApiUrl();
    
    if (!apiKey || !apiUrl || !instanceName || !remoteJid) {
      return [];
    }

    console.log(`[Evolution Sync] 🔍 Buscando mensagens via API: ${remoteJid} (page: ${page}, offset: ${offset})`);
    
    const response = await fetchWithSelfSignedCert(`${apiUrl}/chat/findMessages/${instanceName}`, {
      method: 'POST',
      ...getFetchOptions(apiKey, {
        where: {
          key: {
            remoteJid: remoteJid,
          },
        },
        page: page,
        offset: offset,
      }),
    }, 30000); // 30 segundos de timeout

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Não foi possível ler o erro');
      console.warn(`[Evolution Sync] ⚠️ Erro ao buscar mensagens: ${response.status} ${response.statusText}`, {
        remoteJid,
        errorText: errorText.substring(0, 200),
      });
      return [];
    }

    const data = await response.json() as any;
    
    // A API retorna: { messages: { total, pages, currentPage, records: [...] } }
    // Ou pode retornar diretamente um array de mensagens
    let messages: any[] = [];
    
    if (Array.isArray(data)) {
      // Se for um array direto
      messages = data;
    } else if (data?.messages?.records && Array.isArray(data.messages.records)) {
      // Estrutura padrão: { messages: { records: [...] } }
      messages = data.messages.records;
      console.log(`[Evolution Sync] 📋 Total de mensagens: ${data.messages.total}, página: ${data.messages.currentPage}/${data.messages.pages}`);
    } else if (data?.messages && Array.isArray(data.messages)) {
      // Se for um objeto com propriedade messages (array)
      messages = data.messages;
    } else if (data?.data && Array.isArray(data.data)) {
      // Se for um objeto com propriedade data
      messages = data.data;
    } else if (data && typeof data === 'object' && (data.key || data.message)) {
      // Se for um único objeto de mensagem, transformar em array
      messages = [data];
    }
    
    console.log(`[Evolution Sync] ✅ Mensagens obtidas: ${messages.length} mensagem(ns) para ${remoteJid}`);

    return messages as EvolutionMessage[];
  } catch (error: any) {
    const errorMessage = error?.message || String(error);
    const isNetworkError = errorMessage.includes('fetch failed') || 
                          errorMessage.includes('Timeout') ||
                          errorMessage.includes('ECONNREFUSED') ||
                          errorMessage.includes('ENOTFOUND') ||
                          errorMessage.includes('ETIMEDOUT');
    
    if (isNetworkError) {
      console.warn(`[Evolution Sync] ⚠️ Erro de conexão ao buscar mensagens (continuando):`, {
        error: errorMessage,
        remoteJid,
        instanceName,
      });
    } else {
      console.error(`[Evolution Sync] ❌ Erro ao buscar mensagens:`, {
        error: errorMessage,
        remoteJid,
        instanceName,
      });
    }
    return [];
  }
}

/**
 * Sincroniza todas as últimas mensagens e fotos dos contatos de uma empresa
 */
export const syncWhatsAppContacts = onCall({ 
  region: 'us-central1',
  memory: '1GiB',
  timeoutSeconds: 540, // 9 minutos (máximo para Firebase Functions)
  maxInstances: 10,
  secrets: ['evolution-api-key', 'evolution-api-url'],
}, async (request) => {
  try {
    const { companyId } = request.data;
    
    if (!companyId) {
      throw new Error('companyId é obrigatório');
    }

    console.log(`[Evolution Sync] 🔄 Iniciando sincronização para empresa: ${companyId}`);

    // Buscar configurações da empresa para obter instance name
    const settings = await getCompanySettings(companyId);
    const telefoneSalao = settings.telefoneSalao;
    
    if (!telefoneSalao) {
      throw new Error('Telefone do salão não configurado');
    }

    // Normalizar telefone para buscar instance name
    const normalizedPhone = normalizarTelefone(telefoneSalao);
    if (!normalizedPhone) {
      throw new Error('Telefone do salão inválido');
    }

    // Formato do instance name: smartdoctor_{companyId}
    const instanceName = `smartdoctor_${companyId}`;

    console.log(`[Evolution Sync] 📱 Usando instance: ${instanceName}`);

    // Buscar todos os contatos da empresa
    const contactsSnapshot = await db.collection(`companies/${companyId}/whatsappContacts`).get();
    
    if (contactsSnapshot.empty) {
      console.log(`[Evolution Sync] ⚠️ Nenhum contato encontrado para empresa: ${companyId}`);
      return { success: true, synced: 0, total: 0 };
    }

    console.log(`[Evolution Sync] 📋 Total de contatos a sincronizar: ${contactsSnapshot.docs.length}`);

    // Buscar todos os contatos da API uma única vez e criar cache
    console.log(`[Evolution Sync] 🔍 Buscando todos os contatos da API para cache...`);
    const contactsCache = await fetchAllContacts(instanceName);
    console.log(`[Evolution Sync] ✅ Cache de contatos criado com ${contactsCache.size} contato(s)`);

    let syncedCount = 0;
    let errorCount = 0;

    // Processar cada contato
    for (const contactDoc of contactsSnapshot.docs) {
      try {
        const contactData = contactDoc.data();
        const waId = contactData.wa_id || contactDoc.id;
        
        // Usar remoteJid salvo no contato se disponível, senão construir a partir do wa_id
        let contactRemoteJid = contactData.remoteJid;
        
        if (!contactRemoteJid) {
          // Construir remoteJid no formato correto como fallback
          const normalizedChatId = waId.replace(/\D/g, '');
          contactRemoteJid = `${normalizedChatId}@s.whatsapp.net`;
          console.log(`[Evolution Sync] ⚠️ remoteJid não encontrado no contato, construído: ${contactRemoteJid}`);
        }
        
        console.log(`[Evolution Sync] 🔄 Sincronizando contato: ${waId} (${contactRemoteJid})`);

        // Buscar últimas mensagens (buscar várias para garantir que pegamos a mais recente)
        const messages = await fetchMessagesFromAPI(instanceName, contactRemoteJid, 1, 10);
        
        let lastMessage: any = null;
        if (messages.length > 0) {
          // Converter mensagens para any para lidar com estrutura flexível
          const messagesAny = messages as any[];
          
          // Log da estrutura da mensagem para debug
          console.log(`[Evolution Sync] 🔍 Estrutura da primeira mensagem:`, {
            hasKey: !!messagesAny[0]?.key,
            keys: messagesAny[0] ? Object.keys(messagesAny[0]) : [],
            messageKeys: messagesAny[0]?.message ? Object.keys(messagesAny[0].message) : [],
            sample: messagesAny[0] ? JSON.stringify(messagesAny[0]).substring(0, 200) : 'N/A',
          });
          
          // Ordenar mensagens por timestamp (mais recente primeiro)
          const sortedMessages = messagesAny.sort((a, b) => {
            const aTime = a.messageTimestamp 
              ? (typeof a.messageTimestamp === 'number' ? a.messageTimestamp : Number(a.messageTimestamp))
              : (a.key?.messageTimestamp 
                ? (typeof a.key.messageTimestamp === 'number' ? a.key.messageTimestamp : Number(a.key.messageTimestamp))
                : 0);
            const bTime = b.messageTimestamp 
              ? (typeof b.messageTimestamp === 'number' ? b.messageTimestamp : Number(b.messageTimestamp))
              : (b.key?.messageTimestamp 
                ? (typeof b.key.messageTimestamp === 'number' ? b.key.messageTimestamp : Number(b.key.messageTimestamp))
                : 0);
            return bTime - aTime; // Mais recente primeiro
          });
          
          const latestMessage = sortedMessages[0] as any;
          
          // Validar se a mensagem tem a estrutura esperada
          if (!latestMessage) {
            console.warn(`[Evolution Sync] ⚠️ Mensagem vazia ou inválida para contato: ${waId}`);
            // Continuar para processar foto mesmo sem mensagem
          } else {
            // A mensagem pode vir em diferentes formatos
            // A API retorna: { id: "...", key: { id: "...", fromMe: boolean, remoteJid: "..." }, ... }
            // O id é o ID do banco de dados, o key.id é o ID do WhatsApp (wam_id)
            const messageKey = latestMessage.key || latestMessage.messageKey || { 
              id: latestMessage.id || latestMessage.messageId || latestMessage._id || `sync-${Date.now()}-${waId}`,
              fromMe: latestMessage.fromMe !== undefined ? latestMessage.fromMe : false,
              remoteJid: contactRemoteJid,
            };
            
            // O wam_id é o ID do WhatsApp (key.id), não o ID do banco de dados
            const wamId = messageKey.id || latestMessage.id || `sync-${Date.now()}-${waId}`;
            
            if (!wamId) {
              console.warn(`[Evolution Sync] ⚠️ Mensagem sem ID para contato: ${waId}`, {
                messageKeys: Object.keys(latestMessage),
                messageKey: messageKey,
              });
            } else {
              // Extrair informações da mensagem
              let messageText = '';
              // Usar messageType da API se disponível, senão inferir do conteúdo
              let messageType = latestMessage.messageType || 'text';
              const messageData = latestMessage.message || latestMessage;
              
              if (messageData.conversation) {
                messageText = messageData.conversation;
                messageType = 'text';
              } else if (messageData.extendedTextMessage?.text) {
                messageText = messageData.extendedTextMessage.text;
                messageType = 'text';
              } else if (messageData.imageMessage) {
                messageText = messageData.imageMessage.caption || '';
                messageType = 'image';
              } else if (messageData.videoMessage) {
                messageText = messageData.videoMessage.caption || '';
                messageType = 'video';
              } else if (messageData.audioMessage) {
                messageType = 'audio';
              } else if (messageData.documentMessage) {
                messageText = messageData.documentMessage.fileName || '';
                messageType = 'document';
              } else if (messageData.text) {
                messageText = typeof messageData.text === 'string' ? messageData.text : messageData.text.body || '';
                messageType = 'text';
              }
              
              // Normalizar messageType (a API retorna "imageMessage", mas salvamos como "image")
              if (messageType === 'imageMessage') messageType = 'image';
              else if (messageType === 'videoMessage') messageType = 'video';
              else if (messageType === 'audioMessage') messageType = 'audio';
              else if (messageType === 'documentMessage') messageType = 'document';
              else if (messageType === 'conversation') messageType = 'text';

              // Extrair timestamp (pode estar em diferentes lugares)
              const timestampValue = latestMessage.messageTimestamp 
                ? (typeof latestMessage.messageTimestamp === 'number' 
                    ? latestMessage.messageTimestamp 
                    : Number(latestMessage.messageTimestamp))
                : (latestMessage.timestamp
                  ? (typeof latestMessage.timestamp === 'number'
                      ? latestMessage.timestamp
                      : Number(latestMessage.timestamp))
                  : (latestMessage.createdAt
                    ? (typeof latestMessage.createdAt === 'number'
                        ? latestMessage.createdAt
                        : (latestMessage.createdAt?.seconds 
                          ? latestMessage.createdAt.seconds 
                          : (latestMessage.createdAt?.toMillis ? latestMessage.createdAt.toMillis() / 1000 : Date.now() / 1000)))
                    : Date.now() / 1000));
              const messageTimestamp = new Date(timestampValue * 1000);

              // Verificar se fromMe está disponível
              const fromMe = messageKey.fromMe !== undefined 
                ? messageKey.fromMe 
                : (latestMessage.fromMe !== undefined ? latestMessage.fromMe : false);

              lastMessage = {
                wam_id: wamId,
                text: messageText || null,
                type: messageType,
                direction: fromMe ? 'outbound' : 'inbound',
                fromMe: fromMe,
                timestamp: admin.firestore.Timestamp.fromDate(messageTimestamp),
                createdAt: admin.firestore.Timestamp.fromDate(messageTimestamp),
              };

              // Atualizar contato com última mensagem
              await contactDoc.ref.set({
                remoteJid: contactRemoteJid, // Salvar remoteJid para facilitar busca de foto
                last_message: lastMessage,
                last_message_at: admin.firestore.Timestamp.fromDate(messageTimestamp),
                updatedAt: FieldValue.serverTimestamp(),
              }, { merge: true });

              console.log(`[Evolution Sync] ✅ Última mensagem atualizada para contato: ${waId}`, {
                wam_id: wamId,
                type: messageType,
                hasText: !!messageText,
                textPreview: messageText ? messageText.substring(0, 50) : 'N/A',
              });
            }
          }
        }

        // Buscar/atualizar foto do contato usando cache
        const contactInfo = contactsCache.get(contactRemoteJid);
        
        if (contactInfo?.profilePicUrl) {
          const contactRef = contactDoc.ref;
          const contactDocCurrent = await contactRef.get();
          const currentData = contactDocCurrent.data();
          
          // Verificar se precisa atualizar foto (só atualiza se não tiver ou se passou 1 dia)
          const now = Date.now();
          const oneDayMs = 24 * 60 * 60 * 1000;
          let lastPhotoUpdate = 0;
          
          if (currentData?.profilePicUrlUpdatedAt) {
            if (currentData.profilePicUrlUpdatedAt.toMillis) {
              lastPhotoUpdate = currentData.profilePicUrlUpdatedAt.toMillis();
            } else if (typeof currentData.profilePicUrlUpdatedAt === 'number') {
              lastPhotoUpdate = currentData.profilePicUrlUpdatedAt;
            } else if (currentData.profilePicUrlUpdatedAt._seconds) {
              lastPhotoUpdate = currentData.profilePicUrlUpdatedAt._seconds * 1000;
            }
          }
          
          const shouldUpdatePhoto = !currentData?.profilePicUrl || (now - lastPhotoUpdate) >= oneDayMs;
          
          if (shouldUpdatePhoto) {
            await contactRef.set({
              profilePicUrl: contactInfo.profilePicUrl,
              remoteJid: contactRemoteJid, // Salvar remoteJid para futuras sincronizações
              profilePicUrlUpdatedAt: FieldValue.serverTimestamp(),
              updatedAt: FieldValue.serverTimestamp(),
            }, { merge: true });
            
            console.log(`[Evolution Sync] ✅ Foto atualizada para contato: ${waId} (${contactRemoteJid})`);
          } else {
            console.log(`[Evolution Sync] ⏭️ Foto do contato atualizada recentemente, pulando: ${waId}`);
          }
        } else {
          // Se não encontrou no cache, tentar variações do remoteJid
          // Pode ser que o formato esteja ligeiramente diferente
          const normalizedChatId = waId.replace(/\D/g, '');
          const variations = [
            contactRemoteJid,
            contactRemoteJid.replace('@s.whatsapp.net', '@c.us'),
            `${normalizedChatId}@c.us`,
            `${normalizedChatId}@s.whatsapp.net`,
          ];
          
          let foundContact = null;
          let foundRemoteJid = null;
          for (const variant of variations) {
            if (contactsCache.has(variant)) {
              foundContact = contactsCache.get(variant);
              foundRemoteJid = variant;
              console.log(`[Evolution Sync] 🔍 Contato encontrado no cache com variante: ${variant} -> ${contactRemoteJid}`);
              break;
            }
          }
          
          if (foundContact?.profilePicUrl) {
            const contactRef = contactDoc.ref;
            await contactRef.set({
              profilePicUrl: foundContact.profilePicUrl,
              remoteJid: foundRemoteJid || contactRemoteJid, // Salvar remoteJid encontrado
              profilePicUrlUpdatedAt: FieldValue.serverTimestamp(),
              updatedAt: FieldValue.serverTimestamp(),
            }, { merge: true });
            
            console.log(`[Evolution Sync] ✅ Foto atualizada para contato (variante): ${waId} (${foundRemoteJid || contactRemoteJid})`);
          } else {
            // Salvar remoteJid mesmo se não encontrar a foto
            if (!contactData.remoteJid && contactRemoteJid) {
              await contactDoc.ref.set({
                remoteJid: contactRemoteJid,
                updatedAt: FieldValue.serverTimestamp(),
              }, { merge: true });
              console.log(`[Evolution Sync] 💾 remoteJid salvo no contato (sem foto): ${waId} (${contactRemoteJid})`);
            } else {
              console.log(`[Evolution Sync] ⚠️ Contato não encontrado no cache: ${contactRemoteJid}`);
            }
          }
        }

        syncedCount++;
      } catch (error: any) {
        errorCount++;
        console.error(`[Evolution Sync] ❌ Erro ao sincronizar contato ${contactDoc.id}:`, error?.message || String(error));
        // Continuar com próximo contato mesmo em caso de erro
      }
    }

    console.log(`[Evolution Sync] ✅ Sincronização concluída: ${syncedCount} contatos sincronizados, ${errorCount} erros`);

    return { 
      success: true, 
      synced: syncedCount, 
      total: contactsSnapshot.docs.length,
      errors: errorCount,
    };
  } catch (error: any) {
    console.error('[Evolution Sync] ❌ Erro ao sincronizar contatos:', error);
    throw new Error(error?.message || 'Erro ao sincronizar contatos');
  }
});

/**
 * Busca todos os contatos da API e retorna um mapa de remoteJid -> foto
 * Usado pelo frontend para exibir fotos na tela de mensagens
 */
export const getWhatsAppContactsPhotos = onCall({ 
  region: 'us-central1',
  memory: '512MiB',
  timeoutSeconds: 30,
  maxInstances: 20,
  secrets: ['evolution-api-key', 'evolution-api-url'],
}, async (request) => {
  try {
    const { companyId } = request.data;
    
    if (!companyId) {
      throw new Error('companyId é obrigatório');
    }

    console.log(`[Get Contacts Photos] 🔍 Buscando fotos de contatos para empresa: ${companyId}`);

    // Buscar configurações da empresa para obter instance name
    const settings = await getCompanySettings(companyId);
    const telefoneSalao = settings.telefoneSalao;
    
    if (!telefoneSalao) {
      throw new Error('Telefone do salão não configurado');
    }

    // Formato do instance name: smartdoctor_{companyId}
    const instanceName = `smartdoctor_${companyId}`;

    console.log(`[Get Contacts Photos] 📱 Usando instance: ${instanceName}`);

    // Buscar todos os contatos da API uma única vez
    const contactsCache = await fetchAllContacts(instanceName);
    
    // Converter Map para objeto simples para retornar via JSON
    const contactsMap: Record<string, { profilePicUrl?: string; pushName?: string }> = {};
    contactsCache.forEach((value, key) => {
      contactsMap[key] = value;
    });

    console.log(`[Get Contacts Photos] ✅ ${contactsCache.size} contato(s) carregado(s) para empresa: ${companyId}`);

    return { 
      success: true, 
      contacts: contactsMap,
      count: contactsCache.size,
    };
  } catch (error: any) {
    console.error('[Get Contacts Photos] ❌ Erro ao buscar fotos de contatos:', error);
    throw new Error(error?.message || 'Erro ao buscar fotos de contatos');
  }
});

