var wget = require('../wget');
var audit = require('../security/audit').create();

// Token-based auth gate. If AUTH_TOKEN is unset the server refuses to start
// so an operator cannot accidentally boot an open relay. Set AUTH_TOKEN to a
// long random string and share it out-of-band with users you want to allow.
var REQUIRED_TOKEN = process.env.AUTH_TOKEN;
if (!REQUIRED_TOKEN || REQUIRED_TOKEN.length < 16) {
  console.error('FATAL: AUTH_TOKEN environment variable must be set to a string of 16+ characters.');
  console.error('       Refusing to start the server without an auth token.');
  process.exit(1);
}

// Per-IP sliding window for the socket layer. Express-rate-limit is not the
// right tool for socket.io because we are not behind a request handler.
function makeRateLimiter(opts) {
  opts = opts || {};
  var windowMs = opts.windowMs || 60 * 1000;        // 1 minute
  var max = opts.max || 10;                          // 10 requests / minute / IP
  var buckets = new Map();
  function hit(ip) {
    var now = Date.now();
    var entry = buckets.get(ip) || { start: now, count: 0 };
    if (now - entry.start > windowMs) { entry = { start: now, count: 0 }; }
    entry.count += 1;
    buckets.set(ip, entry);
    return entry.count > max ? (now - entry.start) : 0;
  }
  // Garbage-collect buckets older than 10 windows
  setInterval(function () {
    var cutoff = Date.now() - windowMs * 10;
    for (var pair of buckets.entries()) {
      if (pair[1].start < cutoff) buckets.delete(pair[0]);
    }
  }, windowMs * 5).unref();
  return { hit: hit };
}

module.exports = (io) => {
  var limiter = makeRateLimiter({
    windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 60 * 1000,
    max:      Number(process.env.RATE_LIMIT_MAX)       || 10,
  });

  // Layer-2 socket.io middleware. socket.io 4.x runs this on every transport
  // BEFORE the `connection` event fires, so an unauthorized peer is rejected
  // here without ever reaching the `io.on('connection', ...)` callback. The
  // engine.io polling handshake itself still gets a sid (that's the protocol
  // design), but no `connection` event will fire on the server side, so no
  // request handler can run.
  //
  // We accept the token via either the modern `auth` payload (set by the
  // 4.x client) or the legacy `query.token` parameter (so curl-based
  // smoke-tests and any 2.x-era client still works).
  io.use(function (socket, next) {
    var presented =
      (socket.handshake.auth && socket.handshake.auth.token) ||
      (socket.handshake.query && socket.handshake.query.token) ||
      (socket.handshake.headers && (
        socket.handshake.headers['x-auth-token'] ||
        (socket.handshake.headers.authorization || '').replace(/^Bearer /, '')
      ));
    if (!presented || presented !== REQUIRED_TOKEN) {
      return next(new Error('unauthorized'));
    }
    next();
  });

  io.on('connection', function (socket) {
    socket.on('request', async function (data) {
      var ip = (socket.request && socket.request.socket && socket.request.socket.remoteAddress) || 'unknown';

      if (!data || typeof data.token !== 'string' || !data.token) {
        socket.emit(data && data.token, { error: 'Missing request token.' });
        return;
      }

      var retryAfter = limiter.hit(ip);
      if (retryAfter) {
        socket.emit(data.token, {
          error: 'Too many requests from this IP. Try again in ' +
                 Math.ceil(retryAfter / 1000) + ' seconds.',
        });
        return;
      }

      if (socket.job) {
        socket.emit(data.token, { error: 'A download is already running on this connection.' });
        return;
      }

      console.log('Request connection received %s', data.token);
      try {
        socket.job = await wget(socket, data, function () { socket.job = null; }, audit);
      } catch (err) {
        console.error('wget() threw unexpectedly:', err);
        socket.emit(data.token, { error: 'Internal error starting the download.' });
        socket.job = null;
      }
    });

    socket.on('disconnect', function () {
      // Stop the wget process and remove partially downloaded files
      if (socket.job) {
        socket.job.cancel();
        socket.job = null;
      }
    });
  });
};