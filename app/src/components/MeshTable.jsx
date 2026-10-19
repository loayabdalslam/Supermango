function shortId(peer) {
  return peer.peer_id || peer.id || peer.addr || 'unknown';
}

function amount(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function coordinates(peer) {
  const latitude = amount(peer.latitude ?? peer.lat ?? peer.location?.latitude);
  const longitude = amount(peer.longitude ?? peer.lng ?? peer.lon ?? peer.location?.longitude);
  if (latitude === null || longitude === null) return null;
  return `${latitude.toFixed(3)}, ${longitude.toFixed(3)}`;
}

function ago(timestamp) {
  const value = Number(timestamp);
  if (!value) return '—';
  const seconds = Math.max(0, Math.round((Date.now() - value) / 1000));
  if (seconds < 5) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function statusDot(peer) {
  if (peer.status === 'offline' || peer.status === 'unreachable') return 'bg-red-500';
  if (peer.heartbeat) return 'bg-amber-400';
  return 'bg-emerald-400';
}

export default function MeshTable({
  peers = [],
  activeNode,
  onSelectNode,
  heartbeatUpdatedAt,
  heartbeatSource,
  className = '',
}) {
  const heartbeatLabel = heartbeatUpdatedAt
    ? `Heartbeat ${ago(heartbeatUpdatedAt)}`
    : 'Heartbeat waiting';

  return (
    <div className={`flex flex-col overflow-hidden rounded-[28px] border border-line bg-surface/60 ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-accent/10 text-accent">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
              <path d="M12 2.2 3.6 6.4v9.2L12 21.8l8.4-6.2V6.4L12 2.2Zm0 2.3 6.4 3.2v7L12 19.5l-6.4-4.8v-7L12 4.5Z" />
              <circle cx="12" cy="11" r="2.6" />
            </svg>
          </span>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-faint">Mesh nodes</p>
            <p className="mt-0.5 text-sm font-semibold tracking-tight text-white">
              {peers.length} node{peers.length === 1 ? '' : 's'} online
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-line bg-white/[0.03] px-3 py-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse-dot" />
          <span className="text-[10px] font-medium tracking-wide text-muted">{heartbeatLabel}</span>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full min-w-[760px] border-collapse text-left">
          <thead className="sticky top-0 z-10 bg-[#0c0e13]/95 backdrop-blur">
            <tr className="border-b border-line">
              {['Node', 'Address', 'Models', 'Location', 'Last seen'].map((label) => (
                <th
                  key={label}
                  className="px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-faint"
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {peers.map((peer) => {
              const id = shortId(peer);
              const selected = activeNode && (peer.addr === activeNode || peer.api_host === activeNode);
              return (
                <tr
                  key={id}
                  onClick={() => onSelectNode?.(peer)}
                  className={`border-b border-line/60 transition-colors ${
                    selected ? 'bg-white/[0.04]' : 'hover:bg-white/[0.025]'
                  } ${onSelectNode ? 'cursor-pointer' : ''}`}
                >
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2.5">
                      <span className={`h-2 w-2 shrink-0 rounded-full ${statusDot(peer)}`} />
                      <div className="min-w-0">
                        <p className="truncate text-[12px] font-semibold text-white">
                          {peer.region || 'Auto'}
                        </p>
                        <p className="truncate font-mono text-[10px] text-faint">{id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="max-w-[230px] px-5 py-3">
                    <p className="truncate font-mono text-[11px] text-muted">
                      {peer.addr || (peer.api_host ? `http://${peer.api_host}:${peer.api_port || 4002}` : '—')}
                    </p>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex max-w-[220px] flex-wrap gap-1">
                      {(peer.models || []).slice(0, 3).map((model) => (
                        <span
                          key={model}
                          className="rounded-md border border-line bg-white/[0.03] px-1.5 py-0.5 text-[10px] font-medium text-muted"
                        >
                          {model}
                        </span>
                      ))}
                      {(peer.models || []).length === 0 && (
                        <span className="text-[11px] text-faint">no model</span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <span className="font-mono text-[11px] text-muted">{coordinates(peer) || '—'}</span>
                  </td>
                  <td className="px-5 py-3">
                    <span className="text-[11px] font-medium text-faint">{ago(peer.last_seen)}</span>
                    {peer.heartbeat && (
                      <span className="ml-2 rounded-md bg-amber-400/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-amber-300">
                        HB
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
            {peers.length === 0 && (
              <tr>
                <td colSpan="5" className="px-5 py-16 text-center">
                  <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-faint">
                    Waiting for node heartbeats
                  </p>
                  <p className="mt-2 text-[12px] text-faint/80">
                    Start a node; it reports to{' '}
                    <span className="font-mono text-muted">localhost:3000</span> or{' '}
                    <span className="font-mono text-muted">localhost:3001</span> by default.
                  </p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {heartbeatSource && (
        <div className="border-t border-line px-5 py-2.5 text-[10px] text-faint">
          heartbeat source: <span className="font-mono text-muted">{heartbeatSource}</span>
        </div>
      )}
    </div>
  );
}
