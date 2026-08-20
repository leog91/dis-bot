export type BF6GadgetDefinition = {
    key: string;
    command: string;
    aliases: readonly string[];
    title: string;
    exactKeys: readonly string[];
};

const LAUNCHER_KEYS = [
    "gad_gl_he",
    "gad_gl_tb",
    "gad_il_airburst",
    "gad_rl_ungui",
    "gad_rl_longra",
    "gad_rl_surtoair",
    "gad_rl_aimgui",
    "gad_rl_igla",
] as const;

const MINE_KEYS = ["gad_mine_mosen", "gad_mine_press", "gad_mine_ap", "gad_mine_tws"] as const;
const GRENADE_KEYS = ["gad_gren_frag", "gad_gren_inc"] as const;
const MELEE_KEYS = [
    "melee_light_combatknife",
    "melee_heavy_sledge",
    "melee_light_icecaxe",
    "melee_light_serratedblade",
    "melee_light_eod_arm",
] as const;
const OTHER_COMBAT_KEYS = ["gad_c4", "gad_tknife", "gad_lancet"] as const;
const COMBAT_GADGET_KEYS = [
    ...LAUNCHER_KEYS,
    ...MINE_KEYS,
    ...GRENADE_KEYS,
    ...MELEE_KEYS,
    ...OTHER_COMBAT_KEYS,
] as const;

export const BF6_GADGETS = [
    { key: "combatgadgets", command: "combatgadgets", aliases: ["combat-gadgets"], title: "All Combat Gadgets", exactKeys: COMBAT_GADGET_KEYS },
    { key: "launchers", command: "launchers", aliases: ["launcher"], title: "Launchers", exactKeys: LAUNCHER_KEYS },
    { key: "mines", command: "mines", aliases: [], title: "Mines", exactKeys: MINE_KEYS },
    { key: "grenades", command: "grenades", aliases: ["grenade"], title: "Combat Grenades", exactKeys: GRENADE_KEYS },
    { key: "melee", command: "melee", aliases: [], title: "Melee Weapons", exactKeys: MELEE_KEYS },

    { key: "m320he", command: "m320he", aliases: ["m320-he", "helauncher"], title: "M320A1 HE", exactKeys: ["gad_gl_he"] },
    { key: "m320thrm", command: "m320thrm", aliases: ["m320-thrm", "m320therm", "thermobaric"], title: "M320A1 THRM", exactKeys: ["gad_gl_tb"] },
    { key: "sichg1wp", command: "sichg1wp", aliases: ["sich", "sich-g1", "airburst"], title: "SICH G1 WP", exactKeys: ["gad_il_airburst"] },
    { key: "rpg", command: "rpg", aliases: ["rpg7", "rpg-7", "rpg7v2"], title: "RPG-7V2", exactKeys: ["gad_rl_ungui"] },
    { key: "mas148", command: "mas148", aliases: ["mas-148"], title: "MAS 148", exactKeys: ["gad_rl_longra"] },
    { key: "spire", command: "spire", aliases: ["slm93a", "slm-93a"], title: "SLM-93A SPIRE", exactKeys: ["gad_rl_surtoair"] },
    { key: "m136at", command: "m136at", aliases: ["m136", "m136-at"], title: "M136 AT", exactKeys: ["gad_rl_aimgui"] },
    { key: "igla", command: "igla", aliases: ["9k38", "9k38igla", "9k38-igla"], title: "9K38 IGLA", exactKeys: ["gad_rl_igla"] },
    { key: "ptkm1r", command: "ptkm1r", aliases: ["ptkm", "ptkm-1r"], title: "PTKM-1R", exactKeys: ["gad_mine_mosen"] },
    { key: "m15", command: "mine", aliases: ["m15"], title: "M15 Mine", exactKeys: ["gad_mine_press"] },
    { key: "m18a1", command: "claymore", aliases: ["m18", "m18a1"], title: "Claymore (M18A1)", exactKeys: ["gad_mine_ap"] },
    { key: "slam", command: "slam", aliases: ["m4slam", "m4a1slam", "m4a1-slam"], title: "M4A1 Slam", exactKeys: ["gad_mine_tws"] },
    { key: "c4", command: "c4", aliases: ["c-4"], title: "C-4 Explosives", exactKeys: ["gad_c4"] },
    { key: "frag", command: "frag", aliases: ["fraggrenade"], title: "Frag Grenade", exactKeys: ["gad_gren_frag"] },
    { key: "incendiary", command: "incendiary", aliases: ["incen", "incendiarygrenade"], title: "Incendiary Grenade", exactKeys: ["gad_gren_inc"] },
    { key: "throwingknife", command: "throwingknife", aliases: ["throwing-knife", "tknife"], title: "Throwing Knife", exactKeys: ["gad_tknife"] },
    { key: "hti", command: "hti", aliases: ["htimk2", "hti-mk2", "lancet"], title: "HTI-Mk2", exactKeys: ["gad_lancet"] },
    { key: "knife", command: "knife", aliases: ["combatknife", "combat-knife"], title: "Combat Knife", exactKeys: ["melee_light_combatknife"] },
    { key: "sledgehammer", command: "sledgehammer", aliases: ["sledge", "hammer"], title: "Sledgehammer", exactKeys: ["melee_heavy_sledge"] },
    { key: "iceaxe", command: "iceaxe", aliases: ["ice-axe", "nomad", "cx12", "cx-12"], title: "NOMAD CX-12 Ice Axe", exactKeys: ["melee_light_icecaxe"] },
    { key: "machete", command: "machete", aliases: ["kapok", "kapok14"], title: "KAPOK 14-inch Machete", exactKeys: ["melee_light_serratedblade"] },
    { key: "eodarm", command: "eodarm", aliases: ["eod-arm", "eodbotarm", "eod-bot-arm"], title: "EOD Bot Arm", exactKeys: ["melee_light_eod_arm"] },
] as const satisfies readonly BF6GadgetDefinition[];

export type BF6GadgetSnapshotKey = typeof BF6_GADGETS[number]["key"];
export type BF6GadgetCommand = typeof BF6_GADGETS[number]["command"];

export const BF6_GADGET_COMMANDS = BF6_GADGETS.map((gadget) => gadget.command) as BF6GadgetCommand[];

export const BF6_GADGET_BY_KEY = Object.fromEntries(
    BF6_GADGETS.map((gadget) => [gadget.key, gadget])
) as unknown as Record<BF6GadgetSnapshotKey, BF6GadgetDefinition>;

export const BF6_GADGET_BY_COMMAND = Object.fromEntries(
    BF6_GADGETS.map((gadget) => [gadget.command, gadget])
) as unknown as Record<BF6GadgetCommand, BF6GadgetDefinition>;

function normalizeGadgetName(value: string): string {
    return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function resolveGadgetCommand(raw: string): BF6GadgetCommand | null {
    const normalized = normalizeGadgetName(raw);
    const match = BF6_GADGETS.find((gadget) =>
        normalizeGadgetName(gadget.command) === normalized ||
        gadget.aliases.some((alias) => normalizeGadgetName(alias) === normalized)
    );
    return match?.command ?? null;
}

export function gadgetSegmentMatches(segment: any, key: BF6GadgetSnapshotKey): boolean {
    if (String(segment?.type ?? "").toLowerCase() !== "gadget") return false;

    const segmentKey = String(segment?.attributes?.key ?? "").toLowerCase();
    return BF6_GADGET_BY_KEY[key].exactKeys.some((key) => key.toLowerCase() === segmentKey);
}
