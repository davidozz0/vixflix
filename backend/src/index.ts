import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import dotenv from "dotenv";
import bcryptjs from "bcryptjs";
import jwt from "jsonwebtoken";
import { db } from "./db/index.js";
import { profiles, watchlist } from "./db/schema.js";
import { eq, and, desc, inArray } from "drizzle-orm";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    console.log(`${req.method} ${req.originalUrl} -> ${res.statusCode} (${Date.now() - start}ms)`);
  });
  next();
});

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";
const TMDB_KEY = process.env.TMDB_API_KEY || "";
const TMDB_BASE = "https://api.themoviedb.org/3";


interface AuthRequest extends Request {
  profileId?: number;
}

function auth(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: "Missing token" });
  const token = header.replace("Bearer ", "");
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { profileId: number };
    req.profileId = payload.profileId;
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
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
    res.json({
      page: data.page,
      results: data.results.map((r: any) => normalizeMovie(r)),
    });
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
    const path = `/${type}/${tmdbId}`;
    const data = await tmdb(path, { append_to_response: "credits" });
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

// Profile routes
app.post("/api/profiles", async (req, res) => {
  const { name, pin } = req.body;
  if (!name || !pin || String(pin).length !== 4) {
    return res.status(400).json({ error: "Invalid name or pin" });
  }
  const pinHash = await bcryptjs.hash(String(pin), 10);
  const rows = db.insert(profiles).values({ name, pinHash }).returning().all();
  const profile = rows[0];
  const token = jwt.sign({ profileId: profile.id }, JWT_SECRET, { expiresIn: "7d" });
  res.json({ profile: { id: profile.id, name: profile.name }, token });
});

app.post("/api/profiles/login", async (req, res) => {
  const { name, pin } = req.body;
  if (!name || !pin) return res.status(400).json({ error: "Invalid name or pin" });
  const rows = db.select().from(profiles).where(eq(profiles.name, name)).all();
  if (rows.length === 0) return res.status(401).json({ error: "Not found" });
  const profile = rows[0];
  const ok = await bcryptjs.compare(String(pin), profile.pinHash);
  if (!ok) return res.status(401).json({ error: "Invalid pin" });
  const token = jwt.sign({ profileId: profile.id }, JWT_SECRET, { expiresIn: "7d" });
  res.json({ profile: { id: profile.id, name: profile.name }, token });
});

app.get("/api/profiles/me", auth, (req: AuthRequest, res) => {
  const profileId = req.profileId!;
  const rows = db.select({ id: profiles.id, name: profiles.name }).from(profiles).where(eq(profiles.id, profileId)).all();
  if (rows.length === 0) return res.status(404).json({ error: "Not found" });
  res.json(rows[0]);
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

  const existing = db
    .select()
    .from(watchlist)
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
    const results = await Promise.all(
      entries.map(async (e) => {
        try {
          const type = e.lastEpisode ? "tv" : "movie";
          const data = await tmdb(`/${type}/${e.tmdbId}`, {});
          return {
            tmdbId: e.tmdbId,
            title: data.title || data.name,
            posterPath: data.poster_path,
            type,
            lastSeason: e.lastSeason,
            lastEpisode: e.lastEpisode,
            resumeTimeSeconds: e.resumeTimeSeconds,
          };
        } catch {
          return null;
        }
      })
    );
    res.json(results.filter(Boolean));
  } catch (e: any) {
    res.status(502).json({ error: e.message });
  }
});

app.get("/api/watchlist/recommended", auth, async (req: AuthRequest, res) => {
  try {
    const profileId = req.profileId!;
    const recent = db.select().from(watchlist)
      .where(and(
        eq(watchlist.profileId, profileId),
        inArray(watchlist.status, ["watched", "watching"]),
      ))
      .orderBy(desc(watchlist.updatedAt))
      .limit(5)
      .all();

    if (recent.length === 0) return res.json([]);

    const watchlistIds = new Set(
      db.select({ tmdbId: watchlist.tmdbId }).from(watchlist)
        .where(eq(watchlist.profileId, profileId))
        .all().map(r => r.tmdbId)
    );

    const freq = new Map<number, { count: number; title: string; posterPath: string | null; type: string }>();

    for (const entry of recent) {
      const type = entry.lastEpisode ? "tv" : "movie";
      try {
        const data = await tmdb(`/${type}/${entry.tmdbId}/recommendations`, {});
        for (const r of (data.results || [])) {
          if (watchlistIds.has(r.id)) continue;
          const existing = freq.get(r.id);
          if (existing) {
            existing.count++;
          } else {
            freq.set(r.id, {
              count: 1,
              title: r.title || r.name,
              posterPath: r.poster_path,
              type: r.title ? "movie" : "tv",
            });
          }
        }
      } catch { /* skip failed */ }
    }

    const sorted = Array.from(freq.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 20)
      .map(([tmdbId, v]) => ({ tmdbId, ...v }));

    res.json(sorted);
  } catch (e: any) {
    res.status(502).json({ error: e.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Backend listening on port ${PORT}`);
});
