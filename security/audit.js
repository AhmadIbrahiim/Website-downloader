/**
 * Append-only audit log for every download request.
 *
 * Writes one JSON line per attempt to AUDIT_LOG_PATH (default: ./logs/downloads.log).
 * The schema is intentionally flat so a single `grep` or `jq -c` pipeline
 * can be used for incident response.
 *
 * Recommended ops:
 *   tail -F logs/downloads.log | jq -c 'select(.outcome=="rejected" or .outcome=="parse-error")'
 *   jq -c '.url' logs/downloads.log | sort | uniq -c | sort -rn | head
 *
 * IMPORTANT: do NOT log the raw URL in plaintext if you deploy this for
 * a multi-tenant environment where the log file is world-readable. Pass
 * `redactUrl: true` in the constructor to hash the URL instead.
 */

'use strict';

var fs = require('fs');
var path = require('path');
var crypto = require('crypto');

var LOG_PATH = process.env.AUDIT_LOG_PATH || path.join(process.cwd(), 'logs', 'downloads.log');
var REDACT_URL = process.env.AUDIT_REDACT_URL === 'true';

function ensureDir(p) {
  var dir = path.dirname(p);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true, mode: 0o750 });
}

function shortHash(s) {
  return crypto.createHash('sha256').update(String(s)).digest('hex').slice(0, 16);
}

function createAuditLogger(opts) {
  opts = opts || {};
  var logPath = opts.path || LOG_PATH;
  var redact = opts.redactUrl !== undefined ? opts.redactUrl : REDACT_URL;

  ensureDir(logPath);

  var stream = fs.createWriteStream(logPath, { flags: 'a', mode: 0o640 });

  function record(entry) {
    var line = JSON.stringify(Object.assign({
      _v: 1,
      ts: new Date().toISOString(),
    }, entry));
    if (redact && entry && entry.url) {
      line = JSON.stringify(Object.assign(entry, {
        url: 'sha256:' + shortHash(entry.url),
        urlRedacted: true,
      }));
    }
    stream.write(line + '\n');
  }

  return {
    record: record,
    path: logPath,
    close: function () { stream.end(); },
  };
}

module.exports = {
  create: createAuditLogger,
};