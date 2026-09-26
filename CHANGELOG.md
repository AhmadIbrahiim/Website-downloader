# v0.1.0 — Hardened security release (2026-09-27)

This is the first release of the security-hardened fork of
[`AhmadIbrahiim/Website-downloader`](https://github.com/AhmadIbrahiim/Website-downloader).

## Security fixes (vs upstream `master`)

### Critical / High (24 dep CVEs → 0)

| Package | Upstream | Fork | Notable CVEs fixed |
|---|---|---|---|
| `express` | `~4.19.2` | `^4.21.2` | CVE-2024-29041 open-redirect, multiple prototype-pollution fixes |
| `socket.io` | `^2.5.0` | `^4.8.1` | CVE-2024-38355 stream DoS, CVE-2023-32695 protocol-parser memory-leak |
| `archiver` | `^3.1.1` | `^7.0.1` | Deprecation-related CVEs; new tar/symlink hardening |
| `jszip` | `^3.8.0` | `^3.10.1` | CVE-2022-48285 zip-slip / symlink traversal |

### Authentication & authorization

- **NEW:** `AUTH_TOKEN` env var required at startup; server refuses to boot without it
- **NEW:** socket.io middleware rejects handshakes without the matching token
- **NEW:** `BIND` defaults to `127.0.0.1` (was `0.0.0.0`)

### SSRF protection

- **NEW:** Hostname blocklist (`localhost`, cloud metadata services, `host.docker.internal`, etc.)
- **NEW:** Async DNS resolution + IP-range classifier (RFC1918, loopback, link-local, IPv6 ULA, CGNAT, multicast, reserved)
- **NEW:** Optional `ALLOWED_HOSTNAMES` / `ALLOWED_HOST_SUFFIX` whitelist
- **NEW:** `wget --max-redirect=5` (was unlimited)

### DoS protection

- **NEW:** Per-IP sliding-window rate limit (default 10 req/min/IP)
- **NEW:** `MAX_OUTPUT_BYTES` archive cap (default 200 MB) — zip bomb guard
- **NEW:** Progress messages from wget stderr capped at 4 KB

### Audit & logging

- **NEW:** JSON-lines audit log (`./logs/downloads.log`)
- **NEW:** Optional `AUDIT_REDACT_URL=true` to hash URLs in the log
- **NEW:** `npm run audit` runs `npm audit --omit=dev`

### HTTP hardening

- **NEW:** Security headers (`X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`, `Content-Security-Policy`)
- **NEW:** JSON / URL-encoded body limit set to 64 KB
- **REMOVED:** `/public/*` blanket mount; only `/static/*` exposed (the per-site generated zips go through the socket and stream, not through Express static)
- **REMOVED:** Google Analytics (`gtag.js`)
- **REMOVED:** GitHub buttons.js tracker

### Code quality

- **NEW:** `npm test` runs SSRF unit tests (RFC1918, loopback, link-local, CGNAT, IPv6 ULA, etc.)
- **NEW:** Bug carried from upstream — `execFile` was already used (good), but the SSRF blocker is new

## Migration from upstream

```bash
# In a fresh checkout of the upstream:
git remote add hardened https://github.com/aa01024273697-alt/Website-downloader.git
git fetch hardened
git checkout hardened/hardened/v0.1.0-security-fixes   # or master

npm install

# Generate and export the AUTH_TOKEN (server refuses to start without one):
export AUTH_TOKEN="$(openssl rand -hex 32)"

# (Optional) Whitelist the sites you want to allow:
export ALLOWED_HOSTNAMES="example.com,another.example.org"
export ALLOWED_HOST_SUFFIX=".githubusercontent.com"

npm start
```

## What was NOT changed

- `wget --mirror --convert-links --adjust-extension --page-requisites --no-parent` — the actual download command is unchanged, by design. If you want a different mirror strategy, override the `execFile('wget', [...])` call in `wget/index.js`.
- The zip output is still delivered as a static file at `/sites/<zip>.zip`.
- `wget` is still the only required system binary. Replace with `httrack` or `curl` for a different policy.

## Files added

```
security/ssrf.js          SSRF guard (sync classifier + async DNS check)
security/audit.js         Audit-log writer (JSON lines, optional URL hashing)
test/security.test.js     Unit tests for the SSRF guard
docs/SECURITY-AUDIT.md    The 3-stage audit findings that motivated this fork
```

## Files modified

```
package.json               Bumped all deps; added engines / audit / test scripts
app.js                     Security headers + body limits + /static mount only
bin/www                    Default BIND=127.0.0.1 + startup banner
routes/index.js            Render context passes AUTH_TOKEN to the view
socket/socket.js           AUTH_TOKEN handshake gate + per-IP rate limiter
wget/index.js              parseTarget is now async; runs SSRF guard before exec
                           --max-redirect=5 added
                           audit logger wired in
archiver/index.js          Zip bomb guard (MAX_OUTPUT_BYTES cap)
views/layout.hbs           socket.io 4.x client API + auth.token on handshake;
                           Google Analytics + GitHub buttons removed
README.md                  Full rewrite with security section + env-var table
.gitignore                 logs/ already excluded (from upstream)
```