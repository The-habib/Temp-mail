import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = path.resolve(__dirname, "../../../../data/mailgun-config.json");

export interface MailgunConfig {
  apiKey: string;
  domain: string;
  webhookToken: string;
  configured: boolean;
  configuredAt: string;
}

function ensureDataDir() {
  const dir = path.dirname(CONFIG_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

export function readMailgunConfig(): MailgunConfig | null {
  // Env vars take priority (production / Replit secrets)
  const envKey = process.env["MAILGUN_API_KEY"];
  const envDomain = process.env["MAILGUN_DOMAIN"];
  const envToken = process.env["MAILGUN_WEBHOOK_TOKEN"] || "";
  if (envKey && envDomain) {
    return { apiKey: envKey, domain: envDomain, webhookToken: envToken, configured: true, configuredAt: "" };
  }
  // Fall back to file-based config
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const raw = fs.readFileSync(CONFIG_PATH, "utf8");
      return JSON.parse(raw) as MailgunConfig;
    }
  } catch {}
  return null;
}

export function writeMailgunConfig(config: MailgunConfig): void {
  ensureDataDir();
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), "utf8");
}

export function getMailgunDomain(): string | null {
  return readMailgunConfig()?.domain ?? null;
}

export function getMailgunApiKey(): string | null {
  return readMailgunConfig()?.apiKey ?? null;
}

export function getWebhookToken(): string | null {
  return readMailgunConfig()?.webhookToken ?? null;
}
