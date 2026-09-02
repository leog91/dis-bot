import { describe, expect, it } from "bun:test";
import { getGoogleTTSUrls } from "../utils/googleTTS";

describe("getGoogleTTSUrls", () => {
    it("builds a Google Translate TTS URL", () => {
        const [result] = getGoogleTTSUrls("Hello world", "en");
        const url = new URL(result);

        expect(url.origin).toBe("https://translate.google.com");
        expect(url.pathname).toBe("/translate_tts");
        expect(url.searchParams.get("q")).toBe("Hello world");
        expect(url.searchParams.get("tl")).toBe("en");
        expect(url.searchParams.get("ttsspeed")).toBe("1");
    });

    it("splits long text without losing content", () => {
        const text = "This is a sentence with enough words to split safely. ".repeat(8).trim();
        const urls = getGoogleTTSUrls(text, "es");
        const chunks = urls.map((value) => new URL(value).searchParams.get("q") ?? "");

        expect(urls.length).toBeGreaterThan(1);
        expect(chunks.every((chunk) => chunk.length <= 200)).toBe(true);
        expect(chunks.join("")).toBe(text);
        expect(urls.every((value) => new URL(value).searchParams.get("tl") === "es")).toBe(true);
    });

    it("rejects words longer than Google's per-request limit", () => {
        expect(() => getGoogleTTSUrls("a".repeat(201), "en")).toThrow("word longer than 200 characters");
    });
});
