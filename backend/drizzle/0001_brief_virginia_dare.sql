CREATE TABLE `login_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`profile_id` integer NOT NULL,
	`ip` text,
	`user_agent` text,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	FOREIGN KEY (`profile_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`profile_id` integer NOT NULL,
	`token` text NOT NULL,
	`ip` text,
	`user_agent` text,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`expires_at` integer NOT NULL,
	FOREIGN KEY (`profile_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `wishlist` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`profile_id` integer NOT NULL,
	`tmdb_id` integer NOT NULL,
	`title` text NOT NULL,
	`poster_path` text,
	`type` text DEFAULT 'movie' NOT NULL,
	`added_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	FOREIGN KEY (`profile_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `wishlist_profile_id_tmdb_id_unique` ON `wishlist` (`profile_id`,`tmdb_id`);--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_profiles` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`pin_hash` text NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_profiles`("id", "name", "pin_hash", "created_at") SELECT "id", "name", "pin_hash", "created_at" FROM `profiles`;--> statement-breakpoint
DROP TABLE `profiles`;--> statement-breakpoint
ALTER TABLE `__new_profiles` RENAME TO `profiles`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE TABLE `__new_watchlist` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`profile_id` integer NOT NULL,
	`tmdb_id` integer NOT NULL,
	`status` text DEFAULT 'unwatched' NOT NULL,
	`last_season` integer,
	`last_episode` integer,
	`resume_time_seconds` integer DEFAULT 0 NOT NULL,
	`updated_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	FOREIGN KEY (`profile_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_watchlist`("id", "profile_id", "tmdb_id", "status", "last_season", "last_episode", "resume_time_seconds", "updated_at") SELECT "id", "profile_id", "tmdb_id", "status", "last_season", "last_episode", "resume_time_seconds", "updated_at" FROM `watchlist`;--> statement-breakpoint
DROP TABLE `watchlist`;--> statement-breakpoint
ALTER TABLE `__new_watchlist` RENAME TO `watchlist`;