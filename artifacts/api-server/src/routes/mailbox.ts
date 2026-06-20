import { Router } from "express";
import { randomUUID } from "crypto";

const router = Router();

const MAILTM_BASE   = "https://api.mail.tm";
const GUERRILLA_BASE = "https://api.guerrillamail.com/ajax.php";
const TEMPLOL_BASE  = "https://api.tempmail.lol";

type ProviderKey = "mailtm" | "guerrillamail" | "templol";

interface SessionEntry {
  provider: ProviderKey;
  token: string;
  address: string;
}

const sessionStore = new Map<string, SessionEntry>();

// ─── helpers ────────────────────────────────────────────────────────────────

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

async function lolFetch(path: string): Promise<Response> {
  return fetch(`${TEMPLOL_BASE}${path}`, {
    headers: { "Accept": "application/json" },
  });
}

// ─── /providers ─────────────────────────────────────────────────────────────

router.get("/providers", (_req, res) => {
  res.json([
    { id: "mailtm",       name: "Mail.tm",       description: "Fast & reliable",    supportsCustom: true  },
    { id: "guerrillamail",name: "Guerrilla Mail", description: "Classic & trusted",  supportsCustom: true  },
    { id: "templol",      name: "TempMail.lol",   description: "Simple & instant",   supportsCustom: false },
  ]);
});

// ─── /domains ───────────────────────────────────────────────────────────────

