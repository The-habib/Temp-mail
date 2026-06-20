import { Router } from "express";

const router = Router();

const MAILTM_BASE = "https://api.mail.tm";

const tokenStore = new Map<string, string>();

async function mailtmFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const url = `${MAILTM_BASE}${path}`;
  return fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      ...(options.headers as Record<string, string> || {}),
    },
  });
}

router.get("/domains", async (req, res) => {
  try {
    const response = await mailtmFetch("/domains?page=1");
    if (!response.ok) {
      res.status(response.status).json({ error: "Failed to fetch domains" });
      return;
    }
    const raw = await response.json() as Array<{ id: string; domain: string; isActive: boolean }> | { "hydra:member": Array<{ id: string; domain: string; isActive: boolean }> };
    const list = Array.isArray(raw) ? raw : (raw["hydra:member"] || []);
    const domains = list.map((d) => ({
      id: d.id,
      domain: d.domain,
      isActive: d.isActive,
    }));
    res.json(domains);
  } catch (err) {
    req.log.error({ err }, "Failed to fetch domains");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/mailbox", async (req, res) => {
  const { address, password } = req.body as { address: string; password: string };

  if (!address || !password) {
    res.status(400).json({ error: "address and password are required" });
    return;
  }

  try {
    const createResp = await mailtmFetch("/accounts", {
      method: "POST",
      body: JSON.stringify({ address, password }),
    });

    if (!createResp.ok) {
      const errBody = await createResp.text();
      req.log.error({ status: createResp.status, body: errBody }, "Failed to create account");
      res.status(createResp.status).json({ error: "Failed to create mailbox" });
      return;
    }

    const account = await createResp.json() as { id: string; address: string; createdAt: string };

    const tokenResp = await mailtmFetch("/token", {
      method: "POST",
      body: JSON.stringify({ address, password }),
    });

    if (!tokenResp.ok) {
      req.log.error({ status: tokenResp.status }, "Failed to get token");
      res.status(500).json({ error: "Failed to authenticate mailbox" });
      return;
    }

    const tokenData = await tokenResp.json() as { token: string };

    tokenStore.set(account.id, tokenData.token);

    res.status(201).json({
      id: account.id,
      address: account.address,
      token: tokenData.token,
      createdAt: account.createdAt,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to create mailbox");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/mailbox/:id/messages", async (req, res) => {
  const { id } = req.params;
  const authHeader = req.headers.authorization;
  const token = authHeader?.replace("Bearer ", "") || tokenStore.get(id);

  if (!token) {
    res.status(401).json({ error: "No token available for this mailbox" });
    return;
  }

  try {
    const response = await mailtmFetch("/messages?page=1", {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      res.status(response.status).json({ error: "Failed to fetch messages" });
      return;
    }

    type MsgItem = {
      id: string;
      from: { address: string; name: string };
      subject: string;
      intro: string;
      seen: boolean;
      createdAt: string;
    };
    const rawMsgs = await response.json() as MsgItem[] | { "hydra:member": MsgItem[] };
    const msgList = Array.isArray(rawMsgs) ? rawMsgs : (rawMsgs["hydra:member"] || []);

    const messages = msgList.map((m) => ({
      id: m.id,
      from: m.from,
      subject: m.subject,
      intro: m.intro,
      seen: m.seen,
      createdAt: m.createdAt,
    }));

    res.json(messages);
  } catch (err) {
    req.log.error({ err }, "Failed to fetch messages");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/mailbox/:id/messages/:messageId", async (req, res) => {
  const { id, messageId } = req.params;
  const authHeader = req.headers.authorization;
  const token = authHeader?.replace("Bearer ", "") || tokenStore.get(id);

  if (!token) {
    res.status(401).json({ error: "No token available for this mailbox" });
    return;
  }

  try {
    const response = await mailtmFetch(`/messages/${messageId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      res.status(response.status).json({ error: "Failed to fetch message" });
      return;
    }

    const m = await response.json() as {
      id: string;
      from: { address: string; name: string };
      to: Array<{ address: string; name: string }>;
      subject: string;
      intro: string;
      text?: string;
      html?: string[];
      seen: boolean;
      createdAt: string;
    };

    res.json({
      id: m.id,
      from: m.from,
      to: m.to || [],
      subject: m.subject,
      intro: m.intro,
      text: m.text || null,
      html: Array.isArray(m.html) ? m.html.join("") : (m.html || null),
      seen: m.seen,
      createdAt: m.createdAt,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to fetch message detail");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/mailbox/:id/messages/:messageId", async (req, res) => {
  const { id, messageId } = req.params;
  const authHeader = req.headers.authorization;
  const token = authHeader?.replace("Bearer ", "") || tokenStore.get(id);

  if (!token) {
    res.status(401).json({ error: "No token available for this mailbox" });
    return;
  }

  try {
    const response = await mailtmFetch(`/messages/${messageId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok && response.status !== 404) {
      res.status(response.status).json({ error: "Failed to delete message" });
      return;
    }

    res.status(204).end();
  } catch (err) {
    req.log.error({ err }, "Failed to delete message");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
