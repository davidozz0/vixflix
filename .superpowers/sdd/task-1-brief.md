# Task 1: Backend — Add `wishlist` table to schema + migration

**Files:**
- Modify: `backend/src/db/schema.ts`
- Create: `backend/drizzle/0002_create_wishlist.sql`

**Interfaces:**
- Produces: `schema.wishlist` table (auto-exported via `* as schema` import in db/index.ts)

## Global constraints

- Migration format: backtick-quoted identifiers, `--> statement-breakpoint` separators, `ON DELETE cascade`

## Implementation steps

### Step 1: Add `wishlist` table to schema.ts

After the `loginLogs` table definition (line ~28), add:

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

### Step 2: Create migration file

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

### Step 3: Verify compilation

Run: `cd backend && npx tsc --noEmit` — expect no errors.

### Step 4: Commit

```bash
git add backend/src/db/schema.ts backend/drizzle/0002_create_wishlist.sql
git commit -m "feat: add wishlist table and migration"
```
