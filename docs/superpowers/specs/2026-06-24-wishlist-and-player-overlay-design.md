# Wishlist + Player Overlay Always Visible

## Overview

Split current monolithic "watchlist" into two distinct concepts:
- **Wishlist**: content the user wants to watch (added via "+")
- **Continue Watching**: content actually played (updated by player)

Also: remove auto-hide from player overlay buttons.

## Changes

### 1. Player Overlay Buttons — Always Visible

**File:** `frontend/src/app/features/player/player.component.ts`

Remove all auto-hide logic:
- `showNav` property
- `navTimer`, `startHideTimer()`
- `@HostListener('document:mousemove')`
- `onKeyDown`
- `[style.opacity]` and `[style.pointer-events]` bindings from nav buttons

Buttons render unconditionally:
- Home (⌂) top-left
- Prev (◀) left, shown only for TV with `hasPrev`
- Next (▶) right, shown only for TV with `hasNext`

### 2. Backend — New `wishlist` Table

**File:** `backend/src/db/schema.ts`

```ts
export const wishlist = sqliteTable("wishlist", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  profileId: integer("profile_id", { mode: "number" }).notNull().references(() => profiles.id, { onDelete: "cascade" }),
  tmdbId: integer("tmdb_id", { mode: "number" }).notNull(),
  title: text("title").notNull(),
  posterPath: text("poster_path"),
  type: text("type", { enum: ["movie", "tv"] }).notNull().default("movie"),
  addedAt: integer("added_at", { mode: "timestamp" }).notNull().default(sql`CURRENT_TIMESTAMP`),
});
```

**Migration:** `backend/drizzle/0002_create_wishlist.sql`

```sql
CREATE TABLE IF NOT EXISTS wishlist (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  profile_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  tmdb_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  poster_path TEXT,
  type TEXT NOT NULL DEFAULT 'movie',
  added_at INTEGER NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

### 3. Backend — New Wishlist API Routes

**File:** `backend/src/index.ts`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/wishlist` | Yes | All items ordered by `added_at DESC` |
| `POST` | `/api/wishlist/:tmdbId` | Yes | Add item (requires body: `{title, posterPath, type}`) |
| `DELETE` | `/api/wishlist/:tmdbId` | Yes | Remove item |

POST is idempotent — if item exists, silently ignore (no duplicate).

### 4. Frontend — New `WishlistItem` Model

**File:** `frontend/src/app/models/wishlist-item.model.ts`

```ts
export interface WishlistItem {
  id: number;
  tmdbId: number;
  title: string;
  posterPath: string | null;
  type: 'movie' | 'tv';
  addedAt: Date;
}
```

### 5. Frontend — New `WishlistService`

**File:** `frontend/src/app/core/services/wishlist.service.ts`

```ts
@Injectable({ providedIn: 'root' })
export class WishlistService {
  getAll(): Observable<WishlistItem[]>;
  add(tmdbId: number, item: { title: string; posterPath: string | null; type: string }): Observable<any>;
  remove(tmdbId: number): Observable<any>;
}
```

All requests use `{ withCredentials: true }`.

### 6. Frontend — Home Component Changes

**File:** `frontend/src/app/features/home/home.component.ts`

**New section** "Wishlist" (between "Continua a guardare" and "Consigliati per te"):
- Horizontal scrollable row of wishlist cards
- Thumbnail + title, clickable → opens content modal
- ✕ button to remove (with confirmation dialog)

**"+" button** on trending grid cards now uses `WishlistService`:
- `toggleWishlist()`: adds to wishlist or removes (with confirm)
- Icon: "+" if not in wishlist, "✓" if in wishlist

**Continue Watching** unchanged:
- `loadContinueWatching()` feeds from `watchlistService.continueWatching()` (status = 'watching')
- Only items actually played (player component) set status to 'watching'
- "+" button no longer touches watchlist at all

**New properties:**
- `wishlistItems: WishlistItem[]` — for wishlist section
- `wishlistMap = new Map<number, WishlistItem>()` — for "+/✓" toggle
- `watchlistMap` retained — still needed for modal watched-status check

**New methods:**
- `loadWishlistItems()` — loads wishlist, populates wishlistMap
- `toggleWishlist(c, event)` — add/remove from wishlist
- `onWishlistClick(w)` — opens content modal
- `removeFromWishlist(w, event)` — remove with confirm

**Existing methods renamed:**
- `loadWatchlistMap()` → `loadWatchlistStatusMap()` — loads all watchlist entries, filters out `unwatched`, populates `watchlistMap` for modal status only
- `addToWatchlist()` → removed, replaced by `toggleWishlist()`
- `isInWatchlist()` → removed, replaced by `isInWishlist()`

### 7. "Continua a guardare" — No Changes Needed

- Already filtered by `status = 'watching'`
- Already ordered by `updatedAt DESC`
- Already updated by player component via `watchlist.upsert()`
- The only fix: "+" no longer inserts into watchlist → only `watching` items come from actual play

### Files Modified

| File | Change |
|------|--------|
| `backend/src/db/schema.ts` | Add `wishlist` table |
| `backend/drizzle/0002_create_wishlist.sql` | New migration |
| `backend/src/index.ts` | Add 3 wishlist routes |
| `frontend/src/app/models/wishlist-item.model.ts` | New file |
| `frontend/src/app/core/services/wishlist.service.ts` | New file |
| `frontend/src/app/features/home/home.component.ts` | Wishlist section + "+" uses wishlist |
| `frontend/src/app/features/player/player.component.ts` | Remove auto-hide |
