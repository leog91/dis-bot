import { defineCommand } from "..";
import path from "path";
import { Message, TextChannel } from "discord.js";
import { guilds, users } from "../../utils/constants";
import { updateBf6RankFile } from "../../utils/bf6rank";
import { db } from "../../db/index";
import { bf6Scrapes, bf6Players } from "../../db/schema";
import { desc, eq, sql, and, lt, gt, inArray, lte } from "drizzle-orm";

// ================= CONFIG =================
const CACHE_DURATION = 6 * 60 * 60 * 1000; // 6 hours
const CACHE_FILE = path.join(process.cwd(), "bf6rank.json");
const REFRESH_OWNER_ID = users.leog;
// ==========================================

type SubCommand =
    | "kills"
    | "deaths"
    | "revives"
    | "score"
    | "rank"
    | "timePlayed"
    | "bans"
    | "refresh"
    | "trackergg";


const getLatestScrapes = async () => {
    const latestDates = db.select({
        maxDate: sql`MAX(${bf6Scrapes.scrapedAt})`
    }).from(bf6Scrapes).groupBy(bf6Scrapes.playerId);

    return await db.select({
        id: bf6Players.id,
        user: bf6Players.user,
        platformUserHandle: bf6Players.platformUserHandle,
        profileUrl: bf6Players.profileUrl,
        kills: bf6Scrapes.kills,
        deaths: bf6Scrapes.deaths,
        revives: bf6Scrapes.revives,
        score: bf6Scrapes.score,
        careerPlayerRank: bf6Scrapes.careerPlayerRank,
        timePlayedDisplay: bf6Scrapes.timePlayedDisplay,
        timePlayedValue: bf6Scrapes.timePlayedValue,
        scrapedAt: bf6Scrapes.scrapedAt,
    })
        .from(bf6Scrapes)
        .innerJoin(bf6Players, eq(bf6Scrapes.playerId, bf6Players.id))
        .where(
            inArray(bf6Scrapes.scrapedAt, latestDates)
        );
}


async function getProgressData(daysInfo: string): Promise<{ data: any[], timeframeLabel: string } | null> {
    // 1. Parse days
    let days = 0;
    if (daysInfo.endsWith("d")) days = parseInt(daysInfo.replace("d", ""));
    else if (daysInfo.endsWith("w")) days = parseInt(daysInfo.replace("w", "")) * 7;
    else if (daysInfo.endsWith("m")) days = parseInt(daysInfo.replace("m", "")) * 30;
    else return null;

    if (isNaN(days) || days <= 0) return null;

    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() - days);

    // 2. Fetch Latest Data
    const currentData = await getLatestScrapes();
    if (!currentData.length) return null;

    // 3. Fetch Historical Data
    // "Growth in last 7 days" = (Current) - (Data 7 days ago).
    // So we need data <= targetDate.

    // 3. Fetch Historical Data
    // Strategy: Fetch all scrapes, then find the best baseline for each player in JavaScript.
    // Priority 1: The most recent record that is <= targetDate (True history).
    // Priority 2: The oldest record available (if tracking started < days ago).

    // Fetch all scrapes for all players
    const allScrapes = await db.select({
        playerId: bf6Scrapes.playerId,
        kills: bf6Scrapes.kills,
        deaths: bf6Scrapes.deaths,
        revives: bf6Scrapes.revives,
        score: bf6Scrapes.score,
        timePlayedValue: bf6Scrapes.timePlayedValue,
        scrapedAt: bf6Scrapes.scrapedAt,
    })
        .from(bf6Scrapes)
        .orderBy(bf6Scrapes.scrapedAt);

    // Group by player
    const playerScrapesMap = new Map<string, typeof allScrapes>();
    allScrapes.forEach(scrape => {
        if (!playerScrapesMap.has(scrape.playerId)) {
            playerScrapesMap.set(scrape.playerId, []);
        }
        playerScrapesMap.get(scrape.playerId)!.push(scrape);
    });

    // 4. Calculate Diffs - Find baseline for each player
    const baselineMap = new Map();

    currentData.forEach(curr => {
        const scrapes = playerScrapesMap.get(curr.id);
        if (!scrapes || scrapes.length === 0) {
            return; // No history at all
        }

        // Find the best baseline:
        // 1. Try to find the most recent scrape <= targetDate
        let baseline = null;
        for (let i = scrapes.length - 1; i >= 0; i--) {
            if (scrapes[i].scrapedAt <= targetDate) {
                baseline = scrapes[i];
                break;
            }
        }

        // 2. If no scrape <= targetDate, use the oldest scrape (fallback)
        if (!baseline) {
            baseline = scrapes[0];
        }

        baselineMap.set(curr.id, baseline);
    });

    const progress = currentData.map(curr => {
        const past = baselineMap.get(curr.id);
        if (!past) {
            // Should strictly not happen if logic is correct and DB consistent, 
            // unless the "current" user has NO rows in scrapes table (which relies on innerJoin so unlikely)
            // or dates mismatch due to ms precision?
            return { ...curr, kills: 0, deaths: 0, revives: 0, score: 0, timePlayedValue: 0, isNew: true };
        }

        // If the 'past' record is essentially the same as 'curr' (e.g. only 1 scrape ever), diffs will be 0.
        return {
            ...curr,
            kills: curr.kills - past.kills,
            deaths: curr.deaths - past.deaths,
            revives: curr.revives - past.revives,
            score: curr.score - past.score,
            timePlayedValue: curr.timePlayedValue - past.timePlayedValue,
            isNew: false
        };
    });

    return { data: progress, timeframeLabel: `Last ${daysInfo}` };
}

