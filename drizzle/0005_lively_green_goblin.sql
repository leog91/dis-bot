PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_bf6_scrapes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`player_id` text NOT NULL,
	`kills` integer NOT NULL,
	`deaths` integer NOT NULL,
	`revives` integer NOT NULL,
	`score` integer NOT NULL,
	`career_player_rank` integer,
	`source` text DEFAULT 'tracker' NOT NULL,
	`time_played_display` text NOT NULL,
	`time_played_value` integer NOT NULL,
	`scraped_at` integer NOT NULL,
	FOREIGN KEY (`player_id`) REFERENCES `bf6_players`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_bf6_scrapes`("id", "player_id", "kills", "deaths", "revives", "score", "career_player_rank", "source", "time_played_display", "time_played_value", "scraped_at") SELECT "id", "player_id", "kills", "deaths", "revives", "score", "career_player_rank", 'tracker', "time_played_display", "time_played_value", "scraped_at" FROM `bf6_scrapes`;--> statement-breakpoint
DROP TABLE `bf6_scrapes`;--> statement-breakpoint
ALTER TABLE `__new_bf6_scrapes` RENAME TO `bf6_scrapes`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `player_date_idx` ON `bf6_scrapes` (`player_id`,`scraped_at`);--> statement-breakpoint
CREATE INDEX `scraped_at_idx` ON `bf6_scrapes` (`scraped_at`);
