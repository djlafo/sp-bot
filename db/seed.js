import csv from 'fast-csv';
import fs from 'fs';

import 'dotenv/config';
import { quotesTable } from './schema.js';
import db from './db.js';

async function main() {
    const quotes = await loadQuotes();

    for(let i=0; i<quotes.length; i++) {
        await db.insert(quotesTable).values(quotes[i]);
    }
}

main();


async function loadQuotes() {
    const quotes = [];
    let stream = fs.createReadStream('./quotes.csv')
        .pipe(csv.parse({ headers: true }))
        .on('data', row => {
            quotes.push({
                guildId: row.guildId,
                person: row.person,
                UUID: row.UUID,
                quote: row.quote.replaceAll('\\n', '\n')
            });
        });
    await new Promise((resolve, reject) => {
        stream.on('finish', () => {
            resolve();
        })
            .on('error', error => {
                logger.error(error);
                reject(error);
            });
    });
    return quotes;
}
