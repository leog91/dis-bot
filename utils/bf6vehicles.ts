export type BF6VehicleDefinition = {
    key: string;
    command: string;
    aliases: readonly string[];
    title: string;
    exactKeys?: readonly string[];
    categories?: readonly string[];
    categoryNames?: readonly string[];
    all?: boolean;
};

export const BF6_VEHICLES = [
    { key: "vehicles", command: "vehicles", aliases: ["vehicle", "veh"], title: "All Vehicles", all: true },
    { key: "helicopter", command: "helicopter", aliases: ["heli", "chopper"], title: "Helicopters", categories: ["veh_air_aah", "veh_air_ath"], categoryNames: ["helicopter"] },
    { key: "planes", command: "planes", aliases: ["plane", "aircraft", "jet"], title: "Planes", categories: ["veh_air_aab", "veh_air_afj"], categoryNames: ["bomber", "fighter jet", "plane"] },
    { key: "attackheli", command: "attackheli", aliases: ["attack-heli", "attackhelicopter"], title: "Attack Helicopters", categories: ["veh_air_aah"], categoryNames: ["attack helicopter"] },
    { key: "transheli", command: "transheli", aliases: ["trans-heli", "transportheli", "transporthelicopter", "uh06", "uh-06"], title: "Transport Helicopter (UH-06)", categories: ["veh_air_ath"], categoryNames: ["transport helicopter"] },
    { key: "bomber", command: "bomber", aliases: ["bombers", "attackbomber"], title: "Attack Bombers", categories: ["veh_air_aab"], categoryNames: ["attack bomber"] },
    { key: "fighterjet", command: "fighterjet", aliases: ["fighterjets", "fighter-jet"], title: "Fighter Jets", categories: ["veh_air_afj"], categoryNames: ["fighter jet"] },
    { key: "mbt", command: "mbt", aliases: ["tank", "tanks"], title: "Main Battle Tanks", categories: ["veh_sur_smbt"], categoryNames: ["main battle tank"] },
    { key: "ifv", command: "ifv", aliases: ["ifvs"], title: "Infantry Fighting Vehicles", categories: ["veh_sur_sifv"], categoryNames: ["infantry fighting vehicle"] },
    { key: "mobileaa", command: "mobileaa", aliases: ["aa", "anti-air", "antiair"], title: "Mobile Anti-Air", categories: ["veh_sur_smaa"], categoryNames: ["mobile anti-air"] },
    { key: "lighttransport", command: "lighttransport", aliases: ["light-transport", "lightgroundtransport"], title: "Light Ground Transport", categories: ["veh_sur_slgt"], categoryNames: ["light ground transport"] },
    { key: "transport", command: "transport", aliases: ["groundtransport", "surface-transport"], title: "Surface Transport", categories: ["veh_sur_sgc", "veh_sur_sq", "veh_sur_sa", "veh_sur_sltb"], categoryNames: ["surface - transport"] },
    { key: "dirtbike", command: "dirtbike", aliases: ["dirt-bike", "motorbike", "bike"], title: "Dirt Bikes", categories: ["veh_sur_moto"], categoryNames: ["dirt bike"] },

    { key: "falchion", command: "falchion", aliases: ["m77e", "m77efalchion"], title: "M77E Falchion", exactKeys: ["veh_air_m77efalchion"] },
    { key: "f61v", command: "f61v", aliases: ["f-61v"], title: "F-61V", exactKeys: ["veh_air_f61v"] },
    { key: "kestrel", command: "kestrel", aliases: ["f97", "f-97", "f97k"], title: "F-97 Kestrel", exactKeys: ["veh_air_f97kes"] },
    { key: "panthera", command: "panthera", aliases: ["pantherakht"], title: "Panthera KHT", exactKeys: ["veh_air_panthera"] },
    { key: "f39e", command: "f39e", aliases: ["f-39e"], title: "F-39E", exactKeys: ["veh_air_f39e"] },
    { key: "su57", command: "su57", aliases: ["su-57"], title: "Su-57", exactKeys: ["veh_air_su57"] },
    { key: "littlebird", command: "littlebird", aliases: ["little-bird", "ah6", "ah-6"], title: "AH-6 Little Bird", exactKeys: ["veh_air_ah6litbird"] },
    { key: "glider96", command: "glider96", aliases: ["glider", "glider-96"], title: "Glider 96", exactKeys: ["veh_sur_glider96"] },
    { key: "m1a2", command: "m1a2", aliases: ["m1a2sepv3", "m1a2-sepv3"], title: "M1A2 SEPv3", exactKeys: ["veh_sur_m1a2sepv3"] },
    { key: "strf09", command: "strf09", aliases: ["strf", "strf09a4", "strf-09"], title: "Strf 09 A4", exactKeys: ["veh_sur_strf09a4"] },
    { key: "leo2a4", command: "leo2a4", aliases: ["leo", "leo-2a4"], title: "Leo 2A4", exactKeys: ["veh_sur_leoa4"] },
    { key: "cheetah", command: "cheetah", aliases: ["cheetah1a2", "cheetah-1a2"], title: "Cheetah 1A2", exactKeys: ["veh_sur_cheetah1a2"] },
    { key: "bradley", command: "bradley", aliases: ["m3a3", "m3a3bradley"], title: "M3A3 Bradley", exactKeys: ["veh_sur_bradley"] },
    { key: "royalptv", command: "royalptv", aliases: ["ptv", "turfpro"], title: "Turfpro PTV Royal", exactKeys: ["veh_sur_ptv"] },
    { key: "rugged", command: "rugged", aliases: ["quadbike", "mv740"], title: "Rugged MV740", exactKeys: ["veh_sur_quadbike"] },
    { key: "traverser", command: "traverser", aliases: ["traversermk2", "traverser-mark-2"], title: "Traverser Mark 2", exactKeys: ["veh_sur_travmark2"] },
    { key: "rhib", command: "rhib", aliases: ["nswrhib", "7.7mrhib"], title: "7.7m NSW RHIB", exactKeys: ["veh_sur_rhib"] },
    { key: "vector", command: "vector", aliases: [], title: "VECTOR", exactKeys: ["veh_sur_vector"] },
    { key: "tm450", command: "tm450", aliases: ["tm-o450", "tmo450"], title: "TM/O 450", exactKeys: ["veh_sur_moto_db01"] },
    { key: "m1030", command: "m1030", aliases: ["m1030-m1"], title: "M1030-M1", exactKeys: ["veh_sur_moto_db02"] },
    { key: "ltv", command: "ltv", aliases: [], title: "LTV", exactKeys: ["veh_sur_ltv"] },
    { key: "rcb90", command: "rcb90", aliases: ["rcb-90", "cb90"], title: "RCB-90", exactKeys: ["veh_sur_cb90"] },
] as const satisfies readonly BF6VehicleDefinition[];

