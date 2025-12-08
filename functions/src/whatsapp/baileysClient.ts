/* eslint-disable react-hooks/rules-of-hooks */
import * as admin from "firebase-admin";
import { promises as fs } from "fs";
import { tmpdir } from "os";
import { dirname, join } from "path";
import pino from "pino";
import {
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeWASocket,
  proto,
  useMultiFileAuthState,
  type WASocket
} from "@whiskeysockets/baileys";

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const bucket = admin.storage().bucket();
const { FieldValue } = admin.firestore;

const SESSION_STORAGE_PREFIX = "whatsappBaileysSessions";
const STATUS_COLLECTION = "integrations";
const STATUS_DOC_ID = "whatsappBaileys";

export interface BaileysSendParams {
  companyId: string;
  to: string;
  message: string;
  lookupCandidates?: string[];
}

export interface BaileysSendResult {
  messageId: string;
  jid: string;
  raw: proto.IWebMessageInfo;
  matchedQuery?: string;
  verifiedNumber?: string;
}

type OnWhatsAppLookupResult = { jid: string; exists: boolean } & Record<string, unknown>;

export interface BaileysPairingResult {
  status: "connected" | "pending_qr" | "initializing";
  error?: string;
}

async function ensureDirectory(path: string) {
  await fs.mkdir(path, { recursive: true });
}

async function downloadSessionFiles(companyId: string, targetDir: string) {
  const prefix = `${SESSION_STORAGE_PREFIX}/${companyId}/`;
  try {
    const [files] = await bucket.getFiles({ prefix });
    for (const file of files) {
      const relative = file.name.substring(prefix.length);
      if (!relative) {
        continue;
      }
      const destination = join(targetDir, relative);
      await ensureDirectory(dirname(destination));
      await file.download({ destination });
    }
  } catch (error) {
    console.warn(`[Baileys] Não foi possível baixar sessão existente (${companyId}):`, error);
  }
}

async function collectFilesRecursive(rootDir: string, dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      const child = await collectFilesRecursive(rootDir, fullPath);
      files.push(...child);
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  }
  return files;
}

async function uploadSessionFiles(companyId: string, sourceDir: string) {
  const prefix = `${SESSION_STORAGE_PREFIX}/${companyId}/`;
  try {
    const files = await collectFilesRecursive(sourceDir, sourceDir);
    await Promise.all(
      files.map(async (filePath) => {
        const relative = filePath.substring(sourceDir.length + 1);
        const destination = `${prefix}${relative}`;
        await bucket.upload(filePath, {
          destination,
          resumable: false,
        });
      })
    );
  } catch (error) {
    console.error(`[Baileys] Falha ao enviar sessão para storage (${companyId}):`, error);
  }
}

async function clearStoredSession(companyId: string) {
  const prefix = `${SESSION_STORAGE_PREFIX}/${companyId}/`;
  try {
    const [files] = await bucket.getFiles({ prefix });
    await Promise.all(files.map((file) => file.delete().catch(() => undefined)));
  } catch (error) {
    console.error(`[Baileys] Falha ao limpar sessão (${companyId}):`, error);
  }
}

async function removeLocalDir(dir: string) {
  try {
    await fs.rm(dir, { recursive: true, force: true });
  } catch (error) {
    console.warn(`[Baileys] Não foi possível remover diretório temporário ${dir}:`, error);
  }
}

function companyStatusDoc(companyId: string) {
  return db
    .collection(`companies/${companyId}/${STATUS_COLLECTION}`)
    .doc(STATUS_DOC_ID);
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
    console.warn(`[Baileys] Não foi possível atualizar status (${companyId}):`, error);
  }
}

function normalizePhoneToJid(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (!digits) {
    throw new Error("Telefone inválido para envio via Baileys");
  }
  const e164 = digits.startsWith("55") ? digits : `55${digits}`;
  return `${e164}@s.whatsapp.net`;
}

