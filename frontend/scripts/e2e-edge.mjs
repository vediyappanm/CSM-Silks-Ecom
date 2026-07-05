/**
 * Run full E2E suite in Microsoft Edge.
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const env = { ...process.env, E2E_BROWSER: 'msedge' };

function run(script) {
  console.log(`\n>>> Edge E2E: ${script}\n`);
  const result = spawnSync(process.execPath, [path.join(dir, script)], {
    stdio: 'inherit',
    env,
    cwd: path.resolve(dir, '..'),
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

run('e2e-audit.mjs');
run('e2e-icons-audit.mjs');
console.log('\nEdge E2E complete.');
