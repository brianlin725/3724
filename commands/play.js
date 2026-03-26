const { MessageFlags } = require('discord.js');

module.exports = {
    data: {
        name: 'play',
        description: 'Searches and plays a track using Lavalink',
        options: [
            {
                name: 'query',
                type: 3, // STRING
                description: 'The search query or URL of the song',
                required: true,
            }
        ]
    },
    async execute(interaction) {
        const voiceChannel = interaction.member?.voice?.channel;

        if (!voiceChannel) {
            return interaction.reply({
                content: 'You must be in a voice channel for me to join you.',
                flags: MessageFlags.Ephemeral
            });
        }

        const query = interaction.options.getString('query');
        await interaction.deferReply();

        // Grab the LavaShark instance we attached to the client in index.js
        const lavashark = interaction.client.lavashark;

        try {
            // 1. Create or get the player connection for this specific Discord server
            const player = lavashark.createPlayer({
                guildId: interaction.guild.id,
                voiceChannelId: voiceChannel.id,
                textChannelId: interaction.channel.id,
                selfDeaf: true
            });

            // 2. Connect the bot to the voice channel
            await player.connect();

            // 3. Search for the track
            // Lavalink requires explicit prefixes for text searches so it knows which platform to scrape
            const searchQuery = query.startsWith('http') ? query : `ytsearch:${query}`;
            const res = await lavashark.search(searchQuery, interaction.user);

            // 4. Handle the different types of responses Lavalink might return
            if (res.loadType === 'LOAD_FAILED') {
                return interaction.editReply('Lavalink failed to extract this track. It might be age-restricted or blocked.');
            } else if (res.loadType === 'NO_MATCHES') {
                return interaction.editReply('No results found for that query.');
            }

            // 5. Queue the music and play
            if (res.loadType === 'PLAYLIST_LOADED') {
                player.queue.add(res.tracks);
                if (!player.playing) await player.play();
                return interaction.editReply(`👀 Queued playlist: **${res.playlistInfo.name}** (${res.tracks.length} tracks)`);
            }

            // Check if tracks exist before accessing [0]
            if (!res.tracks || res.tracks.length === 0) {
                return interaction.editReply('No results found for that query.');
            }

            const track = res.tracks[0];
            player.queue.add(track);

            if (!player.playing) await player.play();

            return interaction.editReply(`👀 Queued: **${track.title}**`);

        } catch (error) {
            console.error('Error in play command:', error);
            await interaction.editReply('An error occurred while communicating with the audio server.');
        }
    }
};