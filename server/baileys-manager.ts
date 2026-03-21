import makeWASocket, {
  Browsers,
  DisconnectReason,
  useMultiFileAuthState,
  type WASocket,
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import QRCode from "qrcode";
import { mkdir, rm, readdir } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const BASE_AUTH_DIR = path.join(__dirname, "..", "baileys_auth");

const MAX_RETRIES = 6;
const BASE_DELAY_MS = 5000;
const MAX_DELAY_MS = 60000;

export interface BaileysStatus {
  status: "disconnected" | "connecting" | "connected";
  qrCode: string | null;
  phoneNumber: string | null;
  profilePictureUrl: string | null;
}

class BaileysManager {
  private sockets = new Map<string, WASocket>();
  private states = new Map<string, BaileysStatus>();
  private reconnectTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private retryCounts = new Map<string, number>();

  private getState(authUserId: string): BaileysStatus {
    return (
      this.states.get(authUserId) ?? {
        status: "disconnected",
        qrCode: null,
        phoneNumber: null,
        profilePictureUrl: null,
      }
    );
  }

  private setState(authUserId: string, patch: Partial<BaileysStatus>) {
    const next = { ...this.getState(authUserId), ...patch };
    this.states.set(authUserId, next);
  }

  getStatus(authUserId: string): BaileysStatus {
    return this.getState(authUserId);
  }

  async connect(authUserId: string): Promise<void> {
    const cur = this.getState(authUserId);
    if (cur.status !== "disconnected") return;

    const authDir = path.join(BASE_AUTH_DIR, authUserId);
    await mkdir(authDir, { recursive: true });

    const { state, saveCreds } = await useMultiFileAuthState(authDir);

    this.setState(authUserId, { status: "connecting", qrCode: null });

    const { default: P } = await import("pino");
    const silentLogger = P({ level: "silent" });

    const sock = makeWASocket({
      auth: state,
      printQRInTerminal: false,
      logger: silentLogger,
      browser: Browsers.ubuntu("Chrome"),
      connectTimeoutMs: 30000,
      keepAliveIntervalMs: 30000,
    });

    this.sockets.set(authUserId, sock);

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        try {
          const qrDataUrl = await QRCode.toDataURL(qr, { scale: 6 });
          this.setState(authUserId, { qrCode: qrDataUrl, status: "connecting" });
          this.retryCounts.set(authUserId, 0);
          console.log(`[Baileys] QR code ready for ${authUserId}`);
        } catch (err) {
          console.error("[Baileys] QR code generation failed:", err);
        }
      }

      if (connection === "close") {
        const errCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
        const isLoggedOut = errCode === DisconnectReason.loggedOut;

        this.sockets.delete(authUserId);
        this.setState(authUserId, {
          status: "disconnected",
          qrCode: null,
          phoneNumber: null,
          profilePictureUrl: null,
        });

        if (isLoggedOut) {
          console.log(`[Baileys] Logged out for ${authUserId} — clearing session`);
          this.retryCounts.delete(authUserId);
          const authDir = path.join(BASE_AUTH_DIR, authUserId);
          await rm(authDir, { recursive: true, force: true }).catch(() => {});
          return;
        }

        const retries = (this.retryCounts.get(authUserId) ?? 0) + 1;
        this.retryCounts.set(authUserId, retries);

        if (retries > MAX_RETRIES) {
          console.log(
            `[Baileys] Max retries (${MAX_RETRIES}) reached for ${authUserId} (last code: ${errCode}). Giving up. User must reconnect manually.`
          );
          this.retryCounts.delete(authUserId);
          const authDir = path.join(BASE_AUTH_DIR, authUserId);
          await rm(authDir, { recursive: true, force: true }).catch(() => {});
          return;
        }

        const delay = Math.min(BASE_DELAY_MS * Math.pow(2, retries - 1), MAX_DELAY_MS);
        console.log(
          `[Baileys] Connection closed (code ${errCode}) for ${authUserId} — retry ${retries}/${MAX_RETRIES} in ${delay / 1000}s`
        );

        const timer = setTimeout(() => {
          this.reconnectTimers.delete(authUserId);
          this.connect(authUserId).catch(console.error);
        }, delay);
        this.reconnectTimers.set(authUserId, timer);
      } else if (connection === "open") {
        const phoneNumber = sock.user?.id?.split(":")[0] ?? null;
        console.log(`[Baileys] Connected for ${authUserId}: ${phoneNumber}`);
        this.retryCounts.set(authUserId, 0);
        this.setState(authUserId, {
          status: "connected",
          qrCode: null,
          phoneNumber,
          profilePictureUrl: null,
        });
        if (phoneNumber) {
          try {
            const jid = `${phoneNumber}@s.whatsapp.net`;
            const url = await sock.profilePictureUrl(jid, "image");
            this.setState(authUserId, { profilePictureUrl: url ?? null });
            console.log(`[Baileys] Profile photo fetched for ${authUserId}`);
          } catch {
            // profile photo unavailable — no-op
          }
        }
      }
    });
  }

  async disconnect(authUserId: string): Promise<void> {
    const timer = this.reconnectTimers.get(authUserId);
    if (timer) {
      clearTimeout(timer);
      this.reconnectTimers.delete(authUserId);
    }
    this.retryCounts.delete(authUserId);
    const sock = this.sockets.get(authUserId);
    if (sock) {
      try {
        await sock.logout();
      } catch {
        sock.end(undefined);
      }
      this.sockets.delete(authUserId);
    }
    this.setState(authUserId, {
      status: "disconnected",
      qrCode: null,
      phoneNumber: null,
      profilePictureUrl: null,
    });
    const authDir = path.join(BASE_AUTH_DIR, authUserId);
    await rm(authDir, { recursive: true, force: true }).catch(() => {});
  }

  async sendMessage(
    authUserId: string,
    to: string,
    message: string
  ): Promise<void> {
    const sock = this.sockets.get(authUserId);
    const st = this.getState(authUserId);
    if (!sock || st.status !== "connected") {
      throw new Error("WhatsApp não está conectado");
    }
    const phone = to.replace(/\D/g, "");
    if (!phone || phone.length < 8) {
      throw new Error("Número de telefone inválido");
    }
    const jid = `${phone}@s.whatsapp.net`;
    await sock.sendMessage(jid, { text: message });
  }

  async restoreExistingSessions(): Promise<void> {
    try {
      const entries = await readdir(BASE_AUTH_DIR, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const authUserId = entry.name;
          console.log(`[Baileys] Restoring session for ${authUserId}`);
          this.connect(authUserId).catch((err) =>
            console.error(`[Baileys] Failed to restore session for ${authUserId}:`, err)
          );
        }
      }
    } catch {
      // baileys_auth dir does not exist yet — nothing to restore
    }
  }
}

export const baileysManager = new BaileysManager();
