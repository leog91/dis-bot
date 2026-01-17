import 'dotenv/config';
import { drizzle } from 'drizzle-orm/bun-sqlite';
import { Database } from 'bun:sqlite';
import * as schema from './schema';

const client = new Database(process.env.DB_FILE_NAME!);
export const db = drizzle(client, { schema });
