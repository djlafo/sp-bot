import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { readFileSync } from 'node:fs';
import { sql } from 'drizzle-orm';

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
