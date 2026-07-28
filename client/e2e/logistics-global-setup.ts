import { spawnSync } from 'node:child_process';
import path from 'node:path';

export default function logisticsGlobalSetup(): void {
  const repositoryRoot = path.resolve(__dirname, '../..');
  const result = spawnSync('npm', ['--workspace', 'server', 'run', 'logistics:e2e:seed'], {
    cwd: repositoryRoot,
    env: process.env,
    encoding: 'utf8'
  });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.status !== 0) throw new Error(`Logistics E2E seed failed with exit code ${result.status ?? 'unknown'}`);
}
