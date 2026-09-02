import { drizzle } from 'drizzle-orm/bun-sqlite';
import { migrate } from 'drizzle-orm/bun-sqlite/migrator';
import { Database } from 'bun:sqlite';
import { dirname, isAbsolute, resolve } from 'node:path';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as schema from './schema';

const dbPathFromEnv = process.env.DB_FILE_PATH ?? process.env.DB_FILE_NAME;

if (!dbPathFromEnv) {
    throw new Error('Missing DB file path. Set DB_FILE_PATH (or DB_FILE_NAME for backward compatibility).');
}

const dbFilePath = isAbsolute(dbPathFromEnv) ? dbPathFromEnv : resolve(process.cwd(), dbPathFromEnv);
mkdirSync(dirname(dbFilePath), { recursive: true });

const client = new Database(dbFilePath);
client.run("PRAGMA journal_mode = WAL;");
client.run("PRAGMA busy_timeout = 5000;");
export const db = drizzle(client, { schema });

const dbDir = dirname(fileURLToPath(import.meta.url));
const migrationsFolder = resolve(dbDir, '..', 'drizzle');

migrate(db, { migrationsFolder });
