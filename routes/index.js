var express = require('express');
var router = express.Router();

// Pulled from the same env var the socket.io handshake checks against.
// Surfaced to the view so the client can present it on connect. The token
// is shared via the render context (not embedded in a static file) so it
// can be rotated without redeploying JS bundles.
var AUTH_TOKEN = process.env.AUTH_TOKEN;
if (!AUTH_TOKEN || AUTH_TOKEN.length < 16) {
  // Same fatal guard as in socket/socket.js — duplicated here so the page
  // renders nothing useful if AUTH_TOKEN is unset, even before a websocket
  // attempt is made.
  console.error('FATAL: AUTH_TOKEN must be set to 16+ characters before starting the server.');
  process.exit(1);
}

/* GET home page. */
router.get('/', function (req, res, next) {
  res.render('index', {
    title: 'Website downloader - Take any website offline.',
    authToken: AUTH_TOKEN,
  });
});

module.exports = router;