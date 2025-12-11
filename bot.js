import 'dotenv/config'

import discord from 'discord.js';
import logger from 'winston';
let translate;
import('translate').then(p => {
    translate = p.Translate({ engine: "google", from: "es", to: "en" })
});

import characters from './constants/characters.js';
import commands from './constants/commands.js';
import ai from './services/ai.js';

import commandHandler from './commandHandler.js';

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
                await ai.replyToMessage(message, character, bot);
                return;
            }
        }
        let char;
        if (message.mentions.has(bot.user)) {
            await ai.replyToMessage(message, null, bot);
        } else if ((char = (characters.find(c => c.references.some(r => message.content.toLowerCase().includes(`@${r}`)))))) {
            await ai.replyToMessage(message, char, bot);
        }
    } catch (e) {
        logger.error(`CODE: ${e.code}, DETAIL ${e.detail}, MESSAGE: ${e.message}, STACK: ${e.stack}`);
    }
});

bot.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;
    await interaction.deferReply();
    await commandHandler.handleCommand(interaction);
});

const rest = new discord.REST({ version: '10' }).setToken(process.env.token);
logger.info('Started refreshing application (/) commands.');
rest.put(discord.Routes.applicationCommands(process.env.client_id), { body: commands }).then(() => {
    logger.info('Successfully reloaded application (/) commands.');
    bot.login(process.env.token);
}).catch((error) => {
    logger.error(error.stack);
});

process.on('uncaughtException', (error) => {
    if(![10062].includes(error.code))
        logger.error(`CODE: ${error.code}, DETAIL ${error.detail}, MESSAGE: ${error.message}, STACK: ${error.stack}`);
});