export type BF6VehicleSnapshotKey = typeof BF6_VEHICLES[number]["key"];
export type BF6VehicleCommand = typeof BF6_VEHICLES[number]["command"];

export const BF6_VEHICLE_COMMANDS = BF6_VEHICLES.map((vehicle) => vehicle.command) as BF6VehicleCommand[];

export const BF6_VEHICLE_BY_KEY = Object.fromEntries(
    BF6_VEHICLES.map((vehicle) => [vehicle.key, vehicle])
) as unknown as Record<BF6VehicleSnapshotKey, BF6VehicleDefinition>;

export const BF6_VEHICLE_BY_COMMAND = Object.fromEntries(
    BF6_VEHICLES.map((vehicle) => [vehicle.command, vehicle])
) as unknown as Record<BF6VehicleCommand, BF6VehicleDefinition>;

function normalizeVehicleName(value: string): string {
    return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function resolveVehicleCommand(raw: string): BF6VehicleCommand | null {
    const normalized = normalizeVehicleName(raw);
    const match = BF6_VEHICLES.find((vehicle) =>
        normalizeVehicleName(vehicle.command) === normalized ||
        vehicle.aliases.some((alias) => normalizeVehicleName(alias) === normalized)
    );
    return match?.command ?? null;
}

export function vehicleSegmentMatches(segment: any, key: BF6VehicleSnapshotKey): boolean {
    if (String(segment?.type ?? "").toLowerCase() !== "vehicle") return false;

    const definition = BF6_VEHICLE_BY_KEY[key];
    if (definition.all) return true;

    const segmentKey = String(segment?.attributes?.key ?? "").toLowerCase();
    const category = String(segment?.metadata?.category ?? "").toLowerCase();
    const categoryName = String(segment?.metadata?.categoryName ?? "").toLowerCase();
    return definition.exactKeys?.some((key) => key.toLowerCase() === segmentKey) === true ||
        definition.categories?.some((key) => key.toLowerCase() === category) === true ||
        definition.categoryNames?.some((name) => categoryName.includes(name.toLowerCase())) === true;
}
