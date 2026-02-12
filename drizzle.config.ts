import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';
import { isAbsolute, resolve } from 'node:path';

const dbPathFromEnv = process.env.DB_FILE_PATH ?? process.env.DB_FILE_NAME;

if (!dbPathFromEnv) {
    throw new Error('Missing DB file path. Set DB_FILE_PATH (or DB_FILE_NAME for backward compatibility).');
}

const dbFilePath = isAbsolute(dbPathFromEnv) ? dbPathFromEnv : resolve(process.cwd(), dbPathFromEnv);

export default defineConfig({
    out: './drizzle',
    schema: './db/schema.ts',
    dialect: 'sqlite',
    dbCredentials: {
        url: dbFilePath,
    },
});
