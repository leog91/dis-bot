export function normalizeBF6AliasHandle(handle: string): string {
    return handle.trim().toLowerCase();
}

type Identity = { id: string; user: string; platformUserHandle: string };
type Alias = { playerId: string; normalizedHandle: string };

/** Prefer exact identities/aliases; never guess between multiple matching players. */
export function matchBF6Player<T extends Identity>(input: string, players: T[], aliases: Alias[]): T | null {
    const normalized = normalizeBF6AliasHandle(input);
    if (!normalized) return null;
    const unique = (matches: T[]) => matches.length === 1 ? matches[0] : null;
    const exactPlayers = players.filter(player =>
        [player.id, player.user, player.platformUserHandle].some(value => normalizeBF6AliasHandle(value) === normalized));
    if (exactPlayers.length) return unique(exactPlayers);
    const exactIds = new Set(aliases.filter(alias => alias.normalizedHandle === normalized).map(alias => alias.playerId));
    if (exactIds.size) return unique(players.filter(player => exactIds.has(player.id)));
    const partialIds = new Set(aliases.filter(alias => alias.normalizedHandle.includes(normalized)).map(alias => alias.playerId));
    return unique(players.filter(player => partialIds.has(player.id) ||
        [player.user, player.platformUserHandle].some(value => normalizeBF6AliasHandle(value).includes(normalized))));
}
