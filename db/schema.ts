import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';

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
}, (table) => ({
    // Composite index for efficient player + date queries
    playerDateIdx: index('player_date_idx').on(table.playerId, table.scrapedAt),
    // Index for date-based queries
    scrapedAtIdx: index('scraped_at_idx').on(table.scrapedAt),
}));

export const pins = sqliteTable('pins', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    serverId: text('server_id').notNull(),
    url: text('url').notNull(),
    name: text('name'),
    description: text('description'),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
    tags: text('tags'),
    isArchived: integer('is_archived', { mode: 'boolean' }).notNull().default(false),
    userId: text('user_id').notNull(),
});
