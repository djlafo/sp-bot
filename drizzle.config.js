import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';
import { readFileSync } from 'node:fs';

let ca
try {
  ca = readFileSync('./ca.pem');
} catch {
  ca = false
}

export const dbCreds = {
  host: process.env.DATABASE_HOST,
  port: parseInt(process.env.DATABASE_PORT),
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE,
  ssl: ca ? {
    ca
  } : false
};

const config = {
  out: './drizzle',
  schema: './db/schema.js',
  dialect: 'postgresql',
  dbCredentials: dbCreds,
  migrations: {
    table: 'migrations',
    schema: 'public'
  }
};

export default defineConfig(config);