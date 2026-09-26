'use strict';

/**
 * Integration test for the AUTH_TOKEN gate.
 *
 * Boots the actual server in a subprocess, then uses the real
 * socket.io-client to verify that a bad token is rejected with
 * 'connect_error = unauthorized' and a good token is accepted.
 *
 * Run only when you actually have a port free and the env wired up:
 *   AUTH_TOKEN=$(openssl rand -hex 32) node ./test/integration.test.js
 *
 * Skipped automatically if AUTH_TOKEN is not set or PORT is already in use.
 */

var assert = require('assert');
var cp = require('child_process');
var path = require('path');
var net = require('net');

var REQUIRED_TOKEN = process.env.AUTH_TOKEN;
if (!REQUIRED_TOKEN) {
  console.log('SKIP: AUTH_TOKEN not set; skipping integration test.');
  process.exit(0);
}

var PORT = Number(process.env.PORT) || 13999;

function portFree(port) {
  return new Promise(function (resolve) {
    var sock = net.connect(port, '127.0.0.1');
    sock.once('connect', function () { sock.end(); resolve(false); });
    sock.once('error',   function () { resolve(true);  });
  });
}

async function tryConnect(ioModule, url, token) {
  return new Promise(function (resolve, reject) {
    var sock = ioModule(url, {
      auth: { token: token },
      transports: ['websocket'],
      reconnection: false,
      timeout: 3000,
    });
    sock.on('connect',      function () { sock.close(); resolve('connected'); });
    sock.on('connect_error', function (e) { sock.close(); resolve('connect_error: ' + e.message); });
    setTimeout(function () { sock.close(); reject(new Error('test timeout')); }, 4000);
  });
}

(async function main() {
  if (!(await portFree(PORT))) {
    console.log('SKIP: port ' + PORT + ' is in use; another server may already be running.');
    process.exit(0);
  }

  console.log('Booting server on port ' + PORT + ' ...');
  var child = cp.spawn(process.execPath, [path.join(__dirname, '..', 'bin', 'www')], {
    env: Object.assign({}, process.env, { PORT: String(PORT), BIND: '127.0.0.1' }),
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stdout.on('data', function () { /* swallow */ });
  child.stderr.on('data', function () { /* swallow */ });

  // Wait for the server to start accepting connections
  var ready = false;
  for (var i = 0; i < 30 && !ready; i++) {
    await new Promise(function (r) { setTimeout(r, 200); });
    try {
      var sock = net.connect(PORT, '127.0.0.1');
      ready = await new Promise(function (resolve) {
        sock.once('connect',    function () { sock.end(); resolve(true);  });
        sock.once('error',      function () {                resolve(false); });
      });
    } catch (_) { ready = false; }
  }
  if (!ready) {
    child.kill();
    console.error('FAIL: server did not start within 6 seconds');
    process.exit(1);
  }

  var ioModule;
  try {
    ioModule = require(path.join(__dirname, '..', 'node_modules', 'socket.io-client')).io;
  } catch (err) {
    child.kill();
    console.error('SKIP: socket.io-client not installed; install with `npm install` first.');
    process.exit(0);
  }

  var url = 'http://127.0.0.1:' + PORT;
  var passed = 0, failed = 0;

  console.log('\nTest 1: bad token is rejected');
  var bad = await tryConnect(ioModule, url, 'WRONG_TOKEN').catch(function (e) { return 'error: ' + e.message; });
  if (/unauthorized/.test(bad)) {
    console.log('  ok   ' + bad);
    passed++;
  } else {
    console.error('  FAIL expected connect_error with "unauthorized", got: ' + bad);
    failed++;
  }

  console.log('\nTest 2: good token is accepted');
  var good = await tryConnect(ioModule, url, REQUIRED_TOKEN).catch(function (e) { return 'error: ' + e.message; });
  if (good === 'connected') {
    console.log('  ok   connection established');
    passed++;
  } else {
    console.error('  FAIL expected "connected", got: ' + good);
    failed++;
  }

  console.log('\nTest 3: empty token is rejected');
  var empty = await tryConnect(ioModule, url, '').catch(function (e) { return 'error: ' + e.message; });
  if (/unauthorized/.test(empty) || /error/.test(empty)) {
    console.log('  ok   ' + empty);
    passed++;
  } else {
    console.error('  FAIL expected unauthorized, got: ' + empty);
    failed++;
  }

  child.kill();
  setTimeout(function () {
    console.log('\n' + passed + ' passed, ' + failed + ' failed');
    process.exit(failed ? 1 : 0);
  }, 200);
})();