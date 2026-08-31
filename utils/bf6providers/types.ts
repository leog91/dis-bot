import type { BF6GadgetSnapshotKey } from "../bf6gadgets";
import type { BF6VehicleSnapshotKey } from "../bf6vehicles";
import type { BF6AliasNamespace, BF6AliasSource, BF6PlayerStatus } from "../../db/schema";

export type BF6StatsProviderName = "tracker" | "gametools";

export type Player = {
    userName: string;
    id: string;
    personaId?: string;
    configuredAliases?: PlayerAlias[];
};

export type PlayerAlias = {
    namespace: BF6AliasNamespace;
    handle: string;
    source: BF6AliasSource;
};

export type PlayerConfig = {
    userName: string;
    ids: {
        tracker: {
            profileId: string;
        };
        ea: {
            personaId: string;
            nucleusId: string;
        };
        steam?: {
            personaId?: string;
            nucleusId?: string;
        };
    };
    nicks: {
        tracker?: string[];
        ea?: string[];
        steam?: string[];
    };
};

export type PlayerRank = {
    id: string;
    kills: number;
    deaths: number;
    revives: number;
    platformUserHandle: string;
    user: string;
    score: number;
    careerPlayerRank: number | null;
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

export type PlayerFetchSuccess = {
    rank: PlayerRank;
    weaponPlaystyles: WeaponPlaystyleSnapshot[];
    itemSnapshots: BF6ItemSnapshot[];
    classSnapshots: BF6ClassSnapshot[];
};

export type PlayerFetchResult =
    | { ok: true; data: PlayerFetchSuccess }
    | { ok: false; status: BF6PlayerStatus; apiBlocked?: boolean };

export type BF6StatsProvider = {
    name: BF6StatsProviderName;
    defaultConcurrency: number;
    requestDelayMs?: number;
    fetchPlayer(player: Player, timeoutMs?: number): Promise<PlayerFetchResult>;
};

export const BF6_REQUEST_TIMEOUT_MS = 15_000;
