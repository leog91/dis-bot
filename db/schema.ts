import { sqliteTable, text, integer, index, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const bf6PlayerStatus = ['active', 'private', 'inactive', 'not_found'] as const;
export type BF6PlayerStatus = typeof bf6PlayerStatus[number];
export const bf6AliasNamespaces = ['tracker', 'ea', 'steam'] as const;
export type BF6AliasNamespace = typeof bf6AliasNamespaces[number];
export const bf6AliasSources = ['manual', 'tracker', 'gametools'] as const;
export type BF6AliasSource = typeof bf6AliasSources[number];

export const bf6Players = sqliteTable('bf6_players', {
    id: text('id').primaryKey(), // Using the ID from tracker.gg as the primary key
    platformUserHandle: text('platform_user_handle').notNull(),
    user: text('user').notNull(),
    profileUrl: text('profile_url').notNull(),
    status: text('status', { enum: bf6PlayerStatus }).notNull().default('active'),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

export const bf6PlayerAliases = sqliteTable('bf6_player_aliases', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    playerId: text('player_id').notNull().references(() => bf6Players.id),
    namespace: text('namespace', { enum: bf6AliasNamespaces }).notNull(),
    handle: text('handle').notNull(),
    normalizedHandle: text('normalized_handle').notNull(),
    source: text('source', { enum: bf6AliasSources }).notNull(),
    firstSeenAt: integer('first_seen_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
    lastSeenAt: integer('last_seen_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
    playerAliasUq: uniqueIndex('bf6_player_alias_uq').on(table.playerId, table.namespace, table.normalizedHandle),
    playerLastSeenIdx: index('bf6_alias_player_last_seen_idx').on(table.playerId, table.lastSeenAt),
}));

export const bf6Scrapes = sqliteTable('bf6_scrapes', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    playerId: text('player_id').notNull().references(() => bf6Players.id),
    kills: integer('kills').notNull(),
    aiKills: integer('ai_kills'),
    deaths: integer('deaths').notNull(),
    revives: integer('revives').notNull(),
    wins: integer('wins'),
    losses: integer('losses'),
    matchesPlayed: integer('matches_played'),
    damage: integer('damage'),
    shotsFired: integer('shots_fired'),
    shotsHit: integer('shots_hit'),
    killAssists: integer('kill_assists'),
    heals: integer('heals'),
    resupplies: integer('resupplies'),
    repairs: integer('repairs'),
    squadmateRevives: integer('squadmate_revives'),
    enemiesSpotted: integer('enemies_spotted'),
    score: integer('score').notNull(),
    careerPlayerRank: integer('career_player_rank'),
    source: text('source').notNull().default('tracker'),
    timePlayedDisplay: text('time_played_display').notNull(),
    timePlayedValue: integer('time_played_value').notNull(),
    scrapedAt: integer('scraped_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
    // Composite index for efficient player + date queries
    playerDateIdx: index('player_date_idx').on(table.playerId, table.scrapedAt),
    // Index for date-based queries
    scrapedAtIdx: index('scraped_at_idx').on(table.scrapedAt),
}));

export const bf6WeaponPlaystyles = sqliteTable('bf6_weapon_playstyles', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    playerId: text('player_id').notNull().references(() => bf6Players.id),
    weaponName: text('weapon_name').notNull(),
    kills: integer('kills').notNull(),
    timePlayedValue: integer('time_played_value').notNull(), // seconds
    timePlayedDisplay: text('time_played_display').notNull(),
    adsKills: integer('ads_kills').notNull(),
    hipfireKills: integer('hipfire_kills').notNull(),
    headshots: integer('headshots').notNull(),
    shotsHit: integer('shots_hit').notNull(),
    shotsFired: integer('shots_fired').notNull(),
    adsPct: integer('ads_pct').notNull(), // basis points (x100)
    hipfirePct: integer('hipfire_pct').notNull(), // basis points (x100)
    headshotPct: integer('headshot_pct').notNull(), // basis points (x100)
    accuracyPct: integer('accuracy_pct').notNull(), // basis points (x100)
    scrapedAt: integer('scraped_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
    playerWeaponUq: uniqueIndex('player_weapon_uq').on(table.playerId, table.weaponName),
    playerTimeIdx: index('weapon_player_time_idx').on(table.playerId, table.timePlayedValue),
}));

export const bf6ItemSnapshots = sqliteTable('bf6_item_snapshots', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    playerId: text('player_id').notNull().references(() => bf6Players.id),
    itemKey: text('item_key').notNull(),
    kills: integer('kills').notNull(),
    timePlayedValue: integer('time_played_value').notNull(), // seconds
    timePlayedDisplay: text('time_played_display').notNull(),
    scrapedAt: integer('scraped_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
    playerItemUq: uniqueIndex('player_item_uq').on(table.playerId, table.itemKey),
    itemSortIdx: index('item_sort_idx').on(table.itemKey, table.kills, table.timePlayedValue),
}));

export const bf6ClassSnapshots = sqliteTable('bf6_class_snapshots', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    playerId: text('player_id').notNull().references(() => bf6Players.id),
    classKey: text('class_key').notNull(), // kit_assault, kit_engineer, kit_support, kit_recon
    className: text('class_name').notNull(), // Assault, Engineer, Support, Recon
    timePlayedValue: integer('time_played_value').notNull(), // seconds
    timePlayedDisplay: text('time_played_display').notNull(),
    kills: integer('kills').notNull(),
    deaths: integer('deaths').notNull(),
    assists: integer('assists').notNull(),
    revives: integer('revives').notNull(),
    deployments: integer('deployments').notNull(),
    kdRatio: integer('kd_ratio').notNull(), // stored as basis points (x100)
    scrapedAt: integer('scraped_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
    playerClassUq: uniqueIndex('player_class_uq').on(table.playerId, table.classKey),
    classSortIdx: index('class_sort_idx').on(table.classKey, table.kills, table.timePlayedValue),
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
