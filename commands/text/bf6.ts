import { defineCommand } from "..";
import path from "path";
import { Message, TextChannel } from "discord.js";
import { guilds, users } from "../../utils/constants";
import { updateBf6RankFile } from "../../utils/bf6rank";
import { db } from "../../db/index";
import { bf6Scrapes, bf6Players } from "../../db/schema";
import { desc, eq, sql } from "drizzle-orm";

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


async function getBF6Data(): Promise<any[]> {
    try {
        // Query latest scrape for each player
        // We use a subquery approach to get the Max ID (latest) for each player
        const latestScrapes = await db.select({
            id: bf6Players.id,
            user: bf6Players.user, // Use the stored user name from metadata
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
                sql`(${bf6Scrapes.id}) IN (
                SELECT MAX(${bf6Scrapes.id})
                FROM ${bf6Scrapes}
                GROUP BY ${bf6Scrapes.playerId}
            )`
            );

        if (!latestScrapes.length) {
            console.log("No DB data found. Will fetch fresh data.");
            return await updateBf6RankFile();
        }

        // Check if data is stale (using the Cache Duration logic)
        // If the newest record is older than CACHE_DURATION, refresh
        // Find the most recent timestamp in the entire set
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

    // Fetch new data
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

            // Normal cached flow
            const bfdata = await getBF6Data();
            let sorted = bfdata;
            let content = "";

            switch (sub) {
                case "kills":
                    sorted = [...bfdata].sort((a, b) => b.kills - a.kills);
                    content = sorted
                        .map((p: any) => `${p.platformUserHandle} - ${p.kills} kills`)
                        .join("\n");
                    break;

                case "deaths":
                    sorted = [...bfdata].sort((a, b) => b.deaths - a.deaths);
                    content = sorted
                        .map((p) => `${p.platformUserHandle} - ${p.deaths} deaths`)
                        .join("\n");
                    break;

                case "revives":
                    sorted = [...bfdata].sort((a, b) => b.revives - a.revives);
                    content = sorted
                        .map((p) => `${p.platformUserHandle} - ${p.revives} revives`)
                        .join("\n");
                    break;

                case "score":
                    sorted = [...bfdata].sort((a, b) => b.score - a.score);
                    content = sorted
                        .map((p) => `${p.platformUserHandle} - ${p.score} score`)
                        .join("\n");
                    break;

                case "rank":
                    sorted = [...bfdata].sort(
                        (a, b) => b.careerPlayerRank - a.careerPlayerRank
                    );
                    content = sorted
                        .map((p) => `${p.platformUserHandle} - Rank ${p.careerPlayerRank}`)
                        .join("\n");
                    break;

                case "timePlayed":
                    sorted = [...bfdata].sort(
                        (a, b) => b.timePlayedValue - a.timePlayedValue
                    );
                    content = sorted
                        .map((p) => `${p.platformUserHandle} - ${p.timePlayedDisplay}`)
                        .join("\n");
                    break;

                case "trackergg":
                    sorted = [...bfdata].sort(
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

            await msg.reply(content);
        } catch (err) {
            console.error(err);
            await msg.reply("⚠️ Could not load BF6 rank data.");
        }
    }
});
