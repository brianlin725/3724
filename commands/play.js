const { useMainPlayer } = require('discord-player');
const { MessageFlags, ActionRowBuilder, StringSelectMenuBuilder, ComponentType } = require('discord.js');

module.exports = {
    data: {
        name: 'play',
        description: 'Searches for a song and lets you choose the exact version',
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
                content: 'You must be in a voice channel in a server for me to join you.',
                flags: MessageFlags.Ephemeral
            });
        }

        const query = interaction.options.getString('query');
        await interaction.deferReply();

        const player = useMainPlayer();

        try {
            // Step 1: Search the internet without automatically playing
            const searchResult = await player.search(query, {
                requestedBy: interaction.user,
            });

            if (!searchResult || !searchResult.hasTracks()) {
                return interaction.editReply('No results found for that query.');
            }

            // If the user pasted a direct URL, bypass the menu and just play it
            if (query.startsWith('http')) {
                const { track } = await player.play(voiceChannel, searchResult.tracks[0], {
                    nodeOptions: { metadata: interaction }
                });
                return interaction.editReply(`🎶 Queued: **${track.title}**`);
            }

            // Step 2: Build the interactive dropdown menu using the top 5 results
            const tracks = searchResult.tracks.slice(0, 5);
            const options = tracks.map((track, index) => ({
                label: track.title.substring(0, 100), // Discord enforces a 100-character limit
                description: `[${track.source}] ${track.author}`.substring(0, 100),
                value: index.toString(),
            }));

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('track_select')
                .setPlaceholder('Select the exact track to play...')
                .addOptions(options);

            const row = new ActionRowBuilder().addComponents(selectMenu);

            // Send the menu to the user
            const response = await interaction.editReply({
                content: `Found multiple results for **${query}**. Make a selection:`,
                components: [row],
            });

            // Step 3: Wait for the user to select an option
            const collectorFilter = i => i.user.id === interaction.user.id;
            let confirmation;

            try {
                // Scope 1: Isolate the UI Timeout
                confirmation = await response.awaitMessageComponent({
                    filter: collectorFilter,
                    time: 30_000,
                    componentType: ComponentType.StringSelect,
                });
            } catch (err) {
                // This will ONLY run if the user actually times out
                return interaction.editReply({
                    content: 'Selection timed out. Run the command again if you still want to play a track.',
                    components: []
                });
            }

            // Step 4: Handle the selection and update UI
            const selectedIndex = parseInt(confirmation.values[0], 10);
            const chosenTrack = tracks[selectedIndex];

            console.log('--- TRACK SELECTION DEBUG ---');
            console.log(`Title:  ${chosenTrack.title}`);
            console.log(`Source: ${chosenTrack.source}`);
            console.log(`URL:    ${chosenTrack.url}`);
            console.log('-----------------------------');

            await confirmation.update({
                content: `⏳ Loading your selection: **${chosenTrack.title}**...`,
                components: []
            });

            // Step 5: Execute Audio with its own error boundary
            try {
                await player.play(voiceChannel, chosenTrack, {
                    nodeOptions: { metadata: interaction }
                });

                await interaction.followUp(`🎶 Now playing: **${chosenTrack.title}**`);
            } catch (audioError) {
                // If it joins and leaves, the real reason will print here
                console.error('Audio extraction/playback failed:', audioError);
                await interaction.followUp('I joined the channel, but failed to extract the audio stream. Check the terminal logs.');
            }

        } catch (error) {
            console.error('Error in search and select execution:', error);
            await interaction.editReply('An error occurred while fetching the tracks. Check your terminal.');
        }
    }
};