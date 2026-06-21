import { pgTable, text, boolean, timestamp, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const mailboxesTable = pgTable("mailboxes", {
  id: text("id").primaryKey(),
  address: text("address").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const emailsTable = pgTable("emails", {
  id: serial("id").primaryKey(),
  mailboxAddress: text("mailbox_address").notNull(),
  fromAddress: text("from_address").notNull(),
  fromName: text("from_name").notNull().default(""),
  subject: text("subject").notNull().default("(No subject)"),
  bodyHtml: text("body_html"),
  bodyText: text("body_text"),
  receivedAt: timestamp("received_at").defaultNow().notNull(),
  isRead: boolean("is_read").notNull().default(false),
});

export const insertMailboxSchema = createInsertSchema(mailboxesTable);
export const insertEmailSchema = createInsertSchema(emailsTable).omit({ id: true });

export type Mailbox = typeof mailboxesTable.$inferSelect;
export type Email = typeof emailsTable.$inferSelect;
export type InsertEmail = z.infer<typeof insertEmailSchema>;
