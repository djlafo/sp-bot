import search from 'youtube-search';
import spotify from 'node-spotify-api';

import constants from './constants/constants.js';
import characters from './constants/characters.js';

import quotes from './services/quotes.js';
import { updateSettings } from './db/db.js';

var ytKey = process.env.YT_KEY
var spotifyClient = new spotify({
    id: process.env.spotifyClient,
    secret: process.env.spotifySecret
});

export async function handleCommand(interaction) {
    switch (interaction.commandName) {
        case 'characters':
            interaction.editReply(characters.map(c => `${c.name} (${c.references.map(r => `@${r}`).join(', ')})`).join("\n"));
            break;
        case 'youtubesearch':
            search(interaction.options.getString('query'), { key: ytKey, maxResults: 1 }, function (err, results) {
                if (err) {
                    interaction.editReply(err);
                } else {
                    let resultString = '';
                    results.forEach(function (result, index) {
                        let link = (index === 0) ? result.link : '<' + result.link + '>';
                        resultString += result.title + ' - ' + result.channelTitle + "\n" + link + "\n\n"
                    });
                    interaction.editReply(resultString);
                }
            });
            break;
        case 'translate':
            const preTranslate = interaction.options.getString('text');
            let translated = await translate(preTranslate);
            interaction.editReply(`"${preTranslate}" translates to "${translated}"`);
            break;
        case 'alexaplay':
            try {
                spotifyClient.search({ type: interaction.options.getSubcommand('alexaplay'), query: interaction.options.getString('songname') || interaction.options.getString('albumname'), limit: 1 }, function (err, results) {
                    if (err) {
                        interaction.editReply(err);
                    } else {
                        let spotifyResult = results[Object.keys(results)[0]].items[0];
                        interaction.editReply(spotifyResult.name + ' - ' + (spotifyResult.release_date || '') + "\n" + spotifyResult.external_urls.spotify);
                    }
                });
            } catch (e) {
                interaction.editReply(e.message);
            }
            break;
        case 'getjoke':
            var jokeRequest = new XMLHttpRequest();
            jokeRequest.open("GET", "https://icanhazdadjoke.com/", false);
            jokeRequest.setRequestHeader('accept', 'text/plain');
            jokeRequest.send(null);
            interaction.editReply(jokeRequest.responseText);
            break;
        case 'getfamousquote':
            var famousRequest = new XMLHttpRequest();
            famousRequest.open("GET", `https://quotesondesign.com/wp-json/wp/v2/posts/?orderby=rand&_fields=title,content&per_page=1&a=${Math.floor(Math.random() * 10)}`, false);
            famousRequest.send(null);
            var resJson = JSON.parse(famousRequest.responseText)[0];
            var famousReplaced = resJson.content.rendered.replace(/&#\d{4};/g, x => {
                return String.fromCharCode(x.substring(2, 6));
            }).replace(/<\/?p>/g, "")
            interaction.editReply(`${resJson.title.rendered}:\n${famousReplaced}`);
            break;
        case '8ball':
            interaction.editReply(constants.ball[Math.floor(Math.random() * constants.ball.length)]);
            break;
        case 'coinflip':
            const random = Math.round(Math.random());
            interaction.editReply((!random) ? "heads" : "tails");
            break;
        case 'getpoints':
            interaction.editReply(`Points: ${constants.points[Math.floor(Math.random() * constants.points.length)]}`);
            break;
        case 'jesus':
            let jesusRequest = new XMLHttpRequest();
            jesusRequest.open("GET", "https://beta.ourmanna.com/api/v1/get/?format=text&order=random", false);
            jesusRequest.send(null);
            interaction.editReply(jesusRequest.responseText);
            break;
        case 'kanye':
            let kanyeRequest = new XMLHttpRequest();
            kanyeRequest.open("GET", "https://api.kanye.rest/", false);
            kanyeRequest.send(null);
            interaction.editReply(JSON.parse(kanyeRequest.responseText).quote);
            break;
        case 'quotes':
            await quotes.handleInteraction(interaction);
            break;
        case 'historylength':
            if(interaction.user.username !== 'djl') {
                interaction.editReply("go away");
                break;
            }
            const length = interaction.options.getInteger("length");
            if(length) {
                const updated = await updateSettings({historyLength: length});
                if(updated) {
                    interaction.editReply(`Length set to ${length}`);
                }
            } else {
                interaction.editReply("No length specified");
            }
            break;
    }
}

export default {
    handleCommand
};