import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { bf6ItemSnapshots, bf6Scrapes, bf6Players, bf6WeaponPlaystyles, bf6ClassSnapshots } from "../db/schema";
import { eq } from "drizzle-orm";
import type { BF6PlayerStatus } from "../db/schema";
import { BF6_GADGETS, BF6_GADGET_BY_KEY, gadgetSegmentMatches, type BF6GadgetSnapshotKey } from "./bf6gadgets";
import { BF6_VEHICLES, vehicleSegmentMatches, type BF6VehicleSnapshotKey } from "./bf6vehicles";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const fallbackPlayersConfigPath = process.env.ASSETS_PRIVATE_DIR
    ? path.join(process.env.ASSETS_PRIVATE_DIR, "config", "bf6players.json")
    : path.join(__dirname, "..", "config", "bf6players.json");
const PLAYERS_CONFIG_PATH = process.env.BF6_PLAYERS_CONFIG_PATH ?? fallbackPlayersConfigPath;

type Player = {
    userName: string;
    id: string;
};

async function loadPlayers(): Promise<Player[]> {
    try {
        const data = await fs.readFile(PLAYERS_CONFIG_PATH, "utf-8");
        return JSON.parse(data);
    } catch (error) {
        console.error("❌ Failed to load BF6 players config:", error);
        return [];
    }
}

async function delay(ms: number) {
    return new Promise(res => setTimeout(res, ms));
}

export type PlayerRank = {
    id: string;
    kills: number;
    deaths: number
    revives: number
    platformUserHandle: string;
    user: string;
    score: number;
    careerPlayerRank: number;
    timePlayedDisplay: string;
    timePlayedValue: number;
    profileUrl: string;
};

export type WeaponPlaystyleSnapshot = {
    playerId: string;
    weaponName: string;
    kills: number;
    timePlayedValue: number;
    timePlayedDisplay: string;
    adsKills: number;
    hipfireKills: number;
    headshots: number;
    shotsHit: number;
    shotsFired: number;
    adsPct: number; // basis points (x100)
    hipfirePct: number; // basis points (x100)
    headshotPct: number; // basis points (x100)
    accuracyPct: number; // basis points (x100)
};

export type BF6ItemSnapshotKey = BF6GadgetSnapshotKey | BF6VehicleSnapshotKey;

export type BF6ItemSnapshot = {
    playerId: string;
    itemKey: BF6ItemSnapshotKey;
    kills: number;
    timePlayedValue: number;
    timePlayedDisplay: string;
};

export type BF6ClassKey = "kit_assault" | "kit_engineer" | "kit_support" | "kit_recon";

export type BF6ClassSnapshot = {
    playerId: string;
    classKey: BF6ClassKey;
    className: string;
    timePlayedValue: number;
    timePlayedDisplay: string;
    kills: number;
    deaths: number;
    assists: number;
    revives: number;
    deployments: number;
    kdRatio: number; // stored as basis points (x100)
};

type PlayerFetchSuccess = {
    rank: PlayerRank;
    weaponPlaystyles: WeaponPlaystyleSnapshot[];
    itemSnapshots: BF6ItemSnapshot[];
    classSnapshots: BF6ClassSnapshot[];
};

export type PlayerFetchResult =
    | { ok: true; data: PlayerFetchSuccess }
    | { ok: false; status: BF6PlayerStatus };

