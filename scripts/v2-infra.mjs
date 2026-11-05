import { mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import net from 'node:net';

const base = join(homedir(), '.local/share/cruisin-v2');
for (const directory of ['', 'mongo', 'redis', 'logs']) mkdirSync(join(base, directory), { recursive: true, mode: 0o700 });
const listening = port => new Promise(resolve => {
  const socket = net.connect({ host: '127.0.0.1', port });
  socket.once('connect', () => { socket.destroy(); resolve(true); });
  socket.once('error', () => resolve(false));
});
const commands = [
  [27983, '/opt/homebrew/opt/mongodb-community@8.0/bin/mongod', ['--dbpath', join(base, 'mongo'), '--bind_ip', '127.0.0.1', '--port', '27983', '--replSet', 'rsCruisinV2', '--logpath', join(base, 'logs/mongo.log'), '--fork']],
  [6392, 'redis-server', ['--bind', '127.0.0.1', '--port', '6392', '--dir', join(base, 'redis'), '--appendonly', 'yes', '--daemonize', 'yes', '--logfile', join(base, 'logs/redis.log')]]
];
for (const [port, executable, args] of commands) {
  if (await listening(port)) { console.log(`Port ${port} already listening; no restart performed`); continue; }
  const result = spawnSync(executable, args, { stdio: 'inherit' });
  if (result.status !== 0) throw new Error(`Failed to start isolated service at ${port}`);
}

const replica = spawnSync(process.execPath, ['scripts/v2-enable-replica.mjs'], { stdio: 'inherit' });
if (replica.status !== 0) throw new Error('Local replica-set verification failed');
