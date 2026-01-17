


import fs from "fs/promises";
import { db } from "../db/index";
import { bf6Players, bf6Scrapes } from "../db/schema";
import { eq } from "drizzle-orm";

type Player = {
    userName: string;
    id: string;
};

async function delay(ms: number) {
    return new Promise(res => setTimeout(res, ms));
}

const players: Player[] = [
    { userName: "gd92", id: "3194756111" },
    { userName: "Lik4n", id: "3105796734" },
    { userName: "pablocc74", id: "3211453693" },
    { userName: "Mave", id: "3113523271" },
    { userName: "andy", id: "2778059679" },
    { userName: "AxelFLoyd", id: "3120040957" },
    { userName: "giraldo", id: "3165910038" },
    { userName: "salsagolf", id: "3176788207" },
    { userName: "perro", id: "1000350916995" },

    { userName: "fedepolito", id: "3146576220" },
    { userName: "mastermind", id: "2740207544" },
    {
        userName: "sharpvertex", id: "1001311619103"
    },

    { userName: "leog", id: "2992584642" },



];

type PlayerRank = {
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

async function fetchPlayerData(player: Player): Promise<PlayerRank> {
    try {

        const url = `https://api.tracker.gg/api/v2/bf6/standard/profile/ign/${player.id}`
        const response = await fetch(url, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
                "Accept": "application/json",
                "Accept-Language": "en-US,en;q=0.9",
            },
        });
        // const response = await fetch(
        //     `https://api.tracker.gg/api/v2/bf6/standard/profile/ign/${player.id}`
        // );
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
        return {
            id: player.id,
            kills: 0,
            platformUserHandle: "N/A",
            user: player.userName,
            deaths: 0,
            revives: 0,
            score: 0,
            careerPlayerRank: 0,
            timePlayedDisplay: "N/A",
            timePlayedValue: 0,
            profileUrl: "N/A"
        };
    }
}

export async function bf6Rank(): Promise<PlayerRank[]> {
    console.log("Fetching player data sequentially...\n");

    const playerRank: PlayerRank[] = [];

    // Sequential fetching to avoid rate limits
    for (const player of players) {
        const data = await fetchPlayerData(player);
        playerRank.push(data);
        await delay(1000); // 
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

export async function updateBf6RankFile() {
    const results: PlayerRank[] = [];

    console.log("Fetching player data sequentially...");
    for (const player of players) {
        const data = await fetchPlayerData(player);
        results.push(data);
        await new Promise((res) => setTimeout(res, 1000));
    }

    results.sort((a, b) => b.kills - a.kills);

    const payload = {
        lastUpdated: Date.now(),
        data: results
    };

    await fs.writeFile("./bf6rank.json", JSON.stringify(payload, null, 2));
    console.log("💾 Saved updated player ranks to bf6rank.json");

    // DB Persistence
    try {
        console.log("💾 Saving to database...");
        const scrapedAt = new Date(); // Use same timestamp for all records in this batch

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

