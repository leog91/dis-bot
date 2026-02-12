CREATE TABLE IF NOT EXISTS `pins` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`server_id` text NOT NULL,
	`url` text NOT NULL,
	`name` text,
	`description` text,
	`created_at` integer NOT NULL,
	`tags` text,
	`is_archived` integer DEFAULT false NOT NULL,
	`user_id` text NOT NULL
);
