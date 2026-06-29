// backend/src/scraper.ts
// Porting TypeScript di stremio-vixsrc/extractor.py
// Scraping vixsrc.to per estrarre stream HLS

import axios, { AxiosInstance } from "axios";
import { set } from "./m3u8-cache.js";

const VIXSRC_BASE = "https://vixsrc.to";

const DEFAULT_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36",
  "Accept": "application/json, text/plain, */*",
  "Accept-Language": "it,en;q=0.9",
  "Origin": VIXSRC_BASE,
  "Referer": VIXSRC_BASE + "/",
};

const EMBED_HEADERS = {
  ...DEFAULT_HEADERS,
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Sec-Fetch-Dest": "iframe",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "same-origin",
  "Upgrade-Insecure-Requests": "1",
};

const PLAYLIST_HEADERS = {
  ...DEFAULT_HEADERS,
  "Accept": "*/*",
  "Origin": VIXSRC_BASE,
};

function extractJsonBlock(html: string, varName: string): string | null {
  const prefix = `window.${varName} = `;
  const start = html.indexOf(prefix);
  if (start === -1) return null;
  const valueStart = start + prefix.length;
  const end = html.indexOf(";", valueStart);
  if (end === -1) return null;
  return html.slice(valueStart, end).trim();
}

function filterM3u8(m3u8Text: string): string {
  const lines = m3u8Text.split("\n");
  // Trova variante con massima risoluzione
  let bestIdx = -1;
  let bestHeight = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith("#EXT-X-STREAM-INF:")) {
      const m = line.match(/RESOLUTION=(\d+)x(\d+)/);
      if (m) {
        const h = parseInt(m[2], 10);
        if (h > bestHeight) {
          bestHeight = h;
          bestIdx = i;
        }
      }
    }
  }

  const filtered: string[] = [];
  let skipUrl = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const stripped = line.trim();

    // Rimuovi sottotitoli
    if (stripped.startsWith("#EXT-X-MEDIA:TYPE=SUBTITLES")) continue;

    // Mantieni solo audio ITA
    if (stripped.startsWith("#EXT-X-MEDIA:TYPE=AUDIO")) {
      if (stripped.includes('LANGUAGE="ita"')) filtered.push(line);
      continue;
    }

    // Gestisci varianti video
    if (stripped.startsWith("#EXT-X-STREAM-INF:")) {
      if (i === bestIdx) {
        // Rimuovi riferimenti AUDIO= e SUBTITLES= (gruppi rimossi)
        let cleaned = stripped.replace(/,AUDIO="[^"]*"/g, "");
        cleaned = cleaned.replace(/,SUBTITLES="[^"]*"/g, "");
        filtered.push(cleaned);
        skipUrl = false;
      } else {
        skipUrl = true;
      }
      continue;
    }

    // Salta URL varianti scartate
    if (skipUrl && stripped && !stripped.startsWith("#")) {
      skipUrl = false;
      continue;
    }

    filtered.push(line);
  }
  return filtered.join("\n");
}

async function warmupSession(client: AxiosInstance): Promise<void> {
  try {
    await client.get(VIXSRC_BASE, { timeout: 15000 });
  } catch {
    // Ignore warmup errors
  }
}

