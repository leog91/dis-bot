import { accessSync, constants } from "fs";
import path from "path";

export const resolveYtDlpBinary = (
    configuredPath = process.env.YTDLP_BINARY_PATH,
    cwd = process.cwd(),
    findOnPath: (name: string) => string | null = (name) => Bun.which(name)
) => {
    if (configuredPath) {
        return path.resolve(cwd, configuredPath);
    }

    const localBinary = path.resolve(cwd, "yt-dlp");
    try {
        accessSync(localBinary, constants.X_OK);
        return localBinary;
    } catch {
        const installedBinary = findOnPath("yt-dlp");
        if (installedBinary) {
            return installedBinary;
        }
    }

    throw new Error(
        "yt-dlp was not found. Install it on PATH, add ./yt-dlp, or set YTDLP_BINARY_PATH."
    );
};
