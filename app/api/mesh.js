import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';
import WebSocket from 'ws';

const HOME = process.env.BEE2BEE_HOME || path.join(os.homedir(), '.bee2bee');
const REGISTRY_FILE = path.join(HOME, 'registry.json');
const REGISTRY_TTL_MS = Number(process.env.BEE2BEE_REGISTRY_TTL || 120) * 1000;

function readRegistry() {
  try {
    const raw = JSON.parse(fs.readFileSync(REGISTRY_FILE, 'utf8'));
    if (!raw || typeof raw !== 'object') return [];
    const now = Date.now();
    return Object.values(raw).filter((entry) => {
      const seen = Number(entry?.last_seen_ts) * 1000;
      return entry?.addr && (!seen || now - seen <= REGISTRY_TTL_MS);
    });
  } catch {
    return [];
  }
}

function decodeBootstrap(value) {
  if (!value) return null;
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
  try {
    return Buffer.from(padded, 'base64').toString('utf8');
  } catch {
    return null;
  }
}

function normalizeAddress(address) {
  if (!address) return null;
  if (address.startsWith('http://')) return address.replace('http://', 'ws://');
  if (address.startsWith('https://')) return address.replace('https://', 'wss://');
  if (address.startsWith('ws://') || address.startsWith('wss://')) return address;
  return `ws://${address}`;
}

export class MeshBridge {
  constructor(seedNodes = []) {
    this.nodes = new Set(seedNodes.map(normalizeAddress).filter(Boolean));
    this.activeWs = null;
    this.activeUrl = null;
    this.pendingRequests = new Map();
    this.peerMetadata = new Map();
    this.connecting = null;
    this.stats = {
      startedAt: Date.now(),
      activeNode: null,
      requests: 0,
      connectedAt: null,
    };

    this.connect();
    setInterval(() => {
      if (!this.activeWs || this.activeWs.readyState !== WebSocket.OPEN) {
        this.connect();
      }
    }, 15000);
  }

  get connected() {
    return !!this.activeWs && this.activeWs.readyState === WebSocket.OPEN;
  }

  _seedAddresses() {
    const registered = readRegistry()
      .map((entry) => normalizeAddress(entry.addr))
      .filter(Boolean);
    return [...new Set([...registered, ...Array.from(this.nodes)])];
  }

  syncLocalRegistry() {
    for (const entry of readRegistry()) {
      const address = normalizeAddress(entry.addr);
      if (!address) continue;
      this.nodes.add(address);
      this._updatePeerMetadata(address, {
        peer_id: entry.peer_id,
        region: entry.region,
        models: entry.models,
        metrics: entry.metrics,
      });
    }
  }

  async connect() {
    if (this.connected) return;
    if (this.connecting) return this.connecting;

    this.connecting = (async () => {
      this.syncLocalRegistry();
      const candidates = this._seedAddresses();
      if (candidates.length === 0) {
        this.stats.activeNode = null;
        return;
      }

      for (const nodeUrl of candidates) {
        try {
          const socket = new WebSocket(nodeUrl, { handshakeTimeout: 4000 });
          await new Promise((resolve, reject) => {
            const timer = setTimeout(() => reject(new Error('Connection timeout')), 4500);
            socket.once('open', () => {
              clearTimeout(timer);
              resolve();
            });
            socket.once('error', (error) => {
              clearTimeout(timer);
              reject(error);
            });
          });

          this.activeWs = socket;
          this.activeUrl = nodeUrl;
          this.stats.activeNode = nodeUrl;
          this.stats.connectedAt = Date.now();
          this._setupHandlers(socket);

          const address = nodeUrl.replace('ws://', '').replace('wss://', '');
          this._updatePeerMetadata(nodeUrl, {
            peer_id: address,
            region: 'Local',
            metrics: { status: 'active' },
          });
          return;
        } catch (error) {
          this.nodes.delete(nodeUrl);
        }
      }

      this.activeWs = null;
      this.activeUrl = null;
      this.stats.activeNode = null;
    })();

    try {
      await this.connecting;
    } finally {
      this.connecting = null;
    }
  }

