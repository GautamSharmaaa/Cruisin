import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const configuration = dotenv.parse(readFileSync(resolve(root, 'server/.env')));
// Discard inherited provider/database settings, including production shell exports.
const environment = Object.fromEntries(['PATH', 'HOME', 'TMPDIR', 'USER', 'SHELL'].filter(key => process.env[key]).map(key => [key, process.env[key]]));
Object.assign(environment, configuration, {
  APP_ENV: 'development',
  NEXT_PUBLIC_API_URL: 'http://127.0.0.1:8192/api/v1',
  API_PROXY_TARGET: 'http://127.0.0.1:8192',
  NEXT_PUBLIC_SITE_URL: 'http://127.0.0.1:3192',
  NEXT_PUBLIC_STOREFRONT_URL: 'http://127.0.0.1:3192',
  NEXT_PUBLIC_META_PIXEL_ID: '',
  NEXT_PUBLIC_WHATSAPP_OTP_ENABLED: 'false',
  NEXT_PUBLIC_RAZORPAY_KEY_ID: 'rzp_test_v2_placeholder'
});
const task = process.argv[2] ?? 'api';
const tasks = {
  employee: ['node', ['node_modules/next/dist/bin/next', 'dev', 'employee', '-H', '127.0.0.1', '-p', '3194']],
  'employee-built': ['node', ['node_modules/next/dist/bin/next', 'start', 'employee', '-H', '127.0.0.1', '-p', '3194']],
  api: ['npm', ['--workspace', 'server', 'run', 'dev']],
  storefront: ['node', ['node_modules/next/dist/bin/next', 'dev', 'client', '-H', '127.0.0.1', '-p', '3192']],
  'storefront-built': ['node', ['node_modules/next/dist/bin/next', 'start', 'client', '-H', '127.0.0.1', '-p', '3192']],
  'admin-built': ['node', ['node_modules/next/dist/bin/next', 'start', 'admin', '-H', '127.0.0.1', '-p', '3193']],
  'operations-indexes': ['node',['--import','tsx','server/src/scripts/v2-operations-indexes.ts',...(process.argv[3]==='--apply'?['--apply']:[])]],
  'legacy-count-fixture':['node',['--import','tsx','server/src/scripts/v2-legacy-count-fixture.ts',process.argv[3]??'']],
  'operations-customer': ['node',['--import','tsx','server/src/scripts/v2-operations-customer.ts',process.argv[3]??'']],
  'operations-e2e': ['npm', ['--workspace', 'employee', 'run', 'test:e2e']],
  'editorial-e2e':['npm',['--workspace','client','run','test:e2e','--','--config','playwright.editorial.config.ts']],
  e2e: ['npm', ['--workspace', 'client', 'run', 'test:e2e', '--', 'cross-browser.spec.ts']],
  admin: ['node', ['node_modules/next/dist/bin/next', 'dev', 'admin', '-H', '127.0.0.1', '-p', '3193']],
  seed: ['npm', ['--workspace', 'server', 'run', 'seed']],
  test: ['npm', ['test']],
  'inventory-backfill': ['node', ['--import','tsx','server/src/scripts/v2-inventory-backfill.ts',...(process.argv[3]==='--apply'?['--apply']:[])]],
  'media-inventory': ['node', ['--import','tsx','server/src/scripts/v2-media-inventory.ts']],
  'media-migrate': ['node', ['--import','tsx','server/src/scripts/v2-media-migrate.ts',process.argv[3]??'']],
  typecheck: ['npm', ['run', 'typecheck']],
  lint: ['npm', ['run', 'lint']],
  build: ['npm', ['run', 'build']]
};
if (!Object.hasOwn(tasks, task)) throw new Error('Unknown V2 task');
if (['e2e','editorial-e2e'].includes(task)) Object.assign(environment, { PLAYWRIGHT_API_URL: 'http://127.0.0.1:8192/api/v1', PLAYWRIGHT_STOREFRONT_URL: 'http://127.0.0.1:3192', PLAYWRIGHT_ADMIN_URL: 'http://127.0.0.1:3193', PLAYWRIGHT_REUSE_EXISTING_SERVERS: 'true', PLAYWRIGHT_PRODUCTION_SERVERS: 'true' });
if (task === 'test') {
  environment.NODE_ENV = 'test';
  environment.MONGODB_URI = 'mongodb://127.0.0.1:27983/cruisin-sync-order-analytics-tests';
  environment.REDIS_URL = 'redis://127.0.0.1:6392/14';
}
if (['build', 'storefront-built', 'admin-built', 'employee-built'].includes(task)) environment.NODE_ENV = 'production';
const [command, args] = tasks[task];
const child = spawn(command, args, { cwd: root, env: environment, stdio: 'inherit' });
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
child.on('exit', code => { process.exitCode = code ?? 1; });
