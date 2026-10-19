# Deployment

Bee2Bee is designed to run locally or on a machine you control. It is a long-running process with a persistent WebSocket server, so serverless platforms (Vercel, Netlify Functions, AWS Lambda) are not a fit.

## Local machine (recommended)

### Development

```bash
# Terminal 1: node + model
bee2bee serve-ollama --model gemma3:270m --api-port 4002

# Terminal 2: web app
cd app
npm install
npm run dev
```

Open <http://localhost:3000>.

### Production-style local build

```bash
cd app
npm run local
```

The Express gateway serves the built UI at <http://127.0.0.1:3001> and keeps the WebSocket bridge to the node.

### Windows helper

```powershell
./run.ps1 -Model gemma3:270m
```

### Linux/macOS helper

```bash
BEE2BEE_MODEL=gemma3:270m ./run.sh
```

## Docker

```bash
docker build -t bee2bee .
docker run --rm -p 4002:4002 -p 4003:4003 bee2bee
```

The image starts `python -m bee2bee api` (mesh + HTTP API). Add a model by overriding the command:

```bash
docker run --rm -p 4002:4002 -p 4003:4003 bee2bee \
  python -m bee2bee serve-ollama --model llama3 --host 0.0.0.0 --port 4003 --api-port 4002
```

For Ollama running on the host from inside Docker on Linux, add `--add-host=host.docker.internal:host-gateway` and pass `--endpoint http://host.docker.internal:11434`.

## Long-running hosts

Any host that supports a persistent process works:

- a home server or spare laptop,
- a VPS with Docker,
- Fly.io / Railway / Render using the Dockerfile (TCP and WebSocket support required).

Peers outside your LAN connect through the node's real public IP. `BEE2BEE_NAT=1` is the default, so the node attempts UPnP/NAT-PMP/PCP/STUN discovery before falling back to the LAN address. Use `BEE2BEE_PUBLIC_IP` to advertise a known address, or forward TCP `4003` manually. Set `BEE2BEE_HEARTBEAT_URL` if you want nodes to report status and map coordinates to your own heartbeat server.

## Ports

| Port | Purpose |
| --- | --- |
| `3000` | Vite dev server |
| `3001` | Express gateway (production UI + `/api`) |
| `4002` | Node HTTP API |
| `4003` | P2P WebSocket |

## Storage

- Registry: `~/.bee2bee/registry.json`
- Logs: `bee2bee.log` in the working directory
- Config: `~/.bee2bee/config.json`

No chat history is uploaded anywhere.
