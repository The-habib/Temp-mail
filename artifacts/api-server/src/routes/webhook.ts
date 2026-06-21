import { Router } from "express";
import { db } from "@workspace/db";
import { emailsTable } from "@workspace/db/schema";
import { readMailgunConfig } from "../lib/mailgun-config.js";
import { logger } from "../lib/logger.js";

const router = Router();

function parseFromHeader(raw: string): { address: string; name: string } {
  if (!raw) return { address: "unknown@unknown.com", name: "Unknown" };
  const match = raw.match(/^(.*?)\s*<([^>]+)>$/);
  if (match) return { address: match[2].trim(), name: match[1].trim() || match[2].split("@")[0] };
  return { address: raw.trim(), name: raw.split("@")[0] || raw };
}

router.post("/mailgun", async (req, res) => {
  // Token-based auth: verify the webhook token in the query string
  const config = readMailgunConfig();
  if (config?.webhookToken) {
    const providedToken = req.query["token"] as string | undefined;
    if (providedToken !== config.webhookToken) {
      logger.warn("Invalid webhook token — rejecting inbound email");
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
  }

  try {
    const body = req.body as Record<string, string>;

    const recipient = (body["recipient"] || body["To"] || "").toLowerCase().trim();
    const sender = body["sender"] || body["From"] || "";
    const subject = body["subject"] || body["Subject"] || "(No subject)";
    const bodyHtml = body["body-html"] || null;
    const bodyText = body["body-plain"] || body["stripped-text"] || null;

    if (!recipient) {
      res.status(400).json({ error: "No recipient in webhook payload" });
      return;
    }

    const { address: fromAddress, name: fromName } = parseFromHeader(sender);

    await db.insert(emailsTable).values({
      mailboxAddress: recipient,
      fromAddress,
      fromName,
      subject,
      bodyHtml: bodyHtml || null,
      bodyText: bodyText || null,
      isRead: false,
    });

    logger.info({ recipient, from: fromAddress, subject }, "Stored inbound email");
    res.status(200).json({ ok: true });
  } catch (err) {
    logger.error({ err }, "Failed to store inbound email");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
