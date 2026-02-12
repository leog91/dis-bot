import { db } from "../db/index";
import { bf6Scrapes } from "../db/schema";
import { desc } from "drizzle-orm";
import { updateBf6Data } from "../utils/bf6rank";

const CACHE_TTL = 1000 * 60 * 60 * 6; // 6 hours

class BF6RankService {
    private lastUpdated = 0;

    async load() {
        const latest = await db
            .select({ scrapedAt: bf6Scrapes.scrapedAt })
            .from(bf6Scrapes)
            .orderBy(desc(bf6Scrapes.scrapedAt))
            .limit(1);

        if (!latest.length) {
            this.lastUpdated = 0;
            return;
        }

        this.lastUpdated = latest[0].scrapedAt.getTime();
    }

    isExpired() {
        return Date.now() - this.lastUpdated > CACHE_TTL;
    }

    async update() {
        console.log("🔄 Updating BF6 rank data...");
        await updateBf6Data();
        this.lastUpdated = Date.now();
        console.log("✅ BF6 rank data updated.");
    }
}

export const bf6Service = new BF6RankService();
