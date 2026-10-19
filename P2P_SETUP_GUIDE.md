# P2P Setup Guide

Bee2Bee nodes talk over WebSocket and discover each other in two ways:

1. **Bootstrap address** — one node acts as the meeting point (`BEE2BEE_BOOTSTRAP`, default `ws://127.0.0.1:4003`).
2. **Local registry** — `~/.bee2bee/registry.json` stores recently seen peers and expires them after `BEE2BEE_REGISTRY_TTL` seconds (default `120`).

There is no hosted registry.

## 1. Start the first node

```bash
bee2bee serve-ollama --model llama3 --host 0.0.0.0 --port 4003 --api-port 4002
```

This node prints an invite link such as:

```text
bee2bee://join?network=bee2bee&model=llama3&bootstrap=d3M6Ly8xOTIuMTY4LjEuMjA6NDAwMw&api_port=4002
```

## 2. Join from another machine

```bash
bee2bee serve-ollama --model llama3 \
  --bootstrap "bee2bee://join?network=bee2bee&model=llama3&bootstrap=...&api_port=4002"
```

Or register the peer without serving a model:

```bash
bee2bee register --node-url ws://192.168.1.20:4003
bee2bee register
```

## 3. Join from the web app

Open the invite in a browser:

```text
http://localhost:3000/?link=<url-encoded invite>&api_port=4002
```

The app registers the node with the local gateway, then offers onboarding for a local model.

## 4. Verify

```bash
bee2bee status
curl http://127.0.0.1:4002/health
curl http://127.0.0.1:4002/peers
```

## Architecture

| Component | Role |
| --- | --- |
| `p2p_runtime.P2PNode` | WebSocket server/client, peer handshake, request routing |
| `services.OllamaService` | Forwards generation to Ollama and streams tokens |
| `services.HFService` | Local Transformers inference |
| `registry.RegistryClient` | File-backed, TTL-based peer discovery |
| `api.py` | FastAPI endpoints for peers, providers, generation |
| `tui.py` | Rich terminal dashboard |
| `app/api/mesh.js` | Browser-facing bridge to one or more nodes |

## Troubleshooting

- **No peers**: check that both machines can reach TCP `4003`, and that the bootstrap address is `ws://`, not `http://`.
- **Stale peers**: the registry prunes entries older than the TTL; run `bee2bee register` again or restart the node.
- **NAT traversal**: `BEE2BEE_NAT=1` is the default. The node tries UPnP, NAT-PMP, PCP, then STUN and advertises its real public IP; it falls back to the LAN address when automatic mapping fails. Set `BEE2BEE_NAT=0` to stay LAN-only.
- **Heartbeat**: the default endpoint is `http://localhost:3000/api/heartbeat`, so nodes report to the local web app with no setup. Override `BEE2BEE_HEARTBEAT_URL` (plus optional `BEE2BEE_HEARTBEAT_TOKEN`) to use your own server. The latest response is stored in `~/.bee2bee/heartbeat.json` and drives the node table in the web app.
- **Peer is offline**: `/providers` lists only currently reachable peers.
