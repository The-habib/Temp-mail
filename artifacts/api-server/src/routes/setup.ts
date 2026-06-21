import { Router } from "express";
import crypto from "crypto";
import { readMailgunConfig, writeMailgunConfig } from "../lib/mailgun-config.js";

const router = Router();

const MAILGUN_API_BASE = "https://api.mailgun.net";

async function mailgunGet(apiKey: string, path: string) {
  const res = await fetch(`${MAILGUN_API_BASE}${path}`, {
    headers: {
      Authorization: `Basic ${Buffer.from(`api:${apiKey}`).toString("base64")}`,
      Accept: "application/json",
    },
  });
  return { ok: res.ok, status: res.status, data: await res.json().catch(() => ({})) };
}

async function mailgunPost(apiKey: string, path: string, body: Record<string, string>) {
  const formBody = new URLSearchParams(body).toString();
  const res = await fetch(`${MAILGUN_API_BASE}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`api:${apiKey}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: formBody,
  });
  return { ok: res.ok, status: res.status, data: await res.json().catch(() => ({})) };
}

// GET /api/setup/status
router.get("/setup/status", (req, res) => {
  const config = readMailgunConfig();
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

  // 1. Verify the domain exists in Mailgun
  const domainRes = await mailgunGet(apiKey, `/v3/domains/${cleanDomain}`);
  if (!domainRes.ok) {
    if (domainRes.status === 404) {
      res.status(400).json({ error: `Domain "${cleanDomain}" not found in your Mailgun account. Please add it at mailgun.com first.` });
    } else if (domainRes.status === 401) {
      res.status(401).json({ error: "Invalid API key. Please check it and try again." });
    } else {
      res.status(502).json({ error: "Could not reach Mailgun API. Try again in a moment." });
    }
    return;
  }

  const domainData = domainRes.data as {
    domain?: { state?: string };
    receiving_dns_records?: Array<{ record_type: string; value: string; valid: string; name?: string }>;
    sending_dns_records?: Array<{ record_type: string; value: string; valid: string; name?: string }>;
  };

  // 2. Generate a webhook token for URL-based auth
  const webhookToken = crypto.randomBytes(24).toString("hex");

  // 3. Build the webhook URL
  const host = (req.headers["x-forwarded-host"] || req.headers["host"]) as string;
  const protocol = (req.headers["x-forwarded-proto"] as string) || "https";
  const webhookUrl = `${protocol}://${host}/webhook/mailgun?token=${webhookToken}`;

  // 4. Create a catch-all inbound route in Mailgun
  // First check if we already have one and delete it
  const routesRes = await mailgunGet(apiKey, "/v3/routes");
  const existingRoutes = (routesRes.data as { items?: Array<{ id: string; description?: string }> })?.items ?? [];
  for (const r of existingRoutes) {
    if (r.description?.includes("TempMail-auto")) {
      await fetch(`${MAILGUN_API_BASE}/v3/routes/${r.id}`, {
        method: "DELETE",
        headers: { Authorization: `Basic ${Buffer.from(`api:${apiKey}`).toString("base64")}` },
      });
    }
  }

  const routeRes = await mailgunPost(apiKey, "/v3/routes", {
    priority: "1",
    description: "TempMail-auto catch-all inbound route",
    expression: `match_recipient(".*@${cleanDomain}")`,
    "action[]": `forward("${webhookUrl}")`,
  });

  if (!routeRes.ok) {
    req.log.warn({ routeData: routeRes.data }, "Route creation returned non-ok");
  }

  // 5. Save config
  writeMailgunConfig({
    apiKey,
    domain: cleanDomain,
    webhookToken,
    configured: true,
    configuredAt: new Date().toISOString(),
  });

  // 6. Extract and return DNS records
  const mxRecords = (domainData.receiving_dns_records ?? []).filter((r) => r.record_type === "MX");
  const txtRecord = (domainData.sending_dns_records ?? []).find((r) => r.record_type === "TXT" && r.value?.includes("mailgun"));

  res.json({
    ok: true,
    domain: cleanDomain,
    domainState: domainData.domain?.state ?? "unknown",
    webhookUrl,
    dnsRecords: {
      mx: mxRecords.map((r) => ({ type: "MX", host: r.name || `@`, value: r.value })),
      spf: txtRecord ? { type: "TXT", host: txtRecord.name || `@`, value: txtRecord.value } : null,
    },
  });
});

export default router;
