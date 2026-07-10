import type { Guild } from "discord.js";

const MB = 1024 * 1024;

export const DEFAULT_DISCORD_UPLOAD_LIMIT_BYTES = 10 * MB;

export type GuildUploadLimitInfo = {
    guildId: string;
    premiumTier: number;
    boostCount: number;
    uploadLimitBytes: number;
};

const guildUploadLimits = new Map<string, GuildUploadLimitInfo>();

const toPremiumTierNumber = (premiumTier: Guild["premiumTier"] | number | null | undefined) =>
    Number(premiumTier ?? 0);

export const estimateDiscordUploadLimitBytes = (premiumTier: Guild["premiumTier"] | number | null | undefined) => {
    const tier = toPremiumTierNumber(premiumTier);

    if (tier >= 3) return 100 * MB;
    if (tier >= 2) return 50 * MB;

    return DEFAULT_DISCORD_UPLOAD_LIMIT_BYTES;
};

export const formatUploadLimitMb = (bytes: number) => `${Math.round(bytes / MB)}MB`;

export const cacheGuildUploadLimit = (guild: Guild): GuildUploadLimitInfo => {
    const premiumTier = toPremiumTierNumber(guild.premiumTier);
    const info = {
        guildId: guild.id,
        premiumTier,
        boostCount: guild.premiumSubscriptionCount ?? 0,
        uploadLimitBytes: estimateDiscordUploadLimitBytes(premiumTier),
    };

    guildUploadLimits.set(guild.id, info);
    return info;
};

export const getCachedGuildUploadLimit = (guildId: string | undefined) => {
    if (!guildId) return undefined;
    return guildUploadLimits.get(guildId);
};

export const getGuildUploadLimitBytes = (guild: Guild | null | undefined) => {
    if (!guild) {
        return DEFAULT_DISCORD_UPLOAD_LIMIT_BYTES;
    }

    const cached = getCachedGuildUploadLimit(guild.id);
    if (cached) {
        return cached.uploadLimitBytes;
    }

    return cacheGuildUploadLimit(guild).uploadLimitBytes;
};
