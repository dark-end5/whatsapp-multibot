const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const pino = require('pino');
const handler = require('./handler');

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info');
    
    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false, // Disable QR for Pair Code
        logger: pino({ level: 'silent' }),
        browser: ['Ubuntu', 'Chrome', '20.0.04']
    });

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (qr) {
            // Fallback if pair code fails
            require('qrcode-terminal').generate(qr, { small: true });
        }

        if (connection === 'connecting' || update.qr) {
            if (!sock.authState.creds.registered) {
                // REPLACE WITH YOUR NUMBER (Country Code + Number, no '+')
                const phoneNumber = '254725100848'; 
                try {
                    const code = await sock.requestPairingCode(phoneNumber);
                    console.log(`\n✅ Your Pairing Code: ${code}\n`);
                } catch (error) {
                    console.error('Error requesting pair code:', error);
                }
            }
        }

        if (connection === 'open') {
            console.log('✅ Bot Connected Successfully!');
        }

        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect.error)?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) startBot();
        }
    });

    sock.ev.on('creds.update', saveCreds);
    
    // Pass socket to handler
    handler(sock);
}

startBot();   
