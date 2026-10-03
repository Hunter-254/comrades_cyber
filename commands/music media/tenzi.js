import { TENZI_ZA_ROHONI, catalogHelp, resolveCatalogQuery } from '../../lib/gospelCatalog.js';
import playCommand from './play.js';
import { getFooter } from '../../lib/menuHelper.js';

export default {
  name: 'tenzi',
  aliases: ['tenzizarohoni', 'swahilihymn', 'swahilihymns'],
  category: 'music media',
  description: 'Search and download Tenzi za Rohoni hymns',

  async execute(sock, m, args, prefix = '.') {
    const jid = m.key.remoteJid;
    const input = args.join(' ').trim();
    if (!input || /^list$/i.test(input)) {
      return sock.sendMessage(jid, {
        text: `${catalogHelp(prefix, 'Tenzi za Rohoni', TENZI_ZA_ROHONI, 161, 'tenzi')}\n\n╰⊷ ${getFooter(jid)}`
      }, { quoted: m });
    }

    const query = resolveCatalogQuery(input, TENZI_ZA_ROHONI, 'Tenzi za Rohoni');
    return playCommand.execute(sock, m, query.split(/\s+/), prefix);
  }
};
