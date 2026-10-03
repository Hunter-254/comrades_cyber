import fs from 'fs';
import path from 'path';
import { getBotName } from '../../lib/menuHelper.js';

const OWNER_FILE = path.join(process.cwd(), 'owner.json');
const LEGACY_CONTACT_FILE = path.join(process.cwd(), 'bot_owner_contact.json');
const DEFAULT_OWNER_NUMBER = '254796271291';

function normalizeNumber(value) {
    const number = String(value || '').replace(/\D/g, '');
    return number.length >= 7 ? number : '';
}

function getOwnerContact() {
    // The panel environment is authoritative when present.
    const envNumber = normalizeNumber(process.env.OWNER_NUMBER);
    if (envNumber) return envNumber;

    // Then use the package's main owner record.
    try {
        if (fs.existsSync(OWNER_FILE)) {
            const data = JSON.parse(fs.readFileSync(OWNER_FILE, 'utf8'));
            const configured = normalizeNumber(
                data.OWNER_NUMBER || data.OWNER_CLEAN_NUMBER || data.OWNER_JID || data.number
            );
            if (configured) return configured;
        }
    } catch {}

    // Read the legacy file only for backward compatibility with an existing panel install.
    try {
        if (fs.existsSync(LEGACY_CONTACT_FILE)) {
            const data = JSON.parse(fs.readFileSync(LEGACY_CONTACT_FILE, 'utf8'));
            const legacy = normalizeNumber(data.number);
            if (legacy) return legacy;
        }
    } catch {}

    return DEFAULT_OWNER_NUMBER;
}

function saveOwnerContact(number) {
    const cleanNumber = normalizeNumber(number);
    let data = {};
    try {
        if (fs.existsSync(OWNER_FILE)) data = JSON.parse(fs.readFileSync(OWNER_FILE, 'utf8'));
    } catch {}
    data.OWNER_NUMBER = cleanNumber;
    data.OWNER_CLEAN_NUMBER = cleanNumber;
    data.OWNER_JID = `${cleanNumber}@s.whatsapp.net`;
    fs.writeFileSync(OWNER_FILE, JSON.stringify(data, null, 2) + '\n');
    try { if (fs.existsSync(LEGACY_CONTACT_FILE)) fs.unlinkSync(LEGACY_CONTACT_FILE); } catch {}
}

export default {
    name: 'owner',
    alias: ['creator', 'dev', 'developer'],
    description: 'Show or update the bot owner number',
    category: 'owner',

    async execute(sock, m, args, PREFIX, extra) {
        const jid = m.key.remoteJid;
        const { jidManager } = extra || {};
        const isOwner = jidManager?.isOwner(m) || false;

        if (args[0]) {
            if (!isOwner) {
                return sock.sendMessage(jid, {
                    text: '❌ *Owner Only Command!*'
                }, { quoted: m });
            }

            const newNumber = normalizeNumber(args[0]);
            if (!newNumber) {
                return sock.sendMessage(jid, {
                    text: `❌ Invalid number. Example: \`${PREFIX}owner 254796271291\``
                }, { quoted: m });
            }

            saveOwnerContact(newNumber);
            return sock.sendMessage(jid, {
                text: `✅ *Owner number updated*\n\`+${newNumber}\``
            }, { quoted: m });
        }

        const ownerNumber = getOwnerContact();
        try { await sock.sendMessage(jid, { react: { text: '👑', key: m.key } }); } catch {}

        // Send one response only. The previous implementation sent a text/buttons response
        // and then a second WhatsApp contact card, which looked like two owners.
        return sock.sendMessage(jid, {
            text: `👑 *${getBotName()} OWNER*\n\n📱 *+${ownerNumber}*\n\n💬 https://wa.me/${ownerNumber}`
        }, { quoted: m });
    }
};
