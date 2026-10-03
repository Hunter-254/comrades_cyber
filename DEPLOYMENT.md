# Comrades Cyber Deployment

Use Node.js 22.x. From the project root, install dependencies with `npm install` and start the process with `npm start`.

For unattended WhatsApp login, set a private `SESSION_ID` environment variable beginning with `COMRADES CYBER~`. The payload may be Base64-encoded JSON or GZIP-compressed JSON. Legacy `WOLF-BOT:` session IDs remain accepted. The value is authentication material and must not be committed or posted publicly. If you do not have a session value, use an interactive panel console and follow the pairing-code login flow with the phone number in international format without the plus sign.

Set `OWNER_NUMBER` in international format without `+` when owner-scoped commands are required. `BOT_PREFIX`, `BOT_MODE`, `BOT_NAME`, and `BOT_TIMEZONE` have defaults. `DATABASE_URL` is optional; without it the application uses local SQLite.

The directories `data/`, `session/`, and `logs/` must be writable and should be mounted on persistent storage where the panel supports it. Media features require `ffmpeg`; the supplied Dockerfile installs it for container deployments.

After startup, check `http://<host>:<port>/health`. Before WhatsApp authentication, `connected:false` and `status:"degraded"` are expected. After a valid session or successful pairing, the endpoint should report `connected:true`.

Feature-specific API variables are optional. Add them only for the corresponding commands, using `.env.example` as a reference. The project intentionally does not contain live keys or a live WhatsApp session.
