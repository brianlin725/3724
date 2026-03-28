// this file monitors message
const { EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    name: 'messageCreate',
    async execute(message) {
        if (message.author.bot) return;

        // @everyone monitor
        if (message.content.includes('@everyone')) {
            //if (message.content.includes('@everyone') || message.content.includes('@here')) { not doing @here yet

            // loading config
            const configPath = path.join(__dirname, '..', 'private_config.json');
            let config = { whitelist: [], hr_mappings: {}, default_hr: "HR" };
            try {
                if (fs.existsSync(configPath)) {
                    const data = fs.readFileSync(configPath, 'utf8');
                    config = JSON.parse(data);
                } else {
                    console.warn(`[Warning] private_config.json not found at ${configPath}`);
                }
            } catch (err) {
                console.error("Critical error parsing private_config.json:", err);
            }
            // check if whitelist includes the user
            if (config.whitelist.includes(message.author.id)) {
                return;
            }

            // get company
            const targetHR = config.hr_mappings[message.author.id] || config.default_hr;
            const caseId = `ATTN-${Math.random().toString(36).toUpperCase().substring(2, 9)}`;

            // setting embedded messgae
            const warningEmbed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle(`🚨 DISCIPLINARY REPORT: ${targetHR.toUpperCase()} HR`)
                .setDescription(
                    `An illegal attempt to tag **everyone** has been intercepted.\n\n` +
                    `This incident has been officially logged and transmitted to the **${targetHR} Human Resources Department** for immediate review and further action.`
                )
                .addFields(
                    {
                        name: 'Subject of Incident',
                        value: `<@${message.author.id}>`,
                        inline: true
                    },
                    {
                        name: 'Violation',
                        value: 'Unauthorized "Global Summoning"',
                        inline: true
                    }
                )
                .setTimestamp()
                .setFooter({ text: `Case Reference: ${caseId} | Status: REPORTED` });

            // send message
            try {
                await message.reply({ embeds: [warningEmbed] });
            } catch (err) {
                console.error("Failed to send HR warning embed:", err);
            }
        }
    },
};