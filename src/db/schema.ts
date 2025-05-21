import { integer, pgTable, varchar, uniqueIndex, index, foreignKey, primaryKey } from "drizzle-orm/pg-core";

export const usersTable = pgTable("users", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: varchar({ length: 255 }).notNull(),
  age: integer().notNull(),
  email: varchar({ length: 255 }).notNull().unique(),
});

export const bankTable = pgTable("bank", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: varchar({ length: 255 }).notNull(),
  emoji: varchar({ length: 255 }).notNull(),
  guild: varchar({ length: 255 }).notNull(),
}, (t) => [
  uniqueIndex().on(t.emoji, t.guild),
  index().on(t.guild)
]);

export const userRecordsTable = pgTable("record", {
  userId: integer().notNull(),
  bankId: integer().notNull(),
  coins: integer().notNull(),
}, t => [
  primaryKey({ columns: [t.userId, t.bankId] }),
  foreignKey({ columns: [t.userId], foreignColumns: [ usersTable.id] }),
  foreignKey({ columns: [t.bankId], foreignColumns: [ bankTable.id] }),
]);