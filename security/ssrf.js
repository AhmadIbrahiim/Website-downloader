/**
 * SSRF (Server-Side Request Forgery) protection for the website downloader.
 *
 * The server runs `wget` on user-supplied URLs. Without this guard, an attacker
 * could probe cloud metadata endpoints (169.254.169.254), the internal docker
 * network, IPv6 link-local, or the loopback interface to leak secrets or
 * port-scan the host. The defaults below cover the common cloud + LAN
 * attack surfaces.
 *
 * Configuration is environment-driven so deployments can tighten or relax
 * the rules without touching code:
 *
 *   ALLOWED_HOSTNAMES   comma-separated exact hostnames to whitelist
 *                       (e.g. "github.com,raw.githubusercontent.com")
 *   ALLOWED_HOST_SUFFIX comma-separated suffix rules (".internal.example.com")
 *   BLOCKED_HOSTNAMES   comma-separated exact hostnames to blacklist
 *                       (always wins over allow; default = metadata services)
 *   ALLOW_PRIVATE_NETWORKS = "true" to disable the private-IP block
 *                       (default: false — production should keep this off)
 */

'use strict';

var dns = require('dns').promises;
var net = require('net');

// Curated blocklist of well-known metadata / localhost aliases that should
// never be reachable from a public-facing download tool.
var DEFAULT_BLOCKED_HOSTNAMES = [
  'localhost',
  'metadata.google.internal',
  'metadata',
  '169.254.169.254',
  'fd00:ec2::254',
  'instance-data.ec2.internal',
  'kubernetes.default.svc',
  'host.docker.internal',
  'gateway.docker.internal',
];

function parseList(envValue) {
  if (!envValue) return [];
  return String(envValue)
    .split(',')
    .map(function (s) { return s.trim().toLowerCase(); })
    .filter(Boolean);
}

/**
 * Synchronously classify an IP literal.
 * Returns one of: 'public' | 'private' | 'loopback' | 'linklocal' | 'multicast' | 'reserved' | 'unspec' | 'v4mapped'
 */
function classifyIPv4(ip) {
  var parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some(function (p) { return isNaN(p) || p < 0 || p > 255; })) {
    return 'invalid';
  }
  var o = parts[0], t = parts[1];
  if (o === 10) return 'private';
  if (o === 127) return 'loopback';
  if (o === 0)   return 'unspec';
  if (o >= 224 && o <= 239) return 'multicast';
  if (o >= 240) return 'reserved';
  if (o === 169 && t === 254) return 'linklocal';
  if (o === 172 && t >= 16 && t <= 31) return 'private';
  if (o === 192 && t === 168) return 'private';
  if (o === 100 && t >= 64 && t <= 127) return 'cgnat';   // 100.64.0.0/10
  if (o === 192 && t === 0)   return 'private';           // 192.0.0.0/24
  if (o === 192 && t === 88 && parts[2] === 99) return 'private'; // 6to4 anycast
  if (o === 198 && (t === 18 || t === 19)) return 'benchmark';
  if (o === 198 && t === 51 && parts[2] === 100) return 'private';
  if (o === 203 && t === 0 && parts[2] === 113) return 'private';
  if (o >= 1 && o <= 191) return 'public';
  return 'unknown';
}

function classifyIPv6(ip) {
  var lower = ip.toLowerCase();
  // Loopback
  if (lower === '::1' || lower === '::') return 'loopback';
  // IPv4-mapped IPv6 ::ffff:a.b.c.d
  var v4mapped = lower.match(/^::ffff:([0-9.]+)$/);
  if (v4mapped) return classifyIPv4(v4mapped[1]);
  // Multicast ff00::/8
  if (/^ff[0-9a-f]{2}:/i.test(lower)) return 'multicast';
  // Link-local fe80::/10
  if (/^fe[89ab][0-9a-f]:/i.test(lower)) return 'linklocal';
  // Unique-local fc00::/7 (fc.. or fd..)
  if (/^[fcd][cd]/i.test(lower.slice(0, 2))) return 'private';
  // Documentation 2001:db8::/32
  if (/^2001:db8:/i.test(lower)) return 'reserved';
  // Discard prefix 0100::/64 (RFC 6666)
  if (/^0100:/i.test(lower)) return 'reserved';
  // 6to4 2002::/16 (depends on embedded IPv4; treat as public unless that
  // IPv4 itself is private — too coarse here, classify as public)
  return 'public';
}

