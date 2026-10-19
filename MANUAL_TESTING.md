# Manual Testing

Prerequisites: `pip install -e .` and `cd app && npm install`.

## 1. Mesh only

```bash
bee2bee api --host 127.0.0.1 --port 4002 --p2p-port 4003
```

Check:

```bash
curl http://127.0.0.1:4002/health
curl http://127.0.0.1:4002/
```

## 2. Serve a model

With Ollama:

```bash
ollama pull gemma3:270m
bee2bee serve-ollama --model gemma3:270m --host 127.0.0.1 --port 4003 --api-port 4002
```

With Hugging Face:

```bash
pip install -e ".[hf,torch]"
bee2bee serve-hf --model distilgpt2 --host 127.0.0.1 --port 4003 --api-port 4002
```

Verify the provider is visible:

```bash
curl http://127.0.0.1:4002/providers
```

## 3. Generate

```bash
curl -N -X POST http://127.0.0.1:4002/generate \
  -H "Content-Type: application/json" \
  -d '{"model":"gemma3:270m","prompt":"Hello","stream":true}'
```

Expect newline-delimited JSON chunks ending with `{"done": true}`.

## 4. Terminal dashboard

```bash
bee2bee tui --model gemma3:270m --backend ollama
```

- Press `c`, type a prompt, Enter.
- Press `r` to refresh the registry.
- Press `q` to quit.

## 5. Web app

```bash
cd app
npm run dev
```

1. Open <http://localhost:3000>.
2. Enter a node address (`ws://127.0.0.1:4003`) or an invite link.
3. Open the dashboard and send a message; tokens should stream.
4. Check `GET http://127.0.0.1:3001/api/health` and `GET /api/p2p/status`.

## 6. Invite link

```bash
bee2bee register --node-url ws://127.0.0.1:4003
bee2bee status
```

The invite link printed by a serving node should parse in the browser and register the peer.

## 7. Registry expiry

Set a short TTL:

```bash
BEE2BEE_REGISTRY_TTL=5 bee2bee register --node-url ws://127.0.0.1:4003
sleep 6
bee2bee status
```

The entry should be pruned.

## 8. Regression suite

```bash
pytest
cd app && npm run build
```
