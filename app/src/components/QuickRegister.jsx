import { useEffect, useMemo, useState } from 'react';
import { Activity, Plus } from 'lucide-react';

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
    return (
      <div className="min-h-screen bg-black text-white p-10 flex flex-col items-center justify-center text-center animate-in fade-in duration-700">
        <div className="mb-12">
          <Activity
            className={`w-16 h-16 ${
              peer ? 'text-emerald-500' : 'text-blue-500'
            } animate-pulse mb-8 mx-auto`}
          />
          <h2 className="text-3xl font-light mb-2 text-white italic">Local node monitor</h2>
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.3em] font-mono">
            {peer ? 'Connected to the local mesh' : 'Waiting for the node handshake...'}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-8 w-full max-w-2xl mt-12">
          <div className="bg-white/5 p-8 rounded-[32px] border border-white/10">
            <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-3">CPU load</p>
            <p className="text-3xl font-mono text-white">
              {Number(metrics.throughput).toFixed(1)} <span className="text-xs text-gray-500">%</span>
            </p>
          </div>
          <div className="bg-white/5 p-8 rounded-[32px] border border-white/10">
            <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-3">Memory</p>
            <p className="text-3xl font-mono text-white">
              {Number(metrics.memory).toFixed(0)}
              <span className="text-xs text-gray-500">%</span>
            </p>
          </div>
          <div className="bg-white/5 p-8 rounded-[32px] border border-white/10">
            <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-3">Trust</p>
            <p className="text-3xl font-mono text-emerald-400">{Number(metrics.trust).toFixed(2)}</p>
          </div>
        </div>

        <div className="mt-20 flex flex-col items-center gap-6">
          <button
            onClick={onComplete}
            className="pill-btn bg-white text-black px-16 hover:scale-105 active:scale-95 shadow-2xl shadow-white/10"
          >
            Enter dashboard
          </button>
          <p className="text-[8px] text-gray-600 font-bold uppercase tracking-widest">
            Local peer-to-peer session
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white p-10 flex flex-col items-center justify-center">
      <div className="w-full max-w-md space-y-10">
        <div className="text-center">
          <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Plus className="w-8 h-8 text-blue-600" />
          </div>
          <h2 className="text-2xl font-semibold tracking-tight">Join local node</h2>
          <p className="text-sm text-gray-400 mt-2">
            {linkData?.model || 'Model'} · {linkData?.apiHost || 'local'}
          </p>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <label
              htmlFor="usage"
              className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1"
            >
              Usage
            </label>
            <select
              id="usage"
              value={usage}
              onChange={(event) => setUsage(event.target.value)}
              className="w-full h-14 bg-gray-50 border-none rounded-2xl px-5 text-sm outline-none"
            >
              <option>Personal / Development</option>
              <option>Commercial / API</option>
              <option>Public mesh relay</option>
            </select>
          </div>

          <div className="space-y-2">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">
              Performance tier
            </span>
            <div className="flex gap-2">
              {['Low', 'Medium', 'Ultra'].map((option) => (
                <button
                  key={option}
                  onClick={() => setTier(option)}
                  className={`flex-1 h-12 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${
                    tier === option ? 'bg-black text-white' : 'bg-gray-50 text-gray-400'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        </div>

        {error && <p className="text-xs font-bold text-red-500">{error}</p>}

        <button
          onClick={handleRegister}
          className="w-full h-16 bg-black text-white rounded-3xl font-bold uppercase tracking-widest shadow-xl shadow-black/10 hover:scale-[1.02] active:scale-[0.98] transition-all"
        >
          {step === 'verifying' ? 'Connecting...' : 'Confirm registration'}
        </button>
      </div>
    </div>
  );
}
