import { bf6PlayerAliases, bf6Players } from "../db/schema";
import { eq } from "drizzle-orm";
import type { Player, PlayerAlias } from "./bf6providers/types";
import { fetchPlayerAliases } from "./bf6aliases";
import { resolveBF6DisplayHandle, normalizeBF6AliasHandle } from "./bf6identity";

async function persistAliases(player: Player, aliases: PlayerAlias[]) {
    const { db } = await import("../db");
    const observedAt = new Date();
    const previous = await db.select().from(bf6Players).where(eq(bf6Players.id, player.id)).get();
    const currentHandle = resolveBF6DisplayHandle(player, aliases, previous?.platformUserHandle);
    if (currentHandle) {
        // Preserve the old display name even if it was never collected as an alias.
        if (previous?.platformUserHandle && previous.platformUserHandle !== currentHandle) {
            await db.insert(bf6PlayerAliases).values({
                playerId: player.id, namespace: "tracker", source: "manual",
                handle: previous.platformUserHandle,
                normalizedHandle: normalizeBF6AliasHandle(previous.platformUserHandle),
                firstSeenAt: observedAt, lastSeenAt: observedAt,
            }).onConflictDoNothing();
        }
    }
    for (const alias of aliases) {
        const handle = alias.handle.trim();
        const normalizedHandle = normalizeBF6AliasHandle(handle);
        if (!normalizedHandle) continue;
        const insert = db.insert(bf6PlayerAliases).values({
            playerId: player.id,
            namespace: alias.namespace,
            handle,
            normalizedHandle,
            source: alias.source,
            firstSeenAt: observedAt,
            lastSeenAt: observedAt,
        });
        if (alias.source === "manual") {
            // Import config immediately, but don't replace an observed source/date.
            await insert.onConflictDoNothing();
        } else {
            await insert.onConflictDoUpdate({
                target: [bf6PlayerAliases.playerId, bf6PlayerAliases.namespace, bf6PlayerAliases.normalizedHandle],
                set: { handle, source: alias.source, lastSeenAt: observedAt },
            });
        }
    }
    if (currentHandle) {
        await db.update(bf6Players).set({ platformUserHandle: currentHandle, updatedAt: observedAt })
            .where(eq(bf6Players.id, player.id));
    }
}

/** Apply config changes even when the six-hour stats cache is still fresh. */
export async function syncConfiguredPlayerNames(players: Player[]) {
    // Refresh independently of the stats cache. The refresher throttles network calls
    // and shares pending requests; a config history must never overwrite a live name.
    for (let index = 0; index < players.length; index += 4) {
        await Promise.all(players.slice(index, index + 4).map(async player => {
            try {
                await refreshPlayerAliases(player);
            } catch (error) {
                console.warn(`Could not refresh BF6 nickname for ${player.userName}:`, error);
            }
        }));
    }
}

export function createPlayerAliasRefresher(
    fetchAliases = fetchPlayerAliases,
    saveAliases = persistAliases,
    now = Date.now,
) {
    const lastChecked = new Map<string, number>();
    const pending = new Map<string, Promise<void>>();
    return async (player: Player, force = false): Promise<void> => {
        // Config edits are available even when network checks are cached or fail.
        await saveAliases(player, player.configuredAliases ?? []);
        const running = pending.get(player.id);
        if (running) return running;
        const previous = lastChecked.get(player.id);
        if (!force && previous !== undefined && now() - previous < 60_000) return;
        const request = (async () => {
            const aliases = await fetchAliases(player);
            await saveAliases(player, aliases);
            lastChecked.set(player.id, now());
        })();
        pending.set(player.id, request);
        try {
            await request;
        } finally {
            pending.delete(player.id);
        }
    };
}

export const refreshPlayerAliases = createPlayerAliasRefresher();
