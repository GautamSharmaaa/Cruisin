import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

// Supplemental credential scan; provider revocation and a dedicated scanner are
// still required before release. Never print matched credential contents.
const tracked = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z']).toString().split('\0').filter(Boolean);
const rules = [
  ['private key', /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
  ['GitHub token', /\b(?:ghp|gho|ghu|ghs|github_pat)_[A-Za-z0-9_]{30,}\b/],
  ['AWS key', /\bAKIA[A-Z0-9]{16}\b/],
  ['MongoDB password URI', /mongodb(?:\+srv)?:\/\/[^\s/:@]+:[^\s@]+@(?!localhost|127\.0\.0\.1|[^/\s]*example)/]
];
let failures = 0;
for (const path of tracked) {
  const bytes = readFileSync(path);
  if (bytes.includes(0)) continue;
  for (const [name, expression] of rules) if (expression.test(bytes.toString().replace(/mongodb(?:\+srv)?:\/\/<[^>]+>:<[^>]+>@<[^>]+>/g, 'mongodb://documented-placeholder'))) { failures++; console.error(`${path}: suspected ${name}`); }
}
console.log(`Scanned ${tracked.length} source files; findings: ${failures}`);
process.exitCode = failures ? 1 : 0;
