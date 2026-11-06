import { spawn, spawnSync } from 'node:child_process';

const useShell = process.platform === 'win32';
const projectArguments = ['-p', 'tsconfig.build.json'];
const initialBuild = spawnSync('tsc', projectArguments, {
  shell: useShell,
  stdio: 'inherit',
});

if (initialBuild.status !== 0) {
  process.exit(initialBuild.status ?? 1);
}

// Nest relies on TypeScript's emitted decorator metadata for DTO transformation and validation.
// Compile in watch mode instead of executing the application through an esbuild-based TS loader.
const compiler = spawn(
  'tsc',
  [...projectArguments, '--watch', '--preserveWatchOutput'],
  { shell: useShell, stdio: 'inherit' },
);
const api = spawn(
  process.execPath,
  ['--watch', '--watch-preserve-output', 'dist/main.js'],
  { stdio: 'inherit' },
);

let stopping = false;

function stopChildren(signal: NodeJS.Signals): void {
  if (stopping) return;
  stopping = true;
  compiler.kill(signal);
  api.kill(signal);
}

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => stopChildren(signal));
}

for (const child of [compiler, api]) {
  child.on('exit', (code, signal) => {
    if (stopping) return;
    console.error(`Development process exited (${signal ?? code ?? 'unknown'}).`);
    process.exitCode = code ?? 1;
    stopChildren('SIGTERM');
  });
}
