import { Router } from "express";
import { db } from "@workspace/db";
import { emailsTable } from "@workspace/db/schema";
import { readBrevoConfig } from "../lib/brevo-config.js";
import { logger } from "../lib/logger.js";

const router = Router();

function parseFromHeader(raw: string): { address: string; name: string } {
  if (!raw) return { address: "unknown@unknown.com", name: "Unknown" };
  const match = raw.match(/^(.*?)\s*<([^>]+)>$/);
  if (match) return { address: match[2].trim(), name: match[1].trim() || match[2].split("@")[0] };
  return { address: raw.trim(), name: raw.split("@")[0] || raw };
}

router.post("/brevo", async (req, res) => {
  const config = readBrevoConfig();
  if (config?.webhookToken) {
    const providedToken = req.query["token"] as string | undefined;
    if (providedToken !== config.webhookToken) {
      logger.warn("Invalid webhook token — rejecting inbound email");
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
  }

  try {
    const body = req.body as Record<string, unknown>;

    // Brevo inbound payload shape:
    // { to: [{address, name}], from: {address, name}, subject, html, text, ... }
    const toField = (body["to"] as Array<{ address?: string }> | undefined)?.[0]?.address ?? "";
    const fromField = body["from"] as { address?: string; name?: string } | string | undefined;
    const subject = (body["subject"] as string | undefined) || "(No subject)";
    const bodyHtml = (body["html"] as string | undefined) || null;
    const bodyText = (body["text"] as string | undefined) || null;

    const recipient = toField.toLowerCase().trim();

    if (!recipient) {
      res.status(400).json({ error: "No recipient in webhook payload" });
      return;
    }

    let fromAddress = "unknown@unknown.com";
    let fromName = "Unknown";
    if (typeof fromField === "string") {
      const parsed = parseFromHeader(fromField);
      fromAddress = parsed.address;
      fromName = parsed.name;
    } else if (fromField && typeof fromField === "object") {
      fromAddress = fromField.address ?? fromAddress;
      fromName = fromField.name ?? fromField.address?.split("@")[0] ?? fromName;
    }

    await db.insert(emailsTable).values({
      mailboxAddress: recipient,
      fromAddress,
      fromName,
      subject,
      bodyHtml: bodyHtml || null,
      bodyText: bodyText || null,
      isRead: false,
    });

    logger.info({ recipient, from: fromAddress, subject }, "Stored inbound email via Brevo");
    res.status(200).json({ ok: true });
  } catch (err) {
    logger.error({ err }, "Failed to store inbound email");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
