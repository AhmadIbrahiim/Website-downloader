# Website Downloader — Hardened Fork 💾🔒

> Hardened, security-focused fork of
> [`AhmadIbrahiim/Website-downloader`](https://github.com/AhmadIbrahiim/Website-downloader).
> Downloads any public website as static files (HTML, JS, CSS, images)
> using `wget` and zips the result for offline viewing.

## Why this fork exists

The upstream repo is a popular demo but ships with **24 known dependency
vulnerabilities** (1 critical, 11 high, 6 low) and **no security controls**:

- ❌ No authentication — anyone can use the server
- ❌ No SSRF protection — `http://169.254.169.254/...` works
- ❌ No rate limiting — trivial DoS
- ❌ No audit logging
- ❌ Defaults to `0.0.0.0` (publicly reachable)
- ❌ Pins deps to vulnerable 2019-era versions
- ❌ Tracks users with Google Analytics + GitHub buttons on every page

This fork adds the missing security controls and bumps every dependency
to a release with the relevant CVEs patched. The download logic itself is
unchanged — `wget --mirror` is still the workhorse.

## What's hardened

| Concern | Upstream | This fork |
|---|---|---|
| **Auth** | none | `AUTH_TOKEN` env var, validated on socket.io handshake; server refuses to start without it |
| **SSRF** | none | Hostname blocklist + DNS resolution + IP-range classifier (loopback, RFC1918, link-local, IPv6 ULA, CGNAT, multicast, etc.) |
| **Rate limit** | none | 10 req/min/IP sliding window; tunable via env |
| **Audit log** | none | JSON-lines log to `./logs/downloads.log` (redact URLs with `AUDIT_REDACT_URL=true`) |
| **Bind address** | `0.0.0.0` | `127.0.0.1` default; opt-in with `BIND=0.0.0.0` |
| **Dependencies** | `express ~4.19.2`, `socket.io ^2.5.0`, `archiver ^3.1.1`, `jszip ^3.8.0` (24 CVEs) | `express ^4.21.2`, `socket.io ^4.8.1`, `archiver ^7.0.1`, `jszip ^3.10.1` |
| **Headers** | none | `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`, `Content-Security-Policy` |
| **Zip bomb** | none | Archive capped at `MAX_OUTPUT_BYTES` (default 200 MB); aborted mid-stream if exceeded |
| **wget redirects** | unlimited | `--max-redirect=5` |
| **Progress log injection** | yes (innerHTML on attacker-controlled stderr) | textContent, 4 KB cap per chunk |
| **Static directory** | serves entire `public/` | only `/static/*` exposed |
| **Tracking** | Google Analytics + GitHub buttons | removed |
| **Tests** | none | `npm test` runs SSRF unit tests against RFC1918, loopback, link-local, CGNAT, IPv6 |

## Quick start

```bash
git clone https://github.com/aa01024273697-alt/Website-downloader.git
cd Website-downloader
npm install

# 1. Set a long random AUTH_TOKEN (required — server will refuse to start otherwise)
export AUTH_TOKEN="$(openssl rand -hex 32)"

# 2. (optional) whitelist only the hosts you intend to mirror
export ALLOWED_HOSTNAMES="example.com"
export ALLOWED_HOST_SUFFIX=".example.com"

# 3. Start
npm start
# Listening on http://127.0.0.1:3000
```

Open `http://127.0.0.1:3000/` in a browser, paste a URL, hit Download.

> The page is the **only** client that can talk to the server. Every browser
> that loads it gets the same `AUTH_TOKEN` injected through the rendered
> template; clients without the token are rejected at the socket.io handshake
> with `Error: unauthorized`.

## Configuration reference

All settings are environment variables. Defaults shown.

| Var | Default | Purpose |
|---|---|---|
| `PORT` | `3000` | HTTP listen port |
| `BIND` | `127.0.0.1` | Bind interface. Use `0.0.0.0` **only** behind a reverse proxy. |
| `AUTH_TOKEN` | **(required)** | 16+ char shared secret for the socket.io handshake. Server refuses to start without it. |
| `ALLOWED_HOSTNAMES` | *(unset)* | Comma-separated exact hostnames allowed for `wget`. |
| `ALLOWED_HOST_SUFFIX` | *(unset)* | Comma-separated suffixes allowed (e.g. `.example.com`). |
| `BLOCKED_HOSTNAMES` | metadata services | Extra exact hostnames to block. |
| `ALLOW_PRIVATE_NETWORKS` | `false` | Set `true` only for trusted environments. |
| `DOWNLOAD_QUOTA` | `100m` | wget `--quota` per request. |
| `DOWNLOAD_TIMEOUT_MS` | `300000` | Per-request wget timeout. |
| `MAX_OUTPUT_BYTES` | `209715200` | Archive size cap (zip bomb guard). |
| `RATE_LIMIT_WINDOW_MS` | `60000` | Sliding window length per IP. |
| `RATE_LIMIT_MAX` | `10` | Max requests per window per IP. |
| `AUDIT_LOG_PATH` | `./logs/downloads.log` | JSON-lines audit log destination. |
| `AUDIT_REDACT_URL` | `false` | Hash URLs in the audit log (sha256-16). |

## Deploying behind a reverse proxy

```nginx
# nginx example
server {
  listen 443 ssl http2;
  server_name downloader.example.com;
  ssl_certificate     /etc/letsencrypt/live/downloader.example.com/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/downloader.example.com/privkey.pem;

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    # Defense in depth: refuse requests that didn't come through 443
    if ($scheme != "https") { return 444; }
  }
}
```

Then run the app with `BIND=127.0.0.1` (default).

## Audit log format

One JSON object per line. Schema:

```json
{
  "_v": 1,
  "ts": "2026-09-27T07:15:42.123Z",
  "ip": "203.0.113.5",
  "url": "https://example.com/",
  "outcome": "completed",
  "durationMs": 12453,
  "extra": { "bytes": 102400, "zip": "example.com-abc12345" }
}
```

`outcome` is one of:

| Value | Meaning |
|---|---|
| `parse-error` | URL parse failed |
| `rejected` | SSRF/host block |
| `mkdir-error` | Could not create working dir |
| `wget-failed` | wget exited non-zero or downloaded nothing |
| `cancelled` | User disconnected mid-download |
| `archive-failed` | Zip exceeded size cap or failed to write |
| `completed` | Zip delivered |

Useful queries:

```bash
# Top requested hosts in the last 24h
jq -r 'select(.ts > (now - 86400 | todate)) | .url' logs/downloads.log | sort | uniq -c | sort -rn | head

# All rejected attempts (potential probe traffic)
jq -c 'select(.outcome == "rejected" or .outcome == "parse-error")' logs/downloads.log
```

## Security review

This fork was produced after a 3-stage audit of the upstream repo using
the `audit-github-repo` SOP. See [`docs/SECURITY-AUDIT.md`](docs/SECURITY-AUDIT.md)
for the original findings matrix.

## Requirements

- Node.js ≥ 18 (uses `dns.promises`, native fetch)
- `wget` installed on the host (`apt install wget` / `brew install wget`)

## License

MIT — same as upstream.