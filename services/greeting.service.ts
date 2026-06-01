import fs from "fs";
import path from "path";

const serverSettingsPath = process.env.SERVER_SETTINGS_PATH
    ?? (process.env.ASSETS_PRIVATE_DIR
        ? path.join(process.env.ASSETS_PRIVATE_DIR, "config", "server-settings.json")
        : null);

const usersPendingPath = process.env.USERS_PENDING_PATH
    ?? (process.env.ASSETS_PRIVATE_DIR
        ? path.join(process.env.ASSETS_PRIVATE_DIR, "config", "users-pending.json")
        : null);

function readJSON<T>(filePath: string | null, defaultValue: T): T {
    if (!filePath) return defaultValue;
    try {
        if (!fs.existsSync(filePath)) return defaultValue;
        const data = fs.readFileSync(filePath, "utf-8");
        return JSON.parse(data) as T;
    } catch {
        return defaultValue;
    }
}

function writeJSON<T>(filePath: string | null, data: T) {
    if (!filePath) return;
    try {
        const dir = path.dirname(filePath);
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    } catch (err) {
        console.error("Failed to write JSON file:", filePath, err);
    }
}

type ServerSetting = { greeting?: boolean; name?: string };

export function isGreetingEnabled(guildId: string): boolean {
    const settings = readJSON<Record<string, ServerSetting>>(serverSettingsPath, {});
    return settings[guildId]?.greeting ?? false;
}

export function setGreetingEnabled(guildId: string, enabled: boolean) {
    const settings = readJSON<Record<string, ServerSetting>>(serverSettingsPath, {});
    if (!settings[guildId]) settings[guildId] = {};
    settings[guildId].greeting = enabled;
    writeJSON(serverSettingsPath, settings);
}

export function setServerName(guildId: string, name: string) {
    const settings = readJSON<Record<string, ServerSetting>>(serverSettingsPath, {});
    if (!settings[guildId]) settings[guildId] = {};
    if (settings[guildId].name !== name) {
        settings[guildId].name = name;
        writeJSON(serverSettingsPath, settings);
    }
}

export function addUnknownUser(discordId: string, displayName: string, serverName: string) {
    const pending = readJSON<Record<string, { displayName: string; seenAt: string; lastSeenAt: string; joinCount: number; lastSeenServer: string }>>(usersPendingPath, {});
    const now = new Date().toISOString();
    if (!pending[discordId]) {
        pending[discordId] = { displayName, seenAt: now, lastSeenAt: now, joinCount: 1, lastSeenServer: serverName };
        console.log(`[greeting] Added unknown user to pending list: ${displayName} (${discordId})`);
    } else {
        pending[discordId].lastSeenAt = now;
        pending[discordId].joinCount = (pending[discordId].joinCount || 0) + 1;
        pending[discordId].lastSeenServer = serverName;
        console.log(`[greeting] Updated unknown user in pending list: ${displayName} (${discordId}), joinCount: ${pending[discordId].joinCount}`);
    }
    writeJSON(usersPendingPath, pending);
}
