export const commands = [
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
        name: 'historylength',
        description: 'Set how far back the AI can see',
        options: [
            {
                name: 'length',
                required: true,
                description: "number length",
                type: 4
            }
        ]
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

export default commands;