async function waitForConnection(socket: WASocket, companyId: string, timeoutMs = 20000) {
  return await new Promise<void>((resolve, reject) => {
    let completed = false;
    let timeout: NodeJS.Timeout | null = null;
    const handler = async (update: { connection?: string; qr?: string; lastDisconnect?: { error?: unknown } }) => {
      if (update.qr) {
        await updateStatus(companyId, {
          status: "pending_qr",
          qrCode: update.qr,
          qrGeneratedAt: FieldValue.serverTimestamp(),
        });
      }

      if (update.connection === "open") {
        if (timeout) {
          clearTimeout(timeout);
        }
        socket.ev.off("connection.update", handler as any);
        completed = true;
        await updateStatus(companyId, {
          status: "connected",
          qrCode: FieldValue.delete(),
          lastConnectedAt: FieldValue.serverTimestamp(),
        });
        resolve();
      }

      if (update.connection === "close") {
        if (timeout) {
          clearTimeout(timeout);
        }
        socket.ev.off("connection.update", handler as any);
        completed = true;
        const code = (update.lastDisconnect?.error as any)?.output?.statusCode ?? update.lastDisconnect?.error;
        if (code === DisconnectReason.loggedOut) {
          await clearStoredSession(companyId);
          await updateStatus(companyId, {
            status: "logged_out",
            qrCode: FieldValue.delete(),
            lastDisconnectReason: "logged_out",
          });
        }
        reject(update.lastDisconnect?.error ?? new Error("Conexão encerrada antes de abrir"));
      }
    };

    timeout = setTimeout(() => {
      if (!completed) {
        socket.ev.off("connection.update", handler as any);
        reject(new Error("Tempo limite ao conectar via Baileys. Garanta que o WhatsApp está pareado."));
      }
    }, timeoutMs);

    socket.ev.on("connection.update", handler as any);
  });
}

