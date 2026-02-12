import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { db } from "../db/index";
import { bf6Players, bf6Scrapes } from "../db/schema";
import { eq } from "drizzle-orm";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PLAYERS_CONFIG_PATH = path.join(__dirname, "..", "config", "bf6players.json");

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

async function fetchPlayerData(player: Player): Promise<PlayerRank | null> {
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
            console.error(`❌ Failed to fetch ${player.userName}: Status ${response.status}`);
            return null;
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

        console.log(`✅ ${player.userName}: ${kills} kills`);

        return {
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
        };
    } catch (error) {
        console.error(`❌ Failed to fetch ${player.userName}:`, error);
        return null;
    }
}

export async function bf6Rank(): Promise<PlayerRank[]> {
    console.log("Fetching player data sequentially...\n");

    const players = await loadPlayers();
    if (players.length === 0) {
        console.error("❌ No players configured. Check config/bf6players.json");
        return [];
    }

    const playerRank: PlayerRank[] = [];

    // Sequential fetching to avoid rate limits
    for (const player of players) {
        const data = await fetchPlayerData(player);
        if (data) {
            playerRank.push(data);
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

export async function updateBf6Data() {
    const results: PlayerRank[] = [];
    const players = await loadPlayers();
    
    if (players.length === 0) {
        console.error("❌ No players configured. Check config/bf6players.json");
        return [];
    }

    console.log("Fetching player data sequentially...");
    for (const player of players) {
        const data = await fetchPlayerData(player);
        if (data) {
            results.push(data);
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
        const scrapedAt = new Date();

        for (const p of results) {
            // 1. Upsert Metadata
            const existingPlayer = await db.select().from(bf6Players).where(eq(bf6Players.id, p.id)).get();
            if (existingPlayer) {
                await db.update(bf6Players).set({
                    platformUserHandle: p.platformUserHandle,
                    user: p.user,
                    profileUrl: p.profileUrl,
                    updatedAt: new Date(),
                }).where(eq(bf6Players.id, p.id));
            } else {
                await db.insert(bf6Players).values({
                    id: p.id,
                    platformUserHandle: p.platformUserHandle,
                    user: p.user,
                    profileUrl: p.profileUrl,
                });
            }

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
        }
        console.log("✅ Database updated.");
    } catch (error) {
        console.error("❌ Failed to update database:", error);
    }

    return results;
}
