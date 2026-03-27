require('node:dns').setDefaultResultOrder('ipv4first');
require('dotenv').config();
const { Client, GatewayIntentBits, Collection, REST, Routes, MessageFlags } = require('discord.js');
const { LavaShark } = require('lavashark');
const fs = require('fs');
const path = require('path');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages
    ],
});

// Initialize LavaShark
client.lavashark = new LavaShark({
    nodes: [
        {
            id: 'LocalNode',
            hostname: 'lavalink', // match docker compose service name
            port: 2333,
            password: 'youshallnotpass'
        }
    ],
    sendWS: (guildId, payload) => {
        client.guilds.cache.get(guildId)?.shard.send(payload);
    }
});

// Lavalink Event Listeners (To prove it connects)
client.lavashark.on('nodeConnect', (node) => {
    console.log(`[LavaShark] Successfully connected to Lavalink Node: ${node.id}`);
});

client.lavashark.on('nodeDisconnect', (node, code, reason) => {
    console.warn(`[LavaShark] Node ${node.id} disconnected. Code: ${code}. Attempting to reconnect...`);
    // Manually trigger a reconnect if the library's auto-reconnect is lagging
    setTimeout(() => node.connect(), 5000);
});

client.lavashark.on('nodeError', (node, error) => {
    console.error(`[LavaShark] Error on node ${node.id}:`, error.message);
});

client.lavashark.on('error', (error) => {
    console.error('[LavaShark] Unhandled shark error:', error);
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

client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}!`);

    // start Lavalink connection after Discord is ready
    client.lavashark.start(String(client.user.id));

    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    try {
        await rest.put(Routes.applicationCommands(client.user.id), { body: commandsData });
        console.log('successfully reloaded application commands.');
    } catch (error) {
        console.error('error registering commands:', error);
    }
});

// intercept raw voice data and feed to LavaLink
client.on('raw', (packet) => client.lavashark.handleVoiceUpdate(packet));

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