export async function sendBaileysTextMessage(params: BaileysSendParams): Promise<BaileysSendResult> {
  const { companyId, to, message, lookupCandidates } = params;
  if (!companyId) {
    throw new Error("companyId é obrigatório para envio via Baileys");
  }
  if (!to) {
    throw new Error("Telefone de destino é obrigatório");
  }

  const tempDir = join(tmpdir(), `baileys-${companyId}-${Date.now()}`);
  await ensureDirectory(tempDir);
  await downloadSessionFiles(companyId, tempDir);

  try {
    console.log("[Baileys] Preparando socket para envio", { companyId, tempDir });
    const { state, saveCreds } = await useMultiFileAuthState(tempDir);
    const { version } = await fetchLatestBaileysVersion();
    console.log("[Baileys] Versão do WhatsApp Web carregada", { version });
    const socket = makeWASocket({
      version,
      printQRInTerminal: false,
      auth: state,
      logger: pino({ level: "silent" }),
      syncFullHistory: false,
    });

    socket.ev.on("connection.update", (update) => {
      const { connection, lastDisconnect } = update;
      console.log("[Baileys] Atualização de conexão (envio)", {
        companyId,
        connection,
        hasQr: Boolean(update.qr),
        lastDisconnectError: lastDisconnect?.error ? (lastDisconnect.error as Error).message : null,
      });
    });

    socket.ev.on("creds.update", async () => {
      await saveCreds();
      await uploadSessionFiles(companyId, tempDir);
    });

    await waitForConnection(socket, companyId);

    const possibleQueries = new Set<string>();
    const collectVariants = (value: string) => {
      if (!value) return;
      const digits = value.replace(/\D/g, "");
      if (!digits) return;
      const withCountry = digits.startsWith("55") ? digits : `55${digits}`;
      possibleQueries.add(withCountry);

      if (withCountry.length >= 12) {
        const area = withCountry.slice(2, 4);
        const rest = withCountry.slice(4);
        if (rest.length >= 9 && rest.startsWith("9")) {
          const withoutNine = `55${area}${rest.slice(1)}`;
          possibleQueries.add(withoutNine);
        } else if (rest.length === 8) {
          const withNine = `55${area}9${rest}`;
          possibleQueries.add(withNine);
        }
      }
    };

    collectVariants(to);
    if (lookupCandidates?.length) {
      for (const candidate of lookupCandidates) {
        collectVariants(candidate);
      }
    }

    let verifiedJid: string | null = null;
    let matchedQuery: string | null = null;
    let lastLookupResult: unknown = null;

    for (const query of Array.from(possibleQueries)) {
      if (!query) continue;
      try {
        const lookupResult = (await socket.onWhatsApp(query)) as OnWhatsAppLookupResult[];
        lastLookupResult = lookupResult;
        const validEntry = Array.isArray(lookupResult)
          ? lookupResult.find((entry) => Boolean(entry.exists))
          : undefined;
        if (validEntry?.jid && validEntry.jid.trim()) {
          verifiedJid = validEntry.jid;
          matchedQuery = query;
          console.log("[Baileys] Número verificado via onWhatsApp", {
            companyId,
            query,
            jid: verifiedJid,
          });
          break;
        }
      } catch (error) {
        console.warn("[Baileys] Falha ao consultar número via onWhatsApp", {
          companyId,
          query,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    if (!verifiedJid) {
      verifiedJid = normalizePhoneToJid(to);
      console.warn("[Baileys] Número não confirmado via onWhatsApp, utilizando JID normalizado", {
        companyId,
        to,
        jid: verifiedJid,
        lastLookupResult,
      });
    }

    const jid = verifiedJid;
    const verifiedNumber = jid.split("@")[0]?.replace(/\D/g, "") || null;
    console.log("[Baileys] Enviando mensagem", { companyId, jid, matchedQuery, verifiedNumber });
    const sentMessage = await socket.sendMessage(jid, { text: message });
    if (!sentMessage) {
      throw new Error("Baileys não retornou confirmação de envio.");
    }

    await saveCreds();
    await uploadSessionFiles(companyId, tempDir);

    return {
      messageId: sentMessage.key.id ?? "",
      jid,
      raw: sentMessage,
      matchedQuery: matchedQuery ?? undefined,
      verifiedNumber: verifiedNumber ?? undefined,
    };
  } finally {
    await removeLocalDir(tempDir);
  }
}

export async function startBaileysPairing(
  companyId: string,
  timeoutMs = 60000,
  attempt = 1
): Promise<BaileysPairingResult> {
  if (!companyId) {
    throw new Error("companyId é obrigatório para iniciar pareamento Baileys");
  }

  const MAX_ATTEMPTS = 2;
  const tempDir = join(tmpdir(), `baileys-pair-${companyId}-${Date.now()}`);
  await ensureDirectory(tempDir);
  await downloadSessionFiles(companyId, tempDir);

  if (attempt === 1) {
    await updateStatus(companyId, {
      status: "initializing",
      qrCode: FieldValue.delete(),
      lastDisconnectReason: FieldValue.delete(),
      lastError: FieldValue.delete(),
      retryAttempt: FieldValue.delete(),
    });
  } else {
    await updateStatus(companyId, {
      status: "retrying",
      retryAttempt: attempt,
    });
  }
  console.log("[Baileys] Iniciando pareamento", { companyId, tempDir, timeoutMs, attempt });

  let result: BaileysPairingResult = {
    status: "initializing",
  };

  try {
    const { state, saveCreds } = await useMultiFileAuthState(tempDir);
    const { version } = await fetchLatestBaileysVersion();
    console.log("[Baileys] Estado de autenticação carregado", { companyId, files: Object.keys(state.creds || {}).length });
    console.log("[Baileys] Versão obtida", { companyId, version });
    const socket = makeWASocket({
      version,
      printQRInTerminal: false,
      auth: state,
      logger: pino({ level: "silent" }),
      syncFullHistory: false,
    });

    socket.ev.on("creds.update", async () => {
      console.log("[Baileys] creds.update recebido", { companyId });
      await saveCreds();
      await uploadSessionFiles(companyId, tempDir);
    });

    // Listener temporário para capturar QR code antes de waitForConnection
    const qrHandler = async (update: { qr?: string }) => {
      if (update.qr) {
        console.log("[Baileys] QR code recebido", { companyId, qrLength: update.qr.length });
        await updateStatus(companyId, {
          status: "pending_qr",
          qrCode: update.qr,
          qrGeneratedAt: FieldValue.serverTimestamp(),
        });
      }
    };
    socket.ev.on("connection.update", qrHandler);

    try {
      await waitForConnection(socket, companyId, timeoutMs);
      socket.ev.off("connection.update", qrHandler);
      result = {
        status: "connected",
      };
    } catch (error) {
      const message = (error as Error).message ?? String(error ?? "timeout");
      console.warn(`[Baileys] Pareamento aguardado não completou (${companyId}):`, error);
      const shouldRetry =
        attempt < MAX_ATTEMPTS &&
        (message.includes("Stream Errored") ||
          message.includes("Connection Failure") ||
          message.includes("restart required"));

      if (shouldRetry) {
        console.warn("[Baileys] Tentativa falhou, tentando novamente", { companyId, attempt, message });
        await updateStatus(companyId, {
          status: "retrying",
          lastError: message,
          retryAttempt: attempt,
        });
        return await startBaileysPairing(companyId, timeoutMs, attempt + 1);
      } else {
        await updateStatus(companyId, {
          status: "pending_qr",
          lastError: message,
          retryAttempt: attempt,
        });
        result = {
          status: "pending_qr",
          error: message,
        };
      }
    } finally {
      try {
        socket.ev.off("connection.update", qrHandler);
        socket.end(new Error("Finalizando sessão de pareamento"));
      } catch (endError) {
        console.warn("[Baileys] Erro ao encerrar socket após pareamento:", endError);
      }
      await saveCreds();
      await uploadSessionFiles(companyId, tempDir);
    }
  } finally {
    await removeLocalDir(tempDir);
    console.log("[Baileys] Limpeza concluída após pareamento", { companyId, tempDir });
  }

  return result;
}

