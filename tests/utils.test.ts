import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import fs from "fs";
import path from "path";
import { randomAsset } from "../utils";

describe("randomAsset", () => {
    let originalCwd: string;
    let tempDir: string;

    beforeEach(() => {
        originalCwd = process.cwd();
        tempDir = fs.mkdtempSync(path.join("/tmp", "dis-bot-assets-"));
        process.chdir(tempDir);
    });

    afterEach(() => {
        process.chdir(originalCwd);
        if (tempDir) {
            fs.rmSync(tempDir, { recursive: true, force: true });
        }
    });

    it("returns empty string for unknown command", () => {
        const result = randomAsset("nonexistent");
        expect(result).toBe("");
    });

    it("returns empty string when the command folder exists but has no assets", () => {
        fs.mkdirSync(path.join(tempDir, "assets", "audio", "age"), { recursive: true });

        const result = randomAsset("age");

        expect(result).toBe("");
    });

    it("returns an asset filename from a known command folder", () => {
        const assetDir = path.join(tempDir, "assets", "audio", "age");
        fs.mkdirSync(assetDir, { recursive: true });
        fs.writeFileSync(path.join(assetDir, "clip.mp3"), "fake audio");

        const result = randomAsset("age");

        expect(result).toBe("clip.mp3");
    });

    it("can resolve private asset folders relative to cwd", () => {
        const assetDir = path.join(tempDir, "dis-bot-assets-private", "images", "cat");
        fs.mkdirSync(assetDir, { recursive: true });
        fs.writeFileSync(path.join(assetDir, "cat.jpg"), "fake image");

        const result = randomAsset("cat");

        expect(result).toBe("cat.jpg");
    });
});
