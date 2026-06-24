# Fix subagent: Resolve review findings

## Issues to fix

### Important 1: Add unique constraint on (profile_id, tmdb_id) in wishlist table

**schema.ts** — Add `.unique()` on `[profileId, tmdbId]`:

```ts
export const wishlist = sqliteTable("wishlist", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  profileId: integer("profile_id", { mode: "number" }).notNull().references(() => profiles.id, { onDelete: "cascade" }),
  tmdbId: integer("tmdb_id", { mode: "number" }).notNull(),
  title: text("title").notNull(),
  posterPath: text("poster_path"),
  type: text("type", { enum: ["movie", "tv"] }).notNull().default("movie"),
  addedAt: integer("added_at", { mode: "timestamp" }).notNull().default(sql`CURRENT_TIMESTAMP`),
}, (t) => ({
  unq: unique().on(t.profileId, t.tmdbId),
}));
```

**Migration** — Add `UNIQUE(profile_id, tmdb_id)` to the CREATE TABLE:

```sql
CREATE TABLE `wishlist` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`profile_id` integer NOT NULL,
	`tmdb_id` integer NOT NULL,
	`title` text NOT NULL,
	`poster_path` text,
	`type` text DEFAULT 'movie' NOT NULL,
	`added_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`profile_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE cascade,
	UNIQUE(`profile_id`, `tmdb_id`)
);
```

### Minor 2: Fix onWishlistClick status ternary

In `home.component.ts`, change:
```ts
status: (wl && wl.status === 'watched') ? 'watched' : 'unwatched',
```
to:
```ts
status: wl ? wl.status : 'unwatched',
```

### Minor 3: Add error catch to loadWishlistItems()

In `home.component.ts`, add empty error handler:
```ts
loadWishlistItems() {
  this.wishlistService.getAll().subscribe({
    next: (list) => {
      this.wishlistItems = list;
      this.wishlistMap.clear();
      for (const item of list) {
        this.wishlistMap.set(item.tmdbId, item);
      }
      this.cdr.detectChanges();
    },
    error: () => {},
  });
}
```

### Minor 4: Add body validation to POST /api/wishlist/:tmdbId

In `index.ts`, add validation:
```ts
app.post("/api/wishlist/:tmdbId", auth, (req: AuthRequest, res) => {
  const profileId = req.profileId!;
  const tmdbId = Number(req.params.tmdbId);
  const { title, posterPath, type } = req.body;
  if (!title || !type) return res.status(400).json({ error: "Missing required fields" });
  // ... rest unchanged
```

## Verify compilation

Run both:
- `cd E:\dev\src\vixflix\backend && npx tsc --noEmit`
- `cd E:\dev\src\vixflix\frontend && npx tsc --noEmit`

## Commit

```bash
git add backend/src/db/schema.ts backend/drizzle/0002_create_wishlist.sql backend/src/index.ts frontend/src/app/features/home/home.component.ts
git commit -m "fix: add unique constraint, fix wishlist status, add validation"
```
