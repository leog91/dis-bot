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
CREATE UNIQUE INDEX IF NOT EXISTS `player_weapon_uq` ON `bf6_weapon_playstyles` (`player_id`,`weapon_name`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `weapon_player_time_idx` ON `bf6_weapon_playstyles` (`player_id`,`time_played_value`);
