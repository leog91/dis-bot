CREATE TABLE IF NOT EXISTS `bf6_players` (
	`id` text PRIMARY KEY NOT NULL,
	`platform_user_handle` text NOT NULL,
	`user` text NOT NULL,
	`profile_url` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `bf6_scrapes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`player_id` text NOT NULL,
	`kills` integer NOT NULL,
	`deaths` integer NOT NULL,
	`revives` integer NOT NULL,
	`score` integer NOT NULL,
	`career_player_rank` integer NOT NULL,
	`time_played_display` text NOT NULL,
	`time_played_value` integer NOT NULL,
	`scraped_at` integer NOT NULL,
	FOREIGN KEY (`player_id`) REFERENCES `bf6_players`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `player_date_idx` ON `bf6_scrapes` (`player_id`,`scraped_at`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `scraped_at_idx` ON `bf6_scrapes` (`scraped_at`);
