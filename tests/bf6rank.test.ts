import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import {
    normalizeKey,
    getStatEntry,
    getStatNumber,
    clampPercent,
    normalizePercent,
    toBasisPoints,
    formatHours,
    formatDuration,
    extractWeaponPlaystyles,
    extractItemSnapshots,
    extractClassSnapshots,
    fetchPlayerData,
} from "../utils/bf6rank";

describe("normalizeKey", () => {
    it("lowercases and strips non-alphanumeric chars", () => {
        expect(normalizeKey("PlayerKills")).toBe("playerkills");
        expect(normalizeKey("KD Ratio")).toBe("kdratio");
        expect(normalizeKey("time-played")).toBe("timeplayed");
        expect(normalizeKey("ADS%")).toBe("ads");
    });

    it("keeps numbers", () => {
        expect(normalizeKey("rank123")).toBe("rank123");
    });
});

describe("getStatEntry", () => {
    it("returns null for empty stats", () => {
        expect(getStatEntry({}, ["kills"])).toBeNull();
    });

    it("matches exact candidate keys", () => {
        const stats = { kills: { value: 10 }, deaths: { value: 5 } };
        expect(getStatEntry(stats, ["kills"])).toEqual({ value: 10 });
    });

    it("matches fuzzy candidate keys when no exact match", () => {
        const stats = { timePlayed: { value: 3600 } };
        expect(getStatEntry(stats, ["kills"], ["timeplayed"])).toEqual({ value: 3600 });
    });

    it("returns first exact match before fuzzy", () => {
        const stats = { kills: { value: 5 }, kills2: { value: 99 } };
        expect(getStatEntry(stats, ["kills"], ["kills2"])).toEqual({ value: 5 });
    });

    it("returns null if nothing matches", () => {
        const stats = { score: { value: 1000 } };
        expect(getStatEntry(stats, ["kills"], ["deaths"])).toBeNull();
    });
});

describe("getStatNumber", () => {
    it("extracts numeric value from stats", () => {
        const stats = { kills: { value: 42 } };
        expect(getStatNumber(stats, ["kills"])).toBe(42);
    });

    it("coerces numeric strings", () => {
        const stats = { kills: { value: "42" } };
        expect(getStatNumber(stats, ["kills"])).toBe(42);
    });

    it("returns 0 when key not found", () => {
        const stats = { score: { value: 100 } };
        expect(getStatNumber(stats, ["kills"])).toBe(0);
    });

    it("returns 0 for non-finite values", () => {
        const stats = { kills: { value: NaN } };
        expect(getStatNumber(stats, ["kills"])).toBe(0);
    });

    it("returns 0 for infinite values", () => {
        const stats = { kills: { value: Infinity } };
        expect(getStatNumber(stats, ["kills"])).toBe(0);
    });

    it("fuzzy matches when exact fails", () => {
        const stats = { timePlayed: { value: 3600 } };
        expect(getStatNumber(stats, ["kills"], ["timeplayed"])).toBe(3600);
    });
});

describe("clampPercent", () => {
    it("clamps values within 0-100", () => {
        expect(clampPercent(50)).toBe(50);
        expect(clampPercent(150)).toBe(100);
        expect(clampPercent(-10)).toBe(0);
        expect(clampPercent(0)).toBe(0);
        expect(clampPercent(100)).toBe(100);
    });

    it("returns 0 for non-finite values", () => {
        expect(clampPercent(NaN)).toBe(0);
        expect(clampPercent(Infinity)).toBe(0);
    });
});

describe("normalizePercent", () => {
    it("scales 0-1 range to 0-100", () => {
        expect(normalizePercent(0.5)).toBe(50);
        expect(normalizePercent(0.25)).toBe(25);
        expect(normalizePercent(1)).toBe(100);
    });

    it("leaves 0-100 range unchanged", () => {
        expect(normalizePercent(50)).toBe(50);
        expect(normalizePercent(100)).toBe(100);
    });

    it("returns 0 for non-positive values", () => {
        expect(normalizePercent(0)).toBe(0);
        expect(normalizePercent(-5)).toBe(0);
    });

    it("returns 0 for non-finite values", () => {
        expect(normalizePercent(NaN)).toBe(0);
        expect(normalizePercent(Infinity)).toBe(0);
    });
});

