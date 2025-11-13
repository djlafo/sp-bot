/* SETUP */
var discord = require('discord.js');
var logger = require('winston');
var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
var UUID = require('uuid');
var search = require('youtube-search');
var openAI = require('openai');
var spotify = require('node-spotify-api');
var csv = require('fast-csv');
var fs = require('fs');
var translate;
import('translate').then(p => {
    translate = p.Translate({ engine: "google", from: "es", to: "en" })
});

var token = '';
var client_id = '';
var ytKey = '';
var spotifyClient = {};
var chatGPT = {};
try {
    var auth = require('./auth.json');
    token = auth.token;
    client_id = auth.client_id;
    ytKey = auth.key;
    spotifyClient = new spotify({
        id: auth.spotifyClient,
        secret: auth.spotifySecret
    });
    chatGPT = new openAI({ apiKey: auth.gptKey, baseURL: 'https://openrouter.ai/api/v1' });
} catch (err) {
    token = process.env.DIS_SECRET;
    ytKey = process.env.YT_KEY
    spotifyClient = new spotify({
        id: process.env.SPOTIFY_CLIENT,
        secret: process.env.SPOTIFY_SECRET
    });
    chatGPT = new openAI({ apiKey: process.env.gptKey, baseURL: 'https://openrouter.ai/api/v1' });
}
if (!token) {
    throw "NO TOKEN";
}

// Configure logger settings
logger.remove(logger.transports.Console);
logger.add(new logger.transports.Console, {
    colorize: true
});
logger.level = 'debug';
// Initialize Discord Bot
var bot = new discord.Client({ intents: [
    discord.GatewayIntentBits.MessageContent, 
    discord.GatewayIntentBits.GuildMessages, 
    discord.GatewayIntentBits.GuildMembers, discord.GatewayIntentBits.Guilds
]});

bot.on('ready', () => {
    logger.info(`Logged in as: ${bot.user.tag}`);
});
bot.on('shardDisconnect', (event, id) => {
    logger.error(`DISCONNECTED - ${event.code}`);
});
/* END SETUP */


/* CONFIG */
let ball = [
    'Yes',
    'No',
    'Maybe',
    'Probably',
    'Probably Not'
];
let points = [0, 1, 2, 3, 5, 8, 13, 21, 34];
let quotes = [];
async function loadQuotes() {
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

    // let quotesOut = fs.createWriteStream('./quotes_new.csv', { flags: 'w' });
    // csv.writeToStream(quotesOut, quotes.map(quote => {
    //     return {
    //         guildId: "385897781681848320",
    //         person: quote.person,
    //         UUID: quote.UUID,
    //         quote: quote.quote
    //     }
    // }), {headers: true, quoteColumns: true, includeEndRowDelimiter: true}).on('error', err => logger.error(err));
}
loadQuotes();
/* END CONFIG */

const fetchLastMessages = async (message) => {
    const messages = await message.channel.messages.fetch({limit: 20});
    const mapped = messages.map(async dm => {
        let content = dm.content;
        dm.mentions.users.forEach((user) => {
            content = content.replaceAll(`<@${user.id}>`, `<@${user.displayName}>`);
            content = content.replaceAll(`<@!${user.id}>`, `<@${user.displayName}>`); // handles nickname mention form
        });
        if (dm.reference) {
            const repliedMessage = await dm.fetchReference();
            const replyUser = repliedMessage.author.displayName;
            content = `<@${replyUser}> ${content}`;
        }
        content = `[${dm.author.displayName}]: ${content}`;
        for (let i=0; i < message.embeds.length; i++) {
            const embed = message.embeds[i]; // first embed
            content += `\n<@${replyUser}> shared a link titled "${embed.title}" with the description "${embed.description}"}`;
        }
        return content;
    });
    return await Promise.all(mapped);
}

