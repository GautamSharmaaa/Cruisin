// Governed by .rules v1.0
import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const workspace = process.cwd();
const bundleRoots = [
  path.join(workspace, 'client', '.next', 'static'),
  path.join(workspace, 'admin', '.next', 'static')
];
const serverOnlyMarkers = [
  'SHIPROCKET_API_EMAIL',
  'SHIPROCKET_API_PASSWORD',
  'SHIPROCKET_WEBHOOK_SECRET',
  'https://apiv2.shiprocket.in/v1/external'
];
const configuredSecrets = [
  process.env.SHIPROCKET_API_EMAIL,
  process.env.SHIPROCKET_API_PASSWORD,
  process.env.SHIPROCKET_WEBHOOK_SECRET
].filter((value) => typeof value === 'string' && value.length >= 6);

const filesUnder = async (root) => {
  const rootStat = await stat(root).catch(() => null);
  if (!rootStat?.isDirectory()) throw new Error(`Missing built frontend bundle: ${path.relative(workspace, root)}`);
  const files = [];
  const visit = async (directory) => {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const target = path.join(directory, entry.name);
      if (entry.isDirectory()) await visit(target);
      else if (entry.isFile()) files.push(target);
    }
  };
  await visit(root);
  return files;
};

const violations = [];
let scannedFiles = 0;
for (const root of bundleRoots) {
  for (const file of await filesUnder(root)) {
    scannedFiles += 1;
    const content = await readFile(file, 'utf8');
    for (const marker of [...serverOnlyMarkers, ...configuredSecrets]) {
      if (content.includes(marker)) violations.push(`${path.relative(workspace, file)} contains ${serverOnlyMarkers.includes(marker) ? marker : 'a configured Shiprocket secret'}`);
    }
  }
}

if (violations.length > 0) {
  throw new Error(`Frontend Shiprocket secret scan failed:\n${violations.join('\n')}`);
}
console.log(`Frontend Shiprocket secret scan passed (${scannedFiles} built files).`);