export function normalizeKey(value: string): string {
    return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function getStatEntry(stats: Record<string, any>, exactCandidates: string[], fuzzyIncludes: string[] = []) {
    const entries = Object.entries(stats ?? {});
    if (!entries.length) return null;

    const normalizedCandidates = exactCandidates.map(normalizeKey);
    for (const [key, stat] of entries) {
        if (normalizedCandidates.includes(normalizeKey(key))) {
            return stat;
        }
    }

    const normalizedFuzzy = fuzzyIncludes.map(normalizeKey);
    for (const [key, stat] of entries) {
        const normalizedKey = normalizeKey(key);
        if (normalizedFuzzy.some((needle) => normalizedKey.includes(needle))) {
            return stat;
        }
    }

    return null;
}

export function getStatNumber(stats: Record<string, any>, exactCandidates: string[], fuzzyIncludes: string[] = []): number {
    const entry = getStatEntry(stats, exactCandidates, fuzzyIncludes);
    const value = Number(entry?.value ?? 0);
    return Number.isFinite(value) ? value : 0;
}

function getStatDisplay(stats: Record<string, any>, exactCandidates: string[], fuzzyIncludes: string[] = []): string | null {
    const entry = getStatEntry(stats, exactCandidates, fuzzyIncludes);
    const displayValue = entry?.displayValue;
    return typeof displayValue === "string" ? displayValue : null;
}

export function clampPercent(percent: number): number {
    if (!Number.isFinite(percent)) return 0;
    return Math.max(0, Math.min(100, percent));
}

export function normalizePercent(raw: number): number {
    if (!Number.isFinite(raw) || raw <= 0) return 0;
    // Tracker endpoints can expose percentages either as 0..1 or 0..100.
    return raw <= 1 ? raw * 100 : raw;
}

export function toBasisPoints(percent: number): number {
    return Math.round(clampPercent(percent) * 100);
}

export function formatHours(seconds: number): string {
    return `${(seconds / 3600).toFixed(1)}h`;
}

export function formatDuration(seconds: number): string {
    const safe = Math.max(0, Math.round(seconds));
    const hours = Math.floor(safe / 3600);
    const mins = Math.floor((safe % 3600) / 60);
    const secs = safe % 60;
    if (hours > 0) return `${hours}h ${mins}m`;
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
}

const itemSnapshotKeys: BF6ItemSnapshotKey[] = [
    ...BF6_GADGETS.map((gadget) => gadget.key),
    ...BF6_VEHICLES.map((vehicle) => vehicle.key),
];

function segmentMatchesItem(segment: any, item: BF6ItemSnapshotKey): boolean {
    if (item in BF6_GADGET_BY_KEY) {
        return gadgetSegmentMatches(segment, item as BF6GadgetSnapshotKey);
    }
    return vehicleSegmentMatches(segment, item as BF6VehicleSnapshotKey);
}

export function extractItemSnapshots(playerId: string, payload: any): BF6ItemSnapshot[] {
    const segments = Array.isArray(payload?.data?.segments) ? payload.data.segments : [];

    return itemSnapshotKeys.map((itemKey) => {
        const matched = segments.filter((segment: any) => segmentMatchesItem(segment, itemKey));
        const kills = matched.reduce((sum: number, segment: any) =>
            sum + Math.round(getStatNumber(segment?.stats ?? {}, ["kills"], ["kills"])), 0);
        const timePlayedValue = matched.reduce((sum: number, segment: any) =>
            sum + Math.round(getStatNumber(segment?.stats ?? {}, ["timePlayed", "secondsPlayed"], ["timeplayed", "seconds"])), 0);

        return {
            playerId,
            itemKey,
            kills,
            timePlayedValue,
            timePlayedDisplay: formatDuration(timePlayedValue),
        };
    });
}

const classKeys: BF6ClassKey[] = ["kit_assault", "kit_engineer", "kit_support", "kit_recon"];

export function extractClassSnapshots(playerId: string, payload: any): BF6ClassSnapshot[] {
    const segments = Array.isArray(payload?.data?.segments) ? payload.data.segments : [];

    const classSegments = segments.filter((segment: any) => {
        const type = String(segment?.type ?? "").toLowerCase();
        return type === "kit";
    });

    const result: BF6ClassSnapshot[] = [];

    for (const classKey of classKeys) {
        const matched = classSegments.find((segment: any) => {
            const key = String(segment?.attributes?.key ?? "").toLowerCase();
            return key === classKey;
        });

        if (!matched) continue;

        const stats = matched?.stats ?? {};
        const className = String(matched?.metadata?.name ?? classKey.replace("kit_", ""));

        const timePlayedValue = Math.round(getStatNumber(stats, ["timePlayed", "secondsPlayed"], ["timeplayed", "seconds"]));
        const kills = Math.round(getStatNumber(stats, ["kills"], ["kills"]));
        const deaths = Math.round(getStatNumber(stats, ["deaths"], ["deaths"]));
        const assists = Math.round(getStatNumber(stats, ["assists"], ["assists"]));
        const revives = Math.round(getStatNumber(stats, ["revives"], ["revives"]));
        const deployments = Math.round(getStatNumber(stats, ["deployments"], ["deployments"]));

        const kdRatioRaw = getStatNumber(stats, ["kdRatio", "kd"], ["k/d", "kd"]);
        const kdRatio = Math.round(kdRatioRaw * 100);

        result.push({
            playerId,
            classKey,
            className,
            timePlayedValue,
            timePlayedDisplay: formatDuration(timePlayedValue),
            kills,
            deaths,
            assists,
            revives,
            deployments,
            kdRatio,
        });
    }

    return result;
}

export function extractWeaponPlaystyles(playerId: string, payload: any): WeaponPlaystyleSnapshot[] {
    const allSegments = Array.isArray(payload?.data?.segments) ? payload.data.segments : [];
    const weaponSegments = allSegments.filter((segment: any) => {
        const type = String(segment?.type ?? "").toLowerCase();
        return type === "weapon";
    });

    const byWeapon = new Map<string, WeaponPlaystyleSnapshot>();

    for (const segment of weaponSegments) {
        const stats = segment?.stats ?? {};
        const weaponName = String(
            segment?.metadata?.name ??
            segment?.metadata?.weaponName ??
            segment?.attributes?.weaponName ??
            "Unknown Weapon"
        ).trim();

        const kills = getStatNumber(stats, ["kills", "weaponKills", "playerKills"], ["kills"]);
        const timePlayedValue = Math.round(getStatNumber(stats, ["timePlayed", "weaponTime", "secondsPlayed", "timeUsed"], ["timeplayed", "seconds"]));
        if (timePlayedValue < 3600) continue;

        const timePlayedDisplay =
            getStatDisplay(stats, ["timePlayed", "weaponTime", "secondsPlayed", "timeUsed"], ["timeplayed", "seconds"]) ??
            formatHours(timePlayedValue);

        const adsKills = Math.round(getStatNumber(stats, ["adsKills", "killsAds", "killsADS"], ["adskills", "aimdownsights"]));
        const hipfireKills = Math.round(getStatNumber(stats, ["hipfireKills", "killsHipfire", "killsHipFire"], ["hipfirekills", "killshipfire"]));
        const headshots = Math.round(getStatNumber(stats, ["headshots", "headshotKills", "killsHeadshot"], ["headshotkills", "killsheadshot"]));
        const shotsHit = Math.round(getStatNumber(stats, ["shotsHit", "hits", "bulletsHit"], ["shotshit", "hits"]));
        const shotsFired = Math.round(getStatNumber(stats, ["shotsFired", "bulletsFired"], ["shotsfired", "fired"]));

        const adsPctDirect = normalizePercent(getStatNumber(stats, ["adsKillPercentage", "adsPercentage"], ["adspercent"]));
        const hipfirePctDirect = normalizePercent(getStatNumber(stats, ["hipfireKillPercentage", "hipfirePercentage"], ["hipfirepercent"]));
        const headshotPctDirect = normalizePercent(getStatNumber(stats, ["headshotPercentage", "headshotsPercentage"], ["headshotpercent"]));
        const accuracyPctDirect = normalizePercent(getStatNumber(stats, ["shotsAccuracy", "accuracyPercentage", "accuracy"], ["accuracy"]));

        let adsPct = 0;
        let hipfirePct = 0;
        const totalAdsHip = adsKills + hipfireKills;
        if (totalAdsHip > 0) {
            adsPct = (adsKills / totalAdsHip) * 100;
            hipfirePct = 100 - adsPct;
        } else if (adsPctDirect > 0 || hipfirePctDirect > 0) {
            const directTotal = adsPctDirect + hipfirePctDirect;
            if (directTotal > 0) {
                adsPct = (adsPctDirect / directTotal) * 100;
                hipfirePct = 100 - adsPct;
            }
        }

        const headshotPct = kills > 0 && headshots > 0 ? (headshots / kills) * 100 : headshotPctDirect;
        const accuracyPct = shotsFired > 0 ? (shotsHit / shotsFired) * 100 : accuracyPctDirect;

        const snapshot: WeaponPlaystyleSnapshot = {
            playerId,
            weaponName,
            kills,
            timePlayedValue,
            timePlayedDisplay,
            adsKills,
            hipfireKills,
            headshots,
            shotsHit,
            shotsFired,
            adsPct: toBasisPoints(adsPct),
            hipfirePct: toBasisPoints(hipfirePct),
            headshotPct: toBasisPoints(headshotPct),
            accuracyPct: toBasisPoints(accuracyPct),
        };

        const dedupeKey = weaponName.toLowerCase();
        const existing = byWeapon.get(dedupeKey);
        if (!existing || snapshot.timePlayedValue > existing.timePlayedValue) {
            byWeapon.set(dedupeKey, snapshot);
        }
    }

    return [...byWeapon.values()].sort((a, b) => b.timePlayedValue - a.timePlayedValue);
}

export async function fetchPlayerData(player: Player): Promise<PlayerFetchResult> {
    try {
        const url = `https://api.tracker.gg/api/v2/bf6/standard/profile/ign/${player.id}`
        const response = await fetch(url, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
                "Accept": "application/json",
                "Accept-Language": "en-US,en;q=0.9",
            },
        });

        if (!response.ok) {
            if (response.status === 403) {
                console.log(`🔒 ${player.userName}: profile private`);
                return { ok: false, status: "private" };
            }
            if (response.status === 404) {
                console.log(`❓ ${player.userName}: profile not found`);
                return { ok: false, status: "not_found" };
            }
            console.error(`❌ Failed to fetch ${player.userName}: Status ${response.status}`);
            return { ok: false, status: "inactive" };
        }

        const data = await response.json();

        const kills = data.data?.segments?.[0]?.stats?.playerKills?.value ?? 0;
        const deaths = data.data?.segments?.[0]?.stats?.deaths?.value ?? 0;
        const revives = data.data?.segments?.[0]?.stats?.revives?.value ?? 0;
        const score = data.data?.segments?.[0]?.stats?.score?.value ?? 0;
        const careerPlayerRank = data.data?.segments?.[0]?.stats?.careerPlayerRank?.value ?? 0;
        const timePlayedDisplay = data.data?.segments?.[0]?.stats?.timePlayed?.displayValue ?? "N/A";
        const timePlayedValue = data.data?.segments?.[0]?.stats?.timePlayed?.value ?? 0;
        const profileUrl = `https://tracker.gg/bf6/profile/${player.id}/overview`;

        const platformUserHandle = data.data?.platformInfo?.platformUserHandle ?? "N/A";
        const weaponPlaystyles = extractWeaponPlaystyles(player.id, data);
        const itemSnapshots = extractItemSnapshots(player.id, data);
        const classSnapshots = extractClassSnapshots(player.id, data);

        console.log(`✅ ${player.userName}: ${kills} kills`);

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
                    careerPlayerRank,
                    timePlayedDisplay,
                    timePlayedValue,
                    profileUrl
                },
                weaponPlaystyles,
                itemSnapshots,
                classSnapshots,
            },
        };
    } catch (error) {
        console.error(`❌ Failed to fetch ${player.userName}:`, error);
        return { ok: false, status: "inactive" };
    }
}

