import { afterEach, describe, expect, it } from "bun:test";
import { chmodSync, mkdtempSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import path from "path";
import { resolveYtDlpBinary } from "../utils/ytdlp";

const directories: string[] = [];
const createDirectory = () => {
    const directory = mkdtempSync(path.join(tmpdir(), "dis-bot-ytdlp-"));
    directories.push(directory);
    return directory;
};

afterEach(() => {
    for (const directory of directories.splice(0)) {
        rmSync(directory, { recursive: true, force: true });
    }
});

describe("resolveYtDlpBinary", () => {
    it("preserves an explicitly configured relative path", () => {
        expect(resolveYtDlpBinary("bin/yt-dlp", "/app", () => "/usr/bin/yt-dlp"))
            .toBe("/app/bin/yt-dlp");
    });

    it("preserves an explicitly configured absolute path", () => {
        expect(resolveYtDlpBinary("/custom/yt-dlp", "/app", () => null))
            .toBe("/custom/yt-dlp");
    });

    it("prefers the executable local binary over PATH", () => {
        const cwd = createDirectory();
        const binary = path.join(cwd, "yt-dlp");
        writeFileSync(binary, "#!/bin/sh\n");
        chmodSync(binary, 0o755);

        expect(resolveYtDlpBinary("", cwd, () => "/usr/bin/yt-dlp")).toBe(binary);
    });

    it("uses PATH when the local binary is missing", () => {
        expect(resolveYtDlpBinary("", createDirectory(), (name) => {
            expect(name).toBe("yt-dlp");
            return "/usr/bin/yt-dlp";
        })).toBe("/usr/bin/yt-dlp");
    });

    it("uses PATH when the local file is not executable", () => {
        const cwd = createDirectory();
        const binary = path.join(cwd, "yt-dlp");
        writeFileSync(binary, "not executable");
        chmodSync(binary, 0o644);

        expect(resolveYtDlpBinary("", cwd, () => "/usr/bin/yt-dlp"))
            .toBe("/usr/bin/yt-dlp");
    });

    it("explains how to configure a missing binary", () => {
        expect(() => resolveYtDlpBinary("", createDirectory(), () => null))
            .toThrow("YTDLP_BINARY_PATH");
    });
});
