
## Website Downloader 💾
Download the complete source code of any website (including all assets) 🔨.

👉 Live Demo: https://site-dwloader.herokuapp.com/

![enter image description here](https://github.com/AhmadIbrahiim/Website-downloader/blob/master/public/Record.gif?raw=true)
## Description 📒
 Website downloader works with `wget` and `archiver` to download all websites assets and compress then sends it back to the user through socket channel
 
 **Wget params the being used**
 
 `wget --mirror --convert-links --adjust-extension --page-requisites 
--no-parent http://example.org`

 **Explanation of the various flags:**

 - --mirror – Makes (among other things) the download recursive.
- --convert-links – convert all the links (also to stuff like CSS stylesheets) to relative, so it will be suitable for offline viewing.
- --adjust-extension – Adds suitable extensions to filenames (html or css) depending on their content-type.
- --page-requisites – Download things like CSS style-sheets and images required to properly display the page offline.
- --no-parent – When recursing do not ascend to the parent directory. It useful for restricting the download to only a portion of the site

## How to run it 🤔

- git clone this repo
- `$ npm install`
- `$ npm start`




