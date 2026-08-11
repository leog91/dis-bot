import { describe, expect, it } from "bun:test";
import { BF6_VEHICLES, resolveVehicleCommand, vehicleSegmentMatches } from "../utils/bf6vehicles";

describe("BF6 vehicle catalog", () => {
    it("resolves canonical commands and punctuation-insensitive aliases", () => {
        expect(resolveVehicleCommand("transheli")).toBe("transheli");
        expect(resolveVehicleCommand("UH-06")).toBe("transheli");
        expect(resolveVehicleCommand("little-bird")).toBe("littlebird");
        expect(resolveVehicleCommand("M1A2-SEPv3")).toBe("m1a2");
        expect(resolveVehicleCommand("not-a-vehicle")).toBeNull();
    });

    it("contains one exact command for every vehicle in the Tracker payload", () => {
        const exactDefinitions = BF6_VEHICLES.filter((vehicle) => "exactKeys" in vehicle);
        const exactKeys = exactDefinitions.flatMap((vehicle) => vehicle.exactKeys);
        const transportHelicopter = BF6_VEHICLES.find((vehicle) => vehicle.key === "transheli");

        expect(exactKeys).toHaveLength(22);
        expect(new Set(exactKeys).size).toBe(22);
        expect(transportHelicopter?.categories).toEqual(["veh_air_ath"]);
    });

    it("matches exact models separately from aggregate categories", () => {
        const littleBird = {
            type: "vehicle",
            attributes: { key: "veh_air_ah6litbird" },
            metadata: { category: "veh_air_aah" },
        };

        expect(vehicleSegmentMatches(littleBird, "littlebird")).toBe(true);
        expect(vehicleSegmentMatches(littleBird, "attackheli")).toBe(true);
        expect(vehicleSegmentMatches(littleBird, "helicopter")).toBe(true);
        expect(vehicleSegmentMatches(littleBird, "transheli")).toBe(false);
        expect(vehicleSegmentMatches(littleBird, "vehicles")).toBe(true);
    });
});
