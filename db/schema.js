import { integer, pgTable, varchar } from "drizzle-orm/pg-core";

export const quotesTable = pgTable("quotes", {
    UUID: varchar().primaryKey().notNull(),
    guildId: varchar().notNull(),
    person: varchar().notNull(),
    quote: varchar().notNull()
});