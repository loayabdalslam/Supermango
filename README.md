# Bee2Bee

**Bee2Bee** is a local-first, peer-to-peer mesh for running AI inference on machines you control. A node can serve Ollama or Hugging Face models, and clients can chat with it through either:

- a **local web app** (React + Express), or
- a **terminal dashboard (TUI)** built with Rich.

There is no hosted dashboard, no account system, and no remote registry. Nodes announce themselves over WebSocket, and a small local JSON file (`~/.bee2bee/registry.json`) helps peers rediscover each other after a restart.

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

Open <http://localhost:3000>. The Vite dev server proxies `/api` to the local Express gateway on port `3001`, which connects to the node at `ws://127.0.0.1:4003`.

For a production-style local build:

```bash
cd app
npm run local
```

This builds the UI and serves it from the Express gateway at <http://127.0.0.1:3001>.

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
BEE2BEE_PORT=4003
BEE2BEE_API_PORT=4002
BEE2BEE_BOOTSTRAP=ws://127.0.0.1:4003
BEE2BEE_LOCAL_REGISTRY=1
BEE2BEE_REGISTRY_TTL=120
BEE2BEE_NAT=0
```

`BEE2BEE_NAT=0` keeps startup local: no UPnP/STUN probing. Set it to `1` when you want the node to try to become reachable from outside your LAN.

## Project layout

```text
bee2bee/            Python package: P2P runtime, API, services, TUI
app/                Local web app (React + Vite + Express gateway)
  api/              Mesh bridge and HTTP gateway
  src/              UI components and invite-link helpers
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

The default configuration stores no chat data outside the browser tab and no telemetry is sent anywhere. The local registry only contains node addresses, models, region, and basic metrics.

## License

Non-commercial custom license. See [LICENSE](LICENSE).
