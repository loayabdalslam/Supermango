# Bee2Bee Web App

Web client for a Bee2Bee node. The Express gateway in `api/` connects to the node over WebSocket (default `ws://127.0.0.1:4003`) and exposes `/api/p2p/*` to the React UI. The dashboard renders a live table of every node reported through the node heartbeat, and the gateway accepts heartbeats at `POST /api/heartbeat`.

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
| `API_HOST` | `0.0.0.0` | Gateway bind host |
| `BEE2BEE_SEEDS` | `ws://127.0.0.1:4003` | Comma-separated node addresses |
| `BEE2BEE_LOCAL_REGISTRY` | `1` | Read peers from `~/.bee2bee/registry.json` |
| `BEE2BEE_HEARTBEAT_TTL` | `120` | Seconds before heartbeat nodes leave the table |
| `BEE2BEE_HEARTBEAT_TOKEN` | empty | Optional bearer token for `POST /api/heartbeat` |
| `BEE2BEE_API_URL` | `http://127.0.0.1:3001` | Vite proxy target |

The gateway stores heartbeats in memory and also reads `~/.bee2bee/heartbeat.json`, written by the Python node. With no `BEE2BEE_HEARTBEAT_URL` configured, nodes report to `http://localhost:3000/api/heartbeat` and fall back to `http://localhost:3001/api/heartbeat`, so the table fills in both Vite dev mode and the gateway-served build.

## Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Gateway + Vite dev server |
| `npm run dev:ui` | Vite dev server only |
| `npm run api` | Gateway only |
| `npm run build` | Build static assets |
| `npm run preview` | Preview the build |
| `npm start` | Serve `dist/` + API |
| `npm run local` | Build, then serve |
