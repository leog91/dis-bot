import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";

export type GuildCrashData = {
    users: Record<string, { name: string; crashes: number }>;
};

type CrashData = Record<string, GuildCrashData>;

export class CrashCounterStore {
    constructor(private file: string) {}

    private load(): CrashData {
        if (!fs.existsSync(this.file)) return {};
        return JSON.parse(fs.readFileSync(this.file, "utf8"));
    }

    getGuild(guildId: string): GuildCrashData {
        return this.load()[guildId] ?? { users: {} };
    }

    // Keep the read-modify-write synchronous: no handler can interleave an update.
    update(guildId: string, userId: string, name: string, delta: number): GuildCrashData {
        const data = this.load();
        const guildData = data[guildId] ??= { users: {} };
        const user = guildData.users[userId] ??= { name, crashes: 0 };
        user.name = name;
        user.crashes = Math.max(0, user.crashes + delta);

        fs.mkdirSync(path.dirname(this.file), { recursive: true });
        const tempFile = `${this.file}.${randomUUID()}.tmp`;
        try {
            fs.writeFileSync(tempFile, JSON.stringify(data, null, 2));
            fs.renameSync(tempFile, this.file);
        } finally {
            if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
        }
        return guildData;
    }
}

const file = process.env.CRASH_COUNTER_FILE_PATH
    ?? (process.env.ASSETS_PRIVATE_DIR
        ? path.join(process.env.ASSETS_PRIVATE_DIR, "crashcounter.json")
        : "./crashcounter.json");

export const crashCounterStore = new CrashCounterStore(path.resolve(file));
