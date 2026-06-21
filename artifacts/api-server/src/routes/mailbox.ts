import { Router } from "express";
import { randomUUID } from "crypto";
import { sessionStore } from "../lib/session-store.js";
import type { ProviderKey } from "../lib/session-store.js";

const router = Router();

// ─── helpers ────────────────────────────────────────────────────────────────

function safeDate(val: unknown): string {
  if (!val) return new Date().toISOString();
  const d = new Date(String(val).replace(" ", "T"));
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

/** Parse "Name <email@x.com>" or plain "email@x.com" */
function parseFrom(raw: string): { address: string; name: string } {
  if (!raw) return { address: "unknown@unknown", name: "Unknown" };
  const match = raw.match(/^(.*?)\s*<([^>]+)>$/);
  if (match) return { address: match[2].trim(), name: match[1].trim() || match[2].split("@")[0] };
  return { address: raw.trim(), name: raw.split("@")[0] || raw };
}

/** Decide whether a body string is HTML or plain text */
function bodyFields(body: string | undefined | null): { html: string | null; text: string | null } {
  const b = (body ?? "").trim();
  if (!b) return { html: null, text: null };
  return /<[a-z][\s\S]*>/i.test(b)
    ? { html: b, text: null }
    : { html: null, text: b };
}

const MAILTM_BASE    = "https://api.mail.tm";
const GUERRILLA_BASE = "https://api.guerrillamail.com/ajax.php";
const TEMPLOL_BASE   = "https://api.tempmail.lol";

async function mailtmFetch(path: string, options: RequestInit = {}): Promise<Response> {
  return fetch(`${MAILTM_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      ...(options.headers as Record<string, string> || {}),
    },
  });
}

async function guerrillaFetch(params: Record<string, string>): Promise<Response> {
  const qs = new URLSearchParams({ lang: "en", ...params }).toString();
  return fetch(`${GUERRILLA_BASE}?${qs}`, {
    headers: { "Accept": "application/json" },
  });
}

/** Guerrilla Mail delete uses array bracket notation that URLSearchParams encodes — build manually */
async function guerrillaDeleteFetch(emailId: string, sidToken: string): Promise<Response> {
  const url = `${GUERRILLA_BASE}?f=del_email&lang=en&sid_token=${encodeURIComponent(sidToken)}&email_ids%5B0%5D=${encodeURIComponent(emailId)}`;
  return fetch(url, { headers: { "Accept": "application/json" } });
}

async function lolFetch(path: string): Promise<Response> {
  return fetch(`${TEMPLOL_BASE}${path}`, {
    headers: { "Accept": "application/json" },
  });
}

// ─── /providers ─────────────────────────────────────────────────────────────

router.get("/providers", (_req, res) => {
  res.json([
    { id: "mailtm",        name: "Mail.tm",        description: "Fast & reliable",   supportsCustom: true  },
    { id: "guerrillamail", name: "Guerrilla Mail",  description: "Classic & trusted", supportsCustom: true  },
    { id: "templol",       name: "TempMail.lol",    description: "Simple & instant",  supportsCustom: false },
  ]);
});

// ─── /domains ───────────────────────────────────────────────────────────────

const GUERRILLA_DOMAINS = [
  "grr.la", "guerrillamailblock.com", "guerrillamail.info",
  "guerrillamail.biz", "guerrillamail.de", "guerrillamail.net",
  "guerrillamail.org", "spam4.me",
].map((d) => ({ id: d, domain: d, isActive: true }));

router.get("/domains", async (req, res) => {
  const provider = (req.query.provider as string) || "mailtm";

  if (provider === "guerrillamail") { res.json(GUERRILLA_DOMAINS); return; }
  if (provider === "templol")       { res.json([]);                 return; }

  try {
    const response = await mailtmFetch("/domains?page=1");
    if (!response.ok) { res.status(response.status).json({ error: "Failed to fetch domains" }); return; }
    const raw = await response.json() as
      | Array<{ id: string; domain: string; isActive: boolean }>
      | { "hydra:member": Array<{ id: string; domain: string; isActive: boolean }> };
    const list = Array.isArray(raw) ? raw : (raw["hydra:member"] || []);
    res.json(list.map((d) => ({ id: d.id, domain: d.domain, isActive: d.isActive })));
  } catch (err) {
    req.log.error({ err }, "Failed to fetch domains");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── POST /mailbox ───────────────────────────────────────────────────────────

router.post("/mailbox", async (req, res) => {
  const { address, password, provider = "mailtm" } = req.body as {
    address: string; password: string; provider?: ProviderKey;
  };

  if (!address || !password) { res.status(400).json({ error: "address and password are required" }); return; }

  try {
    // ── mail.tm ──────────────────────────────────────────────────────────────
    if (provider === "mailtm") {
      const createResp = await mailtmFetch("/accounts", {
        method: "POST",
        body: JSON.stringify({ address, password }),
      });
      if (!createResp.ok) {
        const errBody = await createResp.text();
        req.log.error({ status: createResp.status, body: errBody }, "Failed to create mail.tm account");
        res.status(createResp.status).json({ error: "Failed to create mailbox" });
        return;
      }
      const account = await createResp.json() as { id: string; address: string; createdAt: string };
      const tokenResp = await mailtmFetch("/token", {
        method: "POST",
        body: JSON.stringify({ address, password }),
      });
      if (!tokenResp.ok) { res.status(500).json({ error: "Failed to authenticate mailbox" }); return; }
      const tokenData = await tokenResp.json() as { token: string };
      sessionStore.set(account.id, { provider: "mailtm", token: tokenData.token, address: account.address });
      res.status(201).json({ id: account.id, address: account.address, token: tokenData.token, createdAt: account.createdAt, provider: "mailtm" });
      return;
    }

    // ── Guerrilla Mail ────────────────────────────────────────────────────────
    if (provider === "guerrillamail") {
      const username   = address.split("@")[0] || "";
      const wantDomain = address.split("@")[1] || "grr.la";

      const gmResp = await guerrillaFetch({ f: "get_email_address", email_user: username });
      if (!gmResp.ok) { res.status(502).json({ error: "Failed to reach Guerrilla Mail" }); return; }
      const gm = await gmResp.json() as {
        email_addr: string; alias: string; sid_token: string; email_timestamp: number;
      };

      // Try to apply the requested domain (best-effort — Guerrilla Mail may ignore it)
      let finalAddress = gm.email_addr;
      const assignedDomain = finalAddress.split("@")[1] ?? "";
      if (wantDomain && wantDomain !== assignedDomain) {
        const setResp = await guerrillaFetch({
          f: "set_email_user", email_user: username, domain: wantDomain, sid_token: gm.sid_token,
        });
        if (setResp.ok) {
          const setData = await setResp.json() as { email_addr?: string };
          if (setData.email_addr) finalAddress = setData.email_addr;
        }
      }

      const id = `gm_${randomUUID()}`;
      const createdAt = new Date(gm.email_timestamp * 1000).toISOString();
      sessionStore.set(id, { provider: "guerrillamail", token: gm.sid_token, address: finalAddress });
      res.status(201).json({ id, address: finalAddress, token: gm.sid_token, createdAt, provider: "guerrillamail" });
      return;
    }

    // ── TempMail.lol ──────────────────────────────────────────────────────────
    if (provider === "templol") {
      const lolResp = await lolFetch("/generate/rush");
      if (!lolResp.ok) {
        const errText = await lolResp.text().catch(() => "(no body)");
        req.log.error({ status: lolResp.status, body: errText }, "TempMail.lol generation failed");
        res.status(502).json({ error: `TempMail.lol unavailable (${lolResp.status})` });
        return;
      }
      const lol = await lolResp.json() as { token: string; address: string };
      const id = `tl_${randomUUID()}`;
      sessionStore.set(id, { provider: "templol", token: lol.token, address: lol.address });
      res.status(201).json({ id, address: lol.address, token: lol.token, createdAt: new Date().toISOString(), provider: "templol" });
      return;
    }

    res.status(400).json({ error: `Unknown provider: ${provider}` });
  } catch (err) {
    req.log.error({ err }, "Failed to create mailbox");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── GET /mailbox/:id/messages ───────────────────────────────────────────────

router.get("/mailbox/:id/messages", async (req, res) => {
  const { id } = req.params;
  const session = sessionStore.get(id);
  const authHeader = req.headers.authorization;
  const rawToken = authHeader?.replace("Bearer ", "") || session?.token;

  if (!rawToken && !session) {
    res.status(401).json({ error: "Session not found — please create a new mailbox" });
    return;
  }

  const provider = session?.provider ?? "mailtm";

  try {
    // ── mail.tm ──────────────────────────────────────────────────────────────
    if (provider === "mailtm") {
      const response = await mailtmFetch("/messages?page=1", {
        headers: { Authorization: `Bearer ${rawToken}` },
      });
      if (!response.ok) {
        res.status(response.status).json({ error: "Failed to fetch messages" });
        return;
      }
      type MsgItem = {
        id: string; from: { address: string; name: string };
        subject: string; intro: string; seen: boolean; createdAt: string;
      };
      const raw = await response.json() as MsgItem[] | { "hydra:member": MsgItem[] };
      const list = Array.isArray(raw) ? raw : (raw["hydra:member"] || []);
      res.json(list.map((m) => ({
        id: m.id, from: m.from, subject: m.subject || "(No subject)",
        intro: m.intro || "", seen: m.seen, createdAt: m.createdAt,
      })));
      return;
    }

    // ── Guerrilla Mail ────────────────────────────────────────────────────────
    if (provider === "guerrillamail") {
      const gmResp = await guerrillaFetch({ f: "check_email", seq: "0", sid_token: rawToken! });
      if (!gmResp.ok) {
        res.status(502).json({ error: "Failed to fetch Guerrilla Mail messages" });
        return;
      }
      const gm = await gmResp.json() as {
        alias_error?: string;
        email_addr?: string;
        list: Array<{
          mail_id: string; mail_from: string; mail_subject: string;
          mail_excerpt: string; mail_timestamp: string; mail_read: string;
        }> | null;
      };

      // Detect expired / invalid session
      if (gm.alias_error && gm.alias_error !== "") {
        res.status(401).json({ error: "Guerrilla Mail session expired — please create a new mailbox" });
        return;
      }

      const list = gm.list ?? [];
      res.json(list.map((m) => ({
        id: m.mail_id,
        from: parseFrom(m.mail_from),
        subject: m.mail_subject || "(No subject)",
        intro: m.mail_excerpt || "",
        seen: m.mail_read !== "0",
        createdAt: new Date(parseInt(m.mail_timestamp, 10) * 1000).toISOString(),
      })));
      return;
    }

    // ── TempMail.lol ──────────────────────────────────────────────────────────
    if (provider === "templol") {
      const lolResp = await lolFetch(`/auth/token=${encodeURIComponent(rawToken!)}`);
      if (!lolResp.ok) {
        res.status(lolResp.status).json({ error: "Failed to fetch TempMail.lol messages" });
        return;
      }
      const lol = await lolResp.json() as {
        email: Array<{ id: string; from: string; subject: string; body: string; html: string; date: string }> | null;
        token?: string;
      };
      const list = lol.email ?? [];
      res.json(list.map((m) => ({
        id: m.id ?? `${Date.now()}_${Math.random()}`,
        from: parseFrom(m.from),
        subject: m.subject || "(No subject)",
        intro: (m.body || "").substring(0, 120),
        seen: false,
        createdAt: safeDate(m.date),
      })));
      return;
    }

    res.status(400).json({ error: "Unknown provider for this mailbox" });
  } catch (err) {
    req.log.error({ err }, "Failed to fetch messages");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── GET /mailbox/:id/messages/:messageId ────────────────────────────────────

router.get("/mailbox/:id/messages/:messageId", async (req, res) => {
  const { id, messageId } = req.params;
  const session = sessionStore.get(id);
  const authHeader = req.headers.authorization;
  const rawToken = authHeader?.replace("Bearer ", "") || session?.token;

  if (!rawToken && !session) {
    res.status(401).json({ error: "Session not found — please create a new mailbox" });
    return;
  }

  const provider = session?.provider ?? "mailtm";

  try {
    // ── mail.tm ──────────────────────────────────────────────────────────────
    if (provider === "mailtm") {
      const response = await mailtmFetch(`/messages/${messageId}`, {
        headers: { Authorization: `Bearer ${rawToken}` },
      });
      if (!response.ok) { res.status(response.status).json({ error: "Failed to fetch message" }); return; }
      const m = await response.json() as {
        id: string; from: { address: string; name: string }; to: Array<{ address: string; name: string }>;
        subject: string; intro: string; text?: string; html?: string | string[]; seen: boolean; createdAt: string;
      };
      // html can be string[] (multipart) or plain string
      let htmlBody: string | null = null;
      if (Array.isArray(m.html)) {
        htmlBody = m.html.length > 0 ? m.html.join("") : null;
      } else {
        htmlBody = m.html || null;
      }
      res.json({
        id: m.id, from: m.from, to: m.to || [],
        subject: m.subject || "(No subject)", intro: m.intro || "",
        text: htmlBody ? null : (m.text || null),
        html: htmlBody,
        seen: m.seen, createdAt: m.createdAt,
      });
      return;
    }

    // ── Guerrilla Mail ────────────────────────────────────────────────────────
    if (provider === "guerrillamail") {
      const gmResp = await guerrillaFetch({ f: "fetch_email", email_id: messageId, sid_token: rawToken! });
      if (!gmResp.ok) { res.status(502).json({ error: "Failed to fetch Guerrilla Mail message" }); return; }
      const m = await gmResp.json() as {
        mail_id: string; mail_from: string; mail_recipient: string;
        mail_subject: string; mail_excerpt: string; mail_body: string; mail_date: string;
      };
      if (!m.mail_id) { res.status(404).json({ error: "Message not found" }); return; }
      const from = parseFrom(m.mail_from);
      const { html, text } = bodyFields(m.mail_body);
      res.json({
        id: m.mail_id,
        from,
        to: [{ address: m.mail_recipient || session?.address || "", name: "" }],
        subject: m.mail_subject || "(No subject)",
        intro: m.mail_excerpt || "",
        text,
        html,
        seen: true,
        createdAt: safeDate(m.mail_date),
      });
      return;
    }

    // ── TempMail.lol ──────────────────────────────────────────────────────────
    if (provider === "templol") {
      const lolResp = await lolFetch(`/auth/token=${encodeURIComponent(rawToken!)}`);
      if (!lolResp.ok) { res.status(lolResp.status).json({ error: "Failed to fetch TempMail.lol messages" }); return; }
      const lol = await lolResp.json() as {
        email: Array<{ id: string; from: string; subject: string; body: string; html: string; date: string }> | null;
      };
      const list = lol.email ?? [];
      const m = list.find((e) => e.id === messageId) ?? list[0];
      if (!m) { res.status(404).json({ error: "Message not found" }); return; }
      const from = parseFrom(m.from);
      const { html, text } = bodyFields(m.html || m.body);
      res.json({
        id: m.id,
        from,
        to: [{ address: session?.address || "", name: "" }],
        subject: m.subject || "(No subject)",
        intro: (m.body || "").substring(0, 120),
        text,
        html,
        seen: true,
        createdAt: safeDate(m.date),
      });
      return;
    }

    res.status(400).json({ error: "Unknown provider for this mailbox" });
  } catch (err) {
    req.log.error({ err }, "Failed to fetch message detail");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── DELETE /mailbox/:id/messages/:messageId ─────────────────────────────────

router.delete("/mailbox/:id/messages/:messageId", async (req, res) => {
  const { id, messageId } = req.params;
  const session = sessionStore.get(id);
  const authHeader = req.headers.authorization;
  const rawToken = authHeader?.replace("Bearer ", "") || session?.token;

  if (!rawToken && !session) {
    res.status(401).json({ error: "Session not found" });
    return;
  }

  const provider = session?.provider ?? "mailtm";

  try {
    if (provider === "mailtm") {
      const response = await mailtmFetch(`/messages/${messageId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${rawToken}` },
      });
      if (!response.ok && response.status !== 404) {
        res.status(response.status).json({ error: "Failed to delete message" });
        return;
      }
      res.status(204).end();
      return;
    }

    if (provider === "guerrillamail") {
      // Use manually constructed URL to preserve bracket notation
      await guerrillaDeleteFetch(messageId, rawToken!);
      res.status(204).end();
      return;
    }

    if (provider === "templol") {
      // TempMail.lol has no delete API
      res.status(204).end();
      return;
    }

    res.status(400).json({ error: "Unknown provider" });
  } catch (err) {
    req.log.error({ err }, "Failed to delete message");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
