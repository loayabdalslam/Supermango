import { spawn } from 'child_process';

const children = [
  spawn('npm run api', { stdio: 'inherit', shell: true }),
  spawn('npm run dev:ui', { stdio: 'inherit', shell: true }),
];

let stopping = false;

function shutdown(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) {
    try {
      child.kill();
    } catch {
      // ignore
    }
  }
  process.exit(code);
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

for (const child of children) {
  child.on('exit', (code) => {
    if (!stopping && code) shutdown(code);
  });
}
