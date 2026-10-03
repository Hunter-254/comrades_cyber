import axios from 'axios';
import { mcowDownloadAudio } from './giftedApi.js';
import { downloadAudio as xwolfDownloadAudio } from './mediaApi.js';
import { sigLog } from './sigLog.js';

const BK9_BASE = 'https://api.bk9.dev/download';
const MAX_BYTES = 100 * 1024 * 1024;

async function downloadBytes(url) {
    const response = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 120000,
        maxRedirects: 6,
        maxContentLength: MAX_BYTES,
        headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'audio/mpeg,audio/*,*/*;q=0.8' }
    });
    const contentType = String(response.headers?.['content-type'] || '').toLowerCase();
    if (contentType.includes('text/html') || contentType.includes('application/json')) {
        throw new Error('Provider returned a webpage instead of audio');
    }
    const buffer = Buffer.from(response.data);
    if (!buffer.length || buffer.length < 10000 || buffer.length > MAX_BYTES) throw new Error('Audio buffer is empty, too small, or too large');
    return buffer;
}

async function bk9Audio(ytUrl) {
    const response = await axios.get(`${BK9_BASE}/youtube`, {
        params: { url: ytUrl, type: 'audio' },
        timeout: 30000,
        headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    const data = response.data?.BK9;
    if (response.data?.status !== true || !data?.url) throw new Error(data?.msg || 'BK9 returned no audio URL');
    const buffer = await downloadBytes(data.url);
    buffer._meta = { title: data.filename || '', quality: data.quality || '128kbps', provider: 'BK9' };
    return buffer;
}

export async function downloadAudioWithFallback(ytUrl) {
    if (!ytUrl) return null;
    const providers = [
        ['BK9', () => bk9Audio(ytUrl)],
        ['XWolf', () => xwolfDownloadAudio(ytUrl)],
        ['MCOW', () => mcowDownloadAudio(ytUrl)]
    ];
    for (const [name, provider] of providers) {
        try {
            sigLog('🔁', 'audioDownloader', `Trying ${name}…`);
            const buffer = await provider();
            if (!buffer || buffer.length < 10000) throw new Error('provider returned an unusable buffer');
            sigLog('✅', 'audioDownloader', `${name} succeeded`, {
                Size: `${(buffer.length / 1024 / 1024).toFixed(1)}MB`
            });
            return buffer;
        } catch (error) {
            sigLog('⚠️', 'audioDownloader', `${name} failed`, { Error: error.message }, 'yellow');
        }
    }
    return null;
}
