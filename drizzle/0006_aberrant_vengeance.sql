CREATE TABLE `bf6_player_aliases` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`player_id` text NOT NULL,
	`namespace` text NOT NULL,
	`handle` text NOT NULL,
	`normalized_handle` text NOT NULL,
	`source` text NOT NULL,
	`first_seen_at` integer NOT NULL,
	`last_seen_at` integer NOT NULL,
	FOREIGN KEY (`player_id`) REFERENCES `bf6_players`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `bf6_player_alias_uq` ON `bf6_player_aliases` (`player_id`,`namespace`,`normalized_handle`);--> statement-breakpoint
CREATE INDEX `bf6_alias_player_last_seen_idx` ON `bf6_player_aliases` (`player_id`,`last_seen_at`);--> statement-breakpoint
INSERT OR IGNORE INTO `bf6_player_aliases` (`player_id`, `namespace`, `handle`, `normalized_handle`, `source`, `first_seen_at`, `last_seen_at`)
SELECT `id`, 'tracker', trim(`platform_user_handle`), lower(trim(`platform_user_handle`)), 'tracker', `created_at`, `updated_at`
FROM `bf6_players`
WHERE trim(`platform_user_handle`) <> '';
