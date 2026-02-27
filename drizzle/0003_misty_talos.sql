CREATE TABLE IF NOT EXISTS `bf6_item_snapshots` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`player_id` text NOT NULL,
	`item_key` text NOT NULL,
	`kills` integer NOT NULL,
	`time_played_value` integer NOT NULL,
	`time_played_display` text NOT NULL,
	`scraped_at` integer NOT NULL,
	FOREIGN KEY (`player_id`) REFERENCES `bf6_players`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `player_item_uq` ON `bf6_item_snapshots` (`player_id`,`item_key`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `item_sort_idx` ON `bf6_item_snapshots` (`item_key`,`kills`,`time_played_value`);
