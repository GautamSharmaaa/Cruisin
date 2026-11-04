Verified on 2026-11-04T16:26:13.682605+05:30. Evidence directory: `/Users/gautam/Cruisin-Backups/2026-11-04_16-03-11/verification/`. No production writes, deploys, restarts, variable changes or DNS edits were performed.

# Local recovery assets

Backup root: `/Users/gautam/Cruisin-Backups/2026-11-04_16-03-11` (0700). Separate recovery key: `/Users/gautam/.Cruisin-Recovery-Keys/2026-11-04_16-03-11.key` (0600), generated randomly without displaying it. Keep an offline protected copy of that key; loss of it prevents recovery. Nothing was uploaded.

`source-code/checkout.tar.gz.enc` includes the entire original checkout, Git internals, tracked/untracked/ignored files, local documentation, provider configuration and dependency/build artifacts. No ignored files were silently omitted. Full decryption and tar listing passed. Independently compared 45,330 original files and symlinks against the archive: zero differences outside Git internals and macOS AppleDouble metadata.

`git-history/all-refs.bundle.enc` contains all original committed refs; git bundle verify passed before encryption, then decrypted bytes matched exactly. Original status (267 entries), branches, refs and registered worktrees are recorded separately. Fetch was non-pruning; no branch/worktree was deleted.

Encryption: OpenSSL AES-256-CBC, random salt, PBKDF2 200,000 iterations, random high-entropy key file. The SHA-256 inventory is authenticated with HMAC-SHA256 using the separate key. Verify the authenticated inventory before decryption; CBC alone does not authenticate ciphertext.

Configuration exports: all four Railway services' raw variables, environment settings, source/deployment metadata, GitHub repository/actions settings and MongoDB metadata are encrypted. Secret-free variable-name lists are separate. Cloudflare account configuration and Atlas control-plane snapshots remain unavailable. Redis has a mounted production volume and `--save 60 1`; no RDB sync, BGSAVE or persistence change was requested.

Cloudinary: 754 original upload assets, 1,492,308,407 plaintext bytes, each encrypted separately; metadata is encrypted. All decrypt and byte-count checks pass; plaintext SHA-256 hashes are inventoried. The list API did not supply ETags, so source-provider hash comparison is NOT VERIFIED. Authenticated/private assets and external non-Cloudinary URLs were not enumerated. Authoritative catalogue/CMS data is in MongoDB; URLs alone do not recover external assets.

Sizes and per-file checksums are in `manifests/inventory.json`; final aggregate sizes are recorded in the setup report. This is a local recovery copy, not an offsite backup or a recurring backup schedule.

`source-code/v2-prepared.tar.gz.enc` separately preserves the completed V2 source, documentation and private local configuration, excluding dependency/build caches. Decrypt/list verification passed.