router.get("/domains", async (req, res) => {
  try {
    const response = await mailtmFetch("/domains?page=1");
    if (!response.ok) {
      res.status(response.status).json({ error: "Failed to fetch domains" });
      return;
    }
    const raw = await response.json() as Array<{ id: string; domain: string; isActive: boolean }> | { "hydra:member": Array<{ id: string; domain: string; isActive: boolean }> };
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
    address: string;
    password: string;
    provider?: ProviderKey;
  };

  if (!address || !password) {
    res.status(400).json({ error: "address and password are required" });
    return;
  }

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
      if (!tokenResp.ok) {
        res.status(500).json({ error: "Failed to authenticate mailbox" });
        return;
      }
      const tokenData = await tokenResp.json() as { token: string };
      sessionStore.set(account.id, { provider: "mailtm", token: tokenData.token, address: account.address });
      res.status(201).json({
        id: account.id,
        address: account.address,
        token: tokenData.token,
        createdAt: account.createdAt,
        provider: "mailtm",
      });
      return;
    }

    // ── Guerrilla Mail ────────────────────────────────────────────────────────
    if (provider === "guerrillamail") {
      const username = address.split("@")[0] || "";
      const gmResp = await guerrillaFetch({ f: "get_email_address", email_user: username });
      if (!gmResp.ok) {
        res.status(502).json({ error: "Failed to reach Guerrilla Mail" });
        return;
      }
      const gm = await gmResp.json() as {
        email_addr: string;
        alias: string;
        sid_token: string;
        email_timestamp: number;
      };
      const id = `gm_${randomUUID()}`;
      const createdAt = new Date(gm.email_timestamp * 1000).toISOString();
      sessionStore.set(id, { provider: "guerrillamail", token: gm.sid_token, address: gm.email_addr });
      res.status(201).json({
        id,
        address: gm.email_addr,
        token: gm.sid_token,
        createdAt,
        provider: "guerrillamail",
      });
      return;
    }

    // ── TempMail.lol ──────────────────────────────────────────────────────────
    if (provider === "templol") {
      const lolResp = await lolFetch("/generate/rush");
      if (!lolResp.ok) {
        res.status(502).json({ error: "Failed to reach TempMail.lol" });
        return;
      }
      const lol = await lolResp.json() as { token: string; address: string };
      const id = `tl_${randomUUID()}`;
      sessionStore.set(id, { provider: "templol", token: lol.token, address: lol.address });
      res.status(201).json({
        id,
        address: lol.address,
        token: lol.token,
        createdAt: new Date().toISOString(),
        provider: "templol",
      });
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
    res.status(401).json({ error: "No session available for this mailbox" });
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
      type MsgItem = { id: string; from: { address: string; name: string }; subject: string; intro: string; seen: boolean; createdAt: string };
      const raw = await response.json() as MsgItem[] | { "hydra:member": MsgItem[] };
      const list = Array.isArray(raw) ? raw : (raw["hydra:member"] || []);
      res.json(list.map((m) => ({ id: m.id, from: m.from, subject: m.subject, intro: m.intro, seen: m.seen, createdAt: m.createdAt })));
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
        list: Array<{
          mail_id: string;
          mail_from: string;
          mail_subject: string;
          mail_excerpt: string;
          mail_timestamp: string;
          mail_read: string;
        }> | null;
      };
      const list = gm.list ?? [];
      res.json(list.map((m) => ({
        id: m.mail_id,
        from: { address: m.mail_from, name: m.mail_from.split("@")[0] || m.mail_from },
        subject: m.mail_subject || "(No subject)",
        intro: m.mail_excerpt || "",
        seen: m.mail_read !== "0",
        createdAt: new Date(parseInt(m.mail_timestamp) * 1000).toISOString(),
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
        from: { address: m.from || "unknown@unknown", name: (m.from || "").split("@")[0] || m.from || "Unknown" },
        subject: m.subject || "(No subject)",
        intro: (m.body || "").substring(0, 120),
        seen: false,
        createdAt: m.date ? new Date(m.date).toISOString() : new Date().toISOString(),
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
    res.status(401).json({ error: "No session available for this mailbox" });
    return;
  }

  const provider = session?.provider ?? "mailtm";

  try {
    // ── mail.tm ──────────────────────────────────────────────────────────────
    if (provider === "mailtm") {
      const response = await mailtmFetch(`/messages/${messageId}`, {
        headers: { Authorization: `Bearer ${rawToken}` },
      });
      if (!response.ok) {
        res.status(response.status).json({ error: "Failed to fetch message" });
        return;
      }
      const m = await response.json() as {
        id: string; from: { address: string; name: string }; to: Array<{ address: string; name: string }>;
        subject: string; intro: string; text?: string; html?: string[]; seen: boolean; createdAt: string;
      };
      res.json({
        id: m.id, from: m.from, to: m.to || [], subject: m.subject, intro: m.intro,
        text: m.text || null,
        html: Array.isArray(m.html) ? m.html.join("") : (m.html || null),
        seen: m.seen, createdAt: m.createdAt,
      });
      return;
    }

    // ── Guerrilla Mail ────────────────────────────────────────────────────────
    if (provider === "guerrillamail") {
      const gmResp = await guerrillaFetch({ f: "fetch_email", email_id: messageId, sid_token: rawToken! });
      if (!gmResp.ok) {
        res.status(502).json({ error: "Failed to fetch Guerrilla Mail message" });
        return;
      }
      const m = await gmResp.json() as {
        mail_id: string; mail_from: string; mail_recipient: string;
        mail_subject: string; mail_excerpt: string; mail_body: string; mail_date: string;
      };
      const fromAddr = m.mail_from || "unknown@unknown";
      res.json({
        id: m.mail_id,
        from: { address: fromAddr, name: fromAddr.split("@")[0] || fromAddr },
        to: [{ address: m.mail_recipient || session?.address || "", name: "" }],
        subject: m.mail_subject || "(No subject)",
        intro: m.mail_excerpt || "",
        text: m.mail_body || null,
        html: null,
        seen: true,
        createdAt: m.mail_date ? new Date(m.mail_date).toISOString() : new Date().toISOString(),
      });
      return;
    }

    // ── TempMail.lol — full body is in the list, re-fetch ────────────────────
    if (provider === "templol") {
      const lolResp = await lolFetch(`/auth/token=${encodeURIComponent(rawToken!)}`);
      if (!lolResp.ok) {
        res.status(lolResp.status).json({ error: "Failed to fetch TempMail.lol messages" });
        return;
      }
      const lol = await lolResp.json() as {
        email: Array<{ id: string; from: string; subject: string; body: string; html: string; date: string }> | null;
      };
      const list = lol.email ?? [];
      const m = list.find((e) => e.id === messageId) ?? list[0];
      if (!m) {
        res.status(404).json({ error: "Message not found" });
        return;
      }
      const fromAddr = m.from || "unknown@unknown";
      res.json({
        id: m.id,
        from: { address: fromAddr, name: fromAddr.split("@")[0] || fromAddr },
        to: [{ address: session?.address || "", name: "" }],
        subject: m.subject || "(No subject)",
        intro: (m.body || "").substring(0, 120),
        text: m.body || null,
        html: m.html || null,
        seen: true,
        createdAt: m.date ? new Date(m.date).toISOString() : new Date().toISOString(),
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
    res.status(401).json({ error: "No session available for this mailbox" });
    return;
  }

  const provider = session?.provider ?? "mailtm";

  try {
    // ── mail.tm ──────────────────────────────────────────────────────────────
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

    // ── Guerrilla Mail ────────────────────────────────────────────────────────
    if (provider === "guerrillamail") {
      await guerrillaFetch({ f: "del_email", [`email_ids[0]`]: messageId, sid_token: rawToken! });
      res.status(204).end();
      return;
    }

    // ── TempMail.lol — no delete API, return 204 anyway ──────────────────────
    if (provider === "templol") {
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
