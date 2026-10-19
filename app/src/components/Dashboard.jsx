import { useEffect, useRef, useState } from 'react';
import {
  Activity,
  ArrowLeft,
  Cpu,
  Layers,
  Send,
  Settings2,
  Sparkles,
  Table2,
  Terminal,
  X,
  Zap,
} from 'lucide-react';
import MeshTable from './MeshTable';
import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import 'highlight.js/styles/github-dark.css';
import 'katex/dist/katex.min.css';

export default function Dashboard({
  networkStats,
  messages,
  isProcessing,
  activeModel,
  manualNode,
  setManualNode,
  onNavigate,
  onSend,
  tokenConsumption,
  genSettings,
  setGenSettings,
  onSelectNode,
}) {
  const [input, setInput] = useState('');
  const [showStats, setShowStats] = useState(false);
  const [showNodes, setShowNodes] = useState(true);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleCommit = () => {
    if (!input.trim() || isProcessing) return;
    onSend(input);
    setInput('');
  };

  return (
    <div className="flex h-screen bg-ink text-white">
      {showStats && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-6 backdrop-blur-xl animate-fade-scale">
          <div className="panel w-full max-w-xl space-y-8 p-8 md:p-10">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <h2 className="text-2xl font-semibold tracking-tight">Performance metrics</h2>
                <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-faint">
                  Mesh analysis
                </p>
              </div>
              <button
                onClick={() => setShowStats(false)}
                className="grid h-9 w-9 place-items-center rounded-full border border-line text-muted transition-colors hover:text-white"
                aria-label="Close metrics"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Pool size', value: `${networkStats.poolSize} nodes` },
                { label: 'Active model', value: activeModel },
                { label: 'Session tokens', value: tokenConsumption.toLocaleString(), accent: true },
                { label: 'Primary ingress', value: networkStats.activeNode || 'mesh node', mono: true },
              ].map((item) => (
                <div key={item.label} className="rounded-2xl border border-line bg-white/[0.02] p-5">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-faint">
                    {item.label}
                  </span>
                  <p
                    className={`mt-1.5 text-lg font-semibold ${
                      item.accent ? 'text-emerald-400' : ''
                    } ${item.mono ? 'break-all font-mono text-[12px] text-muted' : ''}`}
                  >
                    {item.value}
                  </p>
                </div>
              ))}
            </div>

            <div className="space-y-5 border-t border-line pt-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-faint">
                    Output limit (tokens)
                  </span>
                  <span className="font-mono text-xs font-semibold text-white">{genSettings.maxTokens}</span>
                </div>
                <input
                  type="range"
                  min="128"
                  max="4096"
                  step="128"
                  value={genSettings.maxTokens}
                  onChange={(event) =>
                    setGenSettings({ ...genSettings, maxTokens: parseInt(event.target.value, 10) })
                  }
                  className="h-1 w-full cursor-pointer appearance-none rounded-lg bg-line accent-accent"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-faint">
                    Temperature
                  </span>
                  <span className="font-mono text-xs font-semibold text-white">{genSettings.temperature}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.1"
                  value={genSettings.temperature}
                  onChange={(event) =>
                    setGenSettings({ ...genSettings, temperature: parseFloat(event.target.value) })
                  }
                  className="h-1 w-full cursor-pointer appearance-none rounded-lg bg-line accent-accent"
                />
              </div>
            </div>

            <div className="flex items-center gap-2.5 text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse-dot" />
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em]">
                Global mesh synchronized
              </span>
            </div>
          </div>
        </div>
      )}

      <aside className="flex w-16 flex-col border-r border-line bg-surface/40 p-3 transition-all duration-300 md:w-64 md:p-4">
        <button
          className="mb-8 mt-1 flex items-center gap-3 px-1 md:px-2"
          onClick={() => onNavigate('landing')}
        >
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[10px] bg-accent text-ink">
            <Layers className="h-4 w-4" />
          </span>
          <span className="hidden text-sm font-semibold tracking-tight text-white md:block">Bee2Bee</span>
        </button>

        <div className="no-scrollbar flex-1 space-y-2 overflow-y-auto">
          <div className="rounded-2xl border border-line bg-white/[0.02] p-3 md:p-4">
            <p className="mb-2 hidden text-[10px] font-semibold uppercase tracking-[0.16em] text-faint md:block">
              Network pool
            </p>
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-xl font-semibold leading-none text-white">{networkStats.poolSize}</span>
                <span className="mt-0.5 text-[9px] font-semibold uppercase text-faint md:hidden">nodes</span>
                <span className="mt-1 hidden text-[10px] font-semibold uppercase tracking-wide text-faint md:block">
                  Nodes online
                </span>
              </div>
              <Activity className="hidden h-4 w-4 text-emerald-400 md:block" />
            </div>
          </div>

          <button
            onClick={() => setShowStats(true)}
            className="group flex w-full items-center gap-3 rounded-2xl border border-line bg-white/[0.02] p-3 text-left transition-colors hover:border-white/20 md:p-4"
          >
            <Zap className="h-4 w-4 text-faint group-hover:text-accent" />
            <span className="hidden text-xs font-medium text-muted group-hover:text-white md:block">
              Performance
            </span>
          </button>

          {networkStats.peers.length > 0 && (
            <div className="mt-6 hidden md:block">
              <p className="mb-3 px-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-faint">
                Discovered nodes
              </p>
              <div className="space-y-1">
                {networkStats.peers.slice(0, 6).map((peer) => (
                  <button
                    key={peer.peer_id || peer.id || peer.addr}
                    onClick={() => onSelectNode?.(peer)}
                    className="w-full rounded-xl p-2 text-left transition-colors hover:bg-white/[0.04]"
                  >
                    <span className="block truncate text-[11px] font-semibold text-white">
                      {peer.region || 'Auto'} · {(peer.models || [])[0] || 'node'}
                    </span>
                    <span className="block truncate font-mono text-[10px] text-faint">
                      {peer.addr || peer.id}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6 hidden md:block">
            <label
              htmlFor="manual-node"
              className="mb-3 block px-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-faint"
            >
              Direct ingress (optional)
            </label>
            <div className="flex items-center gap-2 rounded-xl border border-line bg-white/[0.02] p-2.5 transition-colors focus-within:border-accent/40">
              <Terminal className="h-3.5 w-3.5 text-faint" />
              <input
                id="manual-node"
                value={manualNode}
                onChange={(event) => setManualNode(event.target.value)}
                placeholder="IP:PORT or URL..."
                className="w-full bg-transparent text-[11px] font-medium text-white outline-none placeholder:text-faint"
              />
            </div>
          </div>
        </div>

        <button
          onClick={() => onNavigate('landing')}
          className="mt-auto flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-line bg-white/[0.02] text-faint transition-colors hover:text-white"
          aria-label="Back to landing page"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden text-[11px] font-medium md:block">Back</span>
        </button>
      </aside>

      <main className="relative flex flex-1 flex-col">
        <header className="sticky top-0 z-50 flex h-[88px] items-center justify-between border-b border-line bg-ink/70 px-6 backdrop-blur-2xl md:px-10">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-3.5">
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  networkStats.connected
                    ? 'bg-emerald-400 shadow-[0_0_14px_rgba(52,211,153,0.7)]'
                    : 'bg-red-500 shadow-[0_0_14px_rgba(239,68,68,0.7)]'
                } animate-pulse-dot`}
              />
              <div>
                <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-faint">
                  Network status
                </p>
                <p className="text-xs font-semibold uppercase tracking-tight text-white">
                  {networkStats.connected ? 'Mesh synchronized' : 'Mesh offline'}
                </p>
              </div>
            </div>

            <div className="hidden h-9 w-px bg-line md:block" />

            <div className="hidden md:block">
              <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-faint">
                Active path
              </p>
              <div className="flex items-center gap-2">
                <Cpu className="h-3.5 w-3.5 text-accent" />
                <span className="text-[11px] font-semibold uppercase tracking-tight text-white">
                  {activeModel}
                  <span className="ml-2 font-mono font-normal normal-case text-faint">
                    {networkStats.activeNode?.substring(0, 18) || 'mesh'}
                  </span>
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowNodes((visible) => !visible)}
              className={`flex h-10 items-center gap-2 rounded-full border px-4 transition-colors ${
                showNodes
                  ? 'border-accent bg-accent text-ink'
                  : 'border-line bg-white/[0.02] text-muted hover:border-white/20 hover:text-white'
              }`}
              aria-label={showNodes ? 'Hide mesh nodes' : 'Show mesh nodes'}
            >
              <Table2 className="h-4 w-4 opacity-80" />
              <span className="hidden text-[10px] font-semibold uppercase tracking-[0.16em] md:block">
                {showNodes ? 'Hide nodes' : 'Mesh nodes'}
              </span>
            </button>
            <button
              onClick={() => setShowStats(true)}
              className="grid h-10 w-10 place-items-center rounded-full border border-line bg-white/[0.02] text-faint transition-colors hover:text-white"
              aria-label="Open settings"
            >
              <Settings2 className="h-4 w-4" />
            </button>
          </div>
        </header>

        {showNodes && (
          <div className="px-4 pt-4 md:px-8">
            <MeshTable
              peers={networkStats.peers}
              activeNode={networkStats.activeNode}
              onSelectNode={onSelectNode}
              heartbeatUpdatedAt={networkStats.heartbeatUpdatedAt}
              heartbeatSource={networkStats.heartbeatSource}
              className="h-[240px] md:h-[300px]"
            />
          </div>
        )}

        <div className={`no-scrollbar flex-1 overflow-y-auto pb-40 ${showNodes ? 'pt-8' : 'pt-12'}`}>
          <div className="mx-auto max-w-3xl space-y-10 px-6">
            {messages.length === 0 && (
              <div className="space-y-4 py-24 text-center animate-fade-scale">
                <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-accent/10 text-accent">
                  <Sparkles className="h-6 w-6" />
                </span>
                <h2 className="text-3xl font-semibold tracking-tight text-white md:text-4xl">
                  How can the mesh help you?
                </h2>
                <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-faint">
                  Private inference · permissionless · peer-to-peer
                </p>
              </div>
            )}

            {messages.map((message, index) => (
              <div
                key={message.id || index}
                className={`flex flex-col ${
                  message.role === 'user' ? 'items-end' : 'items-start'
                } animate-chat-entry`}
              >
                <div
                  className={`flex max-w-[88%] items-start gap-4 md:max-w-[82%] ${
                    message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                  }`}
                >
                  {message.role !== 'user' && (
                    <div className="mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-accent text-ink">
                      <Cpu className="h-4 w-4" />
                    </div>
                  )}
                  <div className={`w-full ${message.role === 'user' ? 'text-right' : 'text-left'}`}>
                    {message.role === 'user' ? (
                      <p className="inline-block whitespace-pre-wrap rounded-[22px] rounded-tr-md border border-line bg-white/[0.05] px-5 py-3 text-left text-[15px] leading-relaxed text-white">
                        {message.text}
                      </p>
                    ) : (
                      <div className="prose-minimal w-full overflow-hidden">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm, remarkMath]}
                          rehypePlugins={[rehypeHighlight, rehypeKatex]}
                        >
                          {message.text}
                        </ReactMarkdown>
                      </div>
                    )}
                    {message.metadata && !message.metadata.streaming && (
                      <div className="mt-3 flex items-center gap-3 text-faint opacity-80">
                        <span className="text-[10px] font-semibold uppercase tracking-[0.16em]">
                          {message.metadata.mode || 'mesh'}
                        </span>
                        <span className="text-[10px] font-semibold uppercase tracking-[0.16em]">
                          {message.metadata.latency
                            ? `${message.metadata.latency}ms`
                            : message.metadata.path || ''}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {isProcessing && messages[messages.length - 1]?.text === '' && (
              <div className="flex items-start gap-4">
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-line bg-white/[0.02]">
                  <Cpu className="h-4 w-4 text-faint" />
                </div>
                <div className="w-full space-y-2.5 py-3">
                  <div className="h-2 w-3/4 animate-pulse rounded-full bg-white/[0.06]" />
                  <div className="h-2 w-1/2 animate-pulse rounded-full bg-white/[0.06]" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink via-ink/95 to-transparent p-6 md:p-10">
          <div className="pointer-events-auto mx-auto max-w-3xl">
            <div className="relative flex items-center gap-2 rounded-[26px] border border-line bg-surface/80 p-2 pl-5 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.9)] backdrop-blur-xl transition-colors focus-within:border-accent/40">
              <input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => event.key === 'Enter' && handleCommit()}
                placeholder="Message Bee2Bee..."
                className="h-12 flex-1 bg-transparent text-[15px] text-white outline-none placeholder:text-faint"
              />
              <button
                onClick={handleCommit}
                disabled={!input.trim() || isProcessing}
                className={`grid h-12 w-12 place-items-center rounded-full transition-all ${
                  input.trim() && !isProcessing
                    ? 'bg-accent text-ink hover:scale-105 active:scale-95'
                    : 'cursor-not-allowed bg-white/[0.04] text-faint'
                }`}
                aria-label="Send message"
              >
                <Send className="h-5 w-5" />
              </button>
            </div>
            <p className="mt-3 text-center text-[10px] font-medium uppercase tracking-[0.16em] text-faint">
              Bee2Bee may produce incorrect output. Verify critical results.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
