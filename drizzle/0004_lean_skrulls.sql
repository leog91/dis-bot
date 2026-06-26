CREATE TABLE IF NOT EXISTS `bf6_class_snapshots` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`player_id` text NOT NULL,
	`class_key` text NOT NULL,
	`class_name` text NOT NULL,
	`time_played_value` integer NOT NULL,
	`time_played_display` text NOT NULL,
	`kills` integer NOT NULL,
	`deaths` integer NOT NULL,
	`assists` integer NOT NULL,
	`revives` integer NOT NULL,
	`deployments` integer NOT NULL,
	`kd_ratio` integer NOT NULL,
	`scraped_at` integer NOT NULL,
	FOREIGN KEY (`player_id`) REFERENCES `bf6_players`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `player_class_uq` ON `bf6_class_snapshots` (`player_id`,`class_key`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `class_sort_idx` ON `bf6_class_snapshots` (`class_key`,`kills`,`time_played_value`);--> statement-breakpoint
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
CREATE UNIQUE INDEX IF NOT EXISTS `player_item_uq` ON `bf6_item_snapshots` (`player_id`,`item_key`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `item_sort_idx` ON `bf6_item_snapshots` (`item_key`,`kills`,`time_played_value`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `bf6_weapon_playstyles` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`player_id` text NOT NULL,
	`weapon_name` text NOT NULL,
	`kills` integer NOT NULL,
	`time_played_value` integer NOT NULL,
	`time_played_display` text NOT NULL,
	`ads_kills` integer NOT NULL,
	`hipfire_kills` integer NOT NULL,
	`headshots` integer NOT NULL,
	`shots_hit` integer NOT NULL,
	`shots_fired` integer NOT NULL,
	`ads_pct` integer NOT NULL,
	`hipfire_pct` integer NOT NULL,
	`headshot_pct` integer NOT NULL,
	`accuracy_pct` integer NOT NULL,
	`scraped_at` integer NOT NULL,
	FOREIGN KEY (`player_id`) REFERENCES `bf6_players`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `player_weapon_uq` ON `bf6_weapon_playstyles` (`player_id`,`weapon_name`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `weapon_player_time_idx` ON `bf6_weapon_playstyles` (`player_id`,`time_played_value`);--> statement-breakpoint
ALTER TABLE `bf6_players` ADD `status` text DEFAULT 'active' NOT NULL;