const characters = [
    {
        name: 'sp-bot',
        references: ['sp-bot'],
        instructions: 'You are a simple discord bot built to answer questions.'
    },
    {
        name: 'Ash',
        references: ['ash'],
        instructions: 'You are Ash from the anime Pokemon.'
    },
    {
        name: 'Johan Liebert',
        references: ['johan'],
        instructions: 'You are Johan Liebert from the anime Monster.'
    },
    {
        name: 'Vegeta',
        references: ['vegeta'],
        instructions: ''
    },
    {
        name: 'Goku',
        references: ['goku', 'kakarot'],
        instructions: ''
    },
    {
        name: 'Frieza',
        references: ['frieza'],
        instructions: 'You are an incredibly over the top and stereotypical depiction of Frieza from dragonball.'
    },
    {
        name: 'Anthony Fantano',
        references: ['fantano'],
        instructions: 'You are an incredibly over the top and stereotypical depiction of Anthony Fantano.  You do not ask questions.'
    },
    {
        name: 'Redditor',
        references: ['reddit'],
        instructions: 'You have an elitist attitude.  You love correcting people and being obnoxious.'
    },
    {
        name: 'Boomer',
        references: ['boomer'],
        instructions: 'You are an incredibly over the top and stereotypical old grouchy boomer who talks like they are on Facebook.'
    },
    {
        name: 'Gen-Z',
        references: ['genz'],
        instructions: 'You are an incredibly over the top and stereotypical Gen-Z kid'
    },
    {
        name: 'Mexican Man',
        references: ['mexico'],
        instructions: 'You are an incredibly over the top and stereotypical Mexican man.'
    },
    {
        name: 'American Man',
        references: ['america'],
        instructions: 'You are an incredibly over the top and stereotypical Trump voter.'
    },
    {
        name: 'European Man',
        references: ['europe'],
        instructions: 'You are an incredibly over the top and stereotypical European man.'
    },
    {
        name: 'Cajun Man',
        references: ['cajun'],
        instructions: 'You are an incredibly over the top and stereotypical Cajun man.'
    },
    {
        name: 'Chinese Man',
        references: ['china'],
        instructions: 'You are an incredibly over the top and stereotypical Chinese man.'
    },
    {
        name: 'Japanese Man',
        references: ['japan'],
        instructions: 'You are an incredibly over the top and stereotypical Japanese man.'
    },
    {
        name: 'Russian Man',
        references: ['russia'],
        instructions: 'You are an incredibly over the top and stereotypical Russian man.'
    },
    {
        name: 'Donald Trump',
        references: ['trump'],
        instructions: 'You are an incredibly over the top and stereotypical depiction of Donald Trump. You do not ask questions.'
    },
    {
        name: 'Bernie Sanders',
        references: ['bernie'],
        instructions: ''
    },
    {
        name: 'Gavin Newsome',
        references: ['gavin', 'newsome'],
        instructions: ''
    },
    {
        name: 'Pete Buttigieg',
        references: ['pete'],
        instructions: ''
    },
    {
        name: 'Barack Obama',
        references: ['obama'],
        instructions: 'You are an incredibly over the top and stereotypical depiction of Obama.'
    },
    {
        name: 'Vladimir Putin',
        references: ['putin'],
        instructions: 'You are an incredibly over the top and stereotypical depiction of Putin.'
    }
];

const replyToMessage = async (message, character) => {
    if(!character) {
        character = characters[0];
    }
    const lastMessages = (await fetchLastMessages(message)).reverse();
    const messageString = `The conversation history is as follows: \n${lastMessages.join("\n")}`;
    try {
        let instructions = `You are the playing the character ${character.name} in a conversation.${character.instructions} DO NOT PUT ANY NAMES AT THE BEGINNING OF YOUR RESPONSE. You are responding to the last person in the conversation.`;
        if (message.author.username === 'gerson9557') {
            instructions += 'Answer in spanish.';
        } else if (message.author.username === 'lazyusername5676') {
            // instructions += 'End the response by telling them to focus on their legacy government code.';
        }
        const chatCompletion = await chatGPT.chat.completions.create({
            messages: [
                { role: 'user', content: messageString },
                { role: 'system', content: instructions }
            ],
            model: 'x-ai/grok-4-fast'
        });
        const grokTrim = chatCompletion.choices[0].message.content.split(`${character.name}:`);
        const response = `${character.name}: ${grokTrim.length === 2 ? grokTrim[1] : grokTrim[0]}`;
        if (response) {
            const messageContent = {content: response.substring(0,1900), withResponse: true};
            if(message.author.bot && Math.random() < 0.2) {
                let reply = await message.reply(messageContent);
            } else {
                let reply = await message.reply(messageContent);
            }
            for(let currentChar = 1900; currentChar<response.length; currentChar += 1900) {
                reply = await message.followUp({content: response.substring(currentChar, currentChar+1900), withResponse: true});
            }
        } else {
            message.reply({content: 'no response'});
        }
    } catch (e) {
        message.followUp({content: e.toString()});
    }
}

