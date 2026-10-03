import axios from 'axios';
import { getFooter } from '../../lib/menuHelper.js';
import { mediaLyrics } from '../../lib/mediaApi.js';

const UA = 'Mozilla/5.0';

function splitQuery(query) {
  const by = query.match(/^(.+?)\s+by\s+(.+)$/i);
  if (by) return { title: by[1].trim(), artist: by[2].trim() };
  const dash = query.match(/^(.+?)\s+-\s+(.+)$/);
  if (dash) return { title: dash[2].trim(), artist: dash[1].trim() };
  return { title: query.trim(), artist: '' };
}

async function lyricsOvh(query) {
  const { title, artist } = splitQuery(query);
  let selected = { title, artist };
  if (!artist) {
    const suggest = await axios.get(`https://api.lyrics.ovh/suggest/${encodeURIComponent(query)}`, {
      timeout: 12000, headers: { 'User-Agent': UA }
    });
    const track = suggest.data?.data?.find(t => t?.title && t?.artist?.name) || suggest.data?.data?.[0];
    if (!track) throw new Error('No matching artist found');
    selected = { title: track.title, artist: track.artist.name };
  }
  const response = await axios.get(`https://api.lyrics.ovh/v1/${encodeURIComponent(selected.artist)}/${encodeURIComponent(selected.title)}`, {
    timeout: 15000, headers: { 'User-Agent': UA }
  });
  if (!response.data?.lyrics) throw new Error('Lyrics.ovh returned no lyrics');
  return { title: selected.title, artist: selected.artist, lyrics: response.data.lyrics };
}

async function popcatLyrics(query) {
  const response = await axios.get('https://api.popcat.xyz/lyrics', {
    params: { title: query }, timeout: 12000, headers: { 'User-Agent': UA }
  });
  if (!response.data?.lyrics) throw new Error('Popcat returned no lyrics');
  return { title: response.data.title || query, artist: response.data.artist || '', lyrics: response.data.lyrics };
}

async function mediaApiLyrics(query) {
  const result = await mediaLyrics(query);
  if (!result?.lyrics) throw new Error('Media provider returned no lyrics');
  return result;
}

async function lyristLyrics(query) {
  const { title, artist } = splitQuery(query);
  const endpoint = artist
    ? `https://lyrist.vercel.app/api/${encodeURIComponent(title)}/${encodeURIComponent(artist)}`
    : `https://lyrist.vercel.app/api/${encodeURIComponent(title)}`;
  const response = await axios.get(endpoint, { timeout: 12000, headers: { 'User-Agent': UA } });
  if (!response.data?.lyrics) throw new Error('Lyrist returned no lyrics');
  return { title: response.data.title || title, artist: response.data.artist || artist, lyrics: response.data.lyrics };
}

async function fetchLyrics(query) {
  const providers = [lyricsOvh, popcatLyrics, mediaApiLyrics, lyristLyrics];
  const errors = [];
  for (const provider of providers) {
    try {
      const result = await provider(query);
      if (result?.lyrics?.trim().length > 30) return result;
    } catch (error) { errors.push(error.message); }
  }
  throw new Error(errors[0] || 'No lyrics provider returned a result');
}

export default {
  name: 'lyrics',
  aliases: ['lyric', 'ly'],
  description: 'Search for song lyrics by title or phrase',
  category: 'music media',

  async execute(sock, msg, args, PREFIX = '.') {
    const chatId = msg.key.remoteJid;
    const query = args.join(' ').trim();
    if (!query) {
      return sock.sendMessage(chatId, {
        text: `╭─⌈ 🎵 *LYRICS FINDER* ⌋\n│\n├─⊷ *Usage:* ${PREFIX}lyrics <song title>\n│\n├─⊷ *Examples:*\n│  ▸ ${PREFIX}lyrics What a Beautiful Name by Hillsong\n│  ▸ ${PREFIX}lyrics Blinding Lights\n│  ▸ ${PREFIX}lyrics Home by NF\n│\n╰⊷ ${getFooter(chatId)}`
      }, { quoted: msg });
    }

    await sock.sendMessage(chatId, { react: { text: '🔍', key: msg.key } });
    try {
      const result = await fetchLyrics(query);
      const lyrics = result.lyrics.trim();
      const maxLen = 5000;
      const body = lyrics.length > maxLen ? `${lyrics.slice(0, maxLen)}\n\n📜 _Lyrics trimmed. Search the full version online._` : lyrics;
      const header = `╭─⌈ 🎵 *LYRICS* ⌋\n│\n├─⊷ 🎶 *${result.title}*\n${result.artist ? `├─⊷ 👤 *${result.artist}*\n` : ''}╰───\n\n`;
      await sock.sendMessage(chatId, { text: header + body }, { quoted: msg });
      await sock.sendMessage(chatId, { react: { text: '✅', key: msg.key } });
    } catch (error) {
      await sock.sendMessage(chatId, { react: { text: '❌', key: msg.key } });
      await sock.sendMessage(chatId, { text: `❌ *Lyrics search failed*\n\n${error.message}\n\nTry including the artist name.` }, { quoted: msg });
    }
  }
};

export { fetchLyrics };
