export type ProviderKey = "mailtm" | "guerrillamail" | "templol";

export interface SessionEntry {
  provider: ProviderKey;
  token: string;
  address: string;
}

export const sessionStore = new Map<string, SessionEntry>();
