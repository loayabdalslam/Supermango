import { GITHUB_URL, Logo } from './Nav.jsx';

const COLUMNS = [
  {
    title: 'Product',
    links: [
      { label: 'Features', href: '#features' },
      { label: 'Live network', href: '#network' },
      { label: 'How it works', href: '#how' },
      { label: 'FAQ', href: '#faq' },
    ],
  },
  {
    title: 'Developers',
    links: [
      { label: 'GitHub', href: GITHUB_URL },
      { label: 'Documentation', href: `${GITHUB_URL}#readme` },
      { label: 'P2P setup guide', href: `${GITHUB_URL}/blob/main/P2P_SETUP_GUIDE.md` },
      { label: 'Deploy', href: `${GITHUB_URL}/blob/main/DEPLOYMENT.md` },
    ],
  },
  {
    title: 'Community',
    links: [
      { label: 'Issues', href: `${GITHUB_URL}/issues` },
      { label: 'Discussions', href: `${GITHUB_URL}/discussions` },
      { label: 'Manifesto', href: '#how' },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="border-t border-line">
      <div className="container-x grid gap-12 py-16 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div className="space-y-4">
          <Logo />
          <p className="max-w-xs text-sm leading-relaxed text-muted">
            The private inference mesh. Turn hardware you already own into one global,
            permissionless AI network.
          </p>
          <div className="chip">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse-dot" />
            All systems operational
          </div>
        </div>

        {COLUMNS.map((column) => (
          <div key={column.title} className="space-y-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-faint">
              {column.title}
            </p>
            <ul className="space-y-3">
              {column.links.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    target={link.href.startsWith('http') ? '_blank' : undefined}
                    rel="noreferrer"
                    className="text-sm text-muted transition-colors hover:text-white"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="container-x flex flex-col items-center justify-between gap-4 border-t border-line py-6 text-xs text-faint md:flex-row">
        <span>© {new Date().getFullYear()} Bee2Bee. Built for machines you own.</span>
        <span className="font-mono">no cloud · no keys · no leaks</span>
      </div>
    </footer>
  );
}
