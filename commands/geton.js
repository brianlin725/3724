const { AttachmentBuilder } = require('discord.js');
const fs = require('fs');
const { createTextGif } = require('../utils/gifGenerator');

module.exports = {
    data: {
        name: 'geton',
        description: 'Create a "Get on <game>" GIF',
        options: [
            { name: 'game', type: 3, description: 'The game name', required: true },
            { name: 'giftype', type: 3, description: 'Type of GIF to search for', required: true },
        ],
    },
    async execute(interaction) {
        let game = interaction.options.getString('game');
        const gifType = interaction.options.getString('giftype');

        // in case someone tags a user, it doesn't show the
        game = game.replace(/<@!?(\d+)>/g, (match, id) => {
            const user = interaction.client.users.cache.get(id);
            return user ? `@${user.username}` : match;
        });

        await interaction.deferReply();

        try {
            const textOverlay = `Get on ${game}`;
            // create text gif from utility
            const outputGifPath = await createTextGif(gifType, textOverlay);

            const attachment = new AttachmentBuilder(outputGifPath, { name: `geton_${game}.gif` });
            await interaction.editReply({
                content: `Get your ass on ${game}`,
                files: [attachment],
            });

            // cleanup output file
            fs.unlinkSync(outputGifPath);

        } catch (error) {
            console.error('Error in geton command:', error);
            await interaction.editReply('An error occurred while creating the gif. Try a different search term');
        }
    }
};
