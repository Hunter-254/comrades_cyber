import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const thumbnailPath = path.join(path.dirname(fileURLToPath(import.meta.url)), '../menus/media/comrades-cyber-logo.png');

const truthCategories = {
    general: 'https://api.truthordarebot.xyz/v1/truth',
    paranoia: 'https://api.truthordarebot.xyz/v1/paranoia',
    wyr: 'https://api.truthordarebot.xyz/v1/wyr',
    nhie: 'https://api.truthordarebot.xyz/v1/nhie'
};

// The bundled Comrades Cyber artwork is used for the card thumbnail.

const backupTruths = [
    "What's the most embarrassing thing you've ever done?",
    "Have you ever lied to get out of trouble?",
    "What's your biggest fear?",
    "What's a secret you've never told anyone?",
    "What's the weirdest dream you've ever had?"
];

export default {
    name: "truth",
    alias: ["t"],
    desc: "Get a random truth question",
    category: "games",
    usage: `.truth - Random truth\n.truth paranoia - Paranoid questions\n.truth wyr - Would You Rather\n.truth nhie - Never Have I Ever`,
    
    async execute(sock, m, args) {
        try {
            const chatId = m.key.remoteJid;
            const userName = m.pushName || "Friend";
            
            const category = args[0]?.toLowerCase() || 'general';
            
            // Get a truth question
            const truth = await getTruth(category);
            
            if (!truth) {
                return await sock.sendMessage(chatId, {
                    text: "❌ Could not get a truth question. Try again!"
                }, { quoted: m });
            }
            
            // Send with thumbnail image as caption
            const caption = formatTruthCaption(truth, userName, category);
            
            return await sock.sendMessage(chatId, {
                image: fs.readFileSync(thumbnailPath),
                caption: caption
            }, { quoted: m });
            
        } catch (error) {
            console.error("Truth error:", error);
            // If image fails, send text only
            const chatId = m.key.remoteJid;
            const userName = m.pushName || "Friend";
            const category = args[0]?.toLowerCase() || 'general';
            const truth = await getTruth(category);
            
            if (truth) {
                await sock.sendMessage(chatId, {
                    text: formatTruthCaption(truth, userName, category)
                }, { quoted: m });
            }
        }
    }
};

async function getTruth(category) {
    const apiUrl = getApiUrl(category);
    
    if (apiUrl) {
        try {
            const response = await fetch(apiUrl, {
                headers: { 'Accept': 'application/json' },
                timeout: 5000
            });
            
            if (response.ok) {
                const data = await response.json();
                return data.question || data.text || null;
            }
        } catch (error) {
            console.error("API error, using local truths:", error);
        }
    }
    
    // Fallback to local truths
    return backupTruths[Math.floor(Math.random() * backupTruths.length)];
}

function getApiUrl(category) {
    const categoryMap = {
        'general': truthCategories.general,
        'normal': truthCategories.general,
        'standard': truthCategories.general,
        'paranoia': truthCategories.paranoia,
        'scary': truthCategories.paranoia,
        'wyr': truthCategories.wyr,
        'wouldyourather': truthCategories.wyr,
        'would_you_rather': truthCategories.wyr,
        'nhie': truthCategories.nhie,
        'neverhaveiever': truthCategories.nhie,
        'never_have_i_ever': truthCategories.nhie
    };
    
    return categoryMap[category] || truthCategories.general;
}

function formatTruthCaption(truth, userName, category) {
    const categoryNames = {
        'general': 'Truth',
        'paranoia': 'Paranoia',
        'wyr': 'Would You Rather',
        'nhie': 'Never Have I Ever'
    };
    
    const catName = categoryNames[category] || 'Truth';
    
    return `💬 *${catName} Question*\n\n"${truth}"\n\n👤 For: ${userName}\n\nAnswer honestly!`;
}