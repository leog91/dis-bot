import fs from "fs";
import path from "path";

type BuyerEntry = string | { discordId: string; note?: string };

type GameCredentials = {
    username?: string;
    password?: string;
    email?: string;
    extra?: string[];
    lines?: string[];
};

type GameGuide = {
    launcher?: string;
    summary?: string;
    steps?: string[];
    loginInstructions?: string[];
    recommendedSettings?: string[];
    troubleshooting?: string[];
    notes?: string[];
};

type GameConfig = {
    title: string;
    aliases?: string[];
    buyers?: BuyerEntry[];
    credentials: GameCredentials;
    guide: GameGuide;
};

type UserProfile = {
    discordId: string;
    displayName?: string;
    purchases?: string[];
    notes?: string[];
    roles?: string[];
};

type GameAccessConfig = {
    games: Record<string, GameConfig>;
};

type PrivateUsersConfig = {
    users: Record<string, UserProfile>;
};

export type ResolvedGame = GameConfig & {
    key: string;
};

const fallbackConfigPath = process.env.ASSETS_PRIVATE_DIR
    ? path.join(process.env.ASSETS_PRIVATE_DIR, "config", "game-access.json")
    : undefined;

const configPathFromEnv = process.env.GAME_ACCESS_CONFIG_PATH ?? fallbackConfigPath;
const fallbackUsersPath = process.env.ASSETS_PRIVATE_DIR
    ? path.join(process.env.ASSETS_PRIVATE_DIR, "config", "users.json")
    : undefined;
const usersPathFromEnv = process.env.PRIVATE_USERS_CONFIG_PATH ?? fallbackUsersPath;

function normalize(value: string): string {
    return value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .trim()
        .replace(/\s+/g, " ");
}

function isBuyerMatch(buyer: BuyerEntry, discordId: string): boolean {
    if (typeof buyer === "string") {
        return buyer === discordId;
    }

    return buyer.discordId === discordId;
}

class GameAccessService {
    private cachedData: GameAccessConfig | null = null;
    private cachedMtime = 0;
    private cachedUsers: PrivateUsersConfig | null = null;
    private cachedUsersMtime = 0;

    getConfigPath(): string | null {
        if (!configPathFromEnv) return null;

        return path.isAbsolute(configPathFromEnv)
            ? configPathFromEnv
            : path.resolve(configPathFromEnv);
    }

    isConfigured(): boolean {
        return this.getConfigPath() !== null;
    }

    getUsersPath(): string | null {
        if (!usersPathFromEnv) return null;

        return path.isAbsolute(usersPathFromEnv)
            ? usersPathFromEnv
            : path.resolve(usersPathFromEnv);
    }

    private loadData(): GameAccessConfig {
        const filePath = this.getConfigPath();

        if (!filePath) {
            throw new Error("GAME_ACCESS_CONFIG_PATH is not configured.");
        }

        if (!fs.existsSync(filePath)) {
            throw new Error(`Game access config not found: ${filePath}`);
        }

        const stats = fs.statSync(filePath);
        if (this.cachedData && this.cachedMtime === stats.mtimeMs) {
            return this.cachedData;
        }

        const parsed = JSON.parse(fs.readFileSync(filePath, "utf8")) as GameAccessConfig;

        if (!parsed.games || typeof parsed.games !== "object") {
            throw new Error(`Invalid game access config: ${filePath}`);
        }

        this.cachedData = parsed;
        this.cachedMtime = stats.mtimeMs;

        return parsed;
    }

    private loadUsers(): PrivateUsersConfig {
        const filePath = this.getUsersPath();

        if (!filePath) {
            return { users: {} };
        }

        if (!fs.existsSync(filePath)) {
            return { users: {} };
        }

        const stats = fs.statSync(filePath);
        if (this.cachedUsers && this.cachedUsersMtime === stats.mtimeMs) {
            return this.cachedUsers;
        }

        const parsed = JSON.parse(fs.readFileSync(filePath, "utf8")) as PrivateUsersConfig;

        if (!parsed.users || typeof parsed.users !== "object") {
            throw new Error(`Invalid private users config: ${filePath}`);
        }

        this.cachedUsers = parsed;
        this.cachedUsersMtime = stats.mtimeMs;

        return parsed;
    }

    findGame(query: string): ResolvedGame | null {
        const normalizedQuery = normalize(query);
        if (!normalizedQuery) return null;

        const data = this.loadData();

        for (const [key, game] of Object.entries(data.games)) {
            const candidates = [key, game.title, ...(game.aliases ?? [])];
            if (candidates.some((candidate) => normalize(candidate) === normalizedQuery)) {
                return { ...game, key };
            }
        }

        return null;
    }

    hasAccess(discordId: string, game: ResolvedGame): boolean {
        const usersData = this.loadUsers();

        const directBuyerMatch = (game.buyers ?? []).some((buyer) => isBuyerMatch(buyer, discordId));
        if (directBuyerMatch) return true;

        const userProfile = Object.values(usersData.users).find((user) => user.discordId === discordId);
        if (!userProfile?.purchases || userProfile.purchases.length === 0) {
            return false;
        }

        const validKeys = new Set([game.key, ...(game.aliases ?? []), game.title].map(normalize));
        return userProfile.purchases.some((purchase) => validKeys.has(normalize(purchase)));
    }
}

export const gameAccessService = new GameAccessService();
