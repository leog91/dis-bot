import fs from "fs";
import path from "path";
import { pathToFileURL } from "url";
import { Command, isValidCommand, safeExecute } from ".";


export async function loadCommands(dir: string): Promise<Map<string, Command>> {
    const commands = new Map<string, Command>();
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        // Skip loader/index files
        if (["index.ts", "index.js", "commandLoader.ts", "template.ts"].includes(entry.name)) continue;

        if (entry.isDirectory()) {
            const nested = await loadCommands(fullPath);
            nested.forEach((cmd, name) => commands.set(name, cmd));
            continue;
        }

        if (!entry.name.endsWith(".ts") && !entry.name.endsWith(".js")) continue;

        const fileURL = pathToFileURL(fullPath).href;
        const moduleExports = await import(fileURL);

        const cmd: any = moduleExports.default ?? moduleExports;

        if (!isValidCommand(cmd)) {
            console.warn("⛔ Invalid command in:", fullPath);
            continue;
        }

        cmd.execute = safeExecute(cmd.execute);

        commands.set(cmd.name, cmd);
    }

    return commands;
}

