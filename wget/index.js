var util = require('util'),
    exec = require('child_process').exec,
    execFile = require('child_process').execFile;
    var archiver = require('../archiver')
    var fs = require('fs');
    var path = require('path');

module.exports=(io,data)=>{

// download all website assets 
/**
 * wget --mirror --convert-links --adjust-extension --page-requisites 
 * --no-parent http://example.org
 * --mirror – Makes (among other things) the download recursive.
 * --convert-links – convert all the links (also to stuff like CSS stylesheets) to relative, so it will be suitable for offline viewing.
 * --adjust-extension – Adds suitable extensions to filenames (html or css) depending on their content-type.
 * --page-requisites – Download things like CSS style-sheets and images required to properly display the page offline.
 * --no-parent – When recurring do not ascend to the parent directory. It useful for restricting the download to only a portion of the site.
 */

// Normalize URL - add http:// if protocol is missing
let websiteUrl = data.website;
if (!websiteUrl.startsWith('http://') && !websiteUrl.startsWith('https://')) {
    websiteUrl = 'http://' + websiteUrl;
}

// Parse URL to validate it and extract the directory name wget will create.
// For non-standard ports (e.g. localhost:3000) wget creates a directory named
// "hostname:port", so we must include the port when it is non-default.
let parsedUrl;
try {
    parsedUrl = new URL(websiteUrl);
} catch (e) {
    io.emit(data.token, { progress: 'Error: Invalid URL provided.' });
    return;
}

const defaultPort = parsedUrl.protocol === 'https:' ? '443' : '80';
const website = parsedUrl.port && parsedUrl.port !== defaultPort
    ? `${parsedUrl.hostname}:${parsedUrl.port}`
    : parsedUrl.hostname;

const child = execFile('wget', ['-mkEpnp', '--no-if-modified-since', websiteUrl]);

// read stdout from the current child.
child.stderr.on("data",(response)=>{
    io.emit(data.token,{progress:response})
})

child.stderr.on('close',(response)=>{

    io.emit(data.token,{progress:"Converting"})
    archiver(website,io,data)
})

// Handle process termination and cleanup
child.on('exit', (code, signal) => {
    if (signal === 'SIGTERM') {
        console.log('Process terminated');
        removePartiallyDownloadedFiles(website);
    }
});

function removePartiallyDownloadedFiles(website) {
    const directory = path.join(__dirname, '../', website);
    fs.rmdir(directory, { recursive: true }, (err) => {
        if (err) {
            console.error(`Error while removing partially downloaded files: ${err.message}`);
        } else {
            console.log('Partially downloaded files removed successfully');
        }
    });
}
}
