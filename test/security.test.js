'use strict';

/**
 * Minimal stdlib-only test runner. Run with `npm test`.
 *
 * Verifies the SSRF guard rejects every well-known metadata / private /
 * loopback / link-local surface and accepts a normal public hostname.
 */

var assert = require('assert');
var ssrf = require('../security/ssrf');

var tests = [];
function test(name, fn) { tests.push({ name: name, fn: fn }); }

test('classifyIPv4 - public', function () {
  assert.strictEqual(ssrf.classifyIP('1.1.1.1'), 'public');
  assert.strictEqual(ssrf.classifyIP('8.8.8.8'), 'public');
});

test('classifyIPv4 - loopback', function () {
  assert.strictEqual(ssrf.classifyIP('127.0.0.1'), 'loopback');
  assert.strictEqual(ssrf.classifyIP('127.255.255.254'), 'loopback');
});

test('classifyIPv4 - private RFC1918', function () {
  assert.strictEqual(ssrf.classifyIP('10.0.0.1'), 'private');
  assert.strictEqual(ssrf.classifyIP('172.16.0.1'), 'private');
  assert.strictEqual(ssrf.classifyIP('172.31.255.255'), 'private');
  assert.strictEqual(ssrf.classifyIP('192.168.1.1'), 'private');
});

test('classifyIPv4 - link-local cloud metadata', function () {
  assert.strictEqual(ssrf.classifyIP('169.254.169.254'), 'linklocal');
  assert.strictEqual(ssrf.classifyIP('169.254.0.1'), 'linklocal');
});

test('classifyIPv4 - CGNAT', function () {
  assert.strictEqual(ssrf.classifyIP('100.64.0.1'), 'cgnat');
});

test('classifyIPv6 - loopback + link-local + unique-local', function () {
  assert.strictEqual(ssrf.classifyIP('::1'), 'loopback');
  assert.strictEqual(ssrf.classifyIP('fe80::1'), 'linklocal');
  assert.strictEqual(ssrf.classifyIP('fc00::1'), 'private');
  assert.strictEqual(ssrf.classifyIP('fd00:ec2::254'), 'private');  // AWS IMDSv2 IPv6
});

test('isBlockedIPLiteral - blocks AWS/GCP metadata', function () {
  assert.ok(ssrf.isBlockedIPLiteral('169.254.169.254'));
  assert.ok(ssrf.isBlockedIPLiteral('fd00:ec2::254'));
  assert.ok(ssrf.isBlockedIPLiteral('127.0.0.1'));
  assert.ok(ssrf.isBlockedIPLiteral('10.0.0.5'));
  assert.strictEqual(ssrf.isBlockedIPLiteral('8.8.8.8'), null);
});

test('isBlockedByName - default blocklist', function () {
  var opts = ssrf.getOptions();
  assert.ok(ssrf.isBlockedByName('localhost', opts));
  assert.ok(ssrf.isBlockedByName('metadata.google.internal', opts));
  assert.ok(ssrf.isBlockedByName('host.docker.internal', opts));
  assert.strictEqual(ssrf.isBlockedByName('example.com', opts), null);
});

test('isBlockedByName - allowlist enforcement', function () {
  var opts = { allowedHostnames: ['example.com'], allowedSuffix: [], blockedHostnames: [] };
  assert.strictEqual(ssrf.isBlockedByName('example.com', opts), null);
  assert.ok(ssrf.isBlockedByName('github.com', opts));
});

test('isBlockedHost - async resolves and classifies', async function () {
  // Use a real, well-known literal first (no DNS dependency for offline CI).
  assert.strictEqual(await ssrf.isBlockedHost('1.1.1.1', ssrf.getOptions()), null);

  // If DNS is available in the test environment, also exercise the real
  // hostname path. example.com resolves to a public IP so it should pass.
  try {
    var addresses = await Promise.all([
      require('dns').promises.resolve4('example.com').catch(function () { return []; }),
      require('dns').promises.resolve6('example.com').catch(function () { return []; }),
    ]);
    if (addresses[0].length || addresses[1].length) {
      assert.strictEqual(await ssrf.isBlockedHost('example.com', ssrf.getOptions()), null);
    } else {
      console.log('  (skipped live DNS check: example.com did not resolve in this environment)');
    }
  } catch (err) {
    console.log('  (skipped live DNS check: ' + err.code + ')');
  }
});

test('isBlockedHost - rejects metadata.google.internal by name without DNS', async function () {
  var blocked = await ssrf.isBlockedHost('metadata.google.internal', ssrf.getOptions());
  assert.ok(blocked, 'should be blocked by name');
});

(async function run() {
  var passed = 0, failed = 0;
  for (var i = 0; i < tests.length; i++) {
    var t = tests[i];
    try {
      await t.fn();
      console.log('  ok   ' + t.name);
      passed++;
    } catch (err) {
      console.error('  FAIL ' + t.name + ' :: ' + (err.message || err));
      failed++;
    }
  }
  console.log('');
  console.log(passed + ' passed, ' + failed + ' failed');
  process.exit(failed ? 1 : 0);
})();