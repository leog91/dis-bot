import { describe, expect, it } from "bun:test";
import { BF6_GADGETS, gadgetSegmentMatches, resolveGadgetCommand } from "../utils/bf6gadgets";

describe("BF6 combat gadget catalog", () => {
    it("resolves canonical commands and punctuation-insensitive aliases", () => {
        expect(resolveGadgetCommand("mine")).toBe("mine");
        expect(resolveGadgetCommand("M15")).toBe("mine");
        expect(resolveGadgetCommand("M4A1-SLAM")).toBe("slam");
        expect(resolveGadgetCommand("throwing-knife")).toBe("throwingknife");
        expect(resolveGadgetCommand("9K38-IGLA")).toBe("igla");
        expect(resolveGadgetCommand("not-a-gadget")).toBeNull();
    });

    it("contains one individual command for every combat gadget in the Tracker payload", () => {
        const individualDefinitions = BF6_GADGETS.filter((gadget) => gadget.exactKeys.length === 1);
        const exactKeys = individualDefinitions.flatMap((gadget) => gadget.exactKeys);
        const allCombat = BF6_GADGETS.find((gadget) => gadget.key === "combatgadgets");

        expect(exactKeys).toHaveLength(22);
        expect(new Set(exactKeys).size).toBe(22);
        expect(new Set(allCombat?.exactKeys)).toEqual(new Set(exactKeys));
    });

    it("keeps Combat Knife and Throwing Knife separate", () => {
        const combatKnife = {
            type: "gadget",
            attributes: { key: "melee_light_combatknife" },
        };
        const throwingKnife = {
            type: "gadget",
            attributes: { key: "gad_tknife" },
        };

        expect(gadgetSegmentMatches(combatKnife, "knife")).toBe(true);
        expect(gadgetSegmentMatches(combatKnife, "throwingknife")).toBe(false);
        expect(gadgetSegmentMatches(throwingKnife, "throwingknife")).toBe(true);
        expect(gadgetSegmentMatches(throwingKnife, "knife")).toBe(false);
    });

    it("matches individual gadgets in the appropriate aggregates", () => {
        const rpg = { type: "gadget", attributes: { key: "gad_rl_ungui" } };
        const claymore = { type: "gadget", attributes: { key: "gad_mine_ap" } };
        const frag = { type: "gadget", attributes: { key: "gad_gren_frag" } };
        const machete = { type: "gadget", attributes: { key: "melee_light_serratedblade" } };

        expect(gadgetSegmentMatches(rpg, "launchers")).toBe(true);
        expect(gadgetSegmentMatches(claymore, "mines")).toBe(true);
        expect(gadgetSegmentMatches(frag, "grenades")).toBe(true);
        expect(gadgetSegmentMatches(machete, "melee")).toBe(true);
        expect(gadgetSegmentMatches(rpg, "combatgadgets")).toBe(true);
        expect(gadgetSegmentMatches(claymore, "grenades")).toBe(false);
    });
});
