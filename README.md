# Drop

A private, PIN-protected drop box for moving text, images and files between your own devices.
Paste or drop something on your laptop and it shows up on your phone instantly, and the other way round.

- **Drop anything:** type or paste text, paste screenshots, drag files anywhere on the page, or tap *Add files* on mobile. Small text files (`.txt`, `.md`, `.json`, code…) become editable text.
- **Two columns:** text on the left; images and files on the right. On phones they become tabs.
- **Text actions:** copy to clipboard, edit, download, share, delete. URLs in text are tappable.
- **Share links:** each item can get a public `/s/<link>` URL (no PIN needed) with a QR code. You can rename the link, regenerate it, or turn it off.
- **Live sync:** changes appear on every signed-in device over a websocket.
- **6-digit PIN keypad** with a JWT cookie, so each device only unlocks once. The token renews itself while you keep using the device.

## Stack

| | |
|---|---|
| Client | React 19, Vite, Tailwind CSS 4, socket.io-client, served by nginx |
| Server | Express 5, socket.io, SQLite (better-sqlite3), multer, jsonwebtoken |
| Storage | `DATA_DIR/drop.db` (SQLite) + `DATA_DIR/uploads/` |

## Run with Docker

```bash
cp .env.example .env      # then set DROP_PIN
docker compose up -d --build
```

Open `http://<your-server>/`. Everything is stored in the `drop-data` Docker volume.

## Development

```bash
npm install && npm run install:all
cp .env.example server/.env   # set DROP_PIN
npm run dev
```

Client: http://localhost:5173 (proxies `/api` and the websocket to the server on :3001).
To try it from your phone on the same network, run the client with `npm run dev --prefix client -- --host`.

## Configuration

| Variable | Default | |
|---|---|---|
| `DROP_PIN` | — (required) | 6-digit PIN. Changing it signs out every device. |
| `JWT_SECRET` | auto-generated | Stored in the database if not set. |
| `TOKEN_DAYS` | `30` | How long an unused device stays signed in. |
| `MAX_UPLOAD_MB` | `500` | Largest single upload. |
| `TRUST_PROXY` | `1` in Docker | Proxies in front of the server. Set `2` if you add your own reverse proxy in front of the bundled nginx. |
| `DROP_PORT` | `80` | Host port for the web UI. |
| `DATA_DIR` | `server/data` | Where the database and uploads live. |

## Security notes

- Wrong PINs are rate-limited: 5 per IP per 15 minutes, and 100 per hour in total. Devices already signed in are unaffected by a lockout.
- Serve it over **HTTPS** if it's reachable from the internet. Browsers also only allow copying images to the clipboard on HTTPS or localhost; text copy has a fallback that works over plain HTTP.
- Share links are public to anyone who has the URL. Random links are unguessable, but custom ones like `/s/wifi` aren't.
