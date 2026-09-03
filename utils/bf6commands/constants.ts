import { Message } from "discord.js";
import { users } from "../../../dis-bot-assets-private/utils/constants";
import { BF6ItemLeaderboardKey } from "../bf6data";
import {
    BF6_GADGETS,
    BF6_GADGET_BY_COMMAND,
    BF6_GADGET_COMMANDS,
    resolveGadgetCommand,
    type BF6GadgetCommand,
    type BF6GadgetSnapshotKey,
} from "../bf6gadgets";
import {
    BF6_VEHICLES,
    BF6_VEHICLE_BY_COMMAND,
    BF6_VEHICLE_COMMANDS,
    resolveVehicleCommand,
    type BF6VehicleCommand,
} from "../bf6vehicles";

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
    "stats",
    "teamplay",
    "ai",
    "playStyle",
    "bans",
    "refresh",
    "social",
    ...BF6_GADGET_COMMANDS,
    ...BF6_VEHICLE_COMMANDS,
    "class",
    "assault",
    "engineer",
    "support",
    "recon",
    "history",
    "aliases",
] as const;

export type SubCommand = typeof SUBCOMMANDS[number];

const SUBCOMMAND_HELP_CATEGORIES: readonly { title: string; commands: readonly SubCommand[] }[] = [
    { title: "Stats", commands: ["kills", "deaths", "revives", "score", "rank", "timePlayed", "stats", "teamplay", "ai", "playStyle", "history"] },
    { title: "Combat Gadget Groups", commands: ["combatgadgets", "launchers", "mines", "grenades", "melee"] },
    { title: "Launchers", commands: ["m320he", "m320thrm", "sichg1wp", "rpg", "mas148", "spire", "m136at", "igla"] },
    { title: "Explosives & Grenades", commands: ["ptkm1r", "mine", "claymore", "slam", "c4", "frag", "incendiary"] },
    { title: "Special & Melee", commands: ["throwingknife", "hti", "knife", "sledgehammer", "iceaxe", "machete", "eodarm"] },
    { title: "Vehicle Groups", commands: ["vehicles", "helicopter", "planes", "attackheli", "transheli", "bomber", "fighterjet", "mbt", "ifv", "mobileaa", "lighttransport", "transport", "dirtbike"] },
    { title: "Aircraft", commands: ["falchion", "f61v", "kestrel", "panthera", "f39e", "su57", "seacat", "superspectre", "littlebird"] },
    { title: "Ground & Naval", commands: ["glider96", "m1a2", "strf09", "leo2a4", "cheetah", "bradley", "royalptv", "rugged", "traverser", "rhib", "vector", "tm450", "m1030", "ltv", "rcb90"] },
    { title: "Classes", commands: ["class", "assault", "engineer", "support", "recon"] },
    { title: "Other", commands: ["aliases", "social", "refresh", "bans"] },
];

export const SUBCOMMANDS_HELP = SUBCOMMAND_HELP_CATEGORIES
    .map(({ title, commands }) => `**${title}**\n${commands.map((command) => `\`${command}\``).join(", ")}`)
    .join("\n\n");

export const SUBCOMMAND_ALIASES: Partial<Record<SubCommand, string[]>> = {
    timePlayed: ["time", "playtime", "hours"],
    stats: ["profile", "overview"],
    teamplay: ["teamwork"],
    ai: ["bots", "botkills"],
    aliases: ["alias", "names", "nicks", "nick"],
    social: ["trackergg", "tracker", "tg"],
    assault: ["aslt"],
    engineer: ["eng"],
    support: ["sup"],
    recon: ["rec"],
    history: ["monthly", "month"],
    bans: ["ban", "banned"],
};

export function resolveSubcommand(raw: string | undefined): SubCommand | null {
    const normalized = raw?.trim().toLowerCase();
    if (!normalized) return null;

    const gadgetCommand = resolveGadgetCommand(normalized);
    if (gadgetCommand) return gadgetCommand;

    const vehicleCommand = resolveVehicleCommand(normalized);
    if (vehicleCommand) return vehicleCommand;

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
    ...Object.fromEntries(BF6_GADGETS.map((gadget) => [gadget.command, gadget.key])),
    ...Object.fromEntries(BF6_VEHICLES.map((vehicle) => [vehicle.command, vehicle.key])),
};

export const itemTitles: Record<BF6ItemLeaderboardKey, string> = {
    ...Object.fromEntries(BF6_GADGETS.map((gadget) => [gadget.key, gadget.title])) as Record<BF6GadgetSnapshotKey, string>,
    ...Object.fromEntries(BF6_VEHICLES.map((vehicle) => [vehicle.key, vehicle.title])) as Record<BF6VehicleCommand, string>,
};

export function isVehicleSubcommand(sub: SubCommand): sub is BF6VehicleCommand {
    return sub in BF6_VEHICLE_BY_COMMAND;
}

export function isGadgetSubcommand(sub: SubCommand): sub is BF6GadgetCommand {
    return sub in BF6_GADGET_BY_COMMAND;
}
