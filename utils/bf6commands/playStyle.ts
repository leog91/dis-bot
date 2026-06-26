import { getBF6Data, getPlayerWeaponPlaystyle } from "../bf6data";
import type { BF6Handler } from "./constants";

export const playStyleHandler: BF6Handler = async (_sub, msg, args, safeReply) => {
    const userArg = args.slice(1).join(" ").trim();
    if (!userArg) {
        await safeReply("Usage: `bf6 playStyle [user]`");
        return;
    }

    // Ensure there is a fresh cached snapshot before querying weapon rows.
    await getBF6Data();
    const playstyle = await getPlayerWeaponPlaystyle(userArg);

    if (!playstyle) {
        await safeReply(`No BF6 player found for "${userArg}".`);
        return;
    }

    if (!playstyle.weapons.length) {
        await safeReply(`No weapon playstyle data (>=1h) found for ${playstyle.platformUserHandle}.`);
        return;
    }

    const toPct = (basisPoints: number) => `${(basisPoints / 100).toFixed(1)}%`;
    const fmtWeapon = (name: string) => name.slice(0, 11).padEnd(11, " ");
    const fmtTime = (time: string) => time.slice(0, 7).padEnd(7, " ");
    const rows = playstyle.weapons.slice(0, 20).map((w) =>
        `${fmtWeapon(w.weaponName)} | ${fmtTime(w.timePlayedDisplay)} | ${String(w.kills).padStart(5, " ")} | ${toPct(w.adsPct).padStart(6, " ")}/${toPct(w.hipfirePct).padEnd(6, " ")} | ${toPct(w.headshotPct).padStart(6, " ")} | ${toPct(w.accuracyPct).padStart(6, " ")}`
    );

    const trimmedNote = playstyle.weapons.length > 20
        ? `\n...showing top 20/${playstyle.weapons.length} weapons`
        : "";

    await safeReply(
        ` **${playstyle.platformUserHandle}** playStyle \n` +
        "```text\n" +
        "weapon      | time    | kills | ads/hip       | hs%    | acc%\n" +
        rows.join("\n") +
        "\n```" +
        trimmedNote
    );
};
