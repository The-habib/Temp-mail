import { Router } from "express";
import crypto from "crypto";
import { db } from "@workspace/db";
import { emailsTable } from "@workspace/db/schema";
import { logger } from "../lib/logger.js";

const router = Router();

function verifyMailgunSignature(
  signingKey: string,
  timestamp: string,
  token: string,
  signature: string,
): boolean {
  const value = timestamp + token;
  const hmac = crypto.createHmac("sha256", signingKey).update(value).digest("hex");
  return hmac === signature;
}

function parseFromHeader(raw: string): { address: string; name: string } {
  if (!raw) return { address: "unknown@unknown.com", name: "Unknown" };
  const match = raw.match(/^(.*?)\s*<([^>]+)>$/);
  if (match) return { address: match[2].trim(), name: match[1].trim() || match[2].split("@")[0] };
  return { address: raw.trim(), name: raw.split("@")[0] || raw };
}

router.post("/mailgun", async (req, res) => {
  const signingKey = process.env["MAILGUN_WEBHOOK_SIGNING_KEY"];

  if (signingKey) {
    const { timestamp, token, signature } = req.body as {
      timestamp?: string; token?: string; signature?: string;
    };
    if (!timestamp || !token || !signature) {
      res.status(400).json({ error: "Missing Mailgun signature fields" });
      return;
    }
    if (!verifyMailgunSignature(signingKey, timestamp, token, signature)) {
      req.log.warn("Invalid Mailgun webhook signature");
      res.status(401).json({ error: "Invalid signature" });
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

    req.log.info({ recipient, from: fromAddress, subject }, "Stored inbound email");
    res.status(200).json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "Failed to store inbound email");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
