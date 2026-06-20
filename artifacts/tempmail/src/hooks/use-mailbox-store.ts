import { createContext, useContext, useState, ReactNode, createElement } from "react";
import { Mailbox } from "@workspace/api-client-react/src/generated/api.schemas";

const STORAGE_KEY = "tempmail_mailbox";

interface MailboxContextType {
  mailbox: Mailbox | null;
  setMailbox: (mailbox: Mailbox | null) => void;
}

const MailboxContext = createContext<MailboxContextType | null>(null);

export function MailboxProvider({ children }: { children: ReactNode }) {
  const [mailbox, setMailboxState] = useState<Mailbox | null>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return null;
      }
    }
    return null;
  });

  const setMailbox = (m: Mailbox | null) => {
    setMailboxState(m);
    if (m) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(m));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  return createElement(MailboxContext.Provider, { value: { mailbox, setMailbox } }, children);
}

export function useMailboxStore() {
  const ctx = useContext(MailboxContext);
  if (!ctx) throw new Error("useMailboxStore must be used within MailboxProvider");
  return ctx;
}
