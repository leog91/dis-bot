import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const bf6Players = sqliteTable('bf6_players', {
    id: text('id').primaryKey(), // Using the ID from tracker.gg as the primary key
    platformUserHandle: text('platform_user_handle').notNull(),
    user: text('user').notNull(),
    profileUrl: text('profile_url').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

export const bf6Scrapes = sqliteTable('bf6_scrapes', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    playerId: text('player_id').notNull().references(() => bf6Players.id),
    kills: integer('kills').notNull(),
    deaths: integer('deaths').notNull(),
    revives: integer('revives').notNull(),
    score: integer('score').notNull(),
    careerPlayerRank: integer('career_player_rank').notNull(),
    timePlayedDisplay: text('time_played_display').notNull(),
    timePlayedValue: integer('time_played_value').notNull(),
    scrapedAt: integer('scraped_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});
