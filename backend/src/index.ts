import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import bcryptjs from "bcryptjs";
import crypto from "crypto";
import { db } from "./db/index.js";
import { profiles, sessions, loginLogs, watchlist, wishlist } from "./db/schema.js";
import { eq, and, desc, inArray, lt, sql } from "drizzle-orm";

dotenv.config();

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    console.log(`${req.method} ${req.originalUrl} -> ${res.statusCode} (${Date.now() - start}ms)`);
  });
  next();
});

const SESSION_DAYS = 30;
const TMDB_KEY = process.env.TMDB_API_KEY || "";
const TMDB_BASE = "https://api.themoviedb.org/3";
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || "";

interface AuthRequest extends Request {
  profileId?: number;
}

async function auth(req: AuthRequest, res: Response, next: NextFunction) {
  const token = req.cookies?.session;
  if (!token) return res.status(401).json({ error: "Not authenticated" });
  const rows = db.select().from(sessions)
    .where(and(eq(sessions.token, token), lt(sessions.expiresAt, sql`datetime('now')`)))
    .all();
  if (rows.length === 0) {
    res.clearCookie("session");
    return res.status(401).json({ error: "Session expired" });
  }
  req.profileId = rows[0].profileId;
  next();
}

function getClientIp(req: Request): string {
  return (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim()
    || req.socket.remoteAddress
    || "";
}

async function sendTelegramMessage(text: string) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return;
  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text, parse_mode: "HTML" }),
    });
  } catch { /* optional */ }
}

