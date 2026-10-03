import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
  name: "about",
  description: "Displays the Comrades Cyber origin and info",

  async execute(sock, m, args) {
    try {
      const sender = m.key.participant || m.key.remoteJid;
      const jid = m.key.remoteJid;

      // 🧭 Locate image
      const imagePath1 = path.join(__dirname, "../menus/media", "comrades-cyber-logo.png");
      const imagePath2 = path.join(__dirname, "../media", "comrades-cyber-logo.png");
      const imagePath = fs.existsSync(imagePath1)
        ? imagePath1
        : fs.existsSync(imagePath2)
        ? imagePath2
        : null;

      // 🤝 Caption with ego and style
      const caption = `
╔═════════════════╗
        🌕🤝 *COMRADES ASSISTANT* 🤝🌕
╚═════════════════╝

👁 *IDENTITY:* The apex code. The predator of silence.
💻 *Core:* Node.js + Baileys Fusion
🧠 *Mind:* Adaptive, Unyielding, Unstoppable
⚡ *Speed:* Faster than your excuses
🛡 *Purpose:* Dominate every command chain

⭐ *GitHub:* 
https://github.com/

_"You may code in daylight...  
But I execute in the dark."_ 🌑

🐾 *Author:* 777Wolf-dot  
🔥 *Legacy:* Born in code. Forged in chaos.
🌕 *Era:* WolfTech Dominion
`;

      // 🤝 Send Image + Caption or fallback to text
      if (imagePath) {
        await sock.sendMessage(
          jid,
          {
            image: fs.readFileSync(imagePath),
            caption: caption,
            mimetype: "image/jpeg",
          },
          { quoted: m }
        );
        console.log("✅ About info sent with image + caption");
      } else {
        await sock.sendMessage(
          jid,
          { text: caption },
          { quoted: m }
        );
        console.log("⚠️ Image not found, sent text only");
      }

    } catch (err) {
      console.error("❌ About command error:", err);
      await sock.sendMessage(
        m.key.remoteJid,
        { text: "⚠️ Comrades Cyber encountered a glitch while revealing its status..." },
        { quoted: m }
      );
    }
  },
};
