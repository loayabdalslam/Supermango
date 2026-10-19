import { useEffect, useMemo, useState } from 'react';
import { Activity, ArrowRight, Cpu, Gauge, Plus, ShieldCheck } from 'lucide-react';
import { Logo } from './Nav.jsx';

function metricsFromPeer(peer) {
  const metrics = peer?.metrics || {};
  return {
    throughput: metrics.throughput ?? 0,
    memory: metrics.memory_percent ?? 0,
    trust: metrics.trust_score ?? 1,
  };
}

export default function QuickRegister({ linkData, networkStats, fetchStats, onComplete }) {
  const [step, setStep] = useState('form');
  const [usage, setUsage] = useState('Personal / Development');
  const [tier, setTier] = useState('Medium');
  const [error, setError] = useState('');

  const peer = useMemo(() => {
    const peers = networkStats?.peers || [];
    if (!peers.length) return null;
    return (
      peers.find((item) => item.addr === linkData?.apiHost) ||
      peers.find((item) => item.api_port === linkData?.apiPort) ||
      peers[0]
    );
  }, [networkStats?.peers, linkData]);

  const metrics = metricsFromPeer(peer);

  useEffect(() => {
    if (step !== 'monitoring' || !fetchStats) return undefined;
    const timer = setInterval(fetchStats, 3000);
    return () => clearInterval(timer);
  }, [step, fetchStats]);

  const handleRegister = async () => {
    setStep('verifying');
    setError('');
    try {
      const response = await fetch('/api/p2p/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ link: linkData.link }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Registration failed');
      }
      if (fetchStats) await fetchStats();
      setStep('monitoring');
    } catch (registrationError) {
      setError(registrationError.message);
      setStep('form');
    }
  };

  if (step === 'monitoring') {
    const stats = [
      { label: 'CPU load', value: Number(metrics.throughput).toFixed(1), unit: '%', icon: Gauge },
      { label: 'Memory', value: Number(metrics.memory).toFixed(0), unit: '%', icon: Cpu },
      { label: 'Trust', value: Number(metrics.trust).toFixed(2), unit: '', icon: ShieldCheck },
    ];

    return (
      <div className="relative flex min-h-screen flex-col items-center justify-center px-6 text-white">
        <div className="grid-bg absolute inset-0 -z-10" />
        <div className="w-full max-w-2xl text-center animate-rise">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-accent/10 text-accent">
            <Activity className={`h-7 w-7 ${peer ? 'text-emerald-400' : 'text-accent'}`} />
          </span>
          <h2 className="h2 mt-6">Mesh node monitor</h2>
          <p className="mt-3 text-[11px] font-medium uppercase tracking-[0.24em] text-faint">
            {peer ? 'Connected to the mesh' : 'Waiting for the node handshake...'}
          </p>

          <div className="mt-12 grid gap-3 sm:grid-cols-3">
            {stats.map(({ label, value, unit, icon: Icon }) => (
              <div key={label} className="rounded-3xl border border-line bg-surface/60 p-6">
                <Icon className="mx-auto h-5 w-5 text-faint" />
                <p className="mt-3 font-mono text-2xl font-semibold text-white">
                  {value}
                  {unit && <span className="ml-1 text-xs text-faint">{unit}</span>}
                </p>
                <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-faint">
                  {label}
                </p>
              </div>
            ))}
          </div>

          <button onClick={onComplete} className="btn btn-primary btn-lg mt-12">
            Enter dashboard
            <ArrowRight className="h-4 w-4" />
          </button>
          <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.2em] text-faint">
            Peer-to-peer session
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center px-6 py-16 text-white">
      <div className="grid-bg absolute inset-0 -z-10" />
      <div className="w-full max-w-md space-y-8 animate-rise">
        <div className="text-center">
          <div className="mb-6 flex justify-center">
            <Logo />
          </div>
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-accent/10 text-accent">
            <Plus className="h-6 w-6" />
          </span>
          <h2 className="mt-6 text-2xl font-semibold tracking-tight">Join mesh node</h2>
          <p className="mt-2 font-mono text-xs text-faint">
            {linkData?.model || 'Model'} · {linkData?.apiHost || 'local'}
          </p>
        </div>

        <div className="panel space-y-6 p-7">
          <div className="space-y-2">
            <label
              htmlFor="usage"
              className="px-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-faint"
            >
              Usage
            </label>
            <select
              id="usage"
              value={usage}
              onChange={(event) => setUsage(event.target.value)}
              className="h-14 w-full rounded-2xl border border-line bg-white/[0.02] px-4 text-sm text-white outline-none transition-colors focus:border-accent/40"
            >
              <option className="bg-surface">Personal / Development</option>
              <option className="bg-surface">Commercial / API</option>
              <option className="bg-surface">Public mesh relay</option>
            </select>
          </div>

          <div className="space-y-2">
            <span className="px-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-faint">
              Performance tier
            </span>
            <div className="flex gap-2">
              {['Low', 'Medium', 'Ultra'].map((option) => (
                <button
                  key={option}
                  onClick={() => setTier(option)}
                  className={`h-12 flex-1 rounded-xl text-[11px] font-semibold uppercase tracking-[0.14em] transition-all ${
                    tier === option
                      ? 'bg-accent text-ink'
                      : 'border border-line bg-white/[0.02] text-muted hover:text-white'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-xs font-semibold text-red-400">{error}</p>}

          <button onClick={handleRegister} className="btn btn-primary btn-lg w-full">
            {step === 'verifying' ? 'Connecting...' : 'Confirm registration'}
          </button>
        </div>
      </div>
    </div>
  );
}
