// Force Node's internal DNS to skip IPv6 lookups to prevent Docker network timeouts
require('node:dns').setDefaultResultOrder('ipv4first');

require('dotenv').config();
const { Client, GatewayIntentBits, Collection, REST, Routes, MessageFlags } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { Player } = require('discord-player');
const { YoutubeiExtractor } = require("discord-player-youtubei");

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates
    ],
});

// setting up the music bot player framework
const player = new Player(client);
const { DefaultExtractors } = require('@discord-player/extractor');

(async () => {
    try {
        // 1. Register the advanced YouTube API extractor first
        await player.extractors.register(YoutubeiExtractor, {});

        // 2. Filter out the broken default YouTube extractor to avoid conflicts
        const filteredExtractors = DefaultExtractors.filter(ext => ext.name !== 'YouTubeExtractor');

        // 3. Load the remaining default extractors (Spotify, SoundCloud, Apple, etc.)
        await player.extractors.loadMulti(filteredExtractors);

        console.log('debug: Default extractors + YoutubeiExtractor loaded successfully.');
    } catch (err) {
        console.error('debug: Failed to load extractors:', err);
    }
})();
// ========== for debugging. not really importnnt ===============

// audio player error while playing a track
player.events.on('playerError', (queue, error) => {
    console.log(`debug: Audio Player error: ${error.message}`);
});

// exception during queue
player.events.on('error', (queue, error) => {
    console.log(`debug: general Queue Error: ${error.message}`);
});

// bot disconnected
player.events.on('disconnect', (queue) => {
    console.log('debug: bot was disconnected from the voice channel.');
});

client.commands = new Collection();

const commandsData = [];

// loading command files
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);

    // checking if data and execute exists otherwise not a valid command
    if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
        commandsData.push(command.data);
    } else {
        console.log(`warning: command at ${filePath} is missing a required "data" or "execute" property.`);
    }
}

client.once('clientReady', async () => {
    console.log(`Logged in as ${client.user.tag}!`);

    // discord rest api to register commands
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    try {
        console.log(`started refreshing ${commandsData.length} application commands.`);
        await rest.put(
            Routes.applicationCommands(client.user.id),
            { body: commandsData }
        );
        console.log('successfully reloaded application commands.');
    } catch (error) {
        console.error('error registering commands:', error);
    }
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(`error executing ${interaction.commandName}:`, error);
        const errorMessage = 'there was an error while executing this command!';

        if (interaction.replied || interaction.deferred) {
            await interaction.editReply({ content: errorMessage, flags: MessageFlags.Ephemeral });
        } else {
            await interaction.reply({ content: errorMessage, flags: MessageFlags.Ephemeral });
        }
    }
});
// global error handler. everything not handled gets caught here.
client.on('error', console.error);
process.on('unhandledRejection', console.error);
process.on('uncaughtException', console.error);

client.login(process.env.DISCORD_TOKEN);