describe("toBasisPoints", () => {
    it("converts percent to basis points", () => {
        expect(toBasisPoints(50)).toBe(5000);
        expect(toBasisPoints(100)).toBe(10000);
        expect(toBasisPoints(0)).toBe(0);
    });

    it("clamps and rounds", () => {
        expect(toBasisPoints(150)).toBe(10000);
        expect(toBasisPoints(50.123)).toBe(5012);
    });
});

describe("formatHours", () => {
    it("formats seconds as hours with 1 decimal", () => {
        expect(formatHours(3600)).toBe("1.0h");
        expect(formatHours(7200)).toBe("2.0h");
        expect(formatHours(5400)).toBe("1.5h");
        expect(formatHours(0)).toBe("0.0h");
    });
});

describe("formatDuration", () => {
    it("formats as seconds only for < 1m", () => {
        expect(formatDuration(30)).toBe("30s");
        expect(formatDuration(0)).toBe("0s");
    });

    it("formats as minutes and seconds for < 1h", () => {
        expect(formatDuration(90)).toBe("1m 30s");
        expect(formatDuration(3599)).toBe("59m 59s");
    });

    it("formats as hours minutes and seconds for >= 1h", () => {
        expect(formatDuration(3600)).toBe("1h 0m");
        expect(formatDuration(3661)).toBe("1h 1m");
        expect(formatDuration(7261)).toBe("2h 1m");
    });

    it("handles negative values by clamping to 0", () => {
        expect(formatDuration(-100)).toBe("0s");
    });

    it("rounds fractional seconds before formatting", () => {
        expect(formatDuration(59.6)).toBe("1m 0s");
    });
});

describe("extractWeaponPlaystyles", () => {
    it("builds sorted weapon playstyle snapshots from Tracker segments", () => {
        const payload = {
            data: {
                segments: [
                    {
                        type: "weapon",
                        metadata: { name: "M4A1" },
                        stats: {
                            kills: { value: 100 },
                            timePlayed: { value: 7200, displayValue: "2h" },
                            adsKills: { value: 70 },
                            hipfireKills: { value: 30 },
                            headshots: { value: 25 },
                            shotsHit: { value: 250 },
                            shotsFired: { value: 1000 },
                        },
                    },
                    {
                        type: "weapon",
                        metadata: { name: "Sidearm" },
                        stats: {
                            kills: { value: 10 },
                            timePlayed: { value: 1800 },
                        },
                    },
                    {
                        type: "weapon",
                        metadata: { name: "AK-24" },
                        stats: {
                            kills: { value: 50 },
                            timePlayed: { value: 3600 },
                            adsKillPercentage: { value: 0.2 },
                            hipfireKillPercentage: { value: 0.8 },
                            headshotPercentage: { value: 15 },
                            accuracy: { value: 0.4 },
                        },
                    },
                ],
            },
        };

        const result = extractWeaponPlaystyles("player-1", payload);

        expect(result).toHaveLength(2);
        expect(result[0]).toMatchObject({
            playerId: "player-1",
            weaponName: "M4A1",
            timePlayedValue: 7200,
            timePlayedDisplay: "2h",
            adsPct: 7000,
            hipfirePct: 3000,
            headshotPct: 2500,
            accuracyPct: 2500,
        });
        expect(result[1]).toMatchObject({
            weaponName: "AK-24",
            adsPct: 2000,
            hipfirePct: 8000,
            headshotPct: 1500,
            accuracyPct: 4000,
        });
    });

    it("deduplicates weapons by keeping the segment with the most play time", () => {
        const payload = {
            data: {
                segments: [
                    {
                        type: "weapon",
                        metadata: { name: "M4A1" },
                        stats: {
                            kills: { value: 10 },
                            timePlayed: { value: 3600 },
                        },
                    },
                    {
                        type: "weapon",
                        metadata: { name: "m4a1" },
                        stats: {
                            kills: { value: 20 },
                            timePlayed: { value: 5400 },
                        },
                    },
                ],
            },
        };

        const result = extractWeaponPlaystyles("player-1", payload);

        expect(result).toHaveLength(1);
        expect(result[0]).toMatchObject({
            weaponName: "m4a1",
            kills: 20,
            timePlayedValue: 5400,
        });
    });
});

