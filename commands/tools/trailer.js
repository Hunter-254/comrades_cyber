import yts from 'yt-search';
import { getBotName } from '../../lib/botname.js';
import { getFooter } from '../../lib/menuHelper.js';
import { downloadYoutubeVideoBuffer } from '../../lib/videoDownloader.js';

function isYoutubeUrl(value) {
  return /^https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)[^\s]+/i.test(value);
}

async function resolveTrailer(input) {
  if (isYoutubeUrl(input)) return { url: input, title: 'Movie Trailer', thumbnail: '' };
  const result = await yts(`${input} official trailer`);
  const video = result.videos?.find(v => v.videoId) || result.videos?.[0];
  if (!video) throw new Error('No trailer search result found.');
  return {
    url: `https://www.youtube.com/watch?v=${video.videoId}`,
    title: video.title || `${input} Trailer`,
    thumbnail: video.thumbnail || ''
  };
}

export default {
  name: 'trailer',
  aliases: ['movietrailer', 'filmtrailer', 'preview', 'movietrailers', 'filmpromo'],
  category: 'Movie',
  description: 'Search for and send a movie trailer video',

  async execute(sock, m, args, PREFIX) {
    const jid = m.key.remoteJid;
    const query = args.join(' ').trim() || m.quoted?.text?.trim() || '';
    if (!query) {
      return sock.sendMessage(jid, {
        text: `╭─⌈ 🎬 *MOVIE TRAILER* ⌋\n│\n├─⊷ *${PREFIX}trailer <movie name>*\n│  └⊷ Search and download an official trailer\n├─⊷ *${PREFIX}trailer <YouTube URL>*\n│  └⊷ Download a trailer from a link\n│\n├─⊷ *Examples:*\n│  └⊷ ${PREFIX}trailer Interstellar\n│  └⊷ ${PREFIX}trailer John Wick 4\n│\n╰⊷ ${getFooter(jid)}`
      }, { quoted: m });
    }

    await sock.sendMessage(jid, { react: { text: '⏳', key: m.key } });
    try {
      const trailer = await resolveTrailer(query);
      await sock.sendMessage(jid, { react: { text: '📥', key: m.key } });
      const video = await downloadYoutubeVideoBuffer(trailer.url, '720p');
      const sizeMB = video.length / 1024 / 1024;
      if (sizeMB > 100) throw new Error(`Trailer is too large (${sizeMB.toFixed(1)}MB).`);

      await sock.sendMessage(jid, {
        video,
        mimetype: 'video/mp4',
        fileName: `${trailer.title.replace(/[^\w\s.-]/g, '').slice(0, 60) || 'trailer'}.mp4`,
        caption: `🎬 *${trailer.title}*\n📦 ${sizeMB.toFixed(1)}MB | 🤝 ${getBotName()}`
      }, { quoted: m });
      await sock.sendMessage(jid, { react: { text: '✅', key: m.key } });
    } catch (error) {
      await sock.sendMessage(jid, { react: { text: '❌', key: m.key } });
      await sock.sendMessage(jid, {
        text: `❌ *Trailer download failed*\n\n${error.message}\n\nTry a different movie title or paste a YouTube trailer URL.`
      }, { quoted: m });
    }
  }
};