  async connectToPeer(address) {
    const normalized = normalizeAddress(address);
    if (!normalized) return false;
    this.nodes.add(normalized);
    if (this.activeWs) {
      try {
        this.activeWs.close();
      } catch {
        /* ignore */
      }
    }
    this.activeWs = null;
    await this.connect();
    return this.connected;
  }

  _setupHandlers(socket) {
    socket.on('message', (buffer) => {
      let message;
      try {
        message = JSON.parse(buffer.toString());
      } catch {
        return;
      }

      const requestId = message.task_id || message.rid;
      const pending = this.pendingRequests.get(requestId);

      if (message.type === 'hello' || message.type === 'handshake') {
        this._updatePeerMetadata(this.activeUrl, message);
        return;
      }

      if (message.type === 'gen_chunk' || message.type === 'chunk') {
        if (pending) {
          const text = message.text || '';
          pending.chunks.push(text);
          if (pending.onChunk) pending.onChunk(text);
        }
        return;
      }

      if (message.type === 'gen_success' || message.type === 'gen_response' || message.type === 'gen_result') {
        if (!pending) return;
        this.pendingRequests.delete(requestId);
        if (message.error) {
          pending.reject(new Error(message.error));
        } else {
          pending.resolve({
            text: message.text || pending.chunks.join(''),
            rid: requestId,
            metadata: {
              backend: message.backend,
              latency: Date.now() - pending.startedAt,
            },
          });
        }
        return;
      }

      if (message.type === 'gen_error') {
        if (!pending) return;
        this.pendingRequests.delete(requestId);
        pending.reject(new Error(message.error || 'Node generation failed'));
        return;
      }

      if (message.type === 'ping' && this.activeWs?.readyState === WebSocket.OPEN) {
        this.activeWs.send(JSON.stringify({ type: 'pong', ts: message.ts }));
      }
    });

    socket.on('close', () => {
      if (this.activeWs === socket) {
        this.activeWs = null;
        this.activeUrl = null;
        this.stats.activeNode = null;
      }
      for (const [id, pending] of this.pendingRequests) {
        pending.reject(new Error('Mesh connection closed'));
        this.pendingRequests.delete(id);
      }
      setTimeout(() => this.connect(), 3000);
    });
  }

  _updatePeerMetadata(address, message) {
    if (!address) return;
    const existing = this.peerMetadata.get(address) || {};
    const services = message.services || {};
    const serviceModels = Object.values(services).flatMap((service) => service.models || []);
    this.peerMetadata.set(address, {
      ...existing,
      id: message.peer_id || existing.id,
      addr: address,
      region: message.region || existing.region || 'Local',
      metrics: message.metrics || existing.metrics || {},
      models: message.models || (serviceModels.length ? serviceModels : existing.models) || [],
      backend: message.backend || message.metrics?.backend || existing.backend,
      api_port: message.api_port || message.metrics?.api_port || existing.api_port,
      api_host: message.api_host || message.public_ip || existing.api_host,
      public_ip: message.public_ip || existing.public_ip,
      status: 'active',
      last_seen: Date.now(),
    });
  }

  getRegionalMesh() {
    const mesh = {};
    for (const meta of this.peerMetadata.values()) {
      const region = meta.region || 'Local';
      (mesh[region] ||= []).push({
        ...meta,
        latency: Number.isFinite(meta.metrics?.latency) ? meta.metrics.latency : 0,
      });
    }
    return mesh;
  }

