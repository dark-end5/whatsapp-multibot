const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const yts = require('yt-search');
const axios = require('axios');

module.exports = async (sock) => {
    sock.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const chatId = msg.key.remoteJid;
        const isGroup = chatId.endsWith('@g.us');
        const text = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
        const command = text.startsWith('.') ? text.slice(1).split(' ')[0].toLowerCase() : '';

        // --- 1. AUTO READ & TYPING ---
        await sock.readMessages([msg.key]);
        await sock.sendPresenceUpdate('composing', chatId);

        // --- 2. ANTI-LINK (Group Only) ---
        if (isGroup && text.match(/https?:\/\//)) {
        await sock.sendMessage(chatId, { text: '⚠️ Links not allowed!', delete: msg.key });
            // Uncomment line above to enable deletion
        }

        // --- 3. COMMANDS ---
        switch (command) {
            case 'ping':
                await sock.sendMessage(chatId, { text: '🟢 Bot is Online!' });
                break;

            case 'blank':
                await sock.sendMessage(chatId, { text: '\u200B' }); // Zero-width space
                break;

            case 'tagall':
                if (!isGroup) return;
                const groupMeta = await sock.groupMetadata(chatId);
                const tags = groupMeta.participants.map(p => `@${p.id.split('@')[0]}`).join(' ');
                await sock.sendMessage(chatId, { text: tags, mentions: groupMeta.participants.map(a => a.id) });
                break;

            // --- 4. GAMES (Simple Example: Guess Number) ---
            case 'guess':
                const target = Math.floor(Math.random() * 10) + 1;
                await sock.sendMessage(chatId, { text: `🎮 Guess a number between 1-10. (Answer: ${target})` });
                break;

            // --- 5. DOWNLOADER (YouTube Search) ---
            case 'play':
                const query = text.split(' ').slice(1).join(' ');
                if (!query) return await sock.sendMessage(chatId, { text: 'Usage: .play <song name>' });
                
                try {
                    const search = await yts(query);
                    const video = search.videos[0];
                    await sock.sendMessage(chatId, { 
                        text: `🎵 Found: ${video.title}\n🔗 ${video.url}\n\n*(Sending audio...)*` 
                    });
                    // Note: Actual audio download requires ffmpeg and stream logic
                } catch (e) {
                    await sock.sendMessage(chatId, { text: 'Error finding video.' });
                }
                break;

            // --- 6. IMAGE SEARCH ---
            case 'image':
                const imgQuery = text.split(' ').slice(1).join(' ');
                if (!imgQuery) return;
                // Requires an API key (e.g., Google Custom Search) for reliable results
                await sock.sendMessage(chatId, { text: `Searching for: ${imgQuery}... (API Key needed)` });
                break;
                
            default:
                break;
        }
    });
};   
