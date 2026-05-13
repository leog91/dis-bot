import { gameAccess } from "../../dis-bot-assets-private/config/game-access";
import { users } from "../../dis-bot-assets-private/config/users";

export type BuyerEntry = string | { discordId: string; note?: string };

export type GameCredentials = {
    username?: string;
    password?: string;
    email?: string;
    extra?: string[];
    lines?: string[];
};

export type GameGuide = {
    launcher?: string;
    summary?: string;
    steps?: string[];
    loginInstructions?: string[];
    recommendedSettings?: string[];
    troubleshooting?: string[];
    notes?: string[];
};

export type GameConfig = {
    title: string;
    aliases?: string[];
    buyers?: BuyerEntry[];
    credentials: GameCredentials;
    guide: GameGuide;
};

export type UserProfile = {
    discordId: string;
    displayName?: string;
    purchases?: string[];
    notes?: string[];
    roles?: string[];
};

export type ResolvedGame = GameConfig & {
    key: string;
};

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
    isConfigured(): boolean {
        return Object.keys(gameAccess).length > 0;
    }

    findGame(query: string): ResolvedGame | null {
        const normalizedQuery = normalize(query);
        if (!normalizedQuery) return null;

        for (const [key, game] of Object.entries(gameAccess)) {
            const candidates = [key, game.title, ...(game.aliases ?? [])];
            if (candidates.some((candidate) => normalize(candidate) === normalizedQuery)) {
                return { ...game, key };
            }
        }

        return null;
    }

    hasAccess(discordId: string, game: ResolvedGame): boolean {
        const directBuyerMatch = (game.buyers ?? []).some((buyer) =>
            isBuyerMatch(buyer, discordId)
        );
        if (directBuyerMatch) return true;

        const userProfile = Object.values(users).find(
            (user) => user.discordId === discordId
        );
        if (!userProfile?.purchases || userProfile.purchases.length === 0) {
            return false;
        }

        const validKeys = new Set(
            [game.key, ...(game.aliases ?? []), game.title].map(normalize)
        );
        return userProfile.purchases.some((purchase) =>
            validKeys.has(normalize(purchase))
        );
    }
}

export const gameAccessService = new GameAccessService();
