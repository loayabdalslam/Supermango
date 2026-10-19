import { useState } from 'react';
import { ArrowUpRight, Menu, X } from 'lucide-react';

export const GITHUB_URL = 'https://github.com/loayabdalslam/Supermango';

export function Logo({ compact = false }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <span className="relative grid h-8 w-8 place-items-center rounded-[10px] bg-accent text-ink shadow-[0_10px_30px_-10px_rgba(255,198,61,0.8)]">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
          <path d="M12 2.2 3.6 6.4v9.2L12 21.8l8.4-6.2V6.4L12 2.2Zm0 2.3 6.4 3.2v7L12 19.5l-6.4-4.8v-7L12 4.5Z" />
          <circle cx="12" cy="11" r="2.6" />
        </svg>
      </span>
      {!compact && (
        <span className="text-[15px] font-semibold tracking-tight text-white">Bee2Bee</span>
      )}
    </span>
  );
}

const LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'Network', href: '#network' },
  { label: 'How it works', href: '#how' },
  { label: 'FAQ', href: '#faq' },
];

export default function Nav({ onStart }) {
  const [open, setOpen] = useState(false);

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <div className="container-x pt-4">
        <nav className="glass flex items-center justify-between rounded-full px-4 py-2.5 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.9)]">
          <a href="#top" className="pl-1">
            <Logo />
          </a>

          <div className="hidden items-center gap-1 md:flex">
            {LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="rounded-full px-3.5 py-2 text-[13px] font-medium text-muted transition-colors hover:text-white"
              >
                {link.label}
              </a>
            ))}
          </div>

          <div className="hidden items-center gap-2 md:flex">
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noreferrer"
              className="btn btn-ghost h-9 px-4 text-[12px]"
            >
              GitHub
              <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
            <button onClick={onStart} className="btn btn-primary h-9 px-5 text-[12px]">
              Open app
            </button>
          </div>

          <button
            onClick={() => setOpen((value) => !value)}
            className="grid h-9 w-9 place-items-center rounded-full border border-line text-white md:hidden"
            aria-label="Toggle menu"
          >
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </nav>

        {open && (
          <div className="glass mt-2 rounded-3xl p-3 md:hidden">
            {LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="block rounded-2xl px-4 py-3 text-sm font-medium text-muted hover:bg-white/5 hover:text-white"
              >
                {link.label}
              </a>
            ))}
            <button
              onClick={onStart}
              className="btn btn-primary mt-2 w-full"
            >
              Open app
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