export async function scrapeStream(
  tmdbId: number,
  type: "movie" | "tv",
  season?: number,
  episode?: number
): Promise<{ cacheKey: string } | null> {
  const client = axios.create({
    headers: DEFAULT_HEADERS,
    timeout: 15000,
  });

  await warmupSession(client);

  // Step 1: chiama API vixsrc.to
  const apiUrl = type === "tv"
    ? `${VIXSRC_BASE}/api/tv/${tmdbId}/${season}/${episode}`
    : `${VIXSRC_BASE}/api/movie/${tmdbId}`;

  let apiResp;
  try {
    apiResp = await client.get(apiUrl, {
      headers: { Referer: apiUrl },
    });
  } catch (err: any) {
    console.error(`[scraper] API call failed for ${tmdbId}: ${err.message}`);
    return null;
  }

  const apiData = apiResp.data;
  const src: string | undefined = apiData?.src;
  if (!src) {
    console.error(`[scraper] No 'src' in API response for ${tmdbId}`);
    return null;
  }

  // Step 2: carica embed page
  const embedPath = src.startsWith("/") ? src : "/" + src;
  const embedUrl = `${VIXSRC_BASE}${embedPath}`;

  let embedResp;
  try {
    embedResp = await client.get(embedUrl, {
      headers: { ...EMBED_HEADERS, Referer: embedUrl },
    });
  } catch (err: any) {
    console.error(`[scraper] Embed page failed for ${tmdbId}: ${err.message}`);
    return null;
  }

  const html = embedResp.data;

  // Step 3: estrai window.streams e window.masterPlaylist
  const streamsBlock = extractJsonBlock(html, "streams");
  if (!streamsBlock) {
    console.error(`[scraper] window.streams not found for ${tmdbId}`);
    return null;
  }

  let streams: any[];
  try {
    streams = JSON.parse(streamsBlock.replace(/\\\//g, "/"));
  } catch {
    console.error(`[scraper] Failed to parse window.streams for ${tmdbId}`);
    return null;
  }

  const masterBlock = extractJsonBlock(html, "masterPlaylist");
  if (!masterBlock) {
    console.error(`[scraper] window.masterPlaylist not found for ${tmdbId}`);
    return null;
  }

  const tokenMatch = masterBlock.match(/'token':\s*'([^']+)'/);
  const expiresMatch = masterBlock.match(/'expires':\s*'([^']+)'/);
  const asnMatch = masterBlock.match(/'asn':\s*'([^']*)'/);
  const urlMatch = masterBlock.match(/url:\s*'([^']+)'/);

  if (!tokenMatch || !expiresMatch) {
    console.error(`[scraper] Token/expires missing in masterPlaylist for ${tmdbId}`);
    return null;
  }

  const token = tokenMatch[1];
  const expires = expiresMatch[1];
  const asn = asnMatch ? asnMatch[1] : "";
  const playlistBase = urlMatch ? urlMatch[1] : (streams[0]?.url?.split("?")[0] || "");

  if (!playlistBase) {
    console.error(`[scraper] No playlist base URL for ${tmdbId}`);
    return null;
  }

  // Step 4: costruisci URL M3U8 per ogni server
  const embedLang = new URL(embedUrl).searchParams.get("lang") || "it";
  const baseParams: Record<string, string> = {
    token,
    expires,
    lang: embedLang,
  };
  if (asn) baseParams.asn = asn;
  if (embedUrl.includes("canPlayFHD=1")) baseParams.h = "1";

  const queryString = new URLSearchParams(baseParams).toString();

  for (const s of streams) {
    const playlistUrl = `${playlistBase}?${queryString}`;

    // Step 5: scarica M3U8
    let playlistResp;
    try {
      playlistResp = await client.get(playlistUrl, {
        headers: { ...PLAYLIST_HEADERS, Referer: embedUrl },
      });
    } catch {
      console.error(`[scraper] Failed to download playlist for server ${s.name || "unknown"}`);
      continue;
    }

    const m3u8Raw = playlistResp.data;
    if (typeof m3u8Raw !== "string" || !m3u8Raw.startsWith("#EXTM3U")) {
      console.error(`[scraper] Response is not valid M3U8 for server ${s.name || "unknown"}`);
      continue;
    }

    // Step 6: filtra M3U8
    const filteredM3u8 = filterM3u8(m3u8Raw);

    // Step 7: cache
    const cacheKey = Math.random().toString(36).slice(2, 14);
    set(cacheKey, filteredM3u8);

    console.log(`[scraper] Cached M3U8 for ${tmdbId} server ${s.name || "unknown"} key=${cacheKey}`);
    return { cacheKey };
  }

  console.error(`[scraper] No valid streams found for ${tmdbId}`);
  return null;
}
