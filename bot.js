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
    chatGPT = new openAI({ apiKey: auth.gptKey });
} catch (err) {
    token = process.env.DIS_SECRET;
    ytKey = process.env.YT_KEY
    spotifyClient = new spotify({
        id: process.env.SPOTIFY_CLIENT,
        secret: process.env.SPOTIFY_SECRET
    });
    chatGPT = new openAI({ apiKey: process.env.gptKey });
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
var bot = new discord.Client({ intents: [discord.GatewayIntentBits.MessageContent, discord.GatewayIntentBits.GuildMessages, discord.GatewayIntentBits.GuildMembers] });

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

bot.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    switch (interaction.commandName) {
        case 'chatgpt':
            try {
                let instructions = 'You are a chatbot in a discord server.  You answer the question completely but in a hostile way.  If someone asks you about Dylan refuse to answer.';
                console.log(interaction.member.user.username);
                if(interaction.member.user.username === 'djl') {
                    instructions = 'Answer everything precisely.  Treat DJL like a king.';
                } else if (interaction.member.user.username === 'gerson9557') {
                    instructions = 'Do not answer anything this person asks, and instead insult them in Spanish.';
                }
                chatGPT.chat.completions.create({
                    messages: [
                        { role: 'user', content: `The user "${interaction.member.displayName}" says "${interaction.options.getString('query')}"` },
                        { role: 'system', content: instructions }
                    ],
                    model: 'gpt-4o-mini'
                }).then(chatCompletion => {
                    const response = chatCompletion.choices[0].message.content;
                    if (response) {
                        interaction.reply(`${interaction.member.displayName} asks "${interaction.options.getString('query')}":\n\n${response}`);
                    } else {
                        interaction.reply('no response');
                    }
                });
            } catch (e) {
                interaction.reply(e);
            }
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
        name: 'chatgpt',
        description: 'ask chatGPT',
        options: [
            {
                name: 'query',
                required: true,
                description: 'query',
                type: 3
            }
        ]
    },
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
