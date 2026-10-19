import { Layers, Shield, Terminal, Users, ArrowRight } from 'lucide-react';
import TerminalPreview from './TerminalPreview.jsx';

const FEATURES = [
  {
    icon: Shield,
    title: 'Local first',
    body: 'The web app talks to a Bee2Bee node on your machine. No account, no remote registry, no telemetry service.',
  },
  {
    icon: Users,
    title: 'Peer to peer',
    body: 'Peers discover each other over WebSocket. The local registry is a small JSON file in ~/.bee2bee.',
  },
  {
    icon: Terminal,
    title: 'Terminal dashboard',
    body: 'Prefer the terminal? Run bee2bee tui for a live dashboard with peers, models, metrics, and chat.',
  },
];

export default function Landing({ onStart, networkStats }) {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 relative overflow-x-hidden pt-32 pb-32">
      <div className="mb-12 flex items-center gap-2 py-2 px-4 rounded-full border border-gray-100 bg-white shadow-sm ring-1 ring-black/5 animate-float">
        <Layers className="w-3.5 h-3.5 text-black" />
        <span className="text-[11px] font-bold tracking-tight text-black">Bee2Bee · local mesh</span>
      </div>

      <div className="text-center space-y-10 max-w-4xl mx-auto z-10">
        <h1 className="google-sans-title">
          Local
          <br />
          Neural Mesh
        </h1>
        <p className="sub-title mx-auto">
          Run inference on your own machine and share it across peers on your network.
          <br />
          Everything stays on localhost unless you invite another node.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-6 animate-in fade-in slide-in-from-bottom-10 duration-700">
          <button
            onClick={onStart}
            className="pill-btn bg-black text-white hover:scale-105 active:scale-95 shadow-xl text-lg py-5 px-8 flex items-center gap-2"
          >
            Open dashboard
            <ArrowRight className="w-5 h-5" />
          </button>
          <a
            href="https://github.com/Chatit-cloud/BEE2BEE"
            target="_blank"
            rel="noreferrer"
            className="pill-btn bg-white text-black border border-gray-200 hover:bg-gray-50 hover:scale-105 active:scale-95 shadow-sm text-lg py-5 px-8 flex items-center gap-2"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" aria-hidden="true">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
            GitHub
          </a>
        </div>

        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-gray-300">
          {networkStats?.connected ? 'Node connected' : 'Waiting for a local node'}
        </p>
      </div>

      <div className="mt-24 max-w-6xl w-full grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10 text-left">
        {FEATURES.map(({ icon: Icon, title, body }) => (
          <div
            key={title}
            className="bg-white rounded-[32px] p-8 border border-gray-100 shadow-xl shadow-black/[0.02] hover:shadow-black/[0.05] transition-all"
          >
            <Icon className="w-7 h-7 text-black mb-6" />
            <h3 className="text-xl font-light mb-3 text-black">{title}</h3>
            <p className="text-sm text-gray-600 leading-relaxed">{body}</p>
          </div>
        ))}
      </div>

      <div className="mt-24 max-w-6xl w-full">
        <div className="bg-[#0a0a0c] rounded-[40px] p-8 md:p-12 shadow-2xl relative overflow-hidden flex flex-col xl:flex-row gap-12 items-center">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-[100px]" />
          <div className="xl:w-1/3 w-full z-10">
            <Terminal className="w-8 h-8 text-white mb-6" />
            <h3 className="text-3xl font-light mb-4 text-white">One command to join</h3>
            <p className="text-sm text-gray-400 leading-relaxed mb-6">
              Start a node with Ollama or Hugging Face, then open the local web app or stay in the
              terminal dashboard.
            </p>
            <div className="flex flex-wrap gap-2">
              {['bee2bee tui', 'bee2bee serve-ollama', 'bee2bee serve-hf', 'npm start'].map(
                (command) => (
                  <span
                    key={command}
                    className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-[10px] font-bold uppercase tracking-widest text-white"
                  >
                    {command}
                  </span>
                ),
              )}
            </div>
          </div>
          <div className="xl:w-2/3 w-full z-10">
            <TerminalPreview />
          </div>
        </div>
      </div>

      <div className="absolute top-[0%] right-[0%] w-[800px] h-[800px] bg-blue-50 rounded-full blur-[140px] -z-10" />
      <div className="absolute bottom-[0%] left-[-10%] w-[600px] h-[600px] bg-gray-50 rounded-full blur-[120px] -z-10" />
    </div>
  );
}
