import { Database } from "bun:sqlite";
import { createStatsReader } from "./bf6";
import { createDashboard } from "./views";

function startDashboard() {
    const path = process.env.DB_FILE_PATH ?? process.env.DB_FILE_NAME;
    if (!path) throw new Error("Set DB_FILE_PATH to the bot's existing SQLite database.");

    const rawPort = process.env.BF6_WEB_PORT ?? "3000";
    const port = Number(rawPort);
    if (!/^\d+$/.test(rawPort) || port < 1 || port > 65535) {
        throw new Error("BF6_WEB_PORT must be an integer from 1 to 65535.");
    }

    const hostname = "127.0.0.1";
    const host = `${hostname}:${port}`;
    const expectedHost = port === 80 ? hostname : host;
    const client = new Database(path, { readonly: true });
    try {
        const stats = createStatsReader(client);
        try {
            stats.checkSchema();
        } catch (error) {
            throw new Error(`Cannot read BF6 tables in ${path}. Check that this is the bot's migrated database. ${error.message}`);
        }

        const dashboard = createDashboard(stats);
        Bun.serve({
            hostname,
            port,
            fetch(request) {
                const requestedHost = request.headers.get("host");
                if (requestedHost !== expectedHost && requestedHost !== host) return new Response("Invalid host", { status: 403 });
                return dashboard(request);
            },
            error(error) {
                console.error("[web]", error);
                return new Response("Could not read BF6 stats. Check the dashboard logs.", { status: 500 });
            },
        });
        console.log(`[web] BF6 dashboard: http://${host} (Ctrl+C to stop)`);
    } catch (error) {
        client.close();
        throw error;
    }
}

try {
    startDashboard();
} catch (error) {
    console.error(`[web] ${error.message}`);
    process.exitCode = 1;
}