export async function bf6Rank(): Promise<PlayerRank[]> {
    console.log("Fetching player data sequentially...\n");

    const players = await loadPlayers();
    if (players.length === 0) {
        console.error(`❌ No players configured. Check ${PLAYERS_CONFIG_PATH}`);
        return [];
    }

    const playerRank: PlayerRank[] = [];

    // Sequential fetching to avoid rate limits
    for (const player of players) {
        const data = await fetchPlayerData(player);
        if (data.ok) {
            playerRank.push(data.data.rank);
        }
        await delay(1000);
    }

    // Sort by kills descending
    playerRank.sort((a, b) => b.kills - a.kills);

    console.log("\n🏆 Player Rankings (sorted by kills):");
    console.table(
        playerRank.map((p, index) => ({
            Rank: index + 1,
            User: p.user,
            Kills: p.kills,
            Handle: p.platformUserHandle,
        }))
    );

    return playerRank;
}

let updateBf6DataPromise: Promise<PlayerRank[]> | null = null;

async function runBf6DataUpdate() {
    const results: PlayerRank[] = [];
    const fetchResults = new Map<string, PlayerFetchResult>();
    const players = await loadPlayers();

    if (players.length === 0) {
        console.error(`❌ No players configured. Check ${PLAYERS_CONFIG_PATH}`);
        return [];
    }

    console.log("Fetching player data sequentially...");
    for (const player of players) {
        const result = await fetchPlayerData(player);
        fetchResults.set(player.id, result);
        if (result.ok) {
            results.push(result.data.rank);
        }
        await delay(1000);
    }

    if (results.length === 0) {
        console.error("❌ No data fetched successfully. Aborting save.");
        return [];
    }

    results.sort((a, b) => b.kills - a.kills);

    // DB Persistence
    try {
        console.log("💾 Saving to database...");
        const { db } = await import("../db/index");
        const scrapedAt = new Date();

        for (const player of players) {
            const result = fetchResults.get(player.id);
            if (!result) continue;

            const profileUrl = `https://tracker.gg/bf6/profile/${player.id}/overview`;

            // 1. Upsert Metadata (always, so status is tracked even for private/inactive players)
            const existingPlayer = await db.select().from(bf6Players).where(eq(bf6Players.id, player.id)).get();

            let platformUserHandle: string;
            let status: BF6PlayerStatus;
            if ("status" in result) {
                // Private / inactive / not_found: keep the last known handle if we have one,
                // otherwise fall back to the configured username (never the raw id).
                status = result.status;
                platformUserHandle = existingPlayer?.platformUserHandle ?? player.userName;
            } else {
                status = "active";
                platformUserHandle = result.data.rank.platformUserHandle;
            }

            if (existingPlayer) {
                await db.update(bf6Players).set({
                    platformUserHandle,
                    user: player.userName,
                    profileUrl,
                    status,
                    updatedAt: new Date(),
                }).where(eq(bf6Players.id, player.id));
            } else {
                await db.insert(bf6Players).values({
                    id: player.id,
                    platformUserHandle,
                    user: player.userName,
                    profileUrl,
                    status,
                });
            }

            if (!result.ok) continue;

            const entry = result.data;
            const p = entry.rank;

            // 2. Insert Scrape
            await db.insert(bf6Scrapes).values({
                playerId: p.id,
                kills: p.kills,
                deaths: p.deaths,
                revives: p.revives,
                score: p.score,
                careerPlayerRank: p.careerPlayerRank,
                timePlayedDisplay: p.timePlayedDisplay,
                timePlayedValue: p.timePlayedValue,
                scrapedAt: scrapedAt
            });

            // 3. Replace weapon playstyle snapshot for this player
            await db.delete(bf6WeaponPlaystyles).where(eq(bf6WeaponPlaystyles.playerId, p.id));
            if (entry.weaponPlaystyles.length > 0) {
                await db.insert(bf6WeaponPlaystyles).values(
                    entry.weaponPlaystyles.map((w) => ({
                        playerId: w.playerId,
                        weaponName: w.weaponName,
                        kills: w.kills,
                        timePlayedValue: w.timePlayedValue,
                        timePlayedDisplay: w.timePlayedDisplay,
                        adsKills: w.adsKills,
                        hipfireKills: w.hipfireKills,
                        headshots: w.headshots,
                        shotsHit: w.shotsHit,
                        shotsFired: w.shotsFired,
                        adsPct: w.adsPct,
                        hipfirePct: w.hipfirePct,
                        headshotPct: w.headshotPct,
                        accuracyPct: w.accuracyPct,
                        scrapedAt,
                    }))
                );
            }

            // 4. Replace item snapshots for this player
            await db.delete(bf6ItemSnapshots).where(eq(bf6ItemSnapshots.playerId, p.id));
            if (entry.itemSnapshots.length > 0) {
                await db.insert(bf6ItemSnapshots).values(
                    entry.itemSnapshots.map((item) => ({
                        playerId: item.playerId,
                        itemKey: item.itemKey,
                        kills: item.kills,
                        timePlayedValue: item.timePlayedValue,
                        timePlayedDisplay: item.timePlayedDisplay,
                        scrapedAt,
                    }))
                );
            }

            // 5. Replace class snapshots for this player
            await db.delete(bf6ClassSnapshots).where(eq(bf6ClassSnapshots.playerId, p.id));
            if (entry.classSnapshots.length > 0) {
                await db.insert(bf6ClassSnapshots).values(
                    entry.classSnapshots.map((cls) => ({
                        playerId: cls.playerId,
                        classKey: cls.classKey,
                        className: cls.className,
                        timePlayedValue: cls.timePlayedValue,
                        timePlayedDisplay: cls.timePlayedDisplay,
                        kills: cls.kills,
                        deaths: cls.deaths,
                        assists: cls.assists,
                        revives: cls.revives,
                        deployments: cls.deployments,
                        kdRatio: cls.kdRatio,
                        scrapedAt,
                    }))
                );
            }
        }
        console.log("✅ Database updated.");
    } catch (error) {
        console.error("❌ Failed to update database:", error);
    }

    return results;
}

export async function updateBf6Data() {
    if (updateBf6DataPromise) {
        console.log("BF6 update already running; waiting for the current update.");
        return updateBf6DataPromise;
    }

    updateBf6DataPromise = runBf6DataUpdate().finally(() => {
        updateBf6DataPromise = null;
    });

    return updateBf6DataPromise;
}