async function tmdb(path: string, params?: Record<string, string>) {
  const url = new URL(TMDB_BASE + path);
  url.searchParams.set("language", "it-IT");
  if (params) {
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  }
  const start = Date.now();
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${TMDB_KEY}` },
  });
  const ms = Date.now() - start;
  if (!res.ok) {
    const body = await res.text();
    console.log(`TMDB ${path} -> ${res.status} (${ms}ms): ${body}`);
    throw new Error(`TMDB error ${res.status}`);
  }
  console.log(`TMDB ${path} -> OK (${ms}ms)`);
  return res.json();
}

function normalizeMovie(raw: any): any {
  return {
    tmdbId: raw.id,
    title: raw.title || raw.name,
    overview: raw.overview,
    posterPath: raw.poster_path,
    backdropPath: raw.backdrop_path,
    type: raw.title ? "movie" : "tv",
    genreIds: raw.genre_ids || raw.genres?.map((g: any) => g.id) || [],
    voteAverage: raw.vote_average,
    releaseDate: raw.release_date || raw.first_air_date,
  };
}

function normalizeDetail(raw: any, type: "movie" | "tv"): any {
  const base = normalizeMovie(raw);
  base.type = type;
  base.genres = raw.genres || [];
  if (type === "movie") {
    base.runtime = raw.runtime;
  } else {
    base.numberOfSeasons = raw.number_of_seasons;
    base.seasons = (raw.seasons || []).map((s: any) => ({
      seasonNumber: s.season_number,
      name: s.name,
      episodeCount: s.episode_count,
    }));
  }
  return base;
}

// Auth routes
app.post("/api/profiles/login", async (req, res) => {
  const { name, pin } = req.body;
  if (!name || !pin) return res.status(400).json({ error: "Invalid name or pin" });
  const rows = db.select().from(profiles).where(eq(profiles.name, name)).all();
  if (rows.length === 0) return res.status(401).json({ error: "Not found" });
  const profile = rows[0];
  const ok = await bcryptjs.compare(String(pin), profile.pinHash);
  if (!ok) return res.status(401).json({ error: "Invalid pin" });

  const ip = getClientIp(req);
  const ua = req.headers["user-agent"] || "";

  // Check if first login
  const prevLogins = db.select().from(loginLogs).where(eq(loginLogs.profileId, profile.id)).all();

  // Log the login
  db.insert(loginLogs).values({ profileId: profile.id, ip, userAgent: ua }).run();

  // Telegram on first login
  if (prevLogins.length === 0) {
    const msg = `<b>🔐 Nuovo accesso VixFlix</b>\nUtente: ${profile.name}\nIP: ${ip}\nBrowser: ${ua}`;
    sendTelegramMessage(msg);
  }

  // Create session
  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  db.insert(sessions).values({ profileId: profile.id, token, ip, userAgent: ua, expiresAt }).run();

  res.cookie("session", token, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: SESSION_DAYS * 24 * 60 * 60 * 1000,
    path: "/",
  });
  res.json({ profile: { id: profile.id, name: profile.name } });
});

app.post("/api/profiles/logout", auth, (req: AuthRequest, res) => {
  const token = req.cookies?.session;
  if (token) db.delete(sessions).where(eq(sessions.token, token)).run();
  res.clearCookie("session", { path: "/" });
  res.json({ ok: true });
});

app.get("/api/profiles/me", auth, (req: AuthRequest, res) => {
  const profileId = req.profileId!;
  const rows = db.select({ id: profiles.id, name: profiles.name }).from(profiles).where(eq(profiles.id, profileId)).all();
  if (rows.length === 0) return res.status(404).json({ error: "Not found" });
  res.json(rows[0]);
});

// TMDB routes
app.get("/api/trending", async (req, res) => {
  try {
    const type = (req.query.type as string) || "movie";
    const page = (req.query.page as string) || "1";
    const genre = req.query.genre as string;
    let path: string;
    const params: Record<string, string> = { page };
    if (genre) {
      path = `/discover/${type}`;
      params.with_genres = genre;
      params.sort_by = "popularity.desc";
    } else {
      path = type === "tv" ? "/trending/tv/week" : "/trending/movie/week";
    }
    const data = await tmdb(path, params);
    res.json({ page: data.page, results: data.results.map((r: any) => normalizeMovie(r)) });
  } catch (e: any) {
    res.status(502).json({ error: e.message });
  }
});

app.get("/api/genres", async (req, res) => {
  try {
    const type = (req.query.type as string) || "movie";
    const data = await tmdb(`/genre/${type}/list`, {});
    res.json(data.genres || []);
  } catch (e: any) {
    res.status(502).json({ error: e.message });
  }
});

app.get("/api/search", async (req, res) => {
  try {
    const q = req.query.q as string;
    const page = (req.query.page as string) || "1";
    const data = await tmdb("/search/multi", { query: q, page });
    const results = data.results
      .filter((r: any) => r.media_type === "movie" || r.media_type === "tv")
      .map((r: any) => normalizeMovie(r));
    res.json({ page: data.page, results });
  } catch (e: any) {
    res.status(502).json({ error: e.message });
  }
});

app.get("/api/content/:tmdbId", async (req, res) => {
  try {
    const tmdbId = Number(req.params.tmdbId);
    const type = (req.query.type as string) || "movie";
    const data = await tmdb(`/${type}/${tmdbId}`, { append_to_response: "credits" });
    res.json(normalizeDetail(data, type as "movie" | "tv"));
  } catch (e: any) {
    res.status(502).json({ error: e.message });
  }
});

app.get("/api/content/:tmdbId/season/:seasonNumber", async (req, res) => {
  try {
    const tmdbId = Number(req.params.tmdbId);
    const seasonNumber = Number(req.params.seasonNumber);
    const data = await tmdb(`/tv/${tmdbId}/season/${seasonNumber}`, {});
    const episodes = (data.episodes || []).map((ep: any) => ({
      seasonNumber: ep.season_number,
      episodeNumber: ep.episode_number,
      name: ep.name,
      overview: ep.overview,
    }));
    res.json({ seasonNumber, episodes });
  } catch (e: any) {
    res.status(502).json({ error: e.message });
  }
});

// Watchlist routes
app.get("/api/watchlist", auth, (req: AuthRequest, res) => {
  const profileId = req.profileId!;
  const rows = db.select().from(watchlist).where(eq(watchlist.profileId, profileId)).all();
  res.json(rows);
});

app.put("/api/watchlist/:tmdbId", auth, (req: AuthRequest, res) => {
  const profileId = req.profileId!;
  const tmdbId = Number(req.params.tmdbId);
  const { status, lastSeason, lastEpisode, resumeTimeSeconds } = req.body;
  const existing = db.select().from(watchlist)
    .where(and(eq(watchlist.profileId, profileId), eq(watchlist.tmdbId, tmdbId)))
    .all();
  if (existing.length > 0) {
    db.update(watchlist)
      .set({ status, lastSeason, lastEpisode, resumeTimeSeconds: resumeTimeSeconds ?? 0, updatedAt: new Date() })
      .where(eq(watchlist.id, existing[0].id))
      .run();
    res.json({ ok: true, updated: true });
  } else {
    db.insert(watchlist)
      .values({ profileId, tmdbId, status, lastSeason, lastEpisode, resumeTimeSeconds: resumeTimeSeconds ?? 0 })
      .run();
    res.json({ ok: true, created: true });
  }
});

app.get("/api/watchlist/continue", auth, async (req: AuthRequest, res) => {
  try {
    const profileId = req.profileId!;
    const entries = db.select().from(watchlist)
      .where(and(eq(watchlist.profileId, profileId), eq(watchlist.status, "watching")))
      .orderBy(desc(watchlist.updatedAt))
      .all();
    const results = await Promise.all(entries.map(async (e) => {
      try {
        const type = e.lastEpisode ? "tv" : "movie";
        const data = await tmdb(`/${type}/${e.tmdbId}`, {});
        return { tmdbId: e.tmdbId, title: data.title || data.name, posterPath: data.poster_path, type, lastSeason: e.lastSeason, lastEpisode: e.lastEpisode, resumeTimeSeconds: e.resumeTimeSeconds };
      } catch { return null; }
    }));
    res.json(results.filter(Boolean));
  } catch (e: any) {
    res.status(502).json({ error: e.message });
  }
});

app.get("/api/watchlist/recommended", auth, async (req: AuthRequest, res) => {
  try {
    const profileId = req.profileId!;

    // Watchlist: ultimi 5 watching/watched
    const recentWatchlist = db.select().from(watchlist)
      .where(and(eq(watchlist.profileId, profileId), inArray(watchlist.status, ["watched", "watching"])))
      .orderBy(desc(watchlist.updatedAt)).limit(5).all();

    // Wishlist: ultimi 5 items
    const recentWishlist = db.select().from(wishlist)
      .where(eq(wishlist.profileId, profileId))
      .orderBy(desc(wishlist.addedAt)).limit(5).all();

    if (recentWatchlist.length === 0 && recentWishlist.length === 0) return res.json([]);

    // Set di esclusione: contenuti gia' in watchlist o wishlist
    const allWatchlistIds = new Set(db.select({ tmdbId: watchlist.tmdbId }).from(watchlist).where(eq(watchlist.profileId, profileId)).all().map(r => r.tmdbId));
    const allWishlistIds = new Set(db.select({ tmdbId: wishlist.tmdbId }).from(wishlist).where(eq(wishlist.profileId, profileId)).all().map(r => r.tmdbId));
    const excludeIds = new Set([...allWatchlistIds, ...allWishlistIds]);

    // Frequenza raccomandazioni
    const freq = new Map<number, { count: number; title: string; posterPath: string | null; type: string }>();

    // Processa watchlist items
    for (const entry of recentWatchlist) {
      const type = entry.lastEpisode ? "tv" : "movie";
      try {
        const data = await tmdb(`/${type}/${entry.tmdbId}/recommendations`, {});
        for (const r of (data.results || [])) {
          if (excludeIds.has(r.id)) continue;
          const existing = freq.get(r.id);
          if (existing) { existing.count++; } else {
            freq.set(r.id, { count: 1, title: r.title || r.name, posterPath: r.poster_path, type: r.title ? "movie" : "tv" });
          }
        }
      } catch { /* skip */ }
    }

    // Processa wishlist items
    for (const entry of recentWishlist) {
      try {
        const data = await tmdb(`/${entry.type}/${entry.tmdbId}/recommendations`, {});
        for (const r of (data.results || [])) {
          if (excludeIds.has(r.id)) continue;
          const existing = freq.get(r.id);
          if (existing) { existing.count++; } else {
            freq.set(r.id, { count: 1, title: r.title || r.name, posterPath: r.poster_path, type: r.title ? "movie" : "tv" });
          }
        }
      } catch { /* skip */ }
    }

    const sorted = Array.from(freq.entries()).sort((a, b) => b[1].count - a[1].count).slice(0, 20).map(([tmdbId, v]) => ({ tmdbId, ...v }));
    res.json(sorted);
  } catch (e: any) {
    res.status(502).json({ error: e.message });
  }
});

// Wishlist routes
app.get("/api/wishlist", auth, (req: AuthRequest, res) => {
  const profileId = req.profileId!;
  const rows = db.select().from(wishlist).where(eq(wishlist.profileId, profileId)).orderBy(desc(wishlist.addedAt)).all();
  res.json(rows);
});

app.post("/api/wishlist/:tmdbId", auth, (req: AuthRequest, res) => {
  const profileId = req.profileId!;
  const tmdbId = Number(req.params.tmdbId);
  const { title, posterPath, type } = req.body;
  if (!title || !type) return res.status(400).json({ error: "Missing required fields" });
  const existing = db.select().from(wishlist)
    .where(and(eq(wishlist.profileId, profileId), eq(wishlist.tmdbId, tmdbId)))
    .all();
  if (existing.length === 0) {
    db.insert(wishlist).values({ profileId, tmdbId, title, posterPath, type }).run();
  }
  res.json({ ok: true });
});

app.delete("/api/wishlist/:tmdbId", auth, (req: AuthRequest, res) => {
  const profileId = req.profileId!;
  const tmdbId = Number(req.params.tmdbId);
  db.delete(wishlist).where(and(eq(wishlist.profileId, profileId), eq(wishlist.tmdbId, tmdbId))).run();
  res.json({ ok: true });
});

// Clean expired sessions hourly
setInterval(() => {
  db.delete(sessions).where(lt(sessions.expiresAt, sql`datetime('now')`)).run();
}, 60 * 60 * 1000);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Backend listening on port ${PORT}`);
});
