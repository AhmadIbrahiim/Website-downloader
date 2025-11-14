var util = require('util'),
    exec = require('child_process').exec;
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
let website ="";
const child = exec(`wget -mkEpnp --no-if-modified-since ${data.website}`);

// read stdout from the current child.
child.stderr.on("data",(response)=>{

    if(response.startsWith("Resolving "))
    {
        website= response.substring(response.indexOf('Resolve ')+11,response.indexOf(' ('))
    }
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
