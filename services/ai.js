import openAI from 'openai';
import characters from '../constants/characters.js';

const chatGPT = new openAI({ apiKey: process.env.gptKey, baseURL: 'https://openrouter.ai/api/v1' });

export const fetchLastMessages = async (message, bot) => {
    const messages = await message.channel.messages.fetch({limit: 20});
    // logger.info("-----------");
    // messages.forEach(m => {
    //     console.log(JSON.stringify(m, null, 4));
    // });
    // logger.info("----------");
    const messageArr = [];
    for(const message of messages) {
        const dm = message[1];
        let content = dm.content;
        let contentName = '';
        let contentUser = '';
        if(dm.author.username === bot.user.username) {
            if(content.includes("]:")) {
                const name = content.split(':')[0];
                contentName = name.split('[@')[0];
                contentUser = name.split('[@')[1]?.split(']')[0] || bot.user.username;
                content = content.split(']:').slice(1).join(']:');
            } else {
                contentName = bot.user.displayName;
                contentUser = bot.user.username;
            }
        } else {
            contentName = dm.author.displayName;
            contentUser = dm.author.username;
        }
        dm.mentions.users.forEach((user) => {
            content = content.replaceAll(`<@${user.id}>`, `@${user.username}`);
            content = content.replaceAll(`<@!${user.id}>`, `@${user.username}`);
            content = content.replaceAll(`<@&${user.id}>`, `@${user.username}`);
        });
        if (dm.reference) {
            const repliedMessage = await dm.fetchReference();
            const refName = repliedMessage.content.split(']')[0]?.split('[@')[1];
            const replyUser = repliedMessage.author.username === bot.user.username ? refName : repliedMessage.author.username;
            content = `@${replyUser} ${content}`;
        }
        for (let i=0; i < dm.embeds.length; i++) {
            const embed = dm.embeds[i]; // first embed
            messageArr.push({
                name: `${contentName}[@${contentUser}]`,
                content: `shared a link "${embed.url}" titled "${embed.title}" with the description "${embed.description}"}`,
                role: 'user'
            });
        }
        const attachments = dm.attachments
            .filter(a => a.contentType.startsWith('image'))
            .map(a =>{
                return {
                    type: 'image_url',
                    image_url: {
                        url: a.url
                    }
                };
            });
        messageArr.push({
          name: `${contentName}[@${contentUser}]`,
          role: 'user',
          content: [
            {
                type: 'text',
                text: content
            },
            ...attachments
          ]
        });
    }
    return messageArr;
}

export const replyToMessage = async (message, character, bot) => {
    if(message.author.bot && Math.random() > 0.2) return;

    message.channel.sendTyping();
    if(!character) {
        character = characters[0];
    }
    let lastMessages = (await fetchLastMessages(message, bot)).reverse();
    let instructions = `You are ${character.name} in a discord conversation.${character.instructions} ONLY RESPOND WITH WHAT YOU WOULD SAY.  DO NOT BEGIN YOUR RESPONSE WITH YOUR NAME OR USERNAME.  You are responding to the last person in the conversation.`;
    // if (message.author.username === 'gerson9557') {
        // instructions += 'Answer in spanish.';
    // } else if (message.author.username === 'lazyusername5676') {
        // instructions += 'End the response by telling them to focus on their legacy government code.';
    // }
    lastMessages = [{
        role: 'system',
        content: instructions
    }, ...lastMessages];
    // logger.info("-----------");
    // lastMessages.forEach(m => {
    //     console.log(JSON.stringify(m, null, 2));
    // });
    // logger.info("----------");
    try {
        const chatCompletion = await chatGPT.chat.completions.create({
            messages: lastMessages,
            model: 'x-ai/grok-4:online',
            stream: true,
            // tools: tools,
            plugins: [
                {
                    id: "web",
                    max_results: 5
                }
            ]
        });
        let content = `${character.name}[@${character.references[0]}]: `;
        let buffer = '';
        let reply = await message.reply(`${content} ...`);
        message.channel.sendTyping();
        // const toolCalls = [];
        for await (const chunk of chatCompletion) {
            // if (chunk.choices[0].delta.tool_calls) {
            //     toolCalls.push(...chunk.choices[0].delta.tool_calls);
            // }
            // if (chunk.choices[0].delta.finish_reason === 'tool_calls') {
            //     for(const toolCall of toolCalls) {
            //         const toolName = toolCall.function.name;
            //         const { search_params } = JSON.parse(toolCall.function.arguments);
            //         const toolResponse = await TOOL_MAPPING[toolName](search_params);
            //         lastMessages.push({
            //             role: 'tool',
            //             toolCallId: toolCall.id,
            //             name: toolName,
            //             content: JSON.stringify(toolResponse),
            //         });
            //     }
            //     const toolResponse = await chatGPT.chat.completions.create({
            //         messages: lastMessages,
            //         model: 'x-ai/grok-4.1-fast:free:online',
            //         stream: false,
            //         tools: tools,
            //     });
            //     await reply.reply(toolResponse.choices[0].message.content);
            // if (chunk.choices[0].delta.finish_reason === 'stop') {
            // }
            const token = chunk.choices[0]?.delta?.content || '';
            if (token) {
                buffer += token;
                if(buffer.length > 100) {
                    content+=buffer;
                    buffer = '';
                    if(content.length > 1900) {
                        content = content.substring(1900);
                        reply = await reply.reply({ content: `${content} ...`, withResponse: true});
                    } else {
                        await reply.edit({ content: `${content} ...`, withResponse: true});
                    }
                    message.channel.sendTyping();
                }
            }
        }

        if (buffer.length) {
            content += buffer;
            buffer = '';
        }
        await reply.edit({ content: `${content}`, withResponse: true });

        // if(chatCompletion.choices[0].message.annotations?.length > 0) {
        //     chatCompletion.choices[0].message.annotations.forEach(a => {
        //         response += `\n ${a.url_citation.title}: <${a.url_citation.url}>`
        //     });
        // }
    } catch (e) {
        message.reply({content: e.toString()});
    }
}

// const tools = [
//     {
//         "type": "function",
//         "function": {
//             "name": "testTool",
//             "description": "Search for a quote containing the text given",
//             "parameters": {
//                 "type": "object",
//                 "properties": {
//                     "text": {
//                         "type": "string",
//                         "description": "Text to search for in quotes"
//                     }
//                 },
//                 "required": ["person"]
//             }
//         }
//     }
// ];

// const TOOL_MAPPING = {
//   searchQuotes,
// };

export default {
    replyToMessage
};