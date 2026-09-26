var archiver = require('archiver');
var fs = require('fs');
var path = require('path');

var SITES_DIR = path.join(__dirname, '..', 'public', 'sites');

/**
 * Zips sourceDir into public/sites/<zipName>.zip and reports the outcome
 * through the callback. Caps the archive at maxBytes so a zip bomb from
 * an attacker-controlled wget output cannot OOM the server.
 *
 * Every failure here used to be thrown from inside an event handler, which
 * took the whole server down for every connected user. Failures are now passed
 * back to the caller so a single bad download only affects that one request.
 */
module.exports = (sourceDir, zipName, maxBytes, callback) => {
  var settled = false;
  var totalBytes = 0;
  var exceededCap = false;
  var finish = (err) => {
    if (settled) return;
    settled = true;
    try { output.end(); } catch (_) { /* already closed */ }
    callback(err, err ? null : zipName, totalBytes);
  };

  try {
    fs.mkdirSync(SITES_DIR, { recursive: true });
  } catch (err) {
    finish(err);
    return null;
  }

  var zipPath = path.join(SITES_DIR, zipName + '.zip');
  var output = fs.createWriteStream(zipPath);
  var archive = archiver('zip', {
    zlib: { level: 9 } // Sets the compression level.
  });

  // Track archive bytes against the configured cap. abort() stops the
  // pipe; the output stream's 'close' handler still fires so cleanup runs.
  archive.on('data', function (chunk) {
    totalBytes += chunk.length;
    if (maxBytes && totalBytes > maxBytes) {
      exceededCap = true;
      archive.abort();
    }
  });

  // listen for all archive data to be written
  // 'close' event is fired only when a file descriptor is involved
  output.on('close', function () {
    if (exceededCap) {
      finish(new Error('Archive exceeded the ' + Math.round(maxBytes / (1024 * 1024)) +
                       ' MB cap and was discarded.'));
      return;
    }
    console.log(totalBytes + ' total bytes written to ' + zipPath);
    finish(null);
  });

  // Without this the stream throws on its own, and an unhandled stream error
  // ends the process. A missing public/sites directory was enough to do it.
  output.on('error', function (err) {
    finish(err);
  });

  // good practice to catch warnings (ie stat failures and other non-blocking errors)
  archive.on('warning', function (err) {
    console.warn('archive warning: ' + err.message);
  });

  archive.on('error', function (err) {
    finish(err);
  });

  // pipe archive data to the file
  archive.pipe(output);

  // append the downloaded site, without wrapping it in an extra folder
  archive.directory(sourceDir, false);

  // finalize the archive (ie we are done appending files but streams have to finish yet)
  // 'close', 'end' or 'finish' may be fired right after calling this method so register to them beforehand
  archive.finalize();

  return archive;
};