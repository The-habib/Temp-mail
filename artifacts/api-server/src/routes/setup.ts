import { Router } from "express";
import crypto from "crypto";
import { readBrevoConfig, writeBrevoConfig } from "../lib/brevo-config.js";

const router = Router();

const BREVO_API_BASE = "https://api.brevo.com/v3";

async function brevoGet(apiKey: string, path: string) {
  const res = await fetch(`${BREVO_API_BASE}${path}`, {
    headers: {
      "api-key": apiKey,
      Accept: "application/json",
    },
  });
  return { ok: res.ok, status: res.status, data: await res.json().catch(() => ({})) };
}

async function brevoPost(apiKey: string, path: string, body: unknown) {
  const res = await fetch(`${BREVO_API_BASE}${path}`, {
    method: "POST",
    headers: {
      "api-key": apiKey,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });
  return { ok: res.ok, status: res.status, data: await res.json().catch(() => ({})) };
}

async function brevoDelete(apiKey: string, path: string) {
  const res = await fetch(`${BREVO_API_BASE}${path}`, {
    method: "DELETE",
    headers: { "api-key": apiKey },
  });
  return { ok: res.ok, status: res.status };
}

// GET /api/setup/status
router.get("/setup/status", (req, res) => {
  const config = readBrevoConfig();
  if (!config) {
    res.json({ configured: false });
    return;
  }
  res.json({
    configured: true,
    domain: config.domain,
    configuredAt: config.configuredAt,
  });
});

// POST /api/setup/configure
router.post("/setup/configure", async (req, res) => {
  const { apiKey, domain } = req.body as { apiKey?: string; domain?: string };

  if (!apiKey || !domain) {
    res.status(400).json({ error: "apiKey and domain are required" });
    return;
  }

  const cleanDomain = domain.trim().toLowerCase().replace(/^https?:\/\//, "");

  // 1. Verify the API key is valid by calling account info
  const accountRes = await brevoGet(apiKey, "/account");
  if (!accountRes.ok) {
    if (accountRes.status === 401) {
      res.status(401).json({ error: "Invalid API key. Please check it and try again." });
    } else {
      res.status(502).json({ error: "Could not reach Brevo API. Try again in a moment." });
    }
    return;
  }

  // 2. Generate a webhook token for URL-based auth
  const webhookToken = crypto.randomBytes(24).toString("hex");

  // 3. Build the webhook URL
  const host = (req.headers["x-forwarded-host"] || req.headers["host"]) as string;
  const protocol = (req.headers["x-forwarded-proto"] as string) || "https";
  const webhookUrl = `${protocol}://${host}/webhook/brevo?token=${webhookToken}`;

  // 4. Register an inbound webhook in Brevo
  // First, list existing webhooks and remove any previous TempMail ones
  const existingRes = await brevoGet(apiKey, "/webhooks?type=inbound");
  const existingWebhooks = (existingRes.data as { webhooks?: Array<{ id: number; description?: string }> })?.webhooks ?? [];
  for (const wh of existingWebhooks) {
    if (wh.description?.includes("TempMail-auto")) {
      await brevoDelete(apiKey, `/webhooks/${wh.id}`);
    }
  }

  const webhookRes = await brevoPost(apiKey, "/webhooks", {
    url: webhookUrl,
    description: "TempMail-auto inbound webhook",
    events: ["inboundEmailProcessed"],
    type: "inbound",
    domain: cleanDomain,
  });

  if (!webhookRes.ok) {
    req.log.warn({ webhookData: webhookRes.data }, "Webhook creation returned non-ok");
  }

  // 5. Save config
  writeBrevoConfig({
    apiKey,
    domain: cleanDomain,
    webhookToken,
    configured: true,
    configuredAt: new Date().toISOString(),
  });

  // 6. Return DNS records for Brevo inbound (standard MX + SPF)
  res.json({
    ok: true,
    domain: cleanDomain,
    webhookUrl,
    dnsRecords: {
      mx: [
        { type: "MX", host: cleanDomain, value: "inbound.brevo.com", priority: "10" },
      ],
      spf: { type: "TXT", host: cleanDomain, value: "v=spf1 include:spf.brevo.com ~all" },
    },
  });
});

export default router;
