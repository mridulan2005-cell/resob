// Dependency-free dev runner: starts the Express backend (port 3001)
// and the Vite frontend (port 5173) together, so the app's /api calls
// always have a backend to talk to. Use: `npm run dev:full`.
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';

function run(name, cmd, args, cwd) {
  const child = spawn(cmd, args, { cwd, stdio: 'inherit', shell: process.platform === 'win32' });
  child.on('exit', (code) => {
    console.log(`[dev:full] ${name} exited with code ${code}`);
    // If one process dies, tear the other down so the user isn't left
    // with a half-running app.
    procs.filter((p) => p !== child).forEach((p) => p.kill());
    process.exit(code ?? 0);
  });
  return child;
}

const procs = [];
procs.push(run('backend', 'node', ['server/index.js'], root));
procs.push(run('frontend', npm, ['run', 'dev:client'], root));

for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => { procs.forEach((p) => p.kill()); process.exit(0); });
}
