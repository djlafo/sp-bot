import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { readFileSync } from 'node:fs';
import { sql, eq } from 'drizzle-orm';
import { settingsTable } from './schema.js';

let ca;
try {
    ca = readFileSync('./ca.pem');
} catch {
    ca = false;
}

const config = {
    connection: {
        host: process.env.DATABASE_HOST,
        port: parseInt(process.env.DATABASE_PORT || "5432"),
        user: process.env.DATABASE_USER,
        password: process.env.DATABASE_PASSWORD,
        database: process.env.DATABASE,
        ssl: ca ? {
            ca,
            rejectUnauthorized: true
        } : ca
    }
};

const db = drizzle(config);
export default db;

export function lower(col) {
  return sql`lower(${col})`;
}

export async function updateSettings(guildId, settings) {
    await db.insert(settingsTable)
        .values({
            guildId: guildId,
            ...settings
        })
        .onConflictDoUpdate({
            target: settingsTable.guildId,
            set: settings
        })
    return true;
}

export async function getSettings(guildId) {
    let settingsRow = await db.select().from(settingsTable).where(eq(settingsTable.guildId, guildId));
    if(settingsRow.length === 0) {
        await db.insert(settingsTable).values({guildId: guildId});
        settingsRow = await db.select().from(settingsTable).where(eq(settingsTable.guildId, guildId));
    }

    if(settingsRow.length === 1) {
        return settingsRow[0];
    } else {
        throw "Can't find settings";
    }
}
