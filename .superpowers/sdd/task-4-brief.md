# Task 4: Frontend — Home component wishlist section + "+" uses wishlist

**Files:**
- Modify: `frontend/src/app/features/home/home.component.ts`

**Interfaces:**
- Consumes: `WishlistItem` (Task 3), `WishlistService` (Task 3)

## Global constraints

- All frontend API calls use `{ withCredentials: true }`
- Wishlist ordered by `added_at DESC` (last added = first) — already handled by backend

## Implementation steps

### Step 1: Add imports

Add to imports:
```ts
import { WishlistService } from '../../core/services/wishlist.service';
import { WishlistItem } from '../../models/wishlist-item.model';
```

### Step 2: Inject WishlistService + add new properties

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

### Step 3: Update ngOnInit()

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

### Step 4: Add new methods + rename existing

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

### Step 5: Update template — add wishlist section

After the continue watching section `</div>`, before the recommended section `<div *ngIf="recommended.length">`, add:

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

### Step 6: Update "+" button in trending grid

Replace the button element (the one with addToWatchlist):
```html
<button (click)="toggleWishlist(c, $event)" style="position:absolute; top:4px; right:4px; background:rgba(0,0,0,0.7); color:#fff; border:none; border-radius:50%; width:28px; height:28px; cursor:pointer; font-size:16px; line-height:1; display:flex; align-items:center; justify-content:center;"
        [style.background]="isInWishlist(c.tmdbId) ? 'rgba(76,175,80,0.85)' : 'rgba(0,0,0,0.7)'">
  {{ isInWishlist(c.tmdbId) ? '✓' : '+' }}
</button>
```

### Step 7: Update `removeContinue` to use `loadWatchlistStatusMap`

In `removeContinue()`, replace `this.loadWatchlistMap()` with `this.loadWatchlistStatusMap()`.

### Step 8: Verify compilation

Run `cd E:\dev\src\vixflix\frontend && npx tsc --noEmit` — expect no errors.

### Step 9: Commit

```bash
git add frontend/src/app/features/home/home.component.ts
git commit -m "feat: add wishlist section to home, '+' uses wishlist"
```
