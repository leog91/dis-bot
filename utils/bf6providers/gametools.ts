import {
    BF6_REQUEST_TIMEOUT_MS,
    type BF6ClassSnapshot,
    type BF6ItemSnapshot,
    type BF6StatsProvider,
    type Player,
    type PlayerFetchResult,
    type WeaponPlaystyleSnapshot,
} from "./types";
import {
    formatDuration,
    formatHours,
    toBasisPoints,
} from "../bf6rank";
import { BF6_GADGETS, type BF6GadgetSnapshotKey } from "../bf6gadgets";
import { BF6_VEHICLES, type BF6VehicleSnapshotKey } from "../bf6vehicles";

const BASE_URL = "https://api.gametools.network/bf6";

function num(value: unknown): number {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
}

function normalizeId(value: unknown): string {
    return String(value ?? "").toLowerCase();
}

function extractWeaponPlaystyles(playerId: string, data: any): WeaponPlaystyleSnapshot[] {
    const weapons = Array.isArray(data?.weapons) ? data.weapons : [];
    const result: WeaponPlaystyleSnapshot[] = [];

    for (const weapon of weapons) {
        const timePlayedValue = Math.round(num(weapon?.timeEquipped));
        if (timePlayedValue < 3600) continue;

        const kills = Math.round(num(weapon?.kills));
        const adsKills = Math.round(num(weapon?.scopedKills));
        const hipfireKills = Math.round(num(weapon?.hipfireKills));
        const headshots = Math.round(num(weapon?.headshotKills));
        const shotsHit = Math.round(num(weapon?.shotsHit));
        const shotsFired = Math.round(num(weapon?.shotsFired));

        let adsPct = 0;
        let hipfirePct = 0;
        const totalAdsHip = adsKills + hipfireKills;
        if (totalAdsHip > 0) {
            adsPct = (adsKills / totalAdsHip) * 100;
            hipfirePct = 100 - adsPct;
        }

        const headshotPct = kills > 0 && headshots > 0 ? (headshots / kills) * 100 : 0;
        const accuracyPct = shotsFired > 0 ? (shotsHit / shotsFired) * 100 : 0;

        const weaponName = String(weapon?.weaponName ?? weapon?.name ?? "Unknown Weapon").trim();
        result.push({
            playerId,
            weaponName,
            kills,
            timePlayedValue,
            timePlayedDisplay: formatHours(timePlayedValue),
            adsKills,
            hipfireKills,
            headshots,
            shotsHit,
            shotsFired,
            adsPct: toBasisPoints(adsPct),
            hipfirePct: toBasisPoints(hipfirePct),
            headshotPct: toBasisPoints(headshotPct),
            accuracyPct: toBasisPoints(accuracyPct),
        });
    }

    return result.sort((a, b) => b.timePlayedValue - a.timePlayedValue);
}

function extractGadgetSnapshots(playerId: string, data: any): BF6ItemSnapshot[] {
    const gadgets = [
        ...(Array.isArray(data?.gadgets) ? data.gadgets : []),
        ...(Array.isArray(data?.melee) ? data.melee : []),
    ];
    const result: BF6ItemSnapshot[] = [];

    for (const def of BF6_GADGETS) {
        const wanted = def.exactKeys.map(normalizeId);
        const matched = gadgets.filter((g: any) => wanted.includes(normalizeId(g?.id)));
        const kills = matched.reduce((sum: number, g: any) => sum + Math.round(num(g?.kills)), 0);
        const timePlayedValue = matched.reduce((sum: number, g: any) =>
            sum + Math.round(num(g?.secondsPlayed ?? g?.timeEquipped)), 0);
        result.push({
            playerId,
            itemKey: def.key as BF6GadgetSnapshotKey,
            kills,
            timePlayedValue,
            timePlayedDisplay: formatDuration(timePlayedValue),
        });
    }

    return result;
}

function extractVehicleSnapshots(playerId: string, data: any): BF6ItemSnapshot[] {
    const vehicles = Array.isArray(data?.vehicles) ? data.vehicles : [];
    const groups = Array.isArray(data?.vehicleGroups) ? data.vehicleGroups : [];
    const archetypes = Array.isArray(data?.vehicleArchetypes) ? data.vehicleArchetypes : [];
    const result: BF6ItemSnapshot[] = [];

    const archetypesById = (ids: string[]) => archetypes.filter((row: any) => ids.includes(normalizeId(row?.id)));
    const aggregates: Record<string, any[]> = {
        vehicles: groups.filter((row: any) => normalizeId(row?.id) === "veh"),
        helicopter: archetypesById(["arch_heliattack", "arch_heliscout", "arch_helitrans"]),
        planes: archetypesById(["arch_jetattack", "arch_fighterplane", "arch_jetmultirole", "arch_jetfleet"]),
        attackheli: archetypesById(["arch_heliattack", "arch_heliscout"]),
        transheli: archetypesById(["arch_helitrans"]),
        bomber: archetypesById(["arch_jetattack"]),
        fighterjet: archetypesById(["arch_fighterplane", "arch_jetmultirole", "arch_jetfleet"]),
        mbt: archetypesById(["arch_mbt"]),
        ifv: archetypesById(["arch_ifv"]),
        mobileaa: archetypesById(["arch_antiair"]),
        lighttransport: archetypesById(["arch_lighttrans"]),
    };

    for (const def of BF6_VEHICLES) {
        const aggregate = aggregates[def.key];
        const exactKeys = "exactKeys" in def ? def.exactKeys.map(normalizeId) : [];
        const matched = def.key === "transport"
            ? vehicles.filter((v: any) => String(v?.type ?? "").toLowerCase() === "ground transport")
            : def.key === "dirtbike"
                ? vehicles.filter((v: any) => ["veh_sur_moto_db01", "veh_sur_moto_db02"].includes(normalizeId(v?.id)))
                : vehicles.filter((v: any) => exactKeys.includes(normalizeId(v?.id)));
        const kills = aggregate?.length
            ? aggregate.reduce((sum: number, row: any) => sum + Math.round(num(row?.kills)), 0)
            : matched.reduce((sum: number, v: any) => sum + Math.round(num(v?.kills)), 0);
        const timePlayedValue = aggregate?.length
            ? aggregate.reduce((sum: number, row: any) => sum + Math.round(num(row?.timeIn)), 0)
            : matched.reduce((sum: number, v: any) => sum + Math.round(num(v?.timeIn)), 0);
        result.push({
            playerId,
            itemKey: def.key as BF6VehicleSnapshotKey,
            kills,
            timePlayedValue,
            timePlayedDisplay: formatDuration(timePlayedValue),
        });
    }

    return result;
}

