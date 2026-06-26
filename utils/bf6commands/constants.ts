import { Message } from "discord.js";
import { users } from "../../../dis-bot-assets-private/utils/constants";
import { BF6ItemLeaderboardKey } from "../bf6data";

// ================= CONFIG =================
export const REFRESH_OWNER_ID = users.leog;
// ==========================================

export type SafeReply = (content: string) => Promise<Message | void>;

export type BF6Handler = (
    sub: SubCommand,
    msg: Message,
    args: string[],
    safeReply: SafeReply
) => Promise<void>;

export const SUBCOMMANDS = [
    "kills",
    "deaths",
    "revives",
    "score",
    "rank",
    "timePlayed",
    "playStyle",
    "bans",
    "refresh",
    "trackergg",
    "rpg",
    "c4",
    "mine",
    "claymore",
    "knife",
    "frag",
    "sledgehammer",
    "mbt",
    "ifv",
    "vehicles",
    "helicopter",
    "planes",
    "class",
    "assault",
    "engineer",
    "support",
    "recon",
    "history",
] as const;

export type SubCommand = typeof SUBCOMMANDS[number];
export const SUBCOMMANDS_LIST = SUBCOMMANDS.join(", ");

export const SUBCOMMAND_ALIASES: Partial<Record<SubCommand, string[]>> = {
    helicopter: ["heli", "chopper"],
    claymore: ["m18", "m18a1"],
    c4: ["c-4", "c4"],
    mine: ["m15", "mines"],
    sledgehammer: ["sledge", "hammer"],
    timePlayed: ["time", "playtime", "hours"],
    trackergg: ["tracker", "tg", "nicks", "nick"],
    vehicles: ["vehicle", "veh"],
    assault: ["aslt"],
    engineer: ["eng"],
    support: ["sup"],
    recon: ["rec"],
    planes: ["plane", "aircraft", "jet"],
    history: ["monthly", "month"],
    bans: ["ban", "banned"],
};

export function resolveSubcommand(raw: string | undefined): SubCommand | null {
    const normalized = raw?.trim().toLowerCase();
    if (!normalized) return null;

    const exact = SUBCOMMANDS.find((command) => command.toLowerCase() === normalized);
    if (exact) return exact;

    for (const command of SUBCOMMANDS) {
        const aliases = SUBCOMMAND_ALIASES[command] ?? [];
        if (aliases.some((alias) => alias.toLowerCase() === normalized)) {
            return command;
        }
    }

    return null;
}

export const itemSubcommands: Record<string, BF6ItemLeaderboardKey> = {
    rpg: "rpg",
    c4: "c4",
    mine: "m15",
    claymore: "m18a1",
    knife: "knife",
    frag: "frag",
    sledgehammer: "sledgehammer",
    mbt: "mbt",
    ifv: "ifv",
    vehicles: "vehicles",
    helicopter: "helicopter",
    planes: "planes",
};

export const itemTitles: Record<BF6ItemLeaderboardKey, string> = {
    rpg: "RPG",
    c4: "C-4 Explosive",
    mines: "Mines",
    m15: "M15 Mine",
    m18a1: "Claymore (M18A1)",
    knife: "Combat Knife",
    frag: "Frag Grenade",
    sledgehammer: "Sledgehammer",
    mbt: "Main Battle Tank (Leo 2A4 + M1A2)",
    ifv: "IFV (Strf + M3A3)",
    vehicles: "All Vehicles",
    helicopter: "Helicopters",
    planes: "Planes",
};
