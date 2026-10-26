import type { Player, PlayerAlias } from "./bf6providers/types";

/** Bootstrap fallback only: configured histories are not proof of a current name. */
export function configuredBF6Handle(player: Player): string | undefined {
    if (player.displayName?.trim()) return player.displayName.trim();
    for (const namespace of ["steam", "ea", "tracker"] as const) {
        const aliases = (player.configuredAliases ?? []).filter(alias => alias.namespace === namespace && alias.handle.trim());
        if (aliases.length) return aliases.at(-1)!.handle.trim();
    }
}

export function resolveBF6DisplayHandle(player: Player, aliases: PlayerAlias[], previous?: string): string | undefined {
    return player.displayName?.trim() || currentBF6Handle(aliases) || previous || configuredBF6Handle(player);
}

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

/** Only confirmed current names count; observing an old alias again isn't a rename. */
export function currentBF6Handle(aliases: PlayerAlias[]): string | undefined {
    const current = aliases.filter(alias => alias.isCurrent && alias.handle.trim());
    return (current.find(alias => alias.namespace === "steam" && alias.source === "steam")
        ?? current.find(alias => alias.namespace === "steam")
        ?? current.find(alias => alias.namespace === "ea")
        ?? current[0])?.handle.trim();
}