function extractClassSnapshots(playerId: string, data: any): BF6ClassSnapshot[] {
    const classes = Array.isArray(data?.classes) ? data.classes : [];
    const result: BF6ClassSnapshot[] = [];

    for (const cls of classes) {
        const classKey = String(cls?.id ?? "");
        if (!["kit_assault", "kit_engineer", "kit_support", "kit_recon"].includes(classKey)) continue;

        const timePlayedValue = Math.round(num(cls?.secondsPlayed));
        const kills = Math.round(num(cls?.kills));
        const deaths = Math.round(num(cls?.deaths));
        const kdRaw = num(cls?.killDeath);
        const kdRatio = Math.round((kdRaw > 0 ? kdRaw : deaths > 0 ? (kills / deaths) : kills) * 100);

        result.push({
            playerId,
            classKey: classKey as BF6ClassSnapshot["classKey"],
            className: String(cls?.className ?? cls?.name ?? classKey.replace("kit_", "")),
            timePlayedValue,
            timePlayedDisplay: formatDuration(timePlayedValue),
            kills,
            deaths,
            assists: Math.round(num(cls?.assists)),
            revives: Math.round(num(cls?.revives)),
            deployments: Math.round(num(cls?.spawns)),
            kdRatio,
        });
    }

    return result;
}

async function fetchPlayer(
    player: Player,
    timeoutMs = BF6_REQUEST_TIMEOUT_MS,
): Promise<PlayerFetchResult> {
    if (!player.personaId) {
        console.log(`❓ ${player.userName}: no personaId configured (needed by gametools)`);
        return { ok: false, status: "not_found" };
    }

    const controller = new AbortController();
    let timeoutId: ReturnType<typeof setTimeout>;
    const timeout = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
            controller.abort();
            reject(new Error(`request timed out after ${timeoutMs}ms`));
        }, timeoutMs);
    });

    try {
        const url = `${BASE_URL}/stats/?playerid=${encodeURIComponent(player.personaId)}&platform=pc`;
        const response = await Promise.race([
            fetch(url, {
                headers: { "Accept": "application/json" },
                signal: controller.signal,
            }),
            timeout,
        ]);

        const data = await Promise.race([response.json().catch(() => null), timeout]);

        if (!response.ok || (data && Array.isArray(data.errors))) {
            const notFound = response.status === 404 || (data?.errors ?? []).some((e: unknown) =>
                String(e).toLowerCase().includes("not found"));
            if (notFound) {
                console.log(`❓ ${player.userName}: player not found (gametools)`);
                return { ok: false, status: "not_found" };
            }
            console.error(`❌ Failed to fetch ${player.userName} (gametools): Status ${response.status}`);
            return { ok: false, status: "inactive" };
        }

        // Human-only kills to match tracker "playerKills" semantics (excludes AI bots).
        const kills = Math.round(num(data?.dividedKills?.human ?? data?.kills));
        const deaths = Math.round(num(data?.deaths));
        const revives = Math.round(num(data?.revives));
        const score = Math.round(num(data?.score));
        const aggregateClass = (Array.isArray(data?.classes) ? data.classes : [])
            .find((cls: any) => normalizeId(cls?.id) === "kit" || normalizeId(cls?.className) === "all");
        const timePlayedValue = Math.round(num(aggregateClass?.secondsPlayed ?? data?.secondsPlayed));
        const timePlayedDisplay = formatHours(timePlayedValue);
        const platformUserHandle = String(data?.userName ?? player.userName);
        const profileUrl = `https://tracker.gg/bf6/profile/${player.id}/overview`;

        console.log(`✅ ${player.userName}: ${kills} kills (gametools)`);

        return {
            ok: true,
            data: {
                rank: {
                    id: player.id,
                    kills,
                    platformUserHandle,
                    user: player.userName,
                    deaths,
                    revives,
                    score,
                    careerPlayerRank: null, // gametools has no career rank
                    timePlayedDisplay,
                    timePlayedValue,
                    profileUrl,
                },
                weaponPlaystyles: extractWeaponPlaystyles(player.id, data),
                itemSnapshots: [
                    ...extractGadgetSnapshots(player.id, data),
                    ...extractVehicleSnapshots(player.id, data),
                ],
                classSnapshots: extractClassSnapshots(player.id, data),
            },
        };
    } catch (error) {
        console.error(`❌ Failed to fetch ${player.userName} (gametools):`, error);
        return { ok: false, status: "inactive" };
    } finally {
        clearTimeout(timeoutId!);
    }
}

export const gametoolsProvider: BF6StatsProvider = {
    name: "gametools",
    defaultConcurrency: 3,
    fetchPlayer,
};