  async request(payload, onChunk, targetNode = null) {
    this.stats.requests += 1;

    if (targetNode) {
      const direct = await this._requestDirect(targetNode, payload, onChunk);
      if (direct) return direct;
    }

    if (!this.connected) {
      await this.connect();
    }
    if (!this.connected) {
      throw new Error('No local Bee2Bee node is reachable. Start `bee2bee tui` or `bee2bee api`.');
    }

    const requestId = `req-${crypto.randomBytes(4).toString('hex')}`;
    return new Promise((resolve, reject) => {
      this.pendingRequests.set(requestId, {
        resolve,
        reject,
        onChunk,
        chunks: [],
        startedAt: Date.now(),
      });

      this.activeWs.send(
        JSON.stringify({
          type: 'gen_request',
          rid: requestId,
          task_id: requestId,
          model: payload.model,
          prompt: payload.prompt,
          max_tokens: payload.max_tokens,
          temperature: payload.temperature,
          stream: true,
        }),
      );

      setTimeout(() => {
        const pending = this.pendingRequests.get(requestId);
        if (!pending) return;
        this.pendingRequests.delete(requestId);
        if (pending.chunks.length > 0) {
          pending.resolve({ text: pending.chunks.join(''), rid: requestId });
        } else {
          pending.reject(new Error('Generation timed out'));
        }
      }, 120000);
    });
  }

  async _requestDirect(targetNode, payload, onChunk) {
    const base = targetNode.startsWith('http') ? targetNode : `http://${targetNode}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);

    try {
      const response = await fetch(`${base}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: payload.prompt,
          model: payload.model,
          max_new_tokens: payload.max_tokens,
          temperature: payload.temperature,
          stream: Boolean(onChunk),
        }),
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (!response.ok || !response.body) return null;

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let text = '';

      const emit = (line) => {
        if (!line) return;
        let value = line;
        try {
          const parsed = JSON.parse(line);
          if (parsed?.status === 'error') {
            throw new Error(parsed.message || 'Generation failed');
          }
          if (parsed?.done) return;
          value = parsed?.text ?? parsed?.response ?? '';
        } catch (error) {
          if (error instanceof SyntaxError) {
            value = line;
          } else {
            throw error;
          }
        }
        if (!value) return;
        text += value;
        if (onChunk) onChunk(value);
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) emit(line);
      }
      emit(buffer.replace(/\n+$/, ''));
      return { text, metadata: { mode: 'direct-http', target: base } };
    } catch {
      clearTimeout(timer);
      return null;
    }
  }

  getStats() {
    return {
      connected: this.connected,
      activeNode: this.activeUrl,
      poolSize: this.peerMetadata.size,
      peers: Array.from(this.peerMetadata.values()),
      mesh: this.getRegionalMesh(),
      uptime: Date.now() - this.stats.startedAt,
      requests: this.stats.requests,
    };
  }

  async registerJoinLink(input) {
    try {
      let link = String(input || '').trim();
      if (!link) throw new Error('Missing join link');

      if (link.startsWith('http://') || link.startsWith('https://')) {
        const outer = new URL(link);
        link = outer.searchParams.get('link') || link;
      }
      link = decodeURIComponent(link);

      let bootstrap = null;
      let apiPort = null;

      if (link.startsWith('bee2bee://')) {
        const parsed = new URL(link);
        bootstrap = decodeBootstrap(parsed.searchParams.get('bootstrap'));
        apiPort = parsed.searchParams.get('api_port');
      } else {
        bootstrap = link;
      }

      const address = normalizeAddress(bootstrap);
      if (!address) throw new Error('Could not parse a bootstrap address from the link');

      this.nodes.add(address);
      if (apiPort) {
        this._updatePeerMetadata(address, { api_port: Number(apiPort) });
      }
      await this.connectToPeer(address);
      return { success: true, node: address, connected: this.connected };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

const seeds = process.env.BEE2BEE_SEEDS
  ? process.env.BEE2BEE_SEEDS.split(',').map((item) => item.trim()).filter(Boolean)
  : ['ws://127.0.0.1:4003'];

export const bridge = new MeshBridge(seeds);