function classifyIP(ip) {
  // Strip IPv6 zone id (e.g. fe80::1%eth0)
  var bare = ip.split('%')[0];
  if (net.isIPv4(bare)) return classifyIPv4(bare);
  if (net.isIPv6(bare)) return classifyIPv6(bare);
  return 'invalid';
}

/**
 * Synchronously block an IP literal before any DNS lookup.
 */
function isBlockedIPLiteral(hostname) {
  var cls = classifyIP(hostname);
  if (cls === 'invalid') return 'invalid hostname';
  if (cls === 'loopback' || cls === 'linklocal' || cls === 'private' ||
      cls === 'multicast' || cls === 'reserved' || cls === 'unspec' ||
      cls === 'cgnat' || cls === 'benchmark') {
    return 'IP literal in ' + cls + ' range';
  }
  return null;
}

/**
 * Async: resolve a hostname, then check every A/AAAA record.
 * Returns null on success, or a string describing the first blocked IP.
 */
async function isBlockedHost(hostname, opts) {
  opts = opts || {};
  var allowPrivate = opts.allowPrivate === true;
  var blockedHosts = (opts.blockedHosts || DEFAULT_BLOCKED_HOSTNAMES).map(function (h) { return h.toLowerCase(); });

  var lower = hostname.toLowerCase();
  if (blockedHosts.indexOf(lower) !== -1) return 'hostname is on the blocklist';

  var literalBlock = isBlockedIPLiteral(lower);
  if (literalBlock) return literalBlock;

  // DNS-resolve and inspect every result.
  var addresses = [];
  try {
    var v4 = await dns.resolve4(lower).catch(function () { return []; });
    var v6 = await dns.resolve6(lower).catch(function () { return []; });
    addresses = v4.concat(v6);
  } catch (err) {
    // Treat DNS failures as "could not be classified" rather than as a hard
    // block. The synchronous hostname blocklist has already run by this
    // point, so a name that passes the blocklist but fails DNS is genuinely
    // unresolvable — caller's URL fetcher will surface a clearer error than
    // a generic "blocked" message.
    addresses = [];
  }
  if (addresses.length === 0) return null;

  for (var i = 0; i < addresses.length; i++) {
    var cls = classifyIP(addresses[i]);
    if (!allowPrivate &&
        (cls === 'loopback' || cls === 'linklocal' || cls === 'private' ||
         cls === 'multicast' || cls === 'reserved' || cls === 'unspec' ||
         cls === 'cgnat' || cls === 'benchmark')) {
      return 'resolves to ' + cls + ' IP (' + addresses[i] + ')';
    }
  }
  return null;
}

/**
 * Synchronous hostname-pattern checks against the configured allow/block
 * lists. Run this BEFORE the async DNS check.
 */
function isBlockedByName(hostname, opts) {
  opts = opts || {};
  var lower = hostname.toLowerCase();
  var allowed = (opts.allowedHostnames || []).map(function (h) { return h.toLowerCase(); });
  var allowedSuffix = (opts.allowedSuffix || []).map(function (h) { return h.toLowerCase(); });
  var blocked = (opts.blockedHostnames || DEFAULT_BLOCKED_HOSTNAMES).map(function (h) { return h.toLowerCase(); });

  if (blocked.indexOf(lower) !== -1) return 'hostname is on the blocklist';
  if (allowed.length > 0 && allowed.indexOf(lower) === -1 &&
      !allowedSuffix.some(function (suf) { return lower.endsWith(suf); })) {
    return 'hostname not on the allowlist';
  }
  return null;
}

function getOptions() {
  return {
    allowedHostnames: parseList(process.env.ALLOWED_HOSTNAMES),
    allowedSuffix:    parseList(process.env.ALLOWED_HOST_SUFFIX),
    blockedHostnames: parseList(process.env.BLOCKED_HOSTNAMES).length
                       ? parseList(process.env.BLOCKED_HOSTNAMES).concat(DEFAULT_BLOCKED_HOSTNAMES)
                       : DEFAULT_BLOCKED_HOSTNAMES,
    allowPrivate:     process.env.ALLOW_PRIVATE_NETWORKS === 'true',
  };
}

module.exports = {
  classifyIP: classifyIP,
  isBlockedIPLiteral: isBlockedIPLiteral,
  isBlockedByName: isBlockedByName,
  isBlockedHost: isBlockedHost,
  getOptions: getOptions,
};