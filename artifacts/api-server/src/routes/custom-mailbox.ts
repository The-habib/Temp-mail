import { Router } from "express";
import { randomUUID } from "crypto";
import { db } from "@workspace/db";
import { mailboxesTable, emailsTable } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";
import { readBrevoConfig } from "../lib/brevo-config.js";

const router = Router();

function adjective() {
  const adjs = ["swift","quiet","brave","calm","dark","fresh","gold","happy","icy","jolly","kind","lazy","merry","neat","odd","pink","quick","red","silver","tall","vast","warm","zesty","bold","cool","deft","epic","fine","great"];
  return adjs[Math.floor(Math.random() * adjs.length)];
}

function noun() {
  const nouns = ["fox","owl","hawk","wolf","bear","deer","lion","tiger","eagle","raven","storm","river","ocean","flame","spark","cloud","stone","blade","arrow","forge","cedar","maple","birch","pine","grove","creek","ridge","vale"];
  return nouns[Math.floor(Math.random() * nouns.length)];
}

function randomNum() {
  return Math.floor(Math.random() * 900 + 100).toString();
}

export function generateLocalPart(): string {
  return `${adjective()}.${noun()}${randomNum()}`;
}

router.post("/custom-mailbox", async (req, res) => {
  const config = readBrevoConfig();
  if (!config?.domain) {
    res.status(503).json({ error: "Custom domain not configured" });
    return;
  }

  const { localPart } = req.body as { localPart?: string };
  const local = (localPart?.trim() || generateLocalPart()).toLowerCase().replace(/[^a-z0-9._-]/g, "");
  const address = `${local}@${config.domain}`;
  const id = `cm_${randomUUID()}`;

  try {
    await db.insert(mailboxesTable).values({ id, address }).onConflictDoNothing();
    res.status(201).json({
      id,
      address,
      token: id,
      createdAt: new Date().toISOString(),
      provider: "custom",
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to create custom mailbox" });
  }
});

router.get("/custom-mailbox/:id/messages", async (req, res) => {
  const { id } = req.params;

  const mailbox = await db.select().from(mailboxesTable).where(eq(mailboxesTable.id, id)).limit(1);
  if (!mailbox.length) {
    res.status(404).json({ error: "Mailbox not found" });
    return;
  }

  const address = mailbox[0]!.address;
  const emails = await db
    .select()
    .from(emailsTable)
    .where(eq(emailsTable.mailboxAddress, address))
    .orderBy(desc(emailsTable.receivedAt))
    .limit(50);

  res.json(
    emails.map((e) => ({
      id: String(e.id),
      from: { address: e.fromAddress, name: e.fromName },
      subject: e.subject,
      intro: (e.bodyText || "").substring(0, 120),
      seen: e.isRead,
      createdAt: e.receivedAt.toISOString(),
    })),
  );
});

router.get("/custom-mailbox/:id/messages/:msgId", async (req, res) => {
  const { id, msgId } = req.params;

  const mailbox = await db.select().from(mailboxesTable).where(eq(mailboxesTable.id, id)).limit(1);
  if (!mailbox.length) {
    res.status(404).json({ error: "Mailbox not found" });
    return;
  }

  const address = mailbox[0]!.address;
  const msgIdNum = parseInt(msgId, 10);
  if (isNaN(msgIdNum)) {
    res.status(400).json({ error: "Invalid message ID" });
    return;
  }

  const emails = await db
    .select()
    .from(emailsTable)
    .where(eq(emailsTable.id, msgIdNum))
    .limit(1);

  const email = emails[0];
  if (!email || email.mailboxAddress !== address) {
    res.status(404).json({ error: "Message not found" });
    return;
  }

  await db.update(emailsTable).set({ isRead: true }).where(eq(emailsTable.id, msgIdNum));

  res.json({
    id: String(email.id),
    from: { address: email.fromAddress, name: email.fromName },
    to: [{ address, name: "" }],
    subject: email.subject,
    intro: (email.bodyText || "").substring(0, 120),
    html: email.bodyHtml || null,
    text: email.bodyText || null,
    seen: true,
    createdAt: email.receivedAt.toISOString(),
  });
});

router.delete("/custom-mailbox/:id/messages/:msgId", async (req, res) => {
  const msgIdNum = parseInt(req.params.msgId!, 10);
  if (!isNaN(msgIdNum)) {
    await db.delete(emailsTable).where(eq(emailsTable.id, msgIdNum));
  }
  res.status(204).end();
});

export default router;
