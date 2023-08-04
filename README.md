# Complete Website Downloader 💾

Download the complete source code of any website (including all assets) 🔨.

👉 Live Demo: [getwebsite.onrender.com](https://getwebsite.onrender.com)

![enter image description here](https://github.com/rdwz/Website-downloader/blob/master/public/Record.gif?raw=true)

[![CodeQL](https://github.com/rdwz/Website-downloader/actions/workflows/github-code-scanning/codeql/badge.svg)](https://github.com/rdwz/Website-downloader/actions/workflows/github-code-scanning/codeql)

## Description 📒

 Website downloader works with `wget` and `archiver` to download all websites assets and compress then sends it back to the user through socket channel

### wget params the being used

 `wget --mirror --convert-links --adjust-extension --page-requisites
--no-parent http://example.org`

### Explanation of the various flags

- --mirror – Makes (among other things) the download recursive.
- --convert-links – convert all the links (also to stuff like CSS stylesheets) to relative, so it will be suitable for offline viewing.
- --adjust-extension – Adds suitable extensions to filenames (html or css) depending on their content-type.
- --page-requisites – Download things like CSS style-sheets and images required to properly display the page offline.
- --no-parent – When recursing do not ascend to the parent directory. It useful for restricting the download to only a portion of the site

### Deploy on cloud providers

[![Run on Replit](https://binbashbanana.github.io/deploy-buttons/buttons/remade/replit.svg)](https://replit.com/github/rdwz/Website-downloader)
[![Remix on Glitch](https://binbashbanana.github.io/deploy-buttons/buttons/remade/glitch.svg)](https://glitch.com/edit/#!/import/github/rdwz/Website-downloader)
[![Deploy on Railway](https://binbashbanana.github.io/deploy-buttons/buttons/remade/railway.svg)](https://railway.app/new/template?template=https://github.com/rdwz/Website-downloader)
[![Deploy to Cyclic](https://binbashbanana.github.io/deploy-buttons/buttons/remade/cyclic.svg)](https://app.cyclic.sh/api/app/deploy/rdwz/Website-downloader)
[![Deploy to Koyeb](https://binbashbanana.github.io/deploy-buttons/buttons/remade/koyeb.svg)](https://app.koyeb.com/deploy?type=git&repository=github.com/rdwz/Website-downloader&branch=main&name=Website-downloader)
[![Deploy to Render](https://binbashbanana.github.io/deploy-buttons/buttons/remade/render.svg)](https://render.com/deploy?repo=https://github.com/rdwz/Website-downloader)

## How to run it 🤔

- `git clone https://github.com/rdwz/Website-downloader.git`
- `cd website-downloader`
- `$ npm install`
- `$ npm start`
- `http://localhost:3000/`

## How To Contribute

- Open Issue(s) with any bugs you notice.
- Please create Pull Requests if you think it would be an added value towards our program.

## Liked it ? You can buy a coffee

[![Donate](https://www.buymeacoffee.com/assets/img/custom_images/orange_img.png)](https://www.buymeacoffee.com/redwerkz)
