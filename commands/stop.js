const { MessageFlags } = require('discord.js');

module.exports = {
    data: {
        name: 'stop',
        description: 'Stops the music, clears the queue, and leaves the voice channel',
    },
    async execute(interaction) {
        const voiceChannel = interaction.member?.voice?.channel;

        if (!voiceChannel) {
            return interaction.reply({
                content: 'You must be in a voice channel to stop the music!',
                flags: MessageFlags.Ephemeral
            });
        }

        const lavashark = interaction.client.lavashark;
        const player = lavashark.getPlayer(interaction.guild.id);

        if (!player) {
            return interaction.reply({
                content: 'I am not playing anything in this server.',
                flags: MessageFlags.Ephemeral
            });
        }

        try {
            // stop current track and clear queue
            // disconnect from voice channel
            await player.destroy();

            return interaction.reply('🙉 Music stopped, queue cleared.');
        } catch (error) {
            console.error('Error in stop command:', error);
            return interaction.reply({
                content: 'An error occurred while trying to stop the player.',
                flags: MessageFlags.Ephemeral
            });
        }
    }
};