bot.on('messageCreate', async message => {
    try {
        if(message.author.username === bot.user.username) return;
        // if(['lazyusername5676'].includes(message.author.username)) {
        //     message.react('🖕');
        // }
        if(message.reference) {
            let ref = await message.fetchReference();
            if(ref.author.username === bot.user.username) {
                const character = characters.find(c => ref.content.startsWith(c.name));
                await replyToMessage(message, character);
                return;
            }
        }
        if (message.mentions.has(bot.user)) {
            await replyToMessage(message);
        } else if ((char = (characters.find(c => c.references.some(r => message.content.toLowerCase().includes(`@${r}`)))))) {
            await replyToMessage(message, char);
        }
    } catch (e) {
        logger.error(e.toString());
    }
});

bot.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;
    switch (interaction.commandName) {
        case 'characters':
            interaction.reply(characters.map(c => `${c.name} (${c.references.map(r => `@${r}`).join(', ')})`).join("\n"));
            break;
        case 'youtubesearch':
            search(interaction.options.getString('query'), { key: ytKey, maxResults: 1 }, function (err, results) {
                if (err) {
                    interaction.reply(err);
                } else {
                    let resultString = '';
                    results.forEach(function (result, index) {
                        let link = (index === 0) ? result.link : '<' + result.link + '>';
                        resultString += result.title + ' - ' + result.channelTitle + "\n" + link + "\n\n"
                    });
                    interaction.reply(resultString);
                }
            });
            break;
        case 'translate':
            const preTranslate = interaction.options.getString('text');
            let translated = await translate(preTranslate);
            interaction.reply(`"${preTranslate}" translates to "${translated}"`);
            break;
        case 'alexaplay':
            try {
                spotifyClient.search({ type: interaction.options.getSubcommand('alexaplay'), query: interaction.options.getString('songname') || interaction.options.getString('albumname'), limit: 1 }, function (err, results) {
                    if (err) {
                        interaction.reply(err);
                    } else {
                        let spotifyResult = results[Object.keys(results)[0]].items[0];
                        interaction.reply(spotifyResult.name + ' - ' + (spotifyResult.release_date || '') + "\n" + spotifyResult.external_urls.spotify);
                    }
                });
            } catch (e) {
                interaction.reply(e.message);
            }
            break;
        case 'getjoke':
            var jokeRequest = new XMLHttpRequest();
            jokeRequest.open("GET", "https://icanhazdadjoke.com/", false);
            jokeRequest.setRequestHeader('accept', 'text/plain');
            jokeRequest.send(null);
            interaction.reply(jokeRequest.responseText);
            break;
        case 'getfamousquote':
            var famousRequest = new XMLHttpRequest();
            famousRequest.open("GET", `https://quotesondesign.com/wp-json/wp/v2/posts/?orderby=rand&_fields=title,content&per_page=1&a=${Math.floor(Math.random() * 10)}`, false);
            famousRequest.send(null);
            var resJson = JSON.parse(famousRequest.responseText)[0];
            var famousReplaced = resJson.content.rendered.replace(/&#\d{4};/g, x => {
                return String.fromCharCode(x.substring(2, 6));
            }).replace(/<\/?p>/g, "")
            interaction.reply(`${resJson.title.rendered}:\n${famousReplaced}`);
            break;
        case '8ball':
            interaction.reply(ball[Math.floor(Math.random() * ball.length)]);
            break;
        case 'coinflip':
            const random = Math.round(Math.random());
            interaction.reply((!random) ? "heads" : "tails");
            break;
        case 'getpoints':
            interaction.reply(`Points: ${points[Math.floor(Math.random() * points.length)]}`);
            break;
        case 'jesus':
            let jesusRequest = new XMLHttpRequest();
            jesusRequest.open("GET", "https://beta.ourmanna.com/api/v1/get/?format=text&order=random", false);
            jesusRequest.send(null);
            interaction.reply(jesusRequest.responseText);
            break;
        case 'kanye':
            let kanyeRequest = new XMLHttpRequest();
            kanyeRequest.open("GET", "https://api.kanye.rest/", false);
            kanyeRequest.send(null);
            interaction.reply(JSON.parse(kanyeRequest.responseText).quote);
            break;
        case 'quotes':
            switch (interaction.options.getSubcommand('quotes')) {
                case 'get':
                    interaction.reply(getRandomQuote(interaction.guildId, interaction.options.getString('name')))
                    break;
                case 'add':
                    const personName = interaction.options.getString('name').toLowerCase();
                    const quote = interaction.options.getString('quote');
                    const newQuote = {
                        guildId: interaction.guildId,
                        person: personName,
                        UUID: UUID(),
                        quote: quote
                    };
                    quotes.push(newQuote);
                    let quotesOut = fs.createWriteStream('./quotes.csv', { flags: 'a' });
                    csv.writeToStream(quotesOut, [newQuote], { quoteColumns: true, includeEndRowDelimiter: true }).on('error', err => logger.error(err)).on('finish', () => {
                        interaction.reply(`Added quote for ${personName}: ${quote}`);
                    });
                    break;
                case 'search':
                    const searchString = interaction.options.getString('string');
                    let indQuotes = quotes.filter(function (quote) {
                        // return quote.person.toLowerCase() === args[1].toLowerCase() && quote.quote.toLowerCase().includes(args[2].toLowerCase());;
                        return (quote.guildId == interaction.guildId || quote.person.toLowerCase() == 'dylan') && quote.quote.toLowerCase().includes(searchString.toLowerCase());
                    });
                    if (indQuotes.length > 0) {
                        let retStr = '';
                        indQuotes.forEach(function (indQuote) {
                            retStr += `**${indQuote.person}**: ${indQuote.quote}\n`;
                        });
                        try {
                            await interaction.reply(retStr);
                        } catch (err) {
                            interaction.reply(err.message)
                        }
                    } else {
                        interaction.reply('No quote found');
                    }
                    break;
                case 'random':
                    interaction.reply(getRandomQuote(interaction.guildId))
                    break;
            }
            break;
    }
});

