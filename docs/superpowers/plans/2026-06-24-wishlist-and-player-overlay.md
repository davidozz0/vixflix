# Wishlist + Player Overlay Always Visible — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split watchlist into wishlist (via "+") + continue watching (via player), remove player overlay auto-hide.

**Architecture:** New SQLite table `wishlist` with own API routes. Frontend gets new `WishlistService` + home section. Player overlay buttons stay always visible.

**Tech Stack:** Express, better-sqlite3/drizzle, Angular standalone, TypeScript

## Global Constraints

- Migration format: backtick-quoted identifiers, `--> statement-breakpoint` separators, `ON DELETE cascade`
- All frontend API calls use `{ withCredentials: true }`
- Wishlist POST body: `{ title: string, posterPath: string | null, type: string }`
- Wishlist ordered by `added_at DESC` (last added = first)

---

### Task 1: Backend — Add `wishlist` table to schema + migration

**Files:**
- Modify: `backend/src/db/schema.ts`
- Create: `backend/drizzle/0002_create_wishlist.sql`

**Interfaces:**
- Produces: `schema.wishlist` table (auto-exported via `* as schema` import in db/index.ts)

- [ ] **Step 1: Add `wishlist` table to schema.ts**

After line 28 (end of `loginLogs`), add:

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

- [ ] **Step 2: Create migration file**

Create `backend/drizzle/0002_create_wishlist.sql`:

```sql
CREATE TABLE `wishlist` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`profile_id` integer NOT NULL,
	`tmdb_id` integer NOT NULL,
	`title` text NOT NULL,
	`poster_path` text,
	`type` text DEFAULT 'movie' NOT NULL,
	`added_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`profile_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE cascade
);
```

- [ ] **Step 3: Verify compilation**

Run `cd backend && npx tsc --noEmit` — expect no errors.

- [ ] **Step 4: Commit**

```bash
git add backend/src/db/schema.ts backend/drizzle/0002_create_wishlist.sql
git commit -m "feat: add wishlist table and migration"
```

---

### Task 2: Backend — Add wishlist API routes

**Files:**
- Modify: `backend/src/index.ts`

**Interfaces:**
- Consumes: `schema.wishlist` from Task 1
- Produces: `GET /api/wishlist`, `POST /api/wishlist/:tmdbId`, `DELETE /api/wishlist/:tmdbId`

- [ ] **Step 1: Add imports**

At top of `index.ts`, add `wishlist` to the drizzle import:

```ts
import { profiles, sessions, loginLogs, watchlist, wishlist } from "./db/schema.js";
```

- [ ] **Step 2: Add GET /api/wishlist route**

After the `removeContinue` route (after line ~271), add:

```ts
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
```

- [ ] **Step 3: Verify compilation**

Run `cd backend && npx tsc --noEmit` — expect no errors.

- [ ] **Step 4: Commit**

```bash
git add backend/src/index.ts
git commit -m "feat: add wishlist API routes"
```

---

### Task 3: Frontend — Create WishlistItem model + WishlistService

**Files:**
- Create: `frontend/src/app/models/wishlist-item.model.ts`
- Create: `frontend/src/app/core/services/wishlist.service.ts`

**Interfaces:**
- Produces: `WishlistItem` interface, `WishlistService` class (consumed by Task 4)

- [ ] **Step 1: Create model**

Create `frontend/src/app/models/wishlist-item.model.ts`:

```ts
export interface WishlistItem {
  id: number;
  tmdbId: number;
  title: string;
  posterPath: string | null;
  type: 'movie' | 'tv';
  addedAt: string;
}
```

- [ ] **Step 2: Create service**

Create `frontend/src/app/core/services/wishlist.service.ts`:

```ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { WishlistItem } from '../../models/wishlist-item.model';

@Injectable({ providedIn: 'root' })
export class WishlistService {
  private http = inject(HttpClient);
  private api = '/api/wishlist';

  getAll(): Observable<WishlistItem[]> {
    return this.http.get<WishlistItem[]>(this.api, { withCredentials: true });
  }

  add(tmdbId: number, item: { title: string; posterPath: string | null; type: string }): Observable<any> {
    return this.http.post(`${this.api}/${tmdbId}`, item, { withCredentials: true });
  }

  remove(tmdbId: number): Observable<any> {
    return this.http.delete(`${this.api}/${tmdbId}`, { withCredentials: true });
  }
}
```

- [ ] **Step 3: Verify compilation**

Run `cd frontend && npx tsc --noEmit` — expect no errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/models/wishlist-item.model.ts frontend/src/app/core/services/wishlist.service.ts
git commit -m "feat: add WishlistItem model and WishlistService"
```

---

### Task 4: Frontend — Home component wishlist section + "+" uses wishlist

**Files:**
- Modify: `frontend/src/app/features/home/home.component.ts`

**Interfaces:**
- Consumes: `WishlistItem` (Task 3), `WishlistService` (Task 3)

- [ ] **Step 1: Add imports**

Add to imports:
```ts
import { WishlistService } from '../../core/services/wishlist.service';
import { WishlistItem } from '../../models/wishlist-item.model';
```

- [ ] **Step 2: Inject WishlistService + add new properties**

After `private profileService = inject(ProfileService);`, add:
```ts
private wishlistService = inject(WishlistService);
```

Replace the existing properties section:
```ts
private watchlistMap = new Map<number, WatchlistEntry>();
```
with:
```ts
private watchlistMap = new Map<number, WatchlistEntry>();
wishlistItems: WishlistItem[] = [];
private wishlistMap = new Map<number, WishlistItem>();
```

- [ ] **Step 3: Update ngOnInit()**

Replace:
```ts
this.loadWatchlistMap();
this.loadContinueWatching();
this.loadRecommended();
```
with:
```ts
this.loadWatchlistStatusMap();
this.loadContinueWatching();
this.loadRecommended();
this.loadWishlistItems();
```

- [ ] **Step 4: Add new methods + rename existing**

Replace `loadWatchlistMap()` with `loadWatchlistStatusMap()`:
```ts
loadWatchlistStatusMap() {
  this.watchlistService.getAll().subscribe(list => {
    this.watchlistMap.clear();
    for (const e of list) {
      if (e.status !== 'unwatched') this.watchlistMap.set(e.tmdbId, e);
    }
    this.cdr.detectChanges();
  });
}
```

Add `loadWishlistItems()`:
```ts
loadWishlistItems() {
  this.wishlistService.getAll().subscribe(list => {
    this.wishlistItems = list;
    this.wishlistMap.clear();
    for (const item of list) {
      this.wishlistMap.set(item.tmdbId, item);
    }
    this.cdr.detectChanges();
  });
}
```

Replace `isInWatchlist()` with `isInWishlist()`:
```ts
isInWishlist(tmdbId: number): boolean {
  return this.wishlistMap.has(tmdbId);
}
```

Replace `addToWatchlist()` with `toggleWishlist()`:
```ts
async toggleWishlist(c: Content, event: Event) {
  event.stopPropagation();
  event.preventDefault();
  if (this.isInWishlist(c.tmdbId)) {
    const ok = await this.dialogService.confirm(`Rimuovere "${c.title}" dalla wishlist?`);
    if (!ok) return;
    this.wishlistService.remove(c.tmdbId).subscribe(() => {
      this.loadWishlistItems();
    });
  } else {
    this.wishlistService.add(c.tmdbId, {
      title: c.title,
      posterPath: c.posterPath,
      type: c.type,
    }).subscribe(() => {
      this.loadWishlistItems();
    });
  }
}
```

Add `onWishlistClick()`:
```ts
onWishlistClick(w: WishlistItem) {
  const wl = this.watchlistMap.get(w.tmdbId);
  this.modalService.open({
    tmdbId: w.tmdbId,
    type: w.type,
    status: (wl && wl.status === 'watched') ? 'watched' : 'unwatched',
  });
}
```

Add `removeFromWishlist()`:
```ts
async removeFromWishlist(w: WishlistItem, event: Event) {
  event.stopPropagation();
  event.preventDefault();
  const ok = await this.dialogService.confirm(`Rimuovere "${w.title}" dalla wishlist?`);
  if (!ok) return;
  this.wishlistService.remove(w.tmdbId).subscribe(() => {
    this.loadWishlistItems();
  });
}
```

- [ ] **Step 5: Update template — add wishlist section between "Continua a guardare" and "Consigliati per te"**

After the continue watching section (after `</div>` on line 40), before the recommended section, add:

```html
<div *ngIf="wishlistItems.length" style="margin-bottom:1.5rem;">
  <h3 style="margin:0 0 0.75rem 0; color:var(--text-primary);">Wishlist</h3>
  <div style="display:flex; gap:0.75rem; overflow-x:auto; padding-bottom:0.5rem;" class="thin-scroll">
    <div *ngFor="let w of wishlistItems" style="position:relative; cursor:pointer; min-width:140px; max-width:140px; flex-shrink:0; overflow:hidden;" class="card">
      <div (click)="onWishlistClick(w)">
        <img *ngIf="w.posterPath" [src]="'https://image.tmdb.org/t/p/w185' + w.posterPath" style="width:100%; display:block;" />
        <div *ngIf="!w.posterPath" style="width:100%; height:200px; background:var(--bg-secondary); display:flex; align-items:center; justify-content:center; color:var(--text-secondary); font-size:0.8rem;">No poster</div>
        <div style="font-size:0.85rem; padding:0.5rem; color:var(--text-primary); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">{{ w.title }}</div>
      </div>
      <button (click)="removeFromWishlist(w, $event)" style="position:absolute; top:4px; right:4px; background:rgba(0,0,0,0.7); color:#fff; border:none; border-radius:50%; width:24px; height:24px; cursor:pointer; font-size:14px; line-height:1;">✕</button>
    </div>
  </div>
