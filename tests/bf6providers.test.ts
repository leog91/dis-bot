import { afterEach, describe, expect, it } from "bun:test";
import { gametoolsProvider } from "../utils/bf6providers/gametools";
import { trackerProvider } from "../utils/bf6providers/tracker";

describe("gametools BF6 provider", () => {
    const originalFetch = globalThis.fetch;
    const originalLog = console.log;

    afterEach(() => {
        globalThis.fetch = originalFetch;
        console.log = originalLog;
    });

    it("requires an EA persona id", async () => {
        console.log = () => {};
        const result = await gametoolsProvider.fetchPlayer({ userName: "Player", id: "tracker-id" });
        expect(result).toEqual({ ok: false, status: "not_found" });
    });

    it("maps gametools data into the shared provider contract", async () => {
        console.log = () => {};
        globalThis.fetch = (() => Promise.resolve(new Response(JSON.stringify({
            userName: "EAPlayer",
            kills: 100,
            dividedKills: { human: 42 },
            deaths: 10,
            revives: 5,
            wins: 8,
            loses: 2,
            matchesPlayed: 11,
            damage: 9876,
            shotsFired: 1000,
            shotsHit: 250,
            killAssists: 23,
            heals: 44,
            resupplies: 55,
            repairs: 66,
            squadmateRevive: 4,
            enemiesSpotted: 77,
            score: 1234,
            secondsPlayed: 7200,
            timePlayed: "2:00:00",
            weapons: [{
                weaponName: "Test Rifle",
                kills: 100,
                timeEquipped: 3600,
                scopedKills: 80,
                hipfireKills: 20,
                headshotKills: 10,
                shotsHit: 500,
                shotsFired: 1000,
            }],
            gadgets: [{ id: "gad_rl_ungui", kills: 3, secondsPlayed: 60 }],
            melee: [{ id: "melee_light_combatknife", kills: 2, timeEquipped: 30 }],
            vehicles: [{ id: "veh_sur_m1a2sepv3", type: "Ground Combat", kills: 4, timeIn: 120 }],
            vehicleGroups: [{ id: "veh", kills: 4, timeIn: 120 }],
            vehicleArchetypes: [
                { id: "arch_mbt", kills: 4, timeIn: 120 },
                { id: "arch_heliattack", kills: 5, timeIn: 50 },
                { id: "arch_heliscout", kills: 7, timeIn: 70 },
                { id: "arch_helitrans", kills: 2, timeIn: 20 },
            ],
            classes: [
                { id: "kit", className: "All", kills: 99, secondsPlayed: 3600 },
                {
                    id: "kit_assault",
                    className: "Assault",
                    secondsPlayed: 600,
                    kills: 20,
                    deaths: 5,
                    assists: 7,
                    revives: 2,
                    spawns: 12,
                    killDeath: 4,
                },
            ],
        }), { status: 200 }))) as unknown as typeof fetch;

        const result = await gametoolsProvider.fetchPlayer({
            userName: "LocalPlayer",
            id: "tracker-id",
            personaId: "persona-id",
        });

        expect(result.ok).toBe(true);
        if (!result.ok) return;

        expect(result.data.rank).toMatchObject({
            id: "tracker-id",
            kills: 42,
            aiKills: 58,
            deaths: 10,
            revives: 5,
            wins: 8,
            losses: 2,
            matchesPlayed: 11,
            damage: 9876,
            shotsFired: 1000,
            shotsHit: 250,
            killAssists: 23,
            heals: 44,
            resupplies: 55,
            repairs: 66,
            squadmateRevives: 4,
            enemiesSpotted: 77,
            score: 1234,
            platformUserHandle: "EAPlayer",
            careerPlayerRank: null,
            timePlayedValue: 3600,
        });
        expect(result.data.weaponPlaystyles[0]).toMatchObject({
            weaponName: "Test Rifle",
            adsKills: 80,
            hipfireKills: 20,
            adsPct: 8000,
            hipfirePct: 2000,
            headshotPct: 1000,
            accuracyPct: 5000,
        });
        expect(result.data.itemSnapshots.find((item) => item.itemKey === "rpg")).toMatchObject({ kills: 3, timePlayedValue: 60 });
        expect(result.data.itemSnapshots.find((item) => item.itemKey === "knife")).toMatchObject({ kills: 2, timePlayedValue: 30 });
        expect(result.data.itemSnapshots.find((item) => item.itemKey === "vehicles")).toMatchObject({ kills: 4, timePlayedValue: 120 });
        expect(result.data.itemSnapshots.find((item) => item.itemKey === "mbt")).toMatchObject({ kills: 4, timePlayedValue: 120 });
        expect(result.data.itemSnapshots.find((item) => item.itemKey === "helicopter")).toMatchObject({ kills: 14, timePlayedValue: 140 });
        expect(result.data.itemSnapshots.find((item) => item.itemKey === "attackheli")).toMatchObject({ kills: 12, timePlayedValue: 120 });
        expect(result.data.classSnapshots).toEqual([expect.objectContaining({
            classKey: "kit_assault",
            kdRatio: 400,
            deployments: 12,
        })]);
    });

    it("maps a missing gametools profile to not_found", async () => {
        console.log = () => {};
        globalThis.fetch = (() => Promise.resolve(new Response(
            JSON.stringify({ errors: ["Player not found"] }),
            { status: 404 },
        ))) as unknown as typeof fetch;

        const result = await gametoolsProvider.fetchPlayer({
            userName: "Missing",
            id: "tracker-id",
            personaId: "persona-id",
        });
        expect(result).toEqual({ ok: false, status: "not_found" });
    });

    it("keeps unavailable gametools counters nullable", async () => {
        console.log = () => {};
        globalThis.fetch = (() => Promise.resolve(new Response(JSON.stringify({
            userName: "EAPlayer",
            dividedKills: { human: 0 },
            deaths: 0,
            revives: 0,
            score: 0,
            classes: [{ id: "kit", className: "All", secondsPlayed: 0 }],
        }), { status: 200 }))) as unknown as typeof fetch;

        const result = await gametoolsProvider.fetchPlayer({
            userName: "LocalPlayer",
            id: "tracker-id",
            personaId: "persona-id",
        });
        expect(result.ok).toBe(true);
        if (!result.ok) return;

        expect(result.data.rank).toMatchObject({
            kills: 0,
            aiKills: null,
            wins: null,
            losses: null,
            matchesPlayed: null,
            damage: null,
            shotsFired: null,
            shotsHit: null,
            killAssists: null,
            heals: null,
            resupplies: null,
            repairs: null,
            squadmateRevives: null,
            enemiesSpotted: null,
        });
    });

    it("keeps unsupported tracker counters nullable", async () => {
        console.log = () => {};
        globalThis.fetch = (() => Promise.resolve(new Response(JSON.stringify({
            data: {
                segments: [{ stats: {
                    playerKills: { value: 12 },
                    deaths: { value: 3 },
                    revives: { value: 2 },
                    score: { value: 500 },
                    timePlayed: { value: 3600, displayValue: "1h" },
                } }],
                platformInfo: { platformUserHandle: "TrackerPlayer" },
            },
        }), { status: 200 }))) as unknown as typeof fetch;

        const result = await trackerProvider.fetchPlayer({ userName: "Player", id: "tracker-id" });
        expect(result.ok).toBe(true);
        if (!result.ok) return;

        expect(result.data.rank).toMatchObject({
            kills: 12,
            aiKills: null,
            wins: null,
            losses: null,
            matchesPlayed: null,
            killAssists: null,
        });
    });
});