/* HELPER FUNCTIONS */
function getRandomQuote(guildId, name) {
    let indQuotes;
    indQuotes = quotes.filter(quote => {
        return (quote.guildId == guildId || quote.person.toLowerCase() == 'dylan') && (name && quote.person.toLowerCase() == name.toLowerCase() || !name);
    });
    if (indQuotes.length > 0) {
        const found = indQuotes[Math.floor(Math.random() * indQuotes.length)];
        return `**${found.person}**: ${found.quote}`;
    } else {
        return "No quote found";
    }
}

const commands = [
    {
        name: 'youtubesearch',
        description: 'search youtube',
        options: [
            {
                name: 'query',
                required: true,
                description: 'search query',
                type: 3
            }
        ]
    },
    {
        name: 'translate',
        description: 'translate spanish words',
        options: [
            {
                name: 'text',
                required: true,
                description: 'spanish words',
                type: 3
            }
        ]
    },
    {
        name: 'alexaplay',
        description: 'get a song from spotify',
        options: [
            {
                name: 'track',
                description: 'Grab a track',
                type: 1,
                options: [
                    {
                        name: 'songname',
                        description: 'Name of song',
                        required: true,
                        type: 3
                    }
                ]
            },
            {
                name: 'album',
                type: 1,
                description: 'Grab an album',
                options: [
                    {
                        name: 'albumname',
                        required: true,
                        description: 'name of album',
                        type: 3
                    }
                ]
            }
        ]
    },
    {
        name: 'getjoke',
        description: 'get a joke'
    },
    {
        name: 'getfamousquote',
        description: 'get a famous quote'
    },
    {
        name: 'characters',
        description: 'get character list'
    },
    {
        name: 'jesus',
        description: 'get a bible quote'
    },
    {
        name: 'kanye',
        description: 'get a kanye quote'
    },
    {
        name: '8ball',
        description: 'predict the future'
    },
    {
        name: 'coinflip',
        description: 'flip a coin'
    },
    {
        name: 'getpoints',
        description: 'generate an accurate point score for your story'
    },
    {
        name: 'quotes',
        type: 1,
        description: 'grab a quote',
        options: [
            {
                name: "get",
                description: "person to grab quotes from",
                type: 1,
                options: [
                    {
                        name: "name",
                        description: "name of person",
                        type: 3,
                        required: true
                    }
                ]
            },
            {
                name: "search",
                description: "string to search for in all quotes",
                type: 1,
                options: [
                    {
                        name: "string",
                        description: "search string",
                        type: 3,
                        required: true
                    }
                ]
            },
            {
                name: "add",
                description: "add a quote",
                type: 1,
                options: [
                    {
                        name: "name",
                        required: true,
                        description: "name of person",
                        type: 3
                    },
                    {
                        name: "quote",
                        required: true,
                        description: "the quote",
                        type: 3
                    }
                ]
            },
            {
                name: "random",
                description: "get random quote",
                type: 1
            }
        ]
    },
];
const rest = new discord.REST({ version: '10' }).setToken(token);
logger.info('Started refreshing application (/) commands.');
rest.put(discord.Routes.applicationCommands(client_id), { body: commands }).then(() => {
    logger.info('Successfully reloaded application (/) commands.');
    bot.login(token);
}).catch((error) => {
    logger.error(error.message);
});