describe("extractItemSnapshots", () => {
    it("aggregates matching gadget and vehicle segments into tracked item snapshots", () => {
        const payload = {
            data: {
                segments: [
                    {
                        type: "gadget",
                        attributes: { key: "gad_c4" },
                        metadata: { name: "C-4 Explosive" },
                        stats: {
                            kills: { value: 3 },
                            timePlayed: { value: 75 },
                        },
                    },
                    {
                        type: "gadget",
                        metadata: { name: "C4 Charge" },
                        stats: {
                            kills: { value: 2 },
                            secondsPlayed: { value: 45 },
                        },
                    },
                    {
                        type: "vehicle",
                        metadata: { categoryName: "Main Battle Tank", name: "M1A2" },
                        stats: {
                            kills: { value: 7 },
                            timePlayed: { value: 3600 },
                        },
                    },
                    {
                        type: "gadget",
                        metadata: { name: "Sledgehammer" },
                        stats: {
                            kills: { value: 4 },
                            timePlayed: { value: 90 },
                        },
                    },
                ],
            },
        };

        const result = extractItemSnapshots("player-1", payload);
        const c4 = result.find((item) => item.itemKey === "c4");
        const mbt = result.find((item) => item.itemKey === "mbt");
        const vehicles = result.find((item) => item.itemKey === "vehicles");
        const sledgehammer = result.find((item) => item.itemKey === "sledgehammer");

        expect(c4).toMatchObject({
            playerId: "player-1",
            kills: 5,
            timePlayedValue: 120,
            timePlayedDisplay: "2m 0s",
        });
        expect(mbt).toMatchObject({
            kills: 7,
            timePlayedValue: 3600,
            timePlayedDisplay: "1h 0m",
        });
        expect(vehicles).toMatchObject({
            kills: 7,
            timePlayedValue: 3600,
        });
        expect(sledgehammer).toMatchObject({
            kills: 4,
            timePlayedValue: 90,
            timePlayedDisplay: "1m 30s",
        });
    });
});

describe("extractClassSnapshots", () => {
    it("extracts class stats and stores kd ratio as basis points", () => {
        const payload = {
            data: {
                segments: [
                    {
                        type: "kit",
                        attributes: { key: "kit_support" },
                        metadata: { name: "Support" },
                        stats: {
                            timePlayed: { value: 3661 },
                            kills: { value: 42 },
                            deaths: { value: 21 },
                            assists: { value: 9 },
                            revives: { value: 12 },
                            deployments: { value: 6 },
                            kdRatio: { value: 2 },
                        },
                    },
                    {
                        type: "weapon",
                        attributes: { key: "kit_recon" },
                        stats: {
                            kills: { value: 999 },
                        },
                    },
                ],
            },
        };

        const result = extractClassSnapshots("player-1", payload);

        expect(result).toEqual([
            {
                playerId: "player-1",
                classKey: "kit_support",
                className: "Support",
                timePlayedValue: 3661,
                timePlayedDisplay: "1h 1m",
                kills: 42,
                deaths: 21,
                assists: 9,
                revives: 12,
                deployments: 6,
                kdRatio: 200,
            },
        ]);
    });
});

describe("fetchPlayerData status handling", () => {
    const originalFetch = globalThis.fetch;
    const originalError = console.error;

    beforeEach(() => {
        console.error = () => {};
    });

    afterEach(() => {
        globalThis.fetch = originalFetch;
        console.error = originalError;
    });

    it("returns private status on 403", async () => {
        globalThis.fetch = (() =>
            Promise.resolve({
                ok: false,
                status: 403,
                statusText: "Forbidden",
            } as Response)) as unknown as typeof fetch;

        const result = await fetchPlayerData({ userName: "privateUser", id: "private-id" });
        expect(result).toEqual({ ok: false, status: "private" });
    });

    it("returns not_found status on 404", async () => {
        globalThis.fetch = (() =>
            Promise.resolve({
                ok: false,
                status: 404,
                statusText: "Not Found",
            } as Response)) as unknown as typeof fetch;

        const result = await fetchPlayerData({ userName: "missingUser", id: "missing-id" });
        expect(result).toEqual({ ok: false, status: "not_found" });
    });

    it("returns inactive status on other errors", async () => {
        globalThis.fetch = (() =>
            Promise.resolve({
                ok: false,
                status: 500,
                statusText: "Internal Server Error",
            } as Response)) as unknown as typeof fetch;

        const result = await fetchPlayerData({ userName: "errorUser", id: "error-id" });
        expect(result).toEqual({ ok: false, status: "inactive" });
    });

    it("returns inactive status on network exceptions", async () => {
        globalThis.fetch = (() => Promise.reject(new Error("network failure"))) as unknown as typeof fetch;

        const result = await fetchPlayerData({ userName: "networkUser", id: "network-id" });
        expect(result).toEqual({ ok: false, status: "inactive" });
    });
});
