import axios from 'axios';
import { getFooter } from '../../lib/menuHelper.js';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

async function imdbSearch(query) {
  const response = await axios.get(`https://v3.sg.media-imdb.com/suggestion/x/${encodeURIComponent(query)}.json`, {
    timeout: 15000, headers: { 'User-Agent': UA }
  });
  const items = Array.isArray(response.data?.d) ? response.data.d : [];
  return items.find(item => item?.qid === 'movie' || item?.q === 'feature') || items[0] || null;
}

async function wikipediaSummary(title) {
  try {
    const search = await axios.get('https://en.wikipedia.org/w/api.php', {
      params: { action: 'query', list: 'search', srsearch: title, srlimit: 1, format: 'json', origin: '*' },
      timeout: 15000, headers: { 'User-Agent': UA }
    });
    const pageTitle = search.data?.query?.search?.[0]?.title;
    if (!pageTitle) return null;
    const summary = await axios.get(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(pageTitle)}`, {
      timeout: 15000, headers: { 'User-Agent': UA }
    });
    return summary.data || null;
  } catch { return null; }
}

function clean(value) {
  return value && value !== 'N/A' ? String(value) : '';
}

export default {
  name: 'movie',
  aliases: ['moviesearch', 'film', 'cinema', 'show'],
  category: 'search',
  description: 'Search for movie information',

  async execute(sock, m, args, PREFIX) {
    const jid = m.key.remoteJid;
    const query = args.join(' ').trim();
    if (!query) {
      return sock.sendMessage(jid, {
        text: `╭─⌈ 🎬 *MOVIE SEARCH* ⌋\n│\n├─⊷ *${PREFIX}movie <title>*\n│  └⊷ Search for movie information\n│\n├─⊷ *Examples:*\n│  └⊷ ${PREFIX}movie Inception\n│  └⊷ ${PREFIX}movie The Originals\n│\n╰⊷ ${getFooter(jid)}`
      }, { quoted: m });
    }

    await sock.sendMessage(jid, { react: { text: '🔍', key: m.key } });
    try {
      const item = await imdbSearch(query);
      if (!item) throw new Error('No movie or show found. Try a more exact title.');
      const summary = await wikipediaSummary(item.l || query);
      const title = item.l || query;
      const year = item.y || item.tl || '';
      const type = item.qid === 'movie' || item.q === 'feature' ? 'Movie' : (item.q || 'Title');
      const cast = item.s || '';
      const poster = item.i?.imageUrl || summary?.thumbnail?.source || '';
      const plot = summary?.extract || '';
      let caption = `🎬 *${title}*${year ? ` (${year})` : ''}\n━━━━━━━━━━━━━━━━━━━━\n\n`;
      caption += `📺 *Type:* ${type}\n`;
      if (cast) caption += `👥 *Cast:* ${cast}\n`;
      if (plot) caption += `\n📖 *Plot:* ${plot}\n`;
      caption += `\n━━━━━━━━━━━━━━━━━━━━\n🔍 *Search:* ${query}\n🤝 *Comrades Cyber*`;

      if (poster) await sock.sendMessage(jid, { image: { url: poster }, caption }, { quoted: m });
      else await sock.sendMessage(jid, { text: caption }, { quoted: m });
      await sock.sendMessage(jid, { react: { text: '✅', key: m.key } });
    } catch (error) {
      await sock.sendMessage(jid, { react: { text: '❌', key: m.key } });
      await sock.sendMessage(jid, {
        text: `❌ *Movie search failed*\n\n${clean(error.message) || 'The movie information service is unavailable.'}\n\nTry: ${PREFIX}movie Inception`
      }, { quoted: m });
    }
  }
};
