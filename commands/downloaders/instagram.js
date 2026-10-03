import axios from 'axios';
import fs from 'fs';
import { createWriteStream } from 'fs';
import { createRequire } from 'module';
import { getBotName } from '../../lib/botname.js';
import { getFooter } from '../../lib/menuHelper.js';
import { isButtonModeEnabled } from '../../lib/buttonMode.js';
import { setActionSession } from '../../lib/actionSession.js';

const MAX_FILE_BYTES = 100 * 1024 * 1024;
const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15';
const require = createRequire(import.meta.url);
let giftedBtnsIg;
try { giftedBtnsIg = require('wolfbtns'); } catch {}

async function streamToFile(url, filePath) {
  const response = await axios.get(url, {
    responseType: 'stream',
    timeout: 90000,
    maxContentLength: MAX_FILE_BYTES,
    maxBodyLength: MAX_FILE_BYTES,
    headers: { 'User-Agent': UA, Accept: 'video/mp4,video/*,image/*,*/*;q=0.8' }
  });
  const contentType = String(response.headers?.['content-type'] || '').toLowerCase();
  if (contentType.includes('text/html') || contentType.includes('application/json')) {
    throw new Error('Provider returned a webpage instead of media');
  }
  const writer = createWriteStream(filePath);
  response.data.pipe(writer);
  await new Promise((resolve, reject) => {
    writer.on('finish', resolve);
    writer.on('error', reject);
    response.data.on('error', reject);
  });
  const stat = fs.statSync(filePath);
  if (!stat.size || stat.size > MAX_FILE_BYTES) throw new Error('Media is empty or too large');
  return stat.size;
}

function normalizeItems(payload) {
  const raw = payload?.BK9 || payload?.data?.items || payload?.data?.media || payload?.items || [];
  if (!Array.isArray(raw)) return [];
  return raw.map(item => ({
    url: item?.url || item?.downloadUrl || item?.download_url,
    thumbnail: item?.thumbnail || item?.cover,
    type: String(item?.type || '').toLowerCase().includes('image') ? 'image' : 'video'
  })).filter(item => /^https?:\/\//i.test(item.url || ''));
}

async function getBk9Media(url) {
  const response = await axios.get('https://api.bk9.dev/download/instagram', {
    params: { url }, timeout: 30000, headers: { 'User-Agent': UA }
  });
  if (response.data?.status !== true) throw new Error(response.data?.message || 'BK9 returned no media');
  return normalizeItems(response.data);
}

async function getSocialKitMedia(url) {
  const key = process.env.SOCIALKIT_ACCESS_KEY;
  if (!key) return [];
  const response = await axios.post('https://api.socialkit.dev/instagram/download', {
    access_key: key, url, format: 'mp4', quality: '720p'
  }, { timeout: 30000, headers: { 'User-Agent': UA, 'Content-Type': 'application/json' } });
  const data = response.data?.data;
  if (!response.data?.success || !data?.downloadUrl) return [];
  return [{ url: data.downloadUrl, thumbnail: data.thumbnail, type: 'video' }];
}

export async function downloadInstagram(url) {
  const providers = [
    ['BK9', () => getBk9Media(url)],
    ['SocialKit', () => getSocialKitMedia(url)]
  ];
  const errors = [];
  for (const [name, provider] of providers) {
    try {
      const candidates = await provider();
      if (!candidates.length) throw new Error('no media items');
      const stamp = Date.now();
      const items = [];
      for (const item of candidates.slice(0, 10)) {
        const ext = item.type === 'image' ? 'jpg' : 'mp4';
        const filePath = `/tmp/comrades-cyber_ig_${stamp}_${items.length}.${ext}`;
        try {
          await streamToFile(item.url, filePath);
          items.push({ filePath, isVideo: item.type !== 'image', thumbnail: item.thumbnail || '' });
        } catch (error) {
          try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch {}
          errors.push(`${name}: ${error.message}`);
        }
      }
      if (items.length) return { success: true, items, provider: name };
    } catch (error) {
      errors.push(`${name}: ${error.message}`);
    }
  }
  return { success: false, error: errors.join(' | ') || 'No media provider returned a result.' };
}

function isValidInstagramUrl(url) {
  return /^https?:\/\/(?:www\.)?(?:instagram\.com|instagr\.am)\/(?:p|reel|reels|tv)\/[A-Za-z0-9_-]+/i.test(url);
}

function cleanup(items = []) {
  for (const item of items) {
    try { if (item.filePath && fs.existsSync(item.filePath)) fs.unlinkSync(item.filePath); } catch {}
  }
}

export default {
  name: 'instagram',
  aliases: ['ig', 'igdl', 'insta'],
  description: 'Download Instagram reels, posts, and carousels',
  category: 'downloaders',

  async execute(sock, m, args, PREFIX) {
    const jid = m.key.remoteJid;
    const url = (args.join(' ').trim() || m.quoted?.text?.trim() || '').trim();
    if (!url) {
      return sock.sendMessage(jid, {
        text: `╭─⌈ 📷 *INSTAGRAM DOWNLOADER* ⌋\n│\n├─⊷ *${PREFIX}instagram <url>*\n│  └⊷ Download reels, posts, or carousels\n│\n├─⊷ *Examples:*\n│  └⊷ ${PREFIX}instagram https://instagram.com/reel/xyz\n│  └⊷ ${PREFIX}instagram https://instagram.com/p/xyz\n│\n╰⊷ ${getFooter(jid)}`
      }, { quoted: m });
    }
    if (!isValidInstagramUrl(url)) {
      return sock.sendMessage(jid, { text: '❌ Please send a public Instagram post, reel, reels, or IGTV URL.' }, { quoted: m });
    }

    if (isButtonModeEnabled() && giftedBtnsIg?.sendInteractiveMessage) {
      const sender = (m.key.participant || jid).split(':')[0].split('@')[0];
      setActionSession(`ig:${sender}:${jid.split('@')[0]}`, { url }, 10 * 60 * 1000);
    }

    await sock.sendMessage(jid, { react: { text: '⏳', key: m.key } });
    let result;
    try { result = await downloadInstagram(url); } catch (error) { result = { success: false, error: error.message }; }
    if (!result.success) {
      await sock.sendMessage(jid, { react: { text: '❌', key: m.key } });
      return sock.sendMessage(jid, { text: `❌ *Instagram download failed*\n\n${result.error}` }, { quoted: m });
    }

    let sent = 0;
    try {
      for (const item of result.items) {
        const buffer = fs.readFileSync(item.filePath);
        const size = (buffer.length / 1024 / 1024).toFixed(1);
        const caption = sent === 0
          ? `📷 *Instagram ${item.isVideo ? 'Video' : 'Photo'}*\n📦 ${size}MB | 🤝 ${getBotName()}`
          : `Part ${sent + 1} | ${size}MB`;
        if (item.isVideo) await sock.sendMessage(jid, { video: buffer, mimetype: 'video/mp4', caption }, { quoted: m });
        else await sock.sendMessage(jid, { image: buffer, caption }, { quoted: m });
        sent++;
        if (sent < result.items.length) await new Promise(r => setTimeout(r, 1000));
      }
      await sock.sendMessage(jid, { react: { text: sent ? '✅' : '❌', key: m.key } });
      if (!sent) await sock.sendMessage(jid, { text: '❌ No usable media was returned.' }, { quoted: m });
    } finally {
      cleanup(result.items);
    }
  }
};
