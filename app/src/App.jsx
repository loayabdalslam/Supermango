import { useCallback, useEffect, useRef, useState } from 'react';
import Dashboard from './components/Dashboard.jsx';
import Landing from './components/Landing.jsx';
import QuickRegister from './components/QuickRegister.jsx';
import {
  buildInviteUrl,
  linkApiHost,
  nodeApiPort,
  nodeHost,
  nodeModels,
  parseJoinLink,
} from './lib/links.js';

const EMPTY_STATS = {
  connected: false,
  poolSize: 0,
  activeNode: '',
  peers: [],
};

export default function App() {
  const [view, setView] = useState('landing');
  const [linkData, setLinkData] = useState(null);
  const [messages, setMessages] = useState([]);
  const [manualNode, setManualNode] = useState(
    () => localStorage.getItem('bee2bee_last_node') || '',
  );
  const [networkStats, setNetworkStats] = useState(EMPTY_STATS);
  const [selectedModel, setSelectedModel] = useState(
    () => localStorage.getItem('bee2bee_last_model') || 'default',
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [tokenConsumption, setTokenConsumption] = useState(0);
  const [genSettings, setGenSettings] = useState({ maxTokens: 2048, temperature: 0.4 });
  const handledLink = useRef('');

  useEffect(() => {
    if (manualNode) localStorage.setItem('bee2bee_last_node', manualNode);
    else localStorage.removeItem('bee2bee_last_node');
  }, [manualNode]);

  useEffect(() => {
    if (selectedModel) localStorage.setItem('bee2bee_last_model', selectedModel);
  }, [selectedModel]);

  const fetchStats = useCallback(async () => {
    const target = manualNode ? `?target=${encodeURIComponent(manualNode)}` : '';
    try {
      const response = await fetch(`/api/p2p/status${target}`);
      if (!response.ok) throw new Error(await response.text());
      const data = await response.json();
      const peers = data.peers || (data.mesh ? Object.values(data.mesh).flat() : []);
      setNetworkStats({
        connected: Boolean(data.connected || data.status === 'active'),
        poolSize: data.poolSize || peers.length,
        activeNode: data.activeNode || '',
        peers,
      });
    } catch {
      setNetworkStats((previous) => ({ ...previous, connected: false }));
    }
  }, [manualNode]);

  useEffect(() => {
    fetchStats();
    const timer = setInterval(fetchStats, 15000);
    return () => clearInterval(timer);
  }, [fetchStats]);

  const registerLink = useCallback(
    async (rawLink) => {
      const parsed = parseJoinLink(rawLink);
      if (!parsed) return null;

      const apiHost = linkApiHost(parsed);
      if (apiHost) setManualNode(apiHost);
      if (parsed.model) setSelectedModel(parsed.model);
      setLinkData({
        link: parsed.raw,
        model: parsed.model,
        apiHost,
        apiPort: parsed.apiPort,
      });

      try {
        await fetch('/api/p2p/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ link: parsed.raw }),
        });
        await fetchStats();
      } catch {
        // The node can still be started later; status polling will pick it up.
      }
      return parsed;
    },
    [fetchStats],
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const raw = params.get('link');
    if (!raw || handledLink.current === raw) return;
    handledLink.current = raw;
    registerLink(raw).then((parsed) => {
      if (parsed) setView('quick-register');
    });
  }, [registerLink]);

  useEffect(() => {
    if (!manualNode || handledLink.current === manualNode) return;
    if (!manualNode.includes('bee2bee://') && !manualNode.includes('link=')) return;
    handledLink.current = manualNode;
    registerLink(manualNode);
  }, [manualNode, registerLink]);

  useEffect(() => {
    if (view !== 'dashboard' || manualNode || !networkStats.connected) return;
    const available = networkStats.peers.find(
      (peer) => (peer.api_port || peer.metrics?.api_port) && peer.status !== 'offline',
    );
    if (!available) return;
    const host = nodeHost(available);
    const port = nodeApiPort(available);
    setManualNode(`http://${host}:${port}`);
    if (nodeModels(available)[0]) setSelectedModel(nodeModels(available)[0]);
  }, [view, manualNode, networkStats.connected, networkStats.peers]);

  const handleSelectNode = useCallback(
    async (node) => {
      if (!node) return;
      const invite = buildInviteUrl(node);
      const host = nodeHost(node);
      const port = nodeApiPort(node);

      try {
        const parsed = new URL(invite);
        window.history.pushState({ peer: node.peer_id }, '', parsed.search);
      } catch {
        // ignore history errors
      }

      setManualNode(`http://${host}:${port}`);
      if (nodeModels(node)[0]) setSelectedModel(nodeModels(node)[0]);
      setMessages([
        {
          role: 'ai',
          text: `### Local link established
Connected to **${node.region || 'Local'}**.

- **Peer**: \`${node.peer_id || node.id || 'anonymous'}\`
- **Path**: \`http://${host}:${port}\`
- **Invite**: [copy local invite](${invite})

Status: *synchronized*`,
          metadata: { mode: 'local-mesh', path: `http://${host}:${port}` },
        },
      ]);
      setView('dashboard');

      try {
        await fetch('/api/p2p/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ link: invite }),
        });
        await fetchStats();
      } catch {
        // status polling will retry
      }
    },
    [fetchStats],
  );

  const handleSend = useCallback(
    async (content) => {
      if (!content.trim() || isProcessing) return;

      const history = [...messages, { role: 'user', text: content }]
        .filter((message) => message.text && message.text.trim())
        .map((message) => `${message.role === 'user' ? 'user' : 'assistant'}: ${message.text.trim()}`)
        .join('\n');

      setMessages((previous) => [...previous, { role: 'user', text: content }]);
      setIsProcessing(true);

      const messageId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      setMessages((previous) => [
        ...previous,
        { role: 'ai', text: '', id: messageId, metadata: { streaming: true } },
      ]);

      const updateMessage = (text, metadata = {}) => {
        setMessages((previous) =>
          previous.map((message) =>
            message.id === messageId
              ? { ...message, text, metadata: { ...message.metadata, ...metadata } }
              : message,
          ),
        );
      };

      try {
        const response = await fetch('/api/p2p/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: history,
            model: selectedModel,
            stream: true,
            max_tokens: genSettings.maxTokens,
            temperature: genSettings.temperature,
            targetNode: manualNode || undefined,
          }),
        });

        if (!response.ok) {
          const error = await response.json().catch(() => ({}));
          throw new Error(error.error || `Request failed (${response.status})`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let text = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          text += decoder.decode(value, { stream: true });
          updateMessage(text, { mode: manualNode ? 'direct' : 'local-mesh' });
        }

        const tokens = Math.ceil(text.length / 4);
        setTokenConsumption((previous) => previous + Math.max(tokens, 1));
        updateMessage(text, {
          streaming: false,
          mode: manualNode ? 'direct' : 'local-mesh',
          latency: 0,
        });
      } catch (error) {
        updateMessage(`Connection error: ${error.message}`, { streaming: false });
      } finally {
        setIsProcessing(false);
      }
    },
    [messages, isProcessing, selectedModel, genSettings, manualNode],
  );

  if (view === 'landing') {
    return <Landing onStart={() => setView('dashboard')} networkStats={networkStats} />;
  }

  if (view === 'quick-register') {
    return (
      <QuickRegister
        linkData={linkData}
        networkStats={networkStats}
        fetchStats={fetchStats}
        onComplete={async () => {
          await fetchStats();
          setView('dashboard');
        }}
      />
    );
  }

  return (
    <Dashboard
      networkStats={networkStats}
      messages={messages}
      isProcessing={isProcessing}
      activeModel={selectedModel}
      tokenConsumption={tokenConsumption}
      manualNode={manualNode}
      setManualNode={setManualNode}
      onNavigate={setView}
      onSend={handleSend}
      genSettings={genSettings}
      setGenSettings={setGenSettings}
      onSelectNode={handleSelectNode}
    />
  );
}
