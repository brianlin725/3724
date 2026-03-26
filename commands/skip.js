const { MessageFlags } = require('discord.js');

module.exports = {
    data: {
        name: 'skip',
        description: 'Skips the current track',
    },
    async execute(interaction) {
        const lavashark = interaction.client.lavashark;
        const player = lavashark.getPlayer(interaction.guild.id);

        if (!player || !player.playing) {
            return interaction.reply({
                content: 'There is nothing playing to skip!',
                flags: MessageFlags.Ephemeral
            });
        }

        try {
            await player.skip();
            return interaction.reply('🪠 Skipped to the next track');
        } catch (error) {
            console.error('Error in skip command:', error);
            return interaction.reply('Failed to skip the track.');
        }
    }
};