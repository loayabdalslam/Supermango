import express from 'express';
import cors from 'cors';
import { bridge } from './mesh.js';

const app = express();
app.use(cors({ origin: true }));
app.use(express.json({ limit: '2mb' }));

const session = {
  startedAt: Date.now(),
  chats: 0,
  tokens: 0,
};

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    mode: 'local',
    connected: bridge.connected,
    activeNode: bridge.activeWs ? bridge.activeUrl : null,
    uptime: Date.now() - session.startedAt,
  });
});

app.post('/api/p2p/register', async (req, res) => {
  const { link } = req.body || {};
  if (!link) return res.status(400).json({ error: 'Missing join link' });

  try {
    const result = await bridge.registerJoinLink(link);
    res.json({ ...result, mode: 'local' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/p2p/generate', async (req, res) => {
  const { task, prompt, model, targetNode, max_tokens, temperature } = req.body || {};
  const finalPrompt = task?.prompt || prompt;
  const finalModel = task?.model || model || 'default';
  const nodeOverride = task?.targetNode || targetNode;

  if (!finalPrompt) return res.status(400).json({ error: 'Prompt is required' });

  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('X-Accel-Buffering', 'no');

  let fullContent = '';
  let receivedChunks = false;

  try {
    const result = await bridge.request(
      {
        prompt: finalPrompt,
        model: finalModel,
        stream: true,
        max_tokens: max_tokens ?? req.body?.maxTokens,
        temperature,
      },
      (chunk) => {
        receivedChunks = true;
        fullContent += chunk;
        res.write(chunk);
      },
      nodeOverride,
    );

    if (!receivedChunks && result?.text) {
      fullContent = result.text;
      res.write(result.text);
    }

    const tokens = Math.ceil(fullContent.length / 4);
    if (tokens > 0) {
      session.tokens += tokens;
      session.chats += 1;
    }
    res.end();
  } catch (error) {
    console.error('[generate]', error.message);
    if (!res.headersSent) {
      res.status(504).json({ error: error.message });
    } else {
      res.write(`\n\n[error] ${error.message}`);
      res.end();
    }
  }
});

async function probeTarget(target) {
  if (!target) return null;
  const base = target.startsWith('http') ? target : `http://${target}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 1500);
  try {
    const response = await fetch(`${base}/`, { signal: controller.signal });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

const getStatus = async (req, res) => {
  const target = req.query.target;
  const targetStatus = await probeTarget(target);

  bridge.syncLocalRegistry();
  const stats = bridge.getStats();
  const mesh = stats.mesh;

  if (targetStatus && target) {
    const region = targetStatus.region || 'Local';
    mesh[region] ||= [];
    const exists = mesh[region].some(
      (node) => node.addr === target || node.id === targetStatus.peer_id,
    );
    if (!exists) {
      mesh[region].push({
        ...targetStatus,
        addr: target,
        status: 'active',
        tag: 'direct',
      });
    }
  }

  res.json({
    ...stats,
    mesh,
    mode: 'local',
    status: stats.connected || targetStatus ? 'active' : 'idle',
  });
};

app.post('/api/heartbeat', (req, res) => {
  const expected = process.env.BEE2BEE_HEARTBEAT_TOKEN;
  if (expected && req.headers.authorization !== `Bearer ${expected}`) {
    return res.status(401).json({ error: 'Invalid heartbeat token' });
  }
  const nodes = bridge.ingestHeartbeat(req.body);
  res.json({ updated_at: Date.now(), nodes });
});

app.get('/api/heartbeat', (req, res) => {
  res.json({ updated_at: bridge.heartbeatUpdatedAt, nodes: bridge.listHeartbeats() });
});

app.get('/api/p2p/status', getStatus);

app.post('/api/p2p/status', async (req, res) => {
  const { action, peer } = req.body || {};
  if (action === 'discover_peer' && peer?.addr) {
    await bridge.connectToPeer(peer.addr);
    return res.json({ status: 'discovery_initiated' });
  }
  return getStatus(req, res);
});

app.get('/api/p2p/metrics', (req, res) => {
  res.json({
    ...session,
    uptime: Date.now() - session.startedAt,
  });
});

export default app;
