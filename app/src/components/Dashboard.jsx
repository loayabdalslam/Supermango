import { useEffect, useRef, useState } from 'react';
import { Activity, Cpu, Layers, Send, Settings, Terminal, X, Zap } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import 'highlight.js/styles/github.css';
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
    <div className="flex h-screen bg-white text-black font-sans selection:bg-black selection:text-white">
      {showStats && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-white/10 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="bg-white border border-gray-100 shadow-2xl p-10 rounded-[40px] max-w-xl w-full space-y-8 relative">
            <button
              onClick={() => setShowStats(false)}
              className="absolute top-8 right-8 p-2 hover:bg-gray-100 rounded-full transition-colors"
              aria-label="Close metrics"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
            <div className="space-y-2">
              <h2 className="text-3xl font-light tracking-tight">Performance metrics</h2>
              <p className="text-xs text-gray-400 font-medium uppercase tracking-widest">
                Local node analysis
              </p>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Pool size</span>
                <p className="text-2xl font-semibold mt-1">{networkStats.poolSize} nodes</p>
              </div>
              <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Active model</span>
                <p className="text-2xl font-semibold mt-1">{activeModel}</p>
              </div>
              <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Session tokens</span>
                <p className="text-2xl font-semibold mt-1 text-emerald-500">
                  {tokenConsumption.toLocaleString()}
                </p>
              </div>
              <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Primary ingress</span>
                <p className="text-sm font-mono mt-1 break-all">
                  {networkStats.activeNode || 'local node'}
                </p>
              </div>
            </div>
            <div className="space-y-4 pt-4 border-t border-gray-100">
              <div className="space-y-2">
                <div className="flex justify-between items-center px-1">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    Output limit (tokens)
                  </span>
                  <span className="text-xs font-mono font-bold">{genSettings.maxTokens}</span>
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
                  className="w-full h-1 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-black"
                />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center px-1">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    Temperature
                  </span>
                  <span className="text-xs font-mono font-bold">{genSettings.temperature}</span>
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
                  className="w-full h-1 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-black"
                />
              </div>
            </div>

            <div className="pt-4 flex items-center gap-3 text-emerald-500">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-[10px] font-bold uppercase tracking-widest">
                Local mesh synchronized
              </span>
            </div>
          </div>
        </div>
      )}

      <aside className="w-16 md:w-64 bg-white border-r border-gray-100 flex flex-col items-center md:items-stretch p-4 transition-all duration-300">
        <div
          className="flex items-center gap-3 mb-12 mt-2 px-2 cursor-pointer"
          onClick={() => onNavigate('landing')}
        >
          <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center shrink-0">
            <Layers className="w-4 h-4 text-white" />
          </div>
          <h1 className="font-bold text-sm hidden md:block tracking-tight text-black">Bee2Bee</h1>
        </div>

        <div className="flex-1 space-y-2 overflow-y-auto no-scrollbar">
          <div className="p-3 md:p-4 bg-gray-50 rounded-2xl border border-gray-100">
            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 hidden md:block">
              Network pool
            </p>
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-xl font-light leading-none">{networkStats.poolSize}</span>
                <span className="text-[8px] font-bold text-gray-400 uppercase md:hidden mt-0.5">nodes</span>
                <span className="text-[9px] font-bold text-gray-400 uppercase hidden md:block">
                  Nodes online
                </span>
              </div>
              <Activity className="w-4 h-4 text-black hidden md:block opacity-20" />
            </div>
          </div>

          <button
            onClick={() => setShowStats(true)}
            className="w-full p-3 md:p-4 bg-white border border-gray-100 rounded-2xl hover:border-black transition-colors cursor-pointer group text-left"
          >
            <div className="flex items-center gap-3">
              <Zap className="w-4 h-4 text-gray-400 group-hover:text-black" />
              <span className="text-xs font-medium hidden md:block">Performance</span>
            </div>
          </button>

          {networkStats.peers.length > 0 && (
            <div className="mt-6 md:block hidden">
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-3 px-1">
                Discovered nodes
              </p>
              <div className="space-y-1">
                {networkStats.peers.slice(0, 6).map((peer) => (
                  <button
                    key={peer.peer_id || peer.id || peer.addr}
                    onClick={() => onSelectNode?.(peer)}
                    className="w-full text-left p-2 rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    <span className="block text-[10px] font-bold text-black truncate">
                      {peer.region || 'Local'} · {(peer.models || [])[0] || 'model'}
                    </span>
                    <span className="block text-[9px] font-mono text-gray-400 truncate">
                      {peer.addr || peer.id}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6 md:block hidden">
            <label
              htmlFor="manual-node"
              className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-3 px-1 block"
            >
              Direct ingress (optional)
            </label>
            <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-xl border border-transparent focus-within:border-black/10 transition-all">
              <Terminal className="w-3 h-3 text-gray-400" />
              <input
                id="manual-node"
                value={manualNode}
                onChange={(event) => setManualNode(event.target.value)}
                placeholder="IP:PORT or URL..."
                className="bg-transparent text-[10px] w-full outline-none font-medium text-black placeholder:text-gray-300"
              />
            </div>
          </div>
        </div>

        <div className="mt-auto p-2">
          <button
            onClick={() => onNavigate('landing')}
            className="w-full h-10 bg-gray-50 rounded-xl flex items-center justify-center cursor-pointer hover:bg-black group transition-all"
            aria-label="Back to landing page"
          >
            <Settings className="w-4 h-4 text-gray-400 group-hover:text-white" />
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col relative">
        <header className="h-[100px] border-b border-black/5 flex items-center justify-between px-10 bg-white/80 backdrop-blur-2xl sticky top-0 z-50">
          <div className="flex items-center gap-10">
            <div className="flex items-center gap-4">
              <div
                className={`w-2.5 h-2.5 rounded-full ${
                  networkStats.connected
                    ? 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.6)]'
                    : 'bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.6)]'
                } animate-pulse`}
              />
              <div>
                <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.2em] mb-0.5">
                  Network status
                </p>
                <p className="text-xs font-bold text-black uppercase tracking-tight">
                  {networkStats.connected ? 'Local mesh synchronized' : 'Local node offline'}
                </p>
              </div>
            </div>

            <div className="h-10 w-[1px] bg-gray-100 hidden md:block" />

            <div className="hidden md:block">
              <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.2em] mb-0.5">
                Active path
              </p>
              <div className="flex items-center gap-2">
                <Cpu className="w-3.5 h-3.5 text-black opacity-30" />
                <span className="text-[11px] font-bold text-black tracking-tight uppercase">
                  {activeModel}{' '}
                  <span className="text-gray-300 font-medium ml-2">
                    ID: {networkStats.activeNode?.substring(0, 18) || 'local'}...
                  </span>
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full border border-gray-100 flex items-center justify-center bg-gray-50/50">
              <Settings className="w-4 h-4 text-black opacity-30" />
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto pt-12 pb-32 no-scrollbar">
          <div className="max-w-3xl mx-auto px-6 space-y-12">
            {messages.length === 0 && (
              <div className="py-20 text-center space-y-4 animate-in fade-in duration-1000">
                <h2 className="text-4xl md:text-5xl font-light tracking-tight text-gray-200">
                  How can Bee2Bee help you?
                </h2>
                <p className="text-xs text-gray-300 font-medium uppercase tracking-[0.2em]">
                  Local inference · private · permissionless
                </p>
              </div>
            )}

            {messages.map((message, index) => (
              <div
                key={message.id || index}
                className={`flex flex-col ${
                  message.role === 'user' ? 'items-end' : 'items-start'
                } animate-in fade-in slide-in-from-bottom-2 duration-500`}
              >
                <div
                  className={`flex items-start gap-4 max-w-[85%] md:max-w-[80%] ${
                    message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                  }`}
                >
                  {message.role !== 'user' && (
                    <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center shrink-0 mt-1 shadow-lg shadow-black/10">
                      <Cpu className="w-4 h-4 text-white" />
                    </div>
                  )}
                  <div className={`w-full ${message.role === 'user' ? 'text-right' : 'text-left'}`}>
                    {message.role === 'user' ? (
                      <p className="text-[15px] leading-relaxed font-normal whitespace-pre-wrap bg-gray-100 py-3 px-5 rounded-[24px] rounded-tr-none text-black inline-block text-left">
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
                      <div className="flex items-center gap-3 mt-4 opacity-30">
                        <span className="text-[8px] font-bold uppercase tracking-widest">
                          {message.metadata.mode || 'local'}
                        </span>
                        <span className="text-[8px] font-bold uppercase tracking-widest">
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
              <div className="flex items-start gap-4 animate-pulse">
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                  <Cpu className="w-4 h-4 text-gray-300" />
                </div>
                <div className="space-y-2 py-3 w-full">
                  <div className="h-2 bg-gray-100 rounded-full w-3/4" />
                  <div className="h-2 bg-gray-100 rounded-full w-1/2" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10 bg-gradient-to-t from-white via-white/95 to-transparent pointer-events-none">
          <div className="max-w-3xl mx-auto pointer-events-auto">
            <div className="relative group">
              <div className="absolute inset-0 bg-black/5 rounded-[32px] blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none" />
              <div className="relative flex items-center gap-2 p-2 pl-6 bg-[#f0f2f5] border border-transparent focus-within:border-gray-200 focus-within:bg-white rounded-[32px] transition-all duration-300 shadow-sm">
                <input
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={(event) => event.key === 'Enter' && handleCommit()}
                  placeholder="Message Bee2Bee..."
                  className="flex-1 h-12 bg-transparent text-[15px] text-black placeholder:text-gray-400 outline-none"
                />
                <button
                  onClick={handleCommit}
                  disabled={!input.trim() || isProcessing}
                  className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                    input.trim() && !isProcessing
                      ? 'bg-black text-white hover:scale-105 active:scale-95'
                      : 'bg-transparent text-gray-300 cursor-not-allowed'
                  }`}
                  aria-label="Send message"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
              <p className="text-[9px] text-center text-gray-300 mt-4 font-bold uppercase tracking-widest">
                Bee2Bee may produce incorrect output. Verify critical results.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
