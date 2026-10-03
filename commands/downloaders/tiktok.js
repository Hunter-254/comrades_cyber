import axios from 'axios';
import { getBotName } from '../../lib/botname.js';
import { getFooter } from '../../lib/menuHelper.js';

const API = 'https://www.tikwm.com/api/';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
const MAX_BYTES = 100 * 1024 * 1024;

function isTikTokUrl(value) {
  return /^https?:\/\/(?:www\.|vm\.|vt\.)?tiktok\.com\//i.test(value);
}

async function fetchTikTok(url) {
  const response = await axios.get(API, {
    params: { url }, timeout: 30000,
    headers: { 'User-Agent': UA, Accept: 'application/json' }
  });
  const data = response.data?.data;
  if (response.data?.code !== 0 || !data?.play) {
    throw new Error(response.data?.msg || 'TikTok media was not found');
  }
  return data;
}

async function downloadBuffer(url, maxBytes = MAX_BYTES) {
  const response = await axios.get(url, {
    responseType: 'arraybuffer', timeout: 120000,
    maxContentLength: maxBytes, maxBodyLength: maxBytes,
    headers: { 'User-Agent': UA, Accept: '*/*' }
  });
  const contentType = String(response.headers?.['content-type'] || '').toLowerCase();
  if (contentType.includes('text/html') || contentType.includes('application/json')) {
    throw new Error('TikTok provider returned a webpage instead of media');
  }
  const buffer = Buffer.from(response.data);
  if (!buffer.length || buffer.length > maxBytes) throw new Error('TikTok media is empty or too large');
  return buffer;
}

export default {
  name: 'tiktok',
  aliases: ['tt', 'tiktokdl', 'ttdl'],
  category: 'downloaders',
  description: 'Download a TikTok video or audio',

  async execute(sock, m, args, PREFIX = '.') {
    const jid = m.key.remoteJid;
    const raw = args.join(' ').trim() || m.quoted?.text?.trim() || '';
    const audioOnly = /^audio\s+/i.test(raw);
    const url = raw.replace(/^audio\s+/i, '').trim();

    if (!url) {
      return sock.sendMessage(jid, {
        text: `╭─⌈ 🎵 *TIKTOK DOWNLOADER* ⌋\n│\n├─⊷ *${PREFIX}tiktok <url>*\n│  └⊷ Download video without watermark\n├─⊷ *${PREFIX}tiktok audio <url>*\n│  └⊷ Download the TikTok sound\n│\n╰⊷ ${getFooter(jid)}`
      }, { quoted: m });
    }
    if (!isTikTokUrl(url)) {
      return sock.sendMessage(jid, { text: '❌ Please send a valid TikTok URL.' }, { quoted: m });
    }

    await sock.sendMessage(jid, { react: { text: '⏳', key: m.key } });
    try {
      const data = await fetchTikTok(url);
      const mediaUrl = audioOnly ? data.music_info?.play || data.music : data.play;
      if (!mediaUrl) throw new Error(audioOnly ? 'No TikTok audio was available.' : 'No TikTok video was available.');
      const buffer = await downloadBuffer(mediaUrl);
      const sizeMB = buffer.length / 1024 / 1024;
      const title = String(data.title || 'TikTok media').replace(/\s+/g, ' ').trim().slice(0, 120);
      const author = data.author?.nickname || data.author?.unique_id || '';

      if (audioOnly) {
        await sock.sendMessage(jid, {
          audio: buffer, mimetype: 'audio/mpeg', ptt: false,
          fileName: `${title.replace(/[^\w\s.-]/g, '').slice(0, 60) || 'tiktok-audio'}.mp3`,
          caption: `🎵 *${title}*\n${author ? `👤 ${author}\n` : ''}🤝 ${getBotName()}`
        }, { quoted: m });
      } else {
        await sock.sendMessage(jid, {
          video: buffer, mimetype: 'video/mp4',
          fileName: `${title.replace(/[^\w\s.-]/g, '').slice(0, 60) || 'tiktok'}.mp4`,
          caption: `🎵 *${title}*\n${author ? `👤 ${author}\n` : ''}📦 ${sizeMB.toFixed(1)}MB | 🤝 ${getBotName()}`
        }, { quoted: m });
      }
      await sock.sendMessage(jid, { react: { text: '✅', key: m.key } });
    } catch (error) {
      await sock.sendMessage(jid, { react: { text: '❌', key: m.key } });
      await sock.sendMessage(jid, {
        text: `❌ *TikTok download failed*\n\n${error.message}\n\nThe link must be public and not expired.`
      }, { quoted: m });
    }
  }
};

export { fetchTikTok };
