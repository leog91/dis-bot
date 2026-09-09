import { describe, expect, it } from "bun:test";
import {
    DEFAULT_DISCORD_UPLOAD_LIMIT_BYTES,
    estimateDiscordUploadLimitBytes,
} from "../services/guildUploadLimit.service";

const MB = 1024 * 1024;

describe("estimateDiscordUploadLimitBytes", () => {
    it("uses 20MB for unboosted and level 1 servers", () => {
        expect(DEFAULT_DISCORD_UPLOAD_LIMIT_BYTES).toBe(20 * MB);
        expect(estimateDiscordUploadLimitBytes(0)).toBe(20 * MB);
        expect(estimateDiscordUploadLimitBytes(1)).toBe(20 * MB);
    });

    it("uses the boosted server upload limits", () => {
        expect(estimateDiscordUploadLimitBytes(2)).toBe(50 * MB);
        expect(estimateDiscordUploadLimitBytes(3)).toBe(100 * MB);
    });
});
