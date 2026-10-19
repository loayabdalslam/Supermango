import { useState } from 'react';
import {
  ArrowRight,
  Boxes,
  Check,
  Copy,
  Cpu,
  Globe2,
  Lock,
  Minus,
  Plus,
  RadioTower,
  Server,
  Shield,
  Terminal,
  Wand2,
  Zap,
} from 'lucide-react';
import Nav, { GITHUB_URL } from './Nav.jsx';
import Footer from './Footer.jsx';
import MeshTable from './MeshTable.jsx';
import TerminalPreview from './TerminalPreview.jsx';

const INSTALL = 'pip install bee2bee';

function CommandCopy() {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(INSTALL);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  return (
    <button
      onClick={copy}
      className="group flex items-center gap-3 rounded-full border border-line bg-surface/70 py-2 pl-4 pr-2 font-mono text-[13px] text-muted transition-colors hover:border-white/20 hover:text-white"
    >
      <span className="text-faint">$</span>
      <span>{INSTALL}</span>
      <span className="grid h-7 w-7 place-items-center rounded-full bg-white/[0.04] text-faint transition-colors group-hover:text-white">
        {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
      </span>
    </button>
  );
}

function Stat({ value, label }) {
  return (
    <div className="rounded-2xl border border-line bg-surface/60 px-5 py-4">
      <p className="text-2xl font-semibold tracking-tight text-white">{value}</p>
      <p className="mt-1 text-[11px] font-medium uppercase tracking-[0.16em] text-faint">{label}</p>
    </div>
  );
}

function MeshGraphic() {
  const nodes = [
    { x: 50, y: 50 },
    { x: 18, y: 24 },
    { x: 84, y: 22 },
    { x: 22, y: 78 },
    { x: 80, y: 80 },
    { x: 50, y: 12 },
  ];
  const edges = [
    [0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [1, 5], [2, 5], [3, 4], [1, 3], [2, 4],
  ];

  return (
    <div className="relative aspect-square w-full max-w-md">
      <div className="absolute inset-0 rounded-[40px] border border-line bg-surface/40" />
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full">
        <defs>
          <radialGradient id="core" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffc63d" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#ffc63d" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="50" cy="50" r="30" fill="url(#core)" />
        {edges.map(([a, b], index) => (
          <line
            key={index}
            x1={nodes[a].x}
            y1={nodes[a].y}
            x2={nodes[b].x}
            y2={nodes[b].y}
            stroke="rgba(255,255,255,0.14)"
            strokeWidth="0.4"
          />
        ))}
        {nodes.map((node, index) => (
          <g key={index}>
            <circle cx={node.x} cy={node.y} r={index === 0 ? 3.2 : 2} fill="#ffc63d" />
            <circle cx={node.x} cy={node.y} r={index === 0 ? 6 : 4} fill="none" stroke="rgba(255,198,61,0.35)" strokeWidth="0.3" />
          </g>
        ))}
      </svg>
      <div className="absolute inset-x-6 bottom-6 rounded-2xl border border-line bg-ink/80 p-4 backdrop-blur">
        <div className="flex items-center justify-between text-[11px]">
          <span className="font-mono text-faint">region: auto · p2p: active</span>
          <span className="flex items-center gap-1.5 text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse-dot" /> synced
          </span>
        </div>
      </div>
    </div>
  );
}

const FEATURES = [
  {
    icon: Lock,
    title: 'Local-first inference',
    body: 'Prompts are executed on hardware you control. Nothing is proxied to a vendor, and no account is required.',
  },
  {
    icon: Globe2,
    title: 'Real IP by default',
    body: 'Every node binds all interfaces and attempts UPnP / NAT-PMP / STUN mapping, advertising its public address with a LAN fallback.',
  },
  {
    icon: RadioTower,
    title: 'Heartbeat mesh',
    body: 'Nodes post full state to the local app, so the dashboard lists each node with region, models, coordinates and last-seen time.',
  },
  {
    icon: Terminal,
    title: 'Terminal dashboard',
    body: 'Prefer the shell? Run bee2bee tui for a live dashboard with peers, models, metrics and chat — all without leaving the terminal.',
  },
  {
    icon: Boxes,
    title: 'Bring any backend',
    body: 'Ollama, Hugging Face and local llama.cpp servers plug into the same mesh protocol with a single adapter.',
  },
  {
    icon: Wand2,
    title: 'Zero-config join links',
    body: 'Share a bee2bee:// invite and a peer joins the mesh, negotiates transport and starts serving in one step.',
  },
];

function FeatureBento() {
  return (
    <section id="features" className="section">
      <div className="container-x">
        <div className="max-w-2xl">
          <p className="eyebrow">
            <Zap className="h-3.5 w-3.5" /> Capabilities
          </p>
          <h2 className="h2 mt-4">
            Everything you need to run a <span className="gradient-text">private AI mesh</span>
          </h2>
          <p className="lead mt-5">
            A complete local-first stack: discovery, transport, orchestration and observability —
            built for machines you already own.
          </p>
        </div>

        <div className="mt-14 grid gap-4 md:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, body }, index) => (
            <article
              key={title}
              className={`card group transition-all duration-300 hover:-translate-y-1 hover:border-white/20 ${
                index === 0 ? 'md:col-span-2 md:flex md:items-center md:gap-8' : ''
              }`}
            >
              <div
                className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-line bg-white/[0.03] text-accent ${
                  index === 0 ? 'md:h-14 md:w-14' : ''
                }`}
              >
                <Icon className={index === 0 ? 'h-6 w-6' : 'h-5 w-5'} />
              </div>
              <div className={index === 0 ? 'mt-5 md:mt-0' : 'mt-5'}>
                <h3 className="h3">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{body}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

const STEPS = [
  {
    icon: Server,
    title: 'Start a node',
    body: 'Install the CLI, point it at Ollama or a local model, and it joins the mesh with a public address.',
  },
  {
    icon: RadioTower,
    title: 'See the mesh',
    body: 'Heartbeats keep the live table in sync so you always know which nodes are online and what they serve.',
  },
  {
    icon: Cpu,
    title: 'Run inference',
    body: 'Send prompts from the web app or the TUI. Requests are routed peer-to-peer to hardware you own.',
  },
];

function HowItWorks() {
  return (
    <section id="how" className="section">
      <div className="container-x">
        <div className="max-w-2xl">
          <p className="eyebrow">
            <Boxes className="h-3.5 w-3.5" /> Workflow
          </p>
          <h2 className="h2 mt-4">From bare metal to mesh in three steps</h2>
        </div>

        <div className="mt-14 grid gap-4 md:grid-cols-3">
          {STEPS.map(({ icon: Icon, title, body }, index) => (
            <div key={title} className="relative card">
              <span className="absolute right-6 top-6 font-mono text-xs text-faint">
                0{index + 1}
              </span>
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-accent/10 text-accent">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="h3 mt-5">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const FAQS = [
  {
    q: 'Is my data private?',
    a: 'Yes. Prompts and responses travel directly between your machines over the mesh. There is no central server, no account, and nothing is stored off-device.',
  },
  {
    q: 'What hardware do I need?',
    a: 'Any machine that can run a local model — a laptop, a desktop, or a small GPU box. Bee2Bee adapts to whatever surface you already have.',
  },
  {
    q: 'Do I need a public IP?',
    a: 'Not strictly. Bee2Bee attempts UPnP, NAT-PMP and STUN to advertise a public address and falls back to the LAN address when the router blocks mapping.',
  },
  {
    q: 'What happens to the node table?',
    a: 'Nodes emit a heartbeat to the local app. The dashboard renders every reporting node with region, models, coordinates and last-seen time in a live table.',
  },
  {
    q: 'Is it free?',
    a: 'Bee2Bee is open source and runs on hardware you own. There is no usage metering and no per-token billing.',
  },
];

function Faq() {
  const [open, setOpen] = useState(0);

  return (
    <section id="faq" className="section">
      <div className="container-x grid gap-12 md:grid-cols-[0.8fr_1.2fr]">
        <div>
          <p className="eyebrow">FAQ</p>
          <h2 className="h2 mt-4">Answers before you deploy</h2>
          <p className="lead mt-5">
            Everything you need to know about running Bee2Bee on hardware you own.
          </p>
        </div>

        <div className="divide-y divide-line rounded-3xl border border-line bg-surface/50">
          {FAQS.map((item, index) => {
            const isOpen = open === index;
            return (
              <div key={item.q}>
                <button
                  onClick={() => setOpen(isOpen ? -1 : index)}
                  className="flex w-full items-center justify-between gap-6 px-6 py-5 text-left"
                >
                  <span className={`text-[15px] font-medium ${isOpen ? 'text-white' : 'text-muted'}`}>
                    {item.q}
                  </span>
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-line text-faint">
                    {isOpen ? <Minus className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                  </span>
                </button>
                {isOpen && (
                  <p className="px-6 pb-6 text-sm leading-relaxed text-muted">{item.a}</p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

const BACKENDS = ['Ollama', 'Hugging Face', 'llama.cpp', 'vLLM', 'LM Studio', 'Text Gen WebUI', 'MLX', 'ExLlama'];

export default function Landing({ onStart, networkStats }) {
  const peers = networkStats?.peers || [];
  const regions = new Set(peers.map((peer) => peer.region || 'Auto')).size;
  const models = new Set(peers.flatMap((peer) => peer.models || [])).size;

  return (
    <div id="top" className="relative min-h-screen overflow-x-hidden text-white">
      <Nav onStart={onStart} />

      {/* Hero */}
      <section className="relative pt-40 pb-24">
        <div className="grid-bg absolute inset-x-0 top-0 -z-10 h-[720px]" />
        <div className="container-x grid items-center gap-16 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="animate-rise">
            <div className="chip">
              <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse-dot" />
              Local-first P2P mesh for private AI
            </div>

            <h1 className="h1 mt-6">
              The private inference mesh for
              <br />
              <span className="gradient-text">machines you own.</span>
            </h1>

            <p className="lead mt-6 max-w-xl">
              Bee2Bee turns your hardware into one global, permissionless AI network. Run
              inference across networks, keep every prompt on your own silicon, and watch the
              nodes come online in real time.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <button onClick={onStart} className="btn btn-primary btn-lg">
                Open dashboard
                <ArrowRight className="h-4 w-4" />
              </button>
              <a href={GITHUB_URL} target="_blank" rel="noreferrer" className="btn btn-ghost btn-lg">
                Star on GitHub
              </a>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <CommandCopy />
              <span className="text-[12px] text-faint">
                {networkStats?.connected ? 'Node connected' : 'Waiting for a node to report'}
              </span>
            </div>

            <div className="mt-12 grid max-w-lg grid-cols-3 gap-3">
              <Stat value={peers.length} label="Nodes online" />
              <Stat value={regions || '—'} label="Regions" />
              <Stat value={models || '—'} label="Models" />
            </div>
          </div>

          <div className="flex justify-center lg:justify-end">
            <MeshGraphic />
          </div>
        </div>
      </section>

      {/* Backends marquee */}
      <section className="border-y border-line py-8">
        <div className="container-x mb-6 text-center text-[11px] font-semibold uppercase tracking-[0.22em] text-faint">
          Bring any local runtime
        </div>
        <div className="relative overflow-hidden [mask-image:linear-gradient(to_right,transparent,#000_12%,#000_88%,transparent)]">
          <div className="marquee-track gap-4">
            {[...BACKENDS, ...BACKENDS].map((name, index) => (
              <span
                key={`${name}-${index}`}
                className="whitespace-nowrap rounded-full border border-line bg-surface/50 px-5 py-2 text-sm font-medium text-muted"
              >
                {name}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Live network */}
      <section id="network" className="section">
        <div className="container-x">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="max-w-2xl">
              <p className="eyebrow">
                <RadioTower className="h-3.5 w-3.5" /> Live network
              </p>
              <h2 className="h2 mt-4">A mesh table that updates as nodes report</h2>
              <p className="lead mt-5">
                Each node emits a heartbeat with its region, models and coordinates. The gateway
                merges those reports with the local registry and renders them here.
              </p>
            </div>
            <button onClick={onStart} className="btn btn-ghost">
              Open dashboard
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-10">
            <MeshTable
              peers={peers}
              activeNode={networkStats?.activeNode}
              heartbeatUpdatedAt={networkStats?.heartbeatUpdatedAt}
              heartbeatSource={networkStats?.heartbeatSource}
              onSelectNode={undefined}
              className="min-h-[320px]"
            />
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <Stat value={networkStats?.poolSize ?? 0} label="Pool size" />
            <Stat value={networkStats?.connected ? 'Active' : 'Idle'} label="Transport" />
            <Stat value={networkStats?.heartbeatSource ? 'Streaming' : 'Waiting'} label="Heartbeat" />
          </div>
        </div>
      </section>

      <FeatureBento />
      <HowItWorks />

      {/* Terminal / CLI */}
      <section className="section">
        <div className="container-x">
          <div className="panel grid items-center gap-10 p-8 md:grid-cols-2 md:p-12">
            <div>
              <p className="eyebrow">
                <Terminal className="h-3.5 w-3.5" /> CLI &amp; TUI
              </p>
              <h2 className="h2 mt-4">One command to join the mesh</h2>
              <p className="lead mt-5">
                Start a node with Ollama or Hugging Face, then open the web app or stay in the
                terminal dashboard with peers, models and chat.
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                {['bee2bee tui', 'bee2bee serve-ollama', 'bee2bee serve-hf', 'npm start'].map(
                  (command) => (
                    <span
                      key={command}
                      className="rounded-lg border border-line bg-white/[0.03] px-3 py-1.5 font-mono text-[11px] text-muted"
                    >
                      {command}
                    </span>
                  ),
                )}
              </div>
            </div>
            <TerminalPreview />
          </div>
        </div>
      </section>

      <Faq />

      {/* CTA */}
      <section className="section">
        <div className="container-x">
          <div className="relative overflow-hidden rounded-[36px] border border-line bg-surface/60 px-8 py-16 text-center md:px-16">
            <div className="glow -top-24 left-1/2 h-64 w-[520px] -translate-x-1/2 bg-accent/20" />
            <div className="relative">
              <Shield className="mx-auto h-8 w-8 text-accent" />
              <h2 className="h2 mt-6">Your hardware. Your models. Your mesh.</h2>
              <p className="lead mx-auto mt-5 max-w-xl">
                Spin up a node, watch it appear in the live table, and run private inference
                across every machine you own.
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                <button onClick={onStart} className="btn btn-primary btn-lg">
                  Open dashboard
                  <ArrowRight className="h-4 w-4" />
                </button>
                <a href={GITHUB_URL} target="_blank" rel="noreferrer" className="btn btn-ghost btn-lg">
                  Read the docs
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
