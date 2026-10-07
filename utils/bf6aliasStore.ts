import { bf6PlayerAliases } from "../db/schema";
import type { Player, PlayerAlias } from "./bf6providers/types";
import { fetchPlayerAliases } from "./bf6aliases";
import { normalizeBF6AliasHandle } from "./bf6identity";

async function persistAliases(player: Player, aliases: PlayerAlias[]) {
    const { db } = await import("../db");
    const observedAt = new Date();
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
