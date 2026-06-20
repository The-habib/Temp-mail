import { useState, useEffect } from "react";
import { Mailbox } from "@workspace/api-client-react/src/generated/api.schemas";

const STORAGE_KEY = "tempmail_mailbox";

export function useMailboxStore() {
  const [mailbox, setMailbox] = useState<Mailbox | null>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  useEffect(() => {
    if (mailbox) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(mailbox));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [mailbox]);

  return { mailbox, setMailbox };
}
