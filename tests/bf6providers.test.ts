import { afterEach, describe, expect, it } from "bun:test";
import { gametoolsProvider } from "../utils/bf6providers/gametools";

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
            deaths: 10,
            revives: 5,
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
});
