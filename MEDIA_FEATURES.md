# Comrades Cyber Media Features

This deployment includes repaired public-media commands for Instagram, movies, trailers, lyrics, and TikTok, together with searchable hymn helpers for **Tenzi za Rohoni** and **Golden Bells**.

## Commands

| Command | Purpose |
| --- | --- |
| `.instagram <public URL>` | Downloads public Instagram posts, reels, IGTV, and carousel items. |
| `.movie <title>` | Searches IMDb suggestions and adds a Wikipedia summary or poster when available. |
| `.trailer <movie name or YouTube URL>` | Searches YouTube for an official trailer and attempts a size-limited MP4 download. If providers fail, the command reports the failure rather than claiming the trailer was sent. |
| `.lyrics <title>` or `.lyrics <title> by <artist>` | Resolves title-only searches through Lyrics.ovh, then uses later fallbacks. |
| `.tiktok <public URL>` | Downloads public TikTok video media. |
| `.tiktok audio <public URL>` | Downloads the TikTok sound as MP3 audio when the provider returns it. |
| `.tenzi list` | Shows the featured Tenzi za Rohoni title index. |
| `.tenzi <title or number>` | Searches the requested Tenzi za Rohoni hymn through `.play`. |
| `.goldenbells list` | Shows the featured Golden Bells title index. |
| `.goldenbells <title or number>` | Searches the requested Golden Bells hymn through `.play`. |

The new commands are also listed in the downloader, music, top-level, button, and slide menus.

## Configuration

Set `SESSION_ID` privately in the hosting panel before starting the bot. Do not put the session string in this ZIP or commit it to a repository. `SOCIALKIT_ACCESS_KEY` is optional and enables the credentialed Instagram fallback; BK9 remains the primary provider. Existing optional `XWOLF_API_KEY`, `XWOLF_BOT_KEY`, `OMDB_API`, and other settings remain blank in the source-only package.

## Hymn-catalog scope

The package does not contain full hymn lyrics, recordings, or copyrighted audio. It ships a curated title index for convenient searching and accepts an arbitrary title or hymn number, which is passed to the existing public YouTube audio workflow. Playback or download therefore depends on a public result, provider availability, regional restrictions, and the user’s rights to access or save the media.

Reference counts are shown as approximate collection references rather than a claim that the bundled title index is a complete official edition. Tenzi za Rohoni is commonly listed at approximately 161 hymns, while Golden Bells counts vary by edition and source. The command intentionally avoids claiming that every edition or title is included.

## Deployment

Run `npm install`, configure the private environment values, and start with `npm start`. This release pins `wolfsocket` to the published npm package `1.0.1` instead of a GitHub dependency, preventing the Git preparation step that can fail with `ECONNRESET` on restricted panels. The final ZIP excludes `node_modules`, `.env`, WhatsApp session files, runtime databases, logs, temporary files, and test state.

## References

[1]: https://docs.socialkit.dev/api-reference/instagram-download-api "SocialKit Instagram Video Download API"

[2]: https://v3.sg.media-imdb.com/suggestion/x/ "IMDb suggestion endpoint"

[3]: https://lyricsovh.docs.apiary.io/ "Lyrics.ovh API documentation"
