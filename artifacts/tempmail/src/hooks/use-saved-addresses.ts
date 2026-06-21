import { useState, useCallback } from "react";

const STORAGE_KEY = "tempmail_saved_addresses";

export interface SavedAddress {
  id: string;
  username: string;
  domain: string;
  address: string;
  provider: string;
  savedAt: number;
}

function load(): SavedAddress[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function persist(list: SavedAddress[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function useSavedAddresses() {
  const [saved, setSaved] = useState<SavedAddress[]>(load);

  const save = useCallback((entry: Omit<SavedAddress, "id" | "savedAt">) => {
    setSaved((prev) => {
      if (prev.some((s) => s.address === entry.address)) return prev;
      const next = [
        { ...entry, id: crypto.randomUUID(), savedAt: Date.now() },
        ...prev,
      ].slice(0, 20);
      persist(next);
      return next;
    });
  }, []);

  const remove = useCallback((id: string) => {
    setSaved((prev) => {
      const next = prev.filter((s) => s.id !== id);
      persist(next);
      return next;
    });
  }, []);

  return { saved, save, remove };
}
