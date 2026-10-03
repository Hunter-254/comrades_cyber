import { GOLDEN_BELLS, catalogHelp, resolveCatalogQuery } from '../../lib/gospelCatalog.js';
import playCommand from './play.js';
import { getFooter } from '../../lib/menuHelper.js';

export default {
  name: 'goldenbells',
  aliases: ['goldenbell', 'golden', 'gbhymn', 'goldenbellshymns'],
  category: 'music media',
  description: 'Search and download Golden Bells hymns',

  async execute(sock, m, args, prefix = '.') {
    const jid = m.key.remoteJid;
    const input = args.join(' ').trim();
    if (!input || /^list$/i.test(input)) {
      return sock.sendMessage(jid, {
        text: `${catalogHelp(prefix, 'Golden Bells', GOLDEN_BELLS, 727, 'goldenbells')}\n\n╰⊷ ${getFooter(jid)}`
      }, { quoted: m });
    }

    const query = resolveCatalogQuery(input, GOLDEN_BELLS, 'Golden Bells hymn');
    return playCommand.execute(sock, m, query.split(/\s+/), prefix);
  }
};
