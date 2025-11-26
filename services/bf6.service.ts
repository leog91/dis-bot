import fs from "fs/promises";
import path from "path";
import { updateBf6RankFile } from "../utils/bf6rank";



const CACHE_FILE = path.join(process.cwd(), "bf6rank.json");
const CACHE_TTL = 1000 * 60 * 60 * 6; // 6 hours

class BF6RankService {
    private lastUpdated = 0;

    async load() {
        try {
            const stats = await fs.stat(CACHE_FILE);
            this.lastUpdated = stats.mtimeMs;
        } catch {
            this.lastUpdated = 0;
        }
    }

    isExpired() {
        return Date.now() - this.lastUpdated > CACHE_TTL;
    }

    async update() {
        console.log("🔄 Updating BF6 rank cache...");
        await updateBf6RankFile();
        this.lastUpdated = Date.now();
        console.log("✅ BF6 rank cache updated.");
    }

    async getData() {
        const file = await fs.readFile(CACHE_FILE, "utf8");
        return JSON.parse(file);
    }
}

export const bf6Service = new BF6RankService();
