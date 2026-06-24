import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const profiles = sqliteTable("profiles", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  pinHash: text("pin_hash").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const sessions = sqliteTable("sessions", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  profileId: integer("profile_id", { mode: "number" }).notNull().references(() => profiles.id, { onDelete: "cascade" }),
  token: text("token").notNull(),
  ip: text("ip"),
  userAgent: text("user_agent"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`CURRENT_TIMESTAMP`),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
});

export const loginLogs = sqliteTable("login_logs", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  profileId: integer("profile_id", { mode: "number" }).notNull().references(() => profiles.id, { onDelete: "cascade" }),
  ip: text("ip"),
  userAgent: text("user_agent"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const wishlist = sqliteTable("wishlist", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  profileId: integer("profile_id", { mode: "number" }).notNull().references(() => profiles.id, { onDelete: "cascade" }),
  tmdbId: integer("tmdb_id", { mode: "number" }).notNull(),
  title: text("title").notNull(),
  posterPath: text("poster_path"),
  type: text("type", { enum: ["movie", "tv"] }).notNull().default("movie"),
  addedAt: integer("added_at", { mode: "timestamp" }).notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const watchlist = sqliteTable("watchlist", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  profileId: integer("profile_id", { mode: "number" }).notNull().references(() => profiles.id, { onDelete: "cascade" }),
  tmdbId: integer("tmdb_id", { mode: "number" }).notNull(),
  status: text("status", { enum: ["unwatched", "watching", "watched"] }).notNull().default("unwatched"),
  lastSeason: integer("last_season"),
  lastEpisode: integer("last_episode"),
  resumeTimeSeconds: integer("resume_time_seconds").notNull().default(0),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`CURRENT_TIMESTAMP`),
});
