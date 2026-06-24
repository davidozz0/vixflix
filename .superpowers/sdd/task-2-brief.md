# Task 2: Backend — Add wishlist API routes

**Files:**
- Modify: `backend/src/index.ts`

**Interfaces:**
- Consumes: `schema.wishlist` from Task 1
- Produces: `GET /api/wishlist`, `POST /api/wishlist/:tmdbId`, `DELETE /api/wishlist/:tmdbId`

## Global constraints

- Wishlist ordered by `added_at DESC` (last added = first)
- POST is idempotent — if item exists, silently ignore (no duplicate)

## Implementation steps

### Step 1: Add imports

At top of `index.ts`, add `wishlist` to the drizzle import:

```ts
import { profiles, sessions, loginLogs, watchlist, wishlist } from "./db/schema.js";
```

### Step 2: Add wishlist API routes

After the last watchlist route (`/api/watchlist/recommended`), add:

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

### Step 3: Verify compilation

Run `cd E:\dev\src\vixflix\backend && npx tsc --noEmit` — expect no errors.

### Step 4: Commit

```bash
git add backend/src/index.ts
git commit -m "feat: add wishlist API routes"
```
