import { Router } from "express";
import webpush from "web-push";
import { sessionStore } from "../lib/session-store.js";

const router = Router();

const VAPID_PUBLIC_KEY  = "BJjKRflKy6mNEKtE3_GwdFo78aVgNKRS0GgU3ip-q5ShEbLgq2XLeMZs1sCDPsqkGLqcxEHZy1_okJ7yFrfszxA";
const VAPID_PRIVATE_KEY = "gBL-OJiGEowfugJueCqOWQ34yOBrOBeZF-UjJ6qjv58";

webpush.setVapidDetails(
  "mailto:admin@mail-temp.eu.cc",
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY,
);

interface PushEntry {
  subscription: webpush.PushSubscription;
  mailboxId: string;
  knownIds: Set<string>;
}

const pushStore = new Map<string, PushEntry>();

// ─── Provider fetch helpers (mirrored from mailbox.ts) ───────────────────────

const MAILTM_BASE    = "https://api.mail.tm";
const GUERRILLA_BASE = "https://api.guerrillamail.com/ajax.php";
const TEMPLOL_BASE   = "https://api.tempmail.lol";

async function fetchMessages(mailboxId: string): Promise<{ id: string; subject: string; from: string }[]> {
  const session = sessionStore.get(mailboxId);
  if (!session) return [];

  try {
    if (session.provider === "mailtm") {
      const res = await fetch(`${MAILTM_BASE}/messages?page=1`, {
        headers: { Authorization: `Bearer ${session.token}`, Accept: "application/json" },
      });
      if (!res.ok) return [];
      type MsgItem = { id: string; from: { address: string; name: string }; subject: string };
      const raw = await res.json() as MsgItem[] | { "hydra:member": MsgItem[] };
      const list = Array.isArray(raw) ? raw : (raw["hydra:member"] || []);
      return list.map((m) => ({ id: m.id, subject: m.subject || "(No subject)", from: m.from?.name || m.from?.address || "Unknown" }));
    }

    if (session.provider === "guerrillamail") {
      const qs = new URLSearchParams({ lang: "en", f: "check_email", seq: "0", sid_token: session.token }).toString();
      const res = await fetch(`${GUERRILLA_BASE}?${qs}`, { headers: { Accept: "application/json" } });
      if (!res.ok) return [];
      const gm = await res.json() as { list: Array<{ mail_id: string; mail_subject: string; mail_from: string }> | null };
      return (gm.list ?? []).map((m) => ({ id: m.mail_id, subject: m.mail_subject || "(No subject)", from: m.mail_from || "Unknown" }));
    }

    if (session.provider === "templol") {
      const res = await fetch(`${TEMPLOL_BASE}/auth/token=${encodeURIComponent(session.token)}`, { headers: { Accept: "application/json" } });
      if (!res.ok) return [];
      const lol = await res.json() as { email: Array<{ id: string; subject: string; from: string }> | null };
      return (lol.email ?? []).map((m) => ({ id: m.id, subject: m.subject || "(No subject)", from: m.from || "Unknown" }));
    }
  } catch {
    // swallow errors in background poller
  }
  return [];
}

// ─── Background polling loop (every 20 s) ───────────────────────────────────

setInterval(async () => {
  for (const [, entry] of pushStore) {
    const messages = await fetchMessages(entry.mailboxId);
    const newOnes  = messages.filter((m) => !entry.knownIds.has(m.id));

    for (const msg of newOnes) {
      entry.knownIds.add(msg.id);
      try {
        await webpush.sendNotification(
          entry.subscription,
          JSON.stringify({
            title: `New email from ${msg.from}`,
            body: msg.subject,
            url: "/",
          }),
        );
      } catch {
        // subscription expired or invalid — remove it
        pushStore.delete(entry.mailboxId);
        break;
      }
    }
  }
}, 20_000);

// ─── GET /push/vapid-public-key ──────────────────────────────────────────────

router.get("/push/vapid-public-key", (_req, res) => {
  res.json({ publicKey: VAPID_PUBLIC_KEY });
});

// ─── POST /push/subscribe ────────────────────────────────────────────────────

router.post("/push/subscribe", async (req, res) => {
  const { mailboxId, subscription } = req.body as {
    mailboxId: string;
    subscription: webpush.PushSubscription;
  };

  if (!mailboxId || !subscription?.endpoint) {
    res.status(400).json({ error: "mailboxId and subscription are required" });
    return;
  }

  const existing = pushStore.get(mailboxId);
  const knownIds = existing?.knownIds ?? new Set<string>();

  // Seed known IDs on first subscribe so we don't re-notify old messages
  if (!existing) {
    const messages = await fetchMessages(mailboxId);
    messages.forEach((m) => knownIds.add(m.id));
  }

  pushStore.set(mailboxId, { subscription, mailboxId, knownIds });
  res.status(201).json({ ok: true });
});

// ─── DELETE /push/unsubscribe/:mailboxId ─────────────────────────────────────

router.delete("/push/unsubscribe/:mailboxId", (req, res) => {
  pushStore.delete(req.params.mailboxId);
  res.status(204).end();
});

export default router;
