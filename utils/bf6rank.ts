


import fs from "fs/promises";

type Player = {
    userName: string;
    id: string;
};

async function delay(ms: number) {
    return new Promise(res => setTimeout(res, ms));
}

const players: Player[] = [
    { userName: "gd92", id: "3194756111" },
    { userName: "Lik4n", id: "3105796734" },
    { userName: "pablocc74", id: "3211453693" },
    { userName: "Mave", id: "3113523271" },
    { userName: "andy", id: "2778059679" },
    { userName: "AxelFLoyd", id: "3120040957" },
    { userName: "giraldo", id: "3165910038" },
    { userName: "salsagolf", id: "3176788207" },
    { userName: "perro", id: "1000350916995" },

    { userName: "fedepolito", id: "3146576220" },


];

type PlayerRank = {
    id: string;
    kills: number;
    deaths: number
    revives: number
    platformUserHandle: string;
    user: string;
    score: number;
    careerPlayerRank: number;
    timePlayedDisplay: string;
    timePlayedValue: number

};

async function fetchPlayerData(player: Player): Promise<PlayerRank> {
    try {

        const url = `https://api.tracker.gg/api/v2/bf6/standard/profile/ign/${player.id}`
        const response = await fetch(url, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
                "Accept": "application/json",
                "Accept-Language": "en-US,en;q=0.9",
            },
        });
        // const response = await fetch(
        //     `https://api.tracker.gg/api/v2/bf6/standard/profile/ign/${player.id}`
        // );
        const data = await response.json();

        const kills = data.data?.segments?.[0]?.stats?.playerKills?.value ?? 0;
        const deaths = data.data?.segments?.[0]?.stats?.deaths?.value ?? 0;
        const revives = data.data?.segments?.[0]?.stats?.revives?.value ?? 0;
        const score = data.data?.segments?.[0]?.stats?.score?.value ?? 0;
        const careerPlayerRank = data.data?.segments?.[0]?.stats?.careerPlayerRank?.value ?? 0;
        const timePlayedDisplay = data.data?.segments?.[0]?.stats?.timePlayed?.displayValue ?? "N/A";
        const timePlayedValue = data.data?.segments?.[0]?.stats?.timePlayed?.value ?? 0;

        const platformUserHandle = data.data?.platformInfo?.platformUserHandle ?? "N/A";

        console.log(`✅ ${player.userName}: ${kills} kills`);

        return {
            id: player.id,
            kills,
            platformUserHandle,
            user: player.userName,
            deaths,
            revives,
            score,
            careerPlayerRank,
            timePlayedDisplay,
            timePlayedValue



        };
    } catch (error) {
        console.error(`❌ Failed to fetch ${player.userName}:`, error);
        return {
            id: player.id,
            kills: 0,
            platformUserHandle: "N/A",
            user: player.userName,
            deaths: 0,
            revives: 0,
            score: 0,
            careerPlayerRank: 0,
            timePlayedDisplay: "N/A",
            timePlayedValue: 0
        };
    }
}

export async function bf6Rank(): Promise<PlayerRank[]> {
    console.log("Fetching player data sequentially...\n");

    const playerRank: PlayerRank[] = [];

    // Sequential fetching to avoid rate limits
    for (const player of players) {
        const data = await fetchPlayerData(player);
        playerRank.push(data);
        await delay(1000); // 
    }

    // Sort by kills descending
    playerRank.sort((a, b) => b.kills - a.kills);

    console.log("\n🏆 Player Rankings (sorted by kills):");
    console.table(
        playerRank.map((p, index) => ({
            Rank: index + 1,
            User: p.user,
            Kills: p.kills,
            Handle: p.platformUserHandle,
        }))
    );

    // Optional JSON output
    // console.log(JSON.stringify(playerRank, null, 2));

    return playerRank;
}


export async function updateBf6RankFile() {
    const results: PlayerRank[] = [];

    console.log("Fetching player data sequentially...");
    for (const player of players) {
        const data = await fetchPlayerData(player);
        results.push(data);
        await new Promise((res) => setTimeout(res, 1000)); // 1s delay between calls
    }

    results.sort((a, b) => b.kills - a.kills);

    await fs.writeFile("./bf6rank.json", JSON.stringify(results, null, 2));
    console.log("💾 Saved updated player ranks to bf6rank.json");
}

await updateBf6RankFile();

// console.log("check: >>", check, "<<");



// export { };
