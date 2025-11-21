import { defineCommand } from "..";
import fs from "fs/promises";
import { Message, TextChannel } from "discord.js";
import path from "path";
import { guilds } from "../../utils/constants";



type SubCommand = "kills" | "deaths" | "revives" | "score" | "rank" | "timePlayed";

export default defineCommand({
    name: "bf6",
    description: "BF6 stats",
    type: "TEXT",
    permissions: [
        { type: "GUILD", ids: [guilds.Bytes, guilds.plll] }
    ],

    async execute(msg: Message, args: string[]) {
        if (!(msg.channel instanceof TextChannel)) {
            await msg.reply("This command can only be used in a text channel.");
            return;
        }

        const subCommand = args[0] as SubCommand;
        if (!subCommand) {
            await msg.reply("Te falta el subcommand máquina:\nkills, deaths, revives, score, rank, timePlayed");
            return;
        }

        try {


            const file = await fs.readFile(path.join(__dirname, "../../bf6rank.json"), "utf-8");



            const bfdata = JSON.parse(file);

            let sortedData = bfdata;
            let content = "";

            switch (subCommand) {
                case "kills":
                    content = bfdata.map((p: any) => `${p.platformUserHandle} - ${p.kills} kills`).join("\n");
                    break;
                case "deaths":
                    sortedData = bfdata.sort((a: any, b: any) => b.deaths - a.deaths);
                    content = sortedData.map((p: any) => `${p.platformUserHandle} - ${p.deaths} deaths`).join("\n");
                    break;
                case "revives":
                    sortedData = bfdata.sort((a: any, b: any) => b.revives - a.revives);
                    content = sortedData.map((p: any) => `${p.platformUserHandle} - ${p.revives} revives`).join("\n");
                    break;
                case "score":
                    sortedData = bfdata.sort((a: any, b: any) => b.score - a.score);
                    content = sortedData.map((p: any) => `${p.platformUserHandle} - ${p.score}`).join("\n");
                    break;
                case "rank":
                    sortedData = bfdata.sort((a: any, b: any) => b.careerPlayerRank - a.careerPlayerRank);
                    content = sortedData.map((p: any) => `${p.platformUserHandle} - Rank ${p.careerPlayerRank}`).join("\n");
                    break;
                case "timePlayed":
                    sortedData = bfdata.sort((a: any, b: any) => b.timePlayedValue - a.timePlayedValue);
                    content = sortedData.map((p: any) => `${p.platformUserHandle} - ${p.timePlayedDisplay}`).join("\n");
                    break;
                default:
                    await msg.reply("Unknown subcommand. Available: kills, deaths, revives, score, rank, timePlayed");
                    return;
            }

            if (!content) {
                await msg.reply("No rank data available yet.");
                return;
            }

            await msg.reply(content);

        } catch (err) {
            console.error(err);
            await msg.reply("⚠️ Could not read BF6 rank data.");
        }
    }
});