</div>
```

- [ ] **Step 6: Update "+" button in trending grid**

Replace:
```html
<button (click)="addToWatchlist(c, $event)" ... [style.background]="isInWatchlist(c.tmdbId) ? ...">
  {{ isInWatchlist(c.tmdbId) ? '✓' : '+' }}
</button>
```
with:
```html
<button (click)="toggleWishlist(c, $event)" ... [style.background]="isInWishlist(c.tmdbId) ? 'rgba(76,175,80,0.85)' : 'rgba(0,0,0,0.7)'">
  {{ isInWishlist(c.tmdbId) ? '✓' : '+' }}
</button>
```

- [ ] **Step 7: Update `removeContinue` to use `loadWatchlistStatusMap`**

In `removeContinue()`, replace `this.loadWatchlistMap()` with `this.loadWatchlistStatusMap()`.

- [ ] **Step 8: Verify compilation**

Run `cd frontend && npx tsc --noEmit` — expect no errors.

- [ ] **Step 9: Commit**

```bash
git add frontend/src/app/features/home/home.component.ts
git commit -m "feat: add wishlist section to home, '+' uses wishlist"
```

---

### Task 5: Frontend — Player overlay always visible

**Files:**
- Modify: `frontend/src/app/features/player/player.component.ts`

- [ ] **Step 1: Remove auto-hide properties**

Remove from class body:
```ts
private navTimer: any;
```
and:
```ts
showNav = true;
```

- [ ] **Step 2: Remove auto-hide methods**

Remove:
```ts
@HostListener('document:mousemove')
onMouseMove() { this.showNav = true; this.cdr.detectChanges(); clearTimeout(this.navTimer); this.startHideTimer(); }
```
Remove:
```ts
private onKeyDown = () => { this.showNav = true; this.cdr.detectChanges(); clearTimeout(this.navTimer); this.startHideTimer(); };
```
Remove:
```ts
private startHideTimer() { this.navTimer = setTimeout(() => { this.showNav = false; this.cdr.detectChanges(); }, 1000); }
```

- [ ] **Step 3: Remove keydown listener in ngOnInit and ngOnDestroy**

In `ngOnInit`, remove:
```ts
document.addEventListener('keydown', this.onKeyDown);
```
and:
```ts
this.startHideTimer();
```

In `ngOnDestroy`, remove:
```ts
document.removeEventListener('keydown', this.onKeyDown);
```
and:
```ts
clearTimeout(this.navTimer);
```

- [ ] **Step 4: Remove HostListener import if no longer used**

If `@HostListener` is no longer used anywhere in the file, remove it from the import line:
```ts
import { Component, inject, OnInit, OnDestroy, ChangeDetectorRef, HostListener } from '@angular/core';
```
→
```ts
import { Component, inject, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
```

Check if `HostListener` is used elsewhere; if so, keep it.

- [ ] **Step 5: Remove opacity/pointer-events bindings from nav buttons**

Replace:
```html
<button routerLink="/home" class="nav-btn nav-home" [style.opacity]="showNav ? 1 : 0" [style.pointer-events]="showNav ? 'auto' : 'none'">
```
with:
```html
<button routerLink="/home" class="nav-btn nav-home">
```

Replace:
```html
<button *ngIf="src && type==='tv' && hasPrev" (click)="goPrev()" class="nav-btn nav-left" [style.opacity]="showNav ? 1 : 0" [style.pointer-events]="showNav ? 'auto' : 'none'">
```
with:
```html
<button *ngIf="src && type==='tv' && hasPrev" (click)="goPrev()" class="nav-btn nav-left">
```

Replace:
```html
<button *ngIf="src && type==='tv' && hasNext" (click)="goNext()" class="nav-btn nav-right" [style.opacity]="showNav ? 1 : 0" [style.pointer-events]="showNav ? 'auto' : 'none'">
```
with:
```html
<button *ngIf="src && type==='tv' && hasNext" (click)="goNext()" class="nav-btn nav-right">
```

- [ ] **Step 6: Verify compilation**

Run `cd frontend && npx tsc --noEmit` — expect no errors.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/app/features/player/player.component.ts
git commit -m "fix: player overlay buttons always visible, remove auto-hide"
```
