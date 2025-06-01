import { integer, pgTable, varchar, uniqueIndex, index, foreignKey, primaryKey } from "drizzle-orm/pg-core";

export const usersTable = pgTable("users", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  discord_id: varchar({ length: 255 }).notNull().unique(),
  name: varchar({ length: 255 }).notNull(),
});

export const currencyTable = pgTable("currency", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: varchar({ length: 255 }).notNull(),
  emoji: varchar({ length: 255 }).notNull(),
  guild: varchar({ length: 255 }).notNull(),
}, (t) => [
  uniqueIndex().on(t.emoji, t.guild),
  index().on(t.guild)
]);

export const bankTable = pgTable("bank_table", {
  user_id: integer().notNull().references(() => usersTable.id),
  currency_id: integer().notNull().references(() => currencyTable.id),
  coins: integer().notNull(),
}, t => [
  primaryKey({ columns: [t.user_id, t.currency_id] })
]);