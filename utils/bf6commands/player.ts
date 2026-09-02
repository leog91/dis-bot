import { getPlayerAliasProfile, getPlayerOverview } from "../bf6data";
import { formatStatPercent, formatStatRate, formatStatRatio, statusMarker } from "./format";
import type { BF6Handler } from "./constants";

const numberFormatter = new Intl.NumberFormat("en-US");
type PlayerOverview = NonNullable<Awaited<ReturnType<typeof getPlayerOverview>>>;

function formatNumber(value: number | null): string {
    return value === null ? "-" : numberFormatter.format(value);
}

function rows(values: [string, string][]): string {
    const width = Math.max(...values.map(([label]) => label.length));
    return values.map(([label, value]) => `${label.padEnd(width)} | ${value}`).join("\n");
}

function scrapeNote(latest: NonNullable<PlayerOverview["latest"]>): string {
    const updated = latest.scrapedAt.toISOString().replace("T", " ").slice(0, 16);
    return `*Source: ${latest.source} | Updated: ${updated} UTC*`;
}

async function aliasesCard(userArg: string, safeReply: Parameters<BF6Handler>[3]) {
    const profile = await getPlayerAliasProfile(userArg);
    if (!profile) {
        await safeReply(`No BF6 player found for "${userArg}".`);
        return;
    }

    if (!profile.aliases.length) {
        await safeReply(`No alias history found for ${profile.player.platformUserHandle}.`);
        return;
    }

    const current = profile.player.platformUserHandle.trim().toLowerCase();
    const namespaceOrder = ["ea", "steam", "tracker"];
    const sections = namespaceOrder.flatMap((namespace) => {
        const aliases = profile.aliases.filter((alias) => alias.namespace === namespace);
        if (!aliases.length) return [];

        const lines = aliases.map((alias) => {
            const first = alias.firstSeenAt.toISOString().slice(0, 10);
            const last = alias.lastSeenAt.toISOString().slice(0, 10);
            const currentLabel = alias.handle.trim().toLowerCase() === current ? " (current)" : "";
            const dates = alias.source === "manual" || first === last
                ? `recorded ${first}`
                : `${first} to ${last}`;
            return `${alias.handle}${currentLabel} | ${alias.source} | ${dates}`;
        });
        return [`${namespace.toUpperCase()}\n${lines.join("\n")}`];
    });

    await safeReply(
        ` **${profile.player.platformUserHandle}${statusMarker(profile.player.status)} - Alias History**\n` +
        "```text\n" + sections.join("\n\n") + "\n```"
    );
}

export const playerHandler: BF6Handler = async (sub, _msg, args, safeReply) => {
    const userArg = args.slice(1).join(" ").trim();
    if (!userArg) {
        await safeReply(`Usage: \`bf6 ${sub} [user]\``);
        return;
    }

    if (sub === "aliases") {
        await aliasesCard(userArg, safeReply);
        return;
    }

    const overview = await getPlayerOverview(userArg);
    if (!overview) {
        await safeReply(`No BF6 player found for "${userArg}".`);
        return;
    }
    if (!overview.latest) {
        await safeReply(`No stats found for ${overview.player.platformUserHandle}.`);
        return;
    }

    const p = overview.latest;
    const title = `${p.platformUserHandle}${statusMarker(p.status)}`;
    let cardRows: [string, string][];
    let cardTitle: string;

    if (sub === "stats") {
        const decidedMatches = p.wins === null || p.losses === null ? null : p.wins + p.losses;
        cardTitle = `${title} - Stats`;
        cardRows = [
            ["Human kills", formatNumber(p.kills)],
            ["Deaths", formatNumber(p.deaths)],
            ["K/D", formatStatRatio(p.kills, p.deaths)],
            ["Wins", formatNumber(p.wins)],
            ["Losses", formatNumber(p.losses)],
            ["Win rate", formatStatPercent(p.wins, decidedMatches)],
            ["Matches", formatNumber(p.matchesPlayed)],
            ["Accuracy", formatStatPercent(p.shotsHit, p.shotsFired)],
            ["Human KPM", formatStatRate(p.kills, p.timePlayedValue)],
            ["Damage/min", formatStatRate(p.damage, p.timePlayedValue)],
            ["Damage", formatNumber(p.damage)],
            ["Score", formatNumber(p.score)],
            ["Playtime", p.timePlayedDisplay],
        ];
    } else if (sub === "teamplay") {
        cardTitle = `${title} - Teamplay`;
        cardRows = [
            ["Revives", formatNumber(p.revives)],
            ["Squad revives", formatNumber(p.squadmateRevives)],
            ["Kill assists", formatNumber(p.killAssists)],
            ["Heals", formatNumber(p.heals)],
            ["Resupplies", formatNumber(p.resupplies)],
            ["Repairs", formatNumber(p.repairs)],
            ["Enemies spotted", formatNumber(p.enemiesSpotted)],
        ];
    } else if (sub === "ai") {
        const classifiedKills = p.aiKills === null ? null : p.kills + p.aiKills;
        cardTitle = `${title} - Human vs AI Kills`;
        cardRows = [
            ["Human kills", formatNumber(p.kills)],
            ["AI kills", formatNumber(p.aiKills)],
            ["Classified total", formatNumber(classifiedKills)],
            ["Human share", formatStatPercent(p.kills, classifiedKills)],
            ["AI share", formatStatPercent(p.aiKills, classifiedKills)],
        ];
    } else {
        await safeReply("Unknown player subcommand.");
        return;
    }

    await safeReply(
        ` **${cardTitle}**\n` +
        "```text\n" + rows(cardRows) + "\n```\n" +
        scrapeNote(p)
    );
};
