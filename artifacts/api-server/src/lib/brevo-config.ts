import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = path.resolve(__dirname, "../../../../data/brevo-config.json");

export interface BrevoConfig {
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

export function readBrevoConfig(): BrevoConfig | null {
  const envKey = process.env["BREVO_API_KEY"];
  const envDomain = process.env["BREVO_DOMAIN"];
  const envToken = process.env["BREVO_WEBHOOK_TOKEN"] || "";
  if (envKey && envDomain) {
    return { apiKey: envKey, domain: envDomain, webhookToken: envToken, configured: true, configuredAt: "" };
  }
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const raw = fs.readFileSync(CONFIG_PATH, "utf8");
      return JSON.parse(raw) as BrevoConfig;
    }
  } catch {}
  return null;
}

export function writeBrevoConfig(config: BrevoConfig): void {
  ensureDataDir();
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), "utf8");
}

export function getBrevoApiKey(): string | null {
  return readBrevoConfig()?.apiKey ?? null;
}

export function getWebhookToken(): string | null {
  return readBrevoConfig()?.webhookToken ?? null;
}

export function getBrevodomain(): string | null {
  return readBrevoConfig()?.domain ?? null;
}
