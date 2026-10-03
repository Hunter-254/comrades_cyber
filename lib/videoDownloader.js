import axios from 'axios';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36';
const BK9_BASE = 'https://api.bk9.dev/download';
const XCASPER_API = 'https://apis.xcasper.space/api/downloader/yt-video';
const KEITH_API = 'https://apiskeith.top/download/video';

async function fetchBuffer(url, timeout = 180000) {
  if (!/^https?:\/\//i.test(url)) throw new Error('Provider returned an invalid media URL');
  const response = await axios.get(url, {
    responseType: 'arraybuffer',
    timeout,
    maxRedirects: 6,
    maxContentLength: 100 * 1024 * 1024,
    headers: { 'User-Agent': UA, Accept: 'video/mp4,video/*,*/*;q=0.8' }
  });
  const contentType = String(response.headers?.['content-type'] || '').toLowerCase();
  if (contentType.includes('text/html') || contentType.includes('application/json')) {
    throw new Error('Provider returned a webpage instead of video');
  }
  const buffer = Buffer.from(response.data);
  if (buffer.length < 10000) throw new Error('Downloaded video is empty or too small');
  return buffer;
}

function chooseQuality(videos, preferred = '720p') {
  if (!Array.isArray(videos)) return null;
  const order = ['360p', '480p', '720p', '1080p'];
  const preferredIndex = Math.max(0, order.indexOf(preferred));
  const candidates = [...order.slice(preferredIndex), ...order.slice(0, preferredIndex).reverse()];
  for (const quality of candidates) {
    const found = videos.find(v => v?.quality === quality && /^https?:\/\//i.test(v.url || ''));
    if (found) return found;
  }
  return videos.find(v => /^https?:\/\//i.test(v?.url || '')) || null;
}

async function bk9Video(url, quality) {
  const first = await axios.get(`${BK9_BASE}/youtube`, {
    params: { url, quality, type: 'video' }, timeout: 30000, headers: { 'User-Agent': UA }
  });
  const firstUrl = first.data?.BK9?.url || first.data?.data?.url;
  if (first.data?.status === true && firstUrl) {
    const buffer = await fetchBuffer(firstUrl);
    buffer._meta = { quality: first.data.BK9?.quality || quality, title: first.data.BK9?.filename || '' };
    return buffer;
  }

  const second = await axios.get(`${BK9_BASE}/youtube3`, {
    params: { url }, timeout: 30000, headers: { 'User-Agent': UA }
  });
  const secondUrl = second.data?.BK9?.downloadUrl || second.data?.data?.downloadUrl;
  if (second.data?.status === true && secondUrl) {
    const buffer = await fetchBuffer(secondUrl);
    buffer._meta = { quality: second.data.BK9?.quality || quality, title: second.data.BK9?.title || '' };
    return buffer;
  }
  throw new Error('BK9 returned no video URL');
}

async function xcasperVideo(url, quality) {
  const response = await axios.get(XCASPER_API, {
    params: { url }, timeout: 30000, headers: { 'User-Agent': UA }
  });
  const data = response.data;
  const videos = data?.videos || data?.data?.videos;
  const chosen = chooseQuality(videos, quality);
  if (!chosen) throw new Error('XCasper returned no usable video URL');
  const buffer = await fetchBuffer(chosen.url);
  buffer._meta = { quality: chosen.quality || quality, title: data?.title || data?.data?.title || '' };
  return buffer;
}

async function keithVideo(url) {
  const response = await axios.get(KEITH_API, {
    params: { url }, timeout: 35000, headers: { 'User-Agent': UA }
  });
  const result = response.data?.result || response.data?.data?.url;
  if (response.data?.status !== true || !result) throw new Error('Keith returned no video URL');
  return fetchBuffer(result);
}

export async function downloadYoutubeVideoBuffer(url, preferredQuality = '720p') {
  const errors = [];
  for (const [name, fn] of [
    ['BK9', () => bk9Video(url, preferredQuality)],
    ['XCasper', () => xcasperVideo(url, preferredQuality)],
    ['Keith', () => keithVideo(url)]
  ]) {
    try {
      const buffer = await fn();
      buffer._meta = { ...(buffer._meta || {}), provider: name };
      return buffer;
    } catch (error) {
      errors.push(`${name}: ${error.message}`);
    }
  }
  throw new Error(`All video providers failed. ${errors.join(' | ')}`);
}

export async function downloadDirectVideoBuffer(url) {
  return fetchBuffer(url);
}
