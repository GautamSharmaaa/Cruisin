#!/usr/bin/env python3
"""Authenticate the manifest, then verify every backup file before recovery."""
import argparse
import hashlib
import hmac
import json
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument('backup', type=Path)
parser.add_argument('--key-file', required=True, type=Path)
args = parser.parse_args()
root = args.backup.resolve()
manifest = (root / 'manifests/inventory.json').read_bytes()
expected = (root / 'manifests/inventory.hmac-sha256').read_text().strip()
actual = hmac.new(args.key_file.read_bytes(), manifest, hashlib.sha256).hexdigest()
if not hmac.compare_digest(expected, actual):
    raise SystemExit('Manifest authentication FAILED; do not decrypt or restore')
rows = json.loads(manifest)
for row in rows:
    path = (root / row['path']).resolve()
    if root not in path.parents:
        raise SystemExit('Unsafe path in authenticated manifest')
    digest = hashlib.sha256()
    with path.open('rb') as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b''):
            digest.update(chunk)
    if path.stat().st_size != row['bytes'] or digest.hexdigest() != row['sha256']:
        raise SystemExit(f"Checksum FAILED: {row['path']}")
print(f'PASS: authenticated manifest and SHA-256 checksums for {len(rows)} files')
