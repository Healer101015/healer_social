const express = require('express');
const { Client, GatewayIntentBits } = require('discord.js');
const app = express();

const intents = [GatewayIntentBits.Guilds]

const client = new Client({ intents: intents });

require('dotenv').config();

const cors = require('cors');
app.use(cors());

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

app.post('/upload', async (req, res) => {
    const { imageBase64 } = req.body;
    if (!imageBase64) {
        return res.status(400).json({ error: 'Missing imageBase64 or channelId' });
    }
    try {
        const channel = await client.channels.fetch(process.env.DISCORD_CHANNEL_ID);
        if (!channel) {
            return res.status(404).json({ error: 'Channel not found' });
        }
        const buffer = Buffer.from(imageBase64, 'base64');
        const image_respose = await channel.send({ files: [{ attachment: buffer, name: 'image.png' }] });
        res.status(200).json({ message: 'Image uploaded successfully', url: image_respose.attachments.first().url });
    } catch (error) {
        console.error('Error uploading image:', error);
        res.status(500).json({ error: 'Failed to upload image' });
    }
});

client.on('clientReady', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

app.listen(process.env.PORT, () => {
    console.log('Server running on port ' + process.env.PORT);

    client.login(process.env.DISCORD_TOKEN);
});