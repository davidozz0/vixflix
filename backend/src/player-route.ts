// backend/src/player-route.ts
// Route per player page HTML + M3U8 proxy

import { Router, Request, Response } from "express";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { scrapeStream, proxyFetch } from "./scraper.js";
import { get } from "./m3u8-cache.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const srcDir = join(__dirname, "..", "src");
const playerTemplate = readFileSync(join(srcDir, "player-page.html"), "utf-8");
const playerTestTemplate = readFileSync(join(srcDir, "player-test.html"), "utf-8");

const router = Router();

// Player page for movies
router.get("/player/movie/:tmdbId", async (req: Request, res: Response) => {
  const tmdbId = Number(req.params.tmdbId);
  if (isNaN(tmdbId)) return res.status(400).send("Invalid tmdbId");

  try {
    const result = await scrapeStream(tmdbId, "movie");
    if (!result) {
      return sendErrorPage(res, tmdbId, "movie");
    }

    const m3u8ProxyUrl = `/api/player/stream/${result.cacheKey}.m3u8`;
    const fallbackUrl = `https://vixsrc.to/movie/${tmdbId}?lang=it&autoplay=true`;
    console.log(`[player-route] Serving player page for movie ${tmdbId}, M3U8 proxy: ${m3u8ProxyUrl}`);
    const html = playerTemplate
      .replaceAll("{{M3U8_URL}}", m3u8ProxyUrl)
      .replaceAll("{{FALLBACK_URL}}", fallbackUrl);
    res.send(html);
  } catch (err: any) {
    console.error(`[player-route] Error for movie ${tmdbId}:`, err.message);
    return sendErrorPage(res, tmdbId, "movie");
  }
});

// Player page for TV
router.get("/player/tv/:tmdbId/:season/:episode", async (req: Request, res: Response) => {
  const tmdbId = Number(req.params.tmdbId);
  const season = Number(req.params.season);
  const episode = Number(req.params.episode);
  if (isNaN(tmdbId) || isNaN(season) || isNaN(episode)) {
    return res.status(400).send("Invalid parameters");
  }

  try {
    const result = await scrapeStream(tmdbId, "tv", season, episode);
    if (!result) {
      return sendErrorPage(res, tmdbId, "tv", season, episode);
    }

    const fallbackUrl = `https://vixsrc.to/tv/${tmdbId}/${season}/${episode}?lang=it&autoplay=true`;
    const html = playerTemplate
      .replaceAll("{{M3U8_URL}}", `/api/player/stream/${result.cacheKey}.m3u8`)
      .replaceAll("{{FALLBACK_URL}}", fallbackUrl);
    res.send(html);
  } catch (err: any) {
    console.error(`[player-route] Error for tv ${tmdbId} S${season}E${episode}:`, err.message);
    return sendErrorPage(res, tmdbId, "tv", season, episode);
  }
});

// Serve cached M3U8 (gia con URL riscritte dallo scraper)
router.get("/player/stream/:key.m3u8", (req: Request, res: Response) => {
  const key = req.params.key as string;
  const entry = get(key);
  if (!entry) {
    console.log(`[player-route] M3U8 cache MISS for key=${key}`);
    return res.status(404).json({ error: "Stream not found or expired" });
  }

  const len = entry.m3u8.length;
  const firstLine = entry.m3u8.split("\n").find(l => l.trim()) || "";
  console.log(`[player-route] Serving M3U8 key=${key} (${len} chars), first line: ${firstLine.substring(0, 80)}`);
  res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.send(entry.m3u8);
});

// Riscrive URL relative in assolute in una M3U8, base = variantUrl
function rewriteM3u8Urls(m3u8Content: string, variantUrl: string): string {
  // Deriva base URL dalla variantUrl (senza query string, fino all'ultimo /)
  const qsIdx = variantUrl.indexOf("?");
  const baseUrl = qsIdx >= 0 ? variantUrl.substring(0, variantUrl.lastIndexOf("/", qsIdx) + 1) : variantUrl.substring(0, variantUrl.lastIndexOf("/") + 1);

  return m3u8Content.split("\n").map(line => {
    const trimmed = line.trim();
    // Salta tag e linee vuote
    if (!trimmed || trimmed.startsWith("#")) return line;
    // Salta URL gia assolute
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return line;
    // URL relativa → risolvi come assoluta
    try {
      const absolute = new URL(trimmed, baseUrl).href;
      return line.replace(trimmed, absolute);
    } catch {
      return line;
    }
  }).join("\n");
}

// Proxy: recupera variant playlist/segmenti da vixsrc.to usando sessione scraper
router.get("/player/fetch/:key", async (req: Request, res: Response) => {
  const key = req.params.key as string;
  const entry = get(key);
  if (!entry || !entry.variantUrl) {
    console.log(`[player-route] Proxy fetch MISS for key=${key}`);
    return res.status(404).json({ error: "Stream not found for proxy" });
  }

  console.log(`[player-route] Proxy fetching: ${entry.variantUrl.slice(0, 80)}`);
  const result = await proxyFetch(entry.variantUrl);
  if (!result) {
    return res.status(502).json({ error: "Proxy fetch failed" });
  }

  // Determina Content-Type dalla risposta
  const contentType = (result.headers["content-type"] as string) || "application/octet-stream";
  const dataLen = result.data ? (result.data.length || result.data.byteLength || 0) : 0;
  console.log(`[player-route] Proxy response: ${result.status} content-type=${contentType} size=${dataLen}`);

  let responseData = result.data;

  // Se e' M3U8, riscrivi URL relative in assolute
  const isM3u8 = contentType.includes("mpegurl") || contentType.includes("x-mpegurl");
  if (isM3u8) {
    const text = responseData instanceof ArrayBuffer
      ? new TextDecoder().decode(responseData)
      : String(responseData);
    const rewritten = rewriteM3u8Urls(text, entry.variantUrl);
    if (rewritten !== text) {
      console.log(`[player-route] Rewrote relative URLs in M3U8 (base: ${entry.variantUrl.slice(0, 60)}...)`);
    }
    responseData = rewritten;
  }

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "*");
  res.setHeader("Content-Type", contentType);
  res.send(Buffer.from(responseData));
});

// Test page — hardcoded TMDB ID
const TEST_TMDB_ID = 414906; // The Batman (2022) - funziona
router.get("/player/test", async (req: Request, res: Response) => {
  try {
    const result = await scrapeStream(TEST_TMDB_ID, "movie");
    if (!result) {
      return res.status(500).send("Scraping failed for test ID");
    }

    const m3u8Url = `/api/player/stream/${result.cacheKey}.m3u8`;
    const fallbackUrl = `https://vixsrc.to/movie/${TEST_TMDB_ID}?lang=it&autoplay=true`;
    const html = playerTestTemplate
      .replaceAll("{{M3U8_URL}}", m3u8Url)
      .replaceAll("{{FALLBACK_URL}}", fallbackUrl)
      .replaceAll("{{TMDB_ID}}", String(TEST_TMDB_ID));
    res.send(html);
  } catch (err: any) {
    console.error(`[player-route] Test page error:`, err.message);
    res.status(500).send("Test page error: " + err.message);
  }
});

function sendErrorPage(res: Response, tmdbId: number, type: string, season?: number, episode?: number) {
  const fallbackUrl = type === "tv" && season && episode
    ? `https://vixsrc.to/tv/${tmdbId}/${season}/${episode}?lang=it&autoplay=true`
    : `https://vixsrc.to/movie/${tmdbId}?lang=it&autoplay=true`;

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<style>
  body { margin:0; background:#000; color:#fff; font-family:sans-serif; display:flex; flex-direction:column; align-items:center; justify-content:center; height:100vh; gap:1rem; }
  h2 { color:#e50914; margin:0; }
  p { color:#aaa; margin:0; }
  button { padding:0.75rem 1.5rem; font-size:1rem; background:#e50914; color:#fff; border:none; border-radius:4px; cursor:pointer; }
  button:hover { opacity:0.9; }
</style></head>
<body>
  <h2>Stream non disponibile</h2>
  <p>Lo scraping dello stream ha fallito.</p>
  <button onclick="parent.location.href='${fallbackUrl}'">Riprova con player originale</button>
</body></html>`;

  res.send(html);
}

export default router;
