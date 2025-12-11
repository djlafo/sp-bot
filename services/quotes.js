import db, { lower } from '../db/db.js';
import { quotesTable } from '../db/schema.js';
import { and, eq, sql, ilike } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

export async function getRandomQuote(guildId, name) {
    const filters = [eq(quotesTable.guildId, guildId)];
    if(name) {
        const toLower = name.toLowerCase();
        filters.push(eq(lower(quotesTable.person), toLower));
    }
    const result = await db
        .select()
        .from(quotesTable)
        .where(and(...filters))
        .orderBy(sql`RANDOM()`)
        .limit(1);
    return result[0] || null;
}

export async function searchQuotes(guildId, name, text) {
    const textLower = text.toLowerCase();
    const filters = [
        eq(quotesTable.guildId, guildId),
        ilike(lower(quotesTable.quote), `%${textLower}%`)
    ];
    if(name) {
        const nameLower = name.toLowerCase();
        filters.push(eq(lower(quotesTable.person), nameLower));
    }
    const result = await db
        .select()
        .from(quotesTable)
        .where(and(...filters));
    return result || null;
}

export async function addQuote(guildId, name, text) {
    await db.insert(quotesTable).values({
        guildId: guildId,
        person: name.toLowerCase(),
        UUID: uuidv4(),
        quote: text
    });
};

function formatQuotes(quotes) {
    let formatQuotes = '';
    quotes.forEach(q => {
        formatQuotes += `${formatQuote(q)}\n`;
    });
    return formatQuotes || "None found";
}

function formatQuote(quote) {
    return quote ? `**${quote.person}**: ${quote.quote}` : "None found";
}

export async function handleInteraction(interaction) {
    switch (interaction.options.getSubcommand('quotes')) {
        case 'random':
            const randQuote = await getRandomQuote(interaction.guildId, interaction.options.getString('name'));
            interaction.editReply(formatQuote(randQuote));
        break;
        case 'get':
            const perQuote = await getRandomQuote(interaction.guildId, interaction.options.getString('name'));
            interaction.editReply(formatQuote(perQuote));
        break;
        case 'search':
            const searchQuote = await searchQuotes(interaction.guildId, null, interaction.options.getString('string'));
            interaction.editReply(formatQuotes(searchQuote));
        break;
        case 'add':
            await addQuote(interaction.guildId, interaction.options.getString('name'),interaction.options.getString('quote'));
            interaction.editReply(`Added quote for ${interaction.options.getString('name')}: ${interaction.options.getString('quote')}`);
        break;
    }
}

export default {
    getRandomQuote,
    searchQuotes,
    addQuote,
    handleInteraction
}