async function getBF6Data(): Promise<any[]> {
    try {
        const latestScrapes = await getLatestScrapes();

        if (!latestScrapes.length) {
            console.log("No DB data found. Will fetch fresh data.");
            return await updateBf6RankFile();
        }

        // Check freshness
        const newestScrapeTime = latestScrapes.reduce((max, curr) =>
            curr.scrapedAt.getTime() > max ? curr.scrapedAt.getTime() : max, 0
        );
        const age = Date.now() - newestScrapeTime;

        if (age < CACHE_DURATION) {
            return latestScrapes;
        } else {
            console.log("DB data stale. Will fetch fresh data.");
            return await updateBf6RankFile();
        }

    } catch (err) {
        console.error("DB Error:", err);
        console.log("Fallback to direct fetch.");
    }
    return await updateBf6RankFile();
}

// Force refresh (ignores cache)
async function refreshBF6Data(): Promise<any[]> {
    return await updateBf6RankFile();
}

export default defineCommand({
    name: "bf6",
    description: "BF6 stats",
    type: "TEXT",
    permissions: [
        { type: "GUILD", ids: [guilds.Bytes, guilds.plll] }
    ],

    async execute(msg: Message, args: string[]) {
        if (!(msg.channel instanceof TextChannel)) {
            await msg.reply("This command can only be used in a text channel.");
            return;
        }

        const sub = args[0] as SubCommand;

        if (!sub) {
            await msg.reply(
                "Te falta el subcommand máquina:\n" +
                "kills, deaths, revives, score, rank, timePlayed, bans, refresh, trackergg"
            );
            return;
        }

        try {
            // 🔐 RESTRICTED REFRESH
            if (sub === "refresh") {
                if (msg.author.id !== REFRESH_OWNER_ID) {
                    await msg.reply("🚫 5 USD to leog");
                    return;
                }

                await refreshBF6Data();
                await msg.reply("force refresh.");
                return;
            }

            // Handle optional time argument (e.g., "7d", "1m")
            const timeArg = args[1];
            let bfdata = [];
            let isProgress = false;
            let timeLabel = "";

            if (timeArg) {
                const progress = await getProgressData(timeArg);
                if (progress) {
                    bfdata = progress.data;
                    isProgress = true;
                    timeLabel = progress.timeframeLabel;
                } else {
                    // Fallback to normal if parsing failed or invalid
                    bfdata = await getBF6Data();
                }
            } else {
                bfdata = await getBF6Data();
            }

            let sorted = bfdata;
            let content = "";
            const prefix = isProgress ? `📈 **Progress (${timeLabel})**\n` : "";
            const sign = isProgress ? "+" : "";

            switch (sub) {
                case "kills":
                    sorted = [...bfdata].sort((a, b) => b.kills - a.kills);
                    content = sorted
                        .map((p: any) => `${p.platformUserHandle} - ${sign}${p.kills} kills`)
                        .join("\n");
                    break;

                case "deaths":
                    sorted = [...bfdata].sort((a, b) => b.deaths - a.deaths);
                    content = sorted
                        .map((p) => `${p.platformUserHandle} - ${sign}${p.deaths} deaths`)
                        .join("\n");
                    break;

                case "revives":
                    sorted = [...bfdata].sort((a, b) => b.revives - a.revives);
                    content = sorted
                        .map((p) => `${p.platformUserHandle} - ${sign}${p.revives} revives`)
                        .join("\n");
                    break;

                case "score":
                    sorted = [...bfdata].sort((a, b) => b.score - a.score);
                    content = sorted
                        .map((p) => `${p.platformUserHandle} - ${sign}${p.score} score`)
                        .join("\n");
                    break;

                case "rank":
                    // Rank doesn't really have a "progress" sum in the same way, but rank change could be shown?
                    // For now, let's just show current rank even in progress mode
                    if (isProgress) {
                        // Fallback: Just show current data for rank, maybe show "rank gain" later?
                        const current = await getBF6Data();
                        sorted = [...current].sort((a, b) => b.careerPlayerRank - a.careerPlayerRank);
                    } else {
                        sorted = [...bfdata].sort((a, b) => b.careerPlayerRank - a.careerPlayerRank);
                    }
                    content = sorted
                        .map((p) => `${p.platformUserHandle} - Rank ${p.careerPlayerRank}`)
                        .join("\n");
                    break;

                case "timePlayed":
                    sorted = [...bfdata].sort(
                        (a, b) => b.timePlayedValue - a.timePlayedValue
                    );
                    content = sorted
                        .map((p) => {
                            if (isProgress) {
                                // Convert seconds to hours
                                const hours = (p.timePlayedValue / 3600).toFixed(1);
                                return `${p.platformUserHandle} - +${hours}h played`;
                            }
                            return `${p.platformUserHandle} - ${p.timePlayedDisplay}`;
                        })
                        .join("\n");
                    break;

                case "trackergg":
                    // Tracker link is static
                    // If progress mode, maybe we still just show links?
                    const current = await getBF6Data();
                    sorted = [...current].sort(
                        (a, b) => b.timePlayedValue - a.timePlayedValue
                    );
                    content = sorted
                        .map((p) => `[${p.platformUserHandle}](${p.profileUrl})`)
                        .join("\n");
                    break;


                case "bans":
                    content = "pablocc74 - 1 ban";
                    break;


                //await msg.channel.send("[Watch video](https://example.com)");


                default:
                    await msg.reply(
                        "Unknown subcommand. Available: kills, deaths, revives, score, rank, timePlayed, bans, refresh"
                    );
                    return;
            }

            if (!content) {
                await msg.reply("No rank data available yet.");
                return;
            }

            await msg.reply(prefix + content);
        } catch (err) {
            console.error(err);
            await msg.reply("⚠️ Could not load BF6 rank data.");
        }
    }
});
