const { AttachmentBuilder } = require('discord.js');
const fs = require('fs');
const { createTextGif } = require('../utils/gifGenerator');

module.exports = {
    data: {
        name: 'voyatek-job',
        description: 'New Voyatek job dropped',
        options: [
            {
                name: 'url',
                type: 3, // STRING
                description: 'URL of the job posting (comma-separated if multiple)',
                required: true,
            },
            {
                name: 'giftype',
                type: 3,
                description: 'Type of GIF to search for',
                required: true,
            },
        ],
    },
    async execute(interaction) {
        const urlString = interaction.options.getString('url');
        const gifType = interaction.options.getString('giftype');

        // split urls in case multiple urls
        const urlSplit = urlString.split(',');

        await interaction.deferReply();

        try {
            const textOverlay = 'WAKE UP. NEW VOYATEK JOB DROP';

            // util to create gif
            const outputGifPath = await createTextGif(gifType, textOverlay);

            // send gif
            const attachment = new AttachmentBuilder(outputGifPath, { name: 'voyatek.gif' });
            await interaction.editReply({
                content: `WAKE UP. NEW VOYATEK JOB DROPPED: [View Job Posting]\n${urlSplit.join('\n')}`,
                files: [attachment],
            });

            // cleanup file
            fs.unlinkSync(outputGifPath);

        } catch (error) {
            console.error('Error in voyatek-job command:', error);
            await interaction.editReply('An error occurred while creating the gif. Try a different search term');
        }
    }
};