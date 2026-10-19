import { useEffect, useRef, useState } from 'react';

const SEQUENCE = [
  { text: 'pip install -e .', type: 'input', delay: 600 },
  {
    text: 'Successfully installed bee2bee-4.0.0\nLocal registry: ~/.bee2bee/registry.json',
    type: 'output',
    delay: 900,
  },
  {
    text: 'bee2bee tui --model gemma3:270m --backend ollama',
    type: 'input',
    delay: 700,
  },
  { text: 'Starting Bee2Bee P2P node...', type: 'output', delay: 800 },
  { text: 'WebSocket server active on 127.0.0.1:4003', type: 'output', delay: 700 },
  { text: 'Ollama model gemma3:270m ready', type: 'output', delay: 700 },
  { text: 'Local dashboard running. Press c to chat, q to quit.', type: 'system', delay: 900 },
  { text: '', type: 'input', delay: 9999999 },
];

export default function TerminalPreview() {
  const [lines, setLines] = useState([]);
  const containerRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    const run = async () => {
      for (const step of SEQUENCE) {
        if (cancelled) return;

        if (step.type === 'input') {
          setLines((previous) => [...previous, { text: '', type: 'input', active: true }]);
          let typed = '';
          for (const character of step.text) {
            if (cancelled) return;
            typed += character;
            setLines((previous) => {
              const copy = [...previous];
              copy[copy.length - 1] = { ...copy[copy.length - 1], text: typed };
              return copy;
            });
            await wait(18 + Math.random() * 22);
          }
          setLines((previous) => {
            const copy = [...previous];
            copy[copy.length - 1] = { ...copy[copy.length - 1], active: false };
            return copy;
          });
          await wait(step.delay);
        } else {
          setLines((previous) => [...previous, { text: step.text, type: step.type }]);
          await wait(step.delay);
        }

        if (containerRef.current) {
          containerRef.current.scrollTop = containerRef.current.scrollHeight;
        }
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="w-full bg-[#050505] border border-white/5 rounded-[24px] p-6 font-mono text-xs md:text-[13px] text-gray-300 shadow-2xl overflow-hidden h-[420px] overflow-y-auto"
    >
      <div className="flex items-center gap-2 mb-6 sticky top-0 left-0 bg-[#050505] pb-2 z-10 w-full">
        <span className="w-3 h-3 rounded-full bg-red-500" />
        <span className="w-3 h-3 rounded-full bg-yellow-500" />
        <span className="w-3 h-3 rounded-full bg-green-500" />
        <span className="ml-4 text-[10px] text-gray-500 uppercase tracking-widest font-bold">
          Terminal / local TUI
        </span>
      </div>
      <div className="space-y-2 pb-10 leading-relaxed">
        {lines.map((line, index) => (
          <div
            key={index}
            className={[
              line.type === 'input' ? 'text-emerald-400 font-semibold' : '',
              line.type === 'system' ? 'text-blue-400 font-bold' : '',
              line.text.startsWith('WebSocket') ? 'text-green-400' : '',
            ].join(' ')}
          >
            {line.type === 'input' && <span className="text-gray-600 mr-2">bee2bee:~$</span>}
            <span className="whitespace-pre-wrap">{line.text}</span>
            {line.active && (
              <span className="inline-block w-2 h-4 bg-emerald-400 animate-pulse ml-1 align-middle opacity-80" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
