import { integer, pgTable, varchar, uniqueIndex, index, foreignKey, primaryKey, pgEnum, unique, boolean, timestamp } from "drizzle-orm/pg-core";

export const usersTable = pgTable("users", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  discord_id: varchar({ length: 255 }).notNull(),
  name: varchar({ length: 255 }).notNull(),
  created_at: timestamp().notNull().defaultNow(),
  updated_at: timestamp().notNull().defaultNow(),
}, (table) => [
  uniqueIndex().on(table.discord_id)
]);

export const currencyTable = pgTable("currency", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: varchar({ length: 255 }).notNull(),
  emoji: varchar({ length: 255 }).notNull(),
  guild: varchar({ length: 255 }).notNull(),
  createdAt: timestamp().notNull().defaultNow(),
  updated_at: timestamp().notNull().defaultNow(),
}, (t) => [
  uniqueIndex().on(t.emoji, t.guild),
  index().on(t.guild)
]);

export const bankTable = pgTable("bank_table", {
  user_id: integer().notNull().references(() => usersTable.id),
  currency_id: integer().notNull().references(() => currencyTable.id),
  coins: integer().notNull(),
  createdAt: timestamp().notNull().defaultNow(),
  updated_at: timestamp().notNull().defaultNow(),
}, t => [
  primaryKey({ columns: [t.user_id, t.currency_id] })
]);

export const guildChannelType = pgEnum("guild_channel_type", ["spam_channel"]);

export const guildChannel = pgTable("guild_channel", {
  guild: varchar({ length: 255 }).notNull(),
  channel: varchar({ length: 255 }).notNull(),
  type: guildChannelType().notNull(),
  createdAt: timestamp().notNull().defaultNow(),
  updated_at: timestamp().notNull().defaultNow(),
}, (t) => [
  primaryKey({ columns: [t.guild, t.channel] })
]);

export const mentionableStateValues = ['is_mentionable', 'blocked_by_discord', 'blocked_by_user'] as const;
export type MentionableStateType = typeof mentionableStateValues[number];

export const mentionableState = pgEnum('mentionable_state', mentionableStateValues);

export const role = pgTable("roles", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  guild: varchar({ length: 255 }).notNull(),
  role_name: varchar({ length: 255 }),
  role_discord_id: varchar({ length: 255 }).notNull(),
  is_mentionable: mentionableState().notNull(),
  createdAt: timestamp().notNull().defaultNow(),
  updated_at: timestamp().notNull().defaultNow(),
}, (table) => [
  index().on(table.guild, table.role_discord_id),
]);

export const userRoles = pgTable("user_roles", {
  user_id: integer().notNull().references(() => usersTable.id),
  role_id: integer().notNull().references(() => role.id),
  active: boolean().notNull().default(true),
  createdAt: timestamp().notNull().defaultNow(),
  updated_at: timestamp().notNull().defaultNow(),
}, (table) => [
  primaryKey({ columns: [table.user_id, table.role_id] }),
  index().on(table.user_id)
]);