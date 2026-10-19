# Bee2Bee Web App

Local web client for a Bee2Bee node. The Express gateway in `api/` connects to the node over WebSocket (default `ws://127.0.0.1:4003`) and exposes `/api/p2p/*` to the React UI.

## Development

```bash
npm install
npm run dev
```

- UI: <http://localhost:3000>
- Gateway: <http://127.0.0.1:3001>
- Node: <http://127.0.0.1:4002>

Vite proxies `/api` to the gateway.

## Production-style local build

```bash
npm run local
```

Builds `dist/` and serves it from the gateway at <http://127.0.0.1:3001>.

## Environment

| Variable | Default | Description |
| --- | --- | --- |
| `API_PORT` | `3001` | Gateway port |
| `API_HOST` | `127.0.0.1` | Gateway bind host |
| `BEE2BEE_SEEDS` | `ws://127.0.0.1:4003` | Comma-separated node addresses |
| `BEE2BEE_LOCAL_REGISTRY` | `1` | Read peers from `~/.bee2bee/registry.json` |
| `BEE2BEE_API_URL` | `http://127.0.0.1:3001` | Vite proxy target |

## Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Vite dev server |
| `npm run api` | Gateway only |
| `npm run build` | Build static assets |
| `npm run preview` | Preview the build |
| `npm start` | Serve `dist/` + API |
| `npm run local` | Build, then serve |
