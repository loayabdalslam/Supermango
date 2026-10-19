# Bee2Bee

**Bee2Bee** is a peer-to-peer mesh for running AI inference on machines you control. Every node binds all interfaces, advertises its real public IP (UPnP/STUN with LAN fallback), and posts a full heartbeat to the local web app at `localhost:3000` by default. A node can serve Ollama or Hugging Face models, and clients can chat with it through either:

- a **web app** (React + Express) with a live table of every node in the mesh, or
- a **terminal dashboard (TUI)** built with Rich.

There is no account system and no hosted registry. Nodes announce themselves over WebSocket, a small local JSON file (`~/.bee2bee/registry.json`) helps peers rediscover each other after a restart, and heartbeats keep the node table current.

---

## Requirements

- Python 3.9+
- Node.js 18+ (for the web app)
- Optional: [Ollama](https://ollama.com/) or a Hugging Face token

## Install

```bash
pip install -e .
```

For local Hugging Face inference:

```bash
pip install -e ".[hf,torch]"
```

Install the web app dependencies:

```bash
cd app
npm install
```

## Quick start

### 1. Start a node

With Ollama:

```bash
bee2bee serve-ollama --model gemma3:270m --api-port 4002
```

With a local Hugging Face model:

```bash
bee2bee serve-hf --model distilgpt2 --api-port 4002
```

Minimal node without a model (mesh + API only):

```bash
bee2bee api --port 4002 --p2p-port 4003
```

### 2. Open the terminal dashboard

```bash
bee2bee tui --model gemma3:270m --backend ollama
```

Keys:

| Key | Action |
| --- | --- |
| `c` | Chat with the local model |
| `r` | Refresh the local registry |
| `q` | Quit |

The TUI shows the node identity, API address, live CPU/memory/GPU metrics, local services, connected peers, and recent events.

### 3. Open the local web app

In a second terminal:

```bash
cd app
npm run dev
```

Open <http://localhost:3000>. `npm run dev` starts the Vite UI and the Express gateway together; Vite proxies `/api` to the gateway on port `3001`, which connects to the node at `ws://127.0.0.1:4003`. Both the gateway and the Python node bind `0.0.0.0` by default, so other machines can reach them on your LAN or public IP.

For a production-style build:

```bash
cd app
npm run local
```

This builds the UI and serves it from the Express gateway at <http://127.0.0.1:3001>. The dashboard shows a live table of every node reported through the heartbeat.

### 4. Heartbeats and the node table

Heartbeats point at the local web app by default, so no configuration is needed while Vite is running:

```text
http://localhost:3000/api/heartbeat
```

Every `BEE2BEE_HEARTBEAT_INTERVAL` seconds (default `30`) the node POSTs its identity, public IP, models, services, metrics, and coordinates, then reads the full node list back from the response. The gateway stores the list in memory and the latest response is written to `~/.bee2bee/heartbeat.json`, which the web app reads for the table.

When `BEE2BEE_HEARTBEAT_URL` is not set, the node tries the local app in order and sticks with the first one that answers:

```text
http://localhost:3000/api/heartbeat
http://localhost:3001/api/heartbeat
```

That means the table fills in both dev mode (Vite on `3000`) and the built app served by the gateway (`npm run local` on `3001`) without any configuration. Set `BEE2BEE_HEARTBEAT_URL` explicitly to pin a single endpoint.

To use a remote server instead:

```bash
export BEE2BEE_HEARTBEAT_URL=https://heartbeat.example.com/nodes
export BEE2BEE_HEARTBEAT_TOKEN=optional-bearer-token
bee2bee api --port 4002 --p2p-port 4003
```

The node understands several common response shapes (a top-level array, `{ nodes: [...] }`, `{ peers: [...] }`, `{ data: { nodes: [...] } }`, or a single node object). Each node may expose `peer_id`/`id`, `addr`/`url`, `region`, `models`, `api_port`, and `latitude`/`longitude` (also accepted: `lat`/`lng`/`lon`, `location.lat`, `geo`, `coordinates`).

### One-command demo

Linux/macOS:

```bash
BEE2BEE_MODEL=gemma3:270m ./run.sh
```

Windows PowerShell:

```powershell
./run.ps1 -Model gemma3:270m
```

Without a model, both scripts start the mesh/API only.

---

## CLI reference

```bash
bee2bee --help
```

| Command | Description |
| --- | --- |
| `serve-ollama` | Serve an Ollama model to the mesh |
| `serve-hf` | Serve a local Hugging Face model |
| `serve-hf-remote` | Proxy a model through the HF Inference API |
| `api` | Run a local node with the HTTP API only |
| `tui` | Open the terminal dashboard |
| `register` | Show the local registry or add a node address |
| `config` | View or update local configuration |
| `status` | Print registry and node summary |

Useful options:

```bash
bee2bee serve-ollama \
  --model llama3 \
  --host 0.0.0.0 \
  --port 4003 \
  --api-port 4002 \
  --endpoint http://localhost:11434
```

## HTTP API

Each node exposes a small FastAPI app (default `http://127.0.0.1:4002`):

| Endpoint | Description |
| --- | --- |
| `GET /` | Node identity, models, services, metrics |
| `GET /health` | Lightweight health check |
| `GET /peers` | Connected peers (requires `X-API-KEY` if configured) |
| `GET /providers` | Providers and models |
| `POST /generate` | Generate text (streaming supported) |
| `GET /connect?addr=ws://...` | Connect to another peer |

The Express gateway exposes the endpoints used by the UI:

| Endpoint | Description |
| --- | --- |
| `POST /api/p2p/register` | Register an invite link |
| `POST /api/p2p/generate` | Stream generation to the browser |
| `GET /api/p2p/status` | Mesh and node status |
| `GET /api/p2p/metrics` | Local session metrics |
| `GET /api/health` | Gateway health |

## Invite links

A node can be shared with another machine on the same network:

```text
bee2bee://join?network=bee2bee&model=gemma3:270m&bootstrap=<base64url(ws://host:port)>&api_port=4002
```

The web app turns this into a local URL:

```text
http://localhost:3000/?link=<encoded invite>&api_port=4002
```

Opening that URL registers the peer with the local gateway and shows the onboarding screen.

## Configuration

Copy `.env.example` to `.env` and adjust:

```ini
BEE2BEE_HOST=0.0.0.0
BEE2BEE_PORT=4003
BEE2BEE_API_PORT=4002
BEE2BEE_BOOTSTRAP=ws://127.0.0.1:4003
BEE2BEE_REGION=Auto
BEE2BEE_LOCAL_REGISTRY=1
BEE2BEE_REGISTRY_TTL=120
BEE2BEE_NAT=1
# BEE2BEE_PUBLIC_IP=203.0.113.10
# BEE2BEE_LATITUDE=30.0444
# BEE2BEE_LONGITUDE=31.2357
BEE2BEE_HEARTBEAT_URL=http://localhost:3000/api/heartbeat
# BEE2BEE_HEARTBEAT_TOKEN=change-me
BEE2BEE_HEARTBEAT_INTERVAL=30
BEE2BEE_HEARTBEAT_TTL=120
API_HOST=0.0.0.0
```

`BEE2BEE_NAT=1` is the default: the node tries UPnP, NAT-PMP, PCP, then STUN to advertise its real public IP, falling back to the LAN address when the router blocks automatic mapping. Set it to `0` to stay LAN-only, or set `BEE2BEE_PUBLIC_IP` to advertise a known address without probing. `BEE2BEE_HEARTBEAT_TTL` controls how long the gateway keeps heartbeat nodes in the table.

## Project layout

```text
bee2bee/            Python package: P2P runtime, heartbeat, API, services, TUI
app/                Web app (React + Vite + Express gateway)
  api/              Mesh bridge and HTTP gateway
  src/              UI components, mesh node table, and invite-link helpers
tests/              Python tests
scripts/            Ad-hoc debugging helpers
```

## Tests

```bash
pytest
```

Frontend checks:

```bash
cd app
npm run build
```

## Privacy

The default configuration stores no chat data outside the browser tab. The local registry only contains node addresses, models, region, and basic metrics.

Each node sends its full state (identity, addresses, public IP, models, services, metrics, and coordinates) to the heartbeat endpoint on a timer. The default is the local web app on `localhost:3000`, so nothing leaves the machine unless you point `BEE2BEE_HEARTBEAT_URL` at a remote server.

## License

Non-commercial custom license. See [LICENSE](LICENSE).
