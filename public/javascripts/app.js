(function () {
  'use strict';

  var TOKEN_KEY = 'token';
  var THEME_KEY = 'wd_theme';
  var HISTORY_KEY = 'wd_history';
  var MAX_FEED_ITEMS = 200;
  var MAX_HISTORY_ITEMS = 8;
  var BASE_TITLE = document.title;

  var form = document.getElementById('downloadForm');
  var websiteInput = document.getElementById('website');
  var downloadBtn = document.getElementById('download');
  var downloadBtnText = document.getElementById('downloadBtnText');
  var clearBtn = document.getElementById('clearBtn');
  var pasteBtn = document.getElementById('pasteBtn');
  var themeToggle = document.getElementById('themeToggle');
  var connPill = document.getElementById('connPill');
  var connText = document.getElementById('connText');

  var jobStatusBadge = document.getElementById('jobStatusBadge');
  var activeTargetLabel = document.getElementById('activeTargetLabel');
  var cancelBtn = document.getElementById('cancelBtn');
  var progressTrack = document.getElementById('progressTrack');
  var stepper = document.getElementById('stepper');

  var resultCard = document.getElementById('resultCard');
  var resultMeta = document.getElementById('resultMeta');
  var downloadZipBtn = document.getElementById('downloadZipBtn');
  var newJobBtn = document.getElementById('newJobBtn');

  var errorCard = document.getElementById('errorCard');
  var errorMessage = document.getElementById('errorMessage');
  var errorTip = document.getElementById('errorTip');
  var retryBtn = document.getElementById('retryBtn');

  var filesCountEl = document.getElementById('nFiles');
  var filesSubEl = document.getElementById('filesSub');
  var elapsedTimerEl = document.getElementById('elapsedTimer');
  var timerSubEl = document.getElementById('timerSub');
  var breakdownSummary = document.getElementById('breakdownSummary');
  var segHtml = document.getElementById('segHtml');
  var segCss = document.getElementById('segCss');
  var segJs = document.getElementById('segJs');
  var segImg = document.getElementById('segImg');
  var segOther = document.getElementById('segOther');
  var countHtml = document.getElementById('countHtml');
  var countCss = document.getElementById('countCss');
  var countJs = document.getElementById('countJs');
  var countImg = document.getElementById('countImg');
  var countOther = document.getElementById('countOther');

  var currentActivity = document.getElementById('currentActivity');
  var tabVisual = document.getElementById('tabVisual');
  var tabTerminal = document.getElementById('tabTerminal');
  var visualView = document.getElementById('visualView');
  var terminalView = document.getElementById('terminalView');
  var feedEmpty = document.getElementById('feedEmpty');
  var feedEmptyText = document.getElementById('feedEmptyText');
  var assetFeed = document.getElementById('assetFeed');
  var feedCountEl = document.getElementById('feedCount');
  var logEl = document.getElementById('log');
  var autoScrollToggle = document.getElementById('autoScrollToggle');
  var copyLogBtn = document.getElementById('copyLogBtn');

  var historySection = document.getElementById('historySection');
  var historyGrid = document.getElementById('historyGrid');
  var clearHistoryBtn = document.getElementById('clearHistoryBtn');

  var state = {
    running: false,
    target: '',
    startTime: 0,
    timerId: null,
    numberOfFiles: 0,
    feedTotal: 0,
    lineBuffer: '',
    pendingUrl: '',
    pendingStatus: '',
    pendingSize: '',
    pendingMime: '',
    counts: { html: 0, css: 0, js: 0, img: 0, other: 0 },
    rawLog: ''
  };

  function initTheme() {
    var saved = localStorage.getItem(THEME_KEY);
    if (saved === 'light' || saved === 'dark') {
      document.documentElement.setAttribute('data-theme', saved);
    }
  }

  themeToggle.addEventListener('click', function () {
    var current = document.documentElement.getAttribute('data-theme') || 'dark';
    var next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem(THEME_KEY, next);
  });

  function generateToken(n) {
    var chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    var out = '';
    for (var i = 0; i < n; i++) {
      out += chars[Math.floor(Math.random() * chars.length)];
    }
    return out;
  }

  if (!localStorage[TOKEN_KEY]) {
    localStorage[TOKEN_KEY] = generateToken(20);
  }
  var token = localStorage[TOKEN_KEY];

  var socket = io.connect(document.URL);

  function setConnectionStatus(status) {
    connPill.classList.remove('connected', 'disconnected');
    if (status === 'connected') {
      connPill.classList.add('connected');
      connText.textContent = 'Connected';
    } else if (status === 'disconnected') {
      connPill.classList.add('disconnected');
      connText.textContent = 'Offline';
    } else {
      connText.textContent = 'Connecting';
    }
  }

  socket.on('connect', function () {
    setConnectionStatus('connected');
  });

  socket.on('disconnect', function () {
    setConnectionStatus('disconnected');
  });

  socket.on('reconnecting', function () {
    setConnectionStatus('connecting');
  });

  socket.on(token, function (event) {
    if (!event) return;

    if (event.error) {
      handleError(event.error);
      return;
    }

    if (event.progress === 'Converting') {
      setStep(3);
      jobStatusBadge.textContent = 'Compressing';
      currentActivity.textContent = 'Compressing site directory into .zip';
      appendRawLog('\n[archive] Compressing site assets into .zip\n');
      return;
    }

    if (event.progress === 'Completed') {
      handleComplete(event.file);
      return;
    }

    if (typeof event.progress === 'string') {
      setStep(2);
      jobStatusBadge.textContent = 'Mirroring';
      processWgetChunk(event.progress);
    }
  });

  function resetJobUI(target) {
    stopTimer();
    state.running = true;
    state.target = target;
    state.startTime = Date.now();
    state.numberOfFiles = 0;
    state.feedTotal = 0;
    state.lineBuffer = '';
    state.pendingUrl = '';
    state.pendingStatus = '';
    state.pendingSize = '';
    state.pendingMime = '';
    state.counts = { html: 0, css: 0, js: 0, img: 0, other: 0 };
    state.rawLog = '';

    document.title = 'Mirroring — ' + BASE_TITLE;
    resultCard.hidden = true;
    errorCard.hidden = true;
    progressTrack.hidden = false;
    cancelBtn.hidden = false;
    feedEmpty.hidden = false;
    feedEmptyText.textContent = 'Waiting for incoming pages and assets from wget';

    jobStatusBadge.className = 'status-text running';
    jobStatusBadge.textContent = 'Connecting';
    activeTargetLabel.textContent = target;
    filesCountEl.textContent = '0';
    filesSubEl.textContent = 'HTTP 200 responses';
    elapsedTimerEl.textContent = '00:00';
    timerSubEl.textContent = 'Running';
    feedCountEl.textContent = '0';
    assetFeed.textContent = '';
    logEl.textContent = '';
    currentActivity.textContent = 'Connecting to ' + target;
    updateBreakdownUI();
    setStep(1);

    downloadBtn.disabled = true;
    downloadBtn.classList.add('loading');
    downloadBtnText.textContent = 'Mirroring';

    state.timerId = setInterval(updateTimer, 250);
  }

  function finishRunningState() {
    state.running = false;
    stopTimer();
    progressTrack.hidden = true;
    cancelBtn.hidden = true;
    downloadBtn.disabled = false;
    downloadBtn.classList.remove('loading');
    downloadBtnText.textContent = 'Mirror site';
  }

  function handleComplete(file) {
    if (state.lineBuffer.trim()) {
      parseWgetLine(state.lineBuffer);
      state.lineBuffer = '';
    }

    finishRunningState();
    setStep(4);
    jobStatusBadge.className = 'status-text done';
    jobStatusBadge.textContent = 'Ready';
    timerSubEl.textContent = 'Completed';
    currentActivity.textContent = file + '.zip';
    document.title = 'Ready — ' + BASE_TITLE;

    var elapsed = formatDuration(Date.now() - state.startTime);
    resultMeta.textContent = file + '.zip · ' + state.numberOfFiles + ' files · ' + elapsed;
    resultCard.hidden = false;

    downloadZipBtn.onclick = function () {
      window.location = '/sites/' + encodeURIComponent(file) + '.zip';
    };

    saveToHistory({
      target: state.target,
      file: file,
      filesCount: state.numberOfFiles,
      duration: elapsed,
      createdAt: Date.now()
    });
  }

  function handleError(message) {
    finishRunningState();
    setStepError();
    jobStatusBadge.className = 'status-text error';
    jobStatusBadge.textContent = 'Stopped';
    timerSubEl.textContent = 'Stopped';
    currentActivity.textContent = message;
    document.title = 'Stopped — ' + BASE_TITLE;

    errorMessage.textContent = String(message).replace(/\.+$/, '');
    var tip = getHelpfulTip(message);
    if (tip) {
      errorTip.textContent = tip;
      errorTip.hidden = false;
    } else {
      errorTip.hidden = true;
    }
    errorCard.hidden = false;
  }

  function getHelpfulTip(msg) {
    var lower = String(msg).toLowerCase();
    if (lower.indexOf('wget is not installed') !== -1) {
      return 'Install GNU wget on the server (Windows: winget install JernejSimoncic.Wget, macOS: brew install wget, Linux: apt install wget) and restart the server';
    }
    if (lower.indexOf('refused') !== -1 || lower.indexOf('403') !== -1 || lower.indexOf('forbidden') !== -1) {
      return 'This site may block automated requests or disallow crawling via robots.txt';
    }
    if (lower.indexOf('does not look like a website address') !== -1) {
      return 'Enter a valid HTTP or HTTPS address such as https://example.com';
    }
    if (lower.indexOf('took longer') !== -1) {
      return 'Try mirroring a specific subpath instead of the full domain';
    }
    return '';
  }

  function startDownload() {
    var website = websiteInput.value.trim();
    if (!website || state.running) return;
    if (!socket.connected) {
      socket.connect();
    }
    resetJobUI(website);
    socket.emit('request', { token: token, website: website });
  }

  cancelBtn.addEventListener('click', function () {
    if (!state.running) return;
    socket.disconnect();
    handleError('Mirror cancelled');
    setTimeout(function () {
      socket.connect();
    }, 200);
  });

  function setStep(activeStep) {
    var steps = stepper.querySelectorAll('.step');
    var lines = stepper.querySelectorAll('.step-line');
    for (var i = 0; i < steps.length; i++) {
      var num = i + 1;
      steps[i].classList.remove('active', 'done', 'error');
      if (num < activeStep || (activeStep === 4 && num === 4)) {
        steps[i].classList.add('done');
      } else if (num === activeStep) {
        steps[i].classList.add('active');
      }
    }
    for (var j = 0; j < lines.length; j++) {
      lines[j].classList.toggle('done', j + 1 < activeStep || activeStep === 4);
    }
  }

  function setStepError() {
    var active = stepper.querySelector('.step.active');
    if (active) {
      active.classList.remove('active');
      active.classList.add('error');
    }
  }

  function processWgetChunk(chunk) {
    appendRawLog(chunk);

    state.lineBuffer += chunk;
    var parts = state.lineBuffer.split(/\r?\n/);
    state.lineBuffer = parts.pop();

    for (var i = 0; i < parts.length; i++) {
      parseWgetLine(parts[i]);
    }
  }

  function appendRawLog(text) {
    state.rawLog += text;
    if (state.rawLog.length > 120000) {
      state.rawLog = state.rawLog.slice(-100000);
    }
    logEl.textContent = state.rawLog;
    if (autoScrollToggle.checked && !terminalView.hidden) {
      terminalView.scrollTop = terminalView.scrollHeight;
    }
  }

  function parseWgetLine(rawLine) {
    var line = rawLine.trim();
    if (!line) return;

    var urlMatch = line.match(/^--\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}--\s+(https?:\/\/\S+)/i);
    if (urlMatch) {
      state.pendingUrl = urlMatch[1];
      state.pendingStatus = '';
      state.pendingSize = '';
      state.pendingMime = '';
      currentActivity.textContent = state.pendingUrl;
      return;
    }

    var httpMatch = line.match(/HTTP request sent, awaiting response\.\.\.\s*(.+)$/i);
    if (httpMatch) {
      state.pendingStatus = httpMatch[1].trim();
      if (state.pendingStatus.indexOf('200 OK') !== -1) {
        state.numberOfFiles++;
        filesCountEl.textContent = String(state.numberOfFiles);
      } else if (/^(4|5)\d\d/.test(state.pendingStatus) && state.pendingUrl) {
        addFeedItem({
          type: classifyAsset(state.pendingUrl, ''),
          path: formatUrlPath(state.pendingUrl),
          status: state.pendingStatus,
          size: '',
          ok: false
        });
      }
      return;
    }

    var lenMatch = line.match(/^Length:\s+\d+(?:\s+\(([^)]+)\))?(?:\s+\[([^\]]+)\])?/i);
    if (lenMatch) {
      state.pendingSize = lenMatch[1] || '';
      state.pendingMime = lenMatch[2] || '';
      return;
    }

    var saveMatch = line.match(/^Saving to:\s+[‘'"]?(.+?)[’'"]?$/i);
    if (saveMatch) {
      var savedPath = saveMatch[1];
      var assetType = classifyAsset(savedPath || state.pendingUrl, state.pendingMime || '');
      incrementCategory(assetType);
      addFeedItem({
        type: assetType,
        path: savedPath,
        status: state.pendingStatus || '200 OK',
        size: state.pendingSize,
        ok: true
      });
      currentActivity.textContent = savedPath;
      return;
    }

    if (/^Converting links in /i.test(line)) {
      currentActivity.textContent = line;
    }
  }

  function classifyAsset(target, mime) {
    var m = (mime || '').toLowerCase();
    if (m.indexOf('text/html') !== -1) return 'html';
    if (m.indexOf('text/css') !== -1) return 'css';
    if (m.indexOf('javascript') !== -1) return 'js';
    if (m.indexOf('image/') !== -1 || m.indexOf('video/') !== -1) return 'img';

    var clean = (target || '').split('?')[0].split('#')[0].toLowerCase();
    if (/\.(html?|php|asp|aspx)$/.test(clean) || /\/$/.test(clean)) return 'html';
    if (/\.css$/.test(clean)) return 'css';
    if (/\.(m?js|jsx|ts)$/.test(clean)) return 'js';
    if (/\.(png|jpe?g|gif|webp|svg|ico|avif|bmp|mp4|webm)$/.test(clean)) return 'img';
    return 'other';
  }

  function incrementCategory(type) {
    if (state.counts[type] === undefined) type = 'other';
    state.counts[type]++;
    updateBreakdownUI();
  }

  function updateBreakdownUI() {
    var c = state.counts;
    var total = c.html + c.css + c.js + c.img + c.other;
    countHtml.textContent = String(c.html);
    countCss.textContent = String(c.css);
    countJs.textContent = String(c.js);
    countImg.textContent = String(c.img);
    countOther.textContent = String(c.other);

    if (total === 0) {
      breakdownSummary.textContent = '0 assets';
      segHtml.style.width = '0%';
      segCss.style.width = '0%';
      segJs.style.width = '0%';
      segImg.style.width = '0%';
      segOther.style.width = '0%';
      return;
    }

    breakdownSummary.textContent = total + (total === 1 ? ' asset' : ' assets');
    segHtml.style.width = ((c.html / total) * 100).toFixed(1) + '%';
    segCss.style.width = ((c.css / total) * 100).toFixed(1) + '%';
    segJs.style.width = ((c.js / total) * 100).toFixed(1) + '%';
    segImg.style.width = ((c.img / total) * 100).toFixed(1) + '%';
    segOther.style.width = ((c.other / total) * 100).toFixed(1) + '%';
  }

  function formatUrlPath(urlStr) {
    try {
      var u = new URL(urlStr);
      return u.hostname + u.pathname;
    } catch (e) {
      return urlStr;
    }
  }

  function formatCategoryLabel(type) {
    if (type === 'html') return 'HTML';
    if (type === 'css') return 'CSS';
    if (type === 'js') return 'JS';
    if (type === 'img') return 'Media';
    return 'Other';
  }

  // Uses textContent exclusively so crawled URLs/paths can never inject markup
  function addFeedItem(item) {
    feedEmpty.hidden = true;
    state.feedTotal++;
    feedCountEl.textContent = String(state.feedTotal);

    var li = document.createElement('li');
    li.className = 'feed-item';

    var typeCell = document.createElement('span');
    typeCell.className = 'type-cell';

    var dot = document.createElement('span');
    dot.className = 'type-dot type-' + item.type;

    var label = document.createElement('span');
    label.textContent = formatCategoryLabel(item.type);

    typeCell.appendChild(dot);
    typeCell.appendChild(label);

    var pathSpan = document.createElement('span');
    pathSpan.className = 'feed-path mono';
    pathSpan.textContent = item.path;
    pathSpan.title = item.path;

    var meta = document.createElement('div');
    meta.className = 'feed-meta';

    var sizeSpan = document.createElement('span');
    sizeSpan.className = 'feed-size mono';
    sizeSpan.textContent = item.size || '—';
    meta.appendChild(sizeSpan);

    var statusSpan = document.createElement('span');
    statusSpan.className = 'http-status mono ' + (item.ok ? 'http-ok' : 'http-warn');
    statusSpan.textContent = item.status.replace(/\s*\(.*\)$/, '').trim();
    meta.appendChild(statusSpan);

    li.appendChild(typeCell);
    li.appendChild(pathSpan);
    li.appendChild(meta);

    assetFeed.appendChild(li);

    while (assetFeed.children.length > MAX_FEED_ITEMS) {
      assetFeed.removeChild(assetFeed.firstChild);
    }

    if (autoScrollToggle.checked && !visualView.hidden) {
      visualView.scrollTop = visualView.scrollHeight;
    }
  }

  function updateTimer() {
    if (!state.startTime) return;
    elapsedTimerEl.textContent = formatDuration(Date.now() - state.startTime);
  }

  function stopTimer() {
    if (state.timerId) {
      clearInterval(state.timerId);
      state.timerId = null;
    }
  }

  function formatDuration(ms) {
    var totalSec = Math.max(0, Math.floor(ms / 1000));
    var mins = Math.floor(totalSec / 60);
    var secs = totalSec % 60;
    return String(mins).padStart(2, '0') + ':' + String(secs).padStart(2, '0');
  }

  tabVisual.addEventListener('click', function () {
    tabVisual.classList.add('active');
    tabTerminal.classList.remove('active');
    tabVisual.setAttribute('aria-selected', 'true');
    tabTerminal.setAttribute('aria-selected', 'false');
    visualView.hidden = false;
    terminalView.hidden = true;
  });

  tabTerminal.addEventListener('click', function () {
    tabTerminal.classList.add('active');
    tabVisual.classList.remove('active');
    tabTerminal.setAttribute('aria-selected', 'true');
    tabVisual.setAttribute('aria-selected', 'false');
    terminalView.hidden = false;
    visualView.hidden = true;
    if (autoScrollToggle.checked) {
      terminalView.scrollTop = terminalView.scrollHeight;
    }
  });

  copyLogBtn.addEventListener('click', function () {
    if (!state.rawLog || !navigator.clipboard) return;
    navigator.clipboard.writeText(state.rawLog).then(function () {
      var prev = copyLogBtn.textContent;
      copyLogBtn.textContent = 'Copied';
      setTimeout(function () {
        copyLogBtn.textContent = prev;
      }, 1400);
    });
  });

  websiteInput.addEventListener('input', function () {
    clearBtn.hidden = !websiteInput.value;
  });

  clearBtn.addEventListener('click', function () {
    websiteInput.value = '';
    clearBtn.hidden = true;
    websiteInput.focus();
  });

  pasteBtn.addEventListener('click', function () {
    if (!navigator.clipboard || !navigator.clipboard.readText) {
      websiteInput.focus();
      return;
    }
    navigator.clipboard.readText().then(function (text) {
      if (text) {
        websiteInput.value = text.trim();
        clearBtn.hidden = !websiteInput.value;
        websiteInput.focus();
      }
    }).catch(function () {
      websiteInput.focus();
    });
  });

  var chipBtns = document.querySelectorAll('.chip-btn');
  for (var k = 0; k < chipBtns.length; k++) {
    chipBtns[k].addEventListener('click', function () {
      websiteInput.value = this.getAttribute('data-url') || '';
      clearBtn.hidden = !websiteInput.value;
      websiteInput.focus();
    });
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    startDownload();
  });

  newJobBtn.addEventListener('click', function () {
    websiteInput.value = '';
    clearBtn.hidden = true;
    websiteInput.focus();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  retryBtn.addEventListener('click', function () {
    startDownload();
  });

  function loadHistory() {
    try {
      var raw = localStorage.getItem(HISTORY_KEY);
      var list = raw ? JSON.parse(raw) : [];
      return Array.isArray(list) ? list : [];
    } catch (e) {
      return [];
    }
  }

  function saveToHistory(entry) {
    var list = loadHistory().filter(function (item) {
      return item && item.file !== entry.file;
    });
    list.unshift(entry);
    list = list.slice(0, MAX_HISTORY_ITEMS);
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(list));
    } catch (e) {}
    renderHistory();
  }

  function renderHistory() {
    var list = loadHistory();
    historyGrid.textContent = '';
    if (list.length === 0) {
      historySection.hidden = true;
      return;
    }
    historySection.hidden = false;

    for (var i = 0; i < list.length; i++) {
      var item = list[i];
      var card = document.createElement('div');
      card.className = 'history-card';

      var host = document.createElement('div');
      host.className = 'history-host mono';
      host.textContent = item.target || item.file;
      host.title = item.target || item.file;

      var info = document.createElement('div');
      info.className = 'history-info mono';
      var dateStr = item.createdAt ? new Date(item.createdAt).toLocaleString() : '';
      info.textContent = (item.filesCount || 0) + ' files · ' + (item.duration || '00:00') + (dateStr ? ' · ' + dateStr : '');

      var actions = document.createElement('div');
      actions.className = 'history-actions';

      var zipLink = document.createElement('a');
      zipLink.className = 'history-dl';
      zipLink.href = '/sites/' + encodeURIComponent(item.file) + '.zip';
      zipLink.textContent = 'Download .zip';

      var reRunBtn = document.createElement('button');
      reRunBtn.type = 'button';
      reRunBtn.className = 'mini-btn';
      reRunBtn.textContent = 'Mirror again';
      (function (targetUrl) {
        reRunBtn.addEventListener('click', function () {
          websiteInput.value = targetUrl;
          clearBtn.hidden = false;
          startDownload();
        });
      })(item.target || '');

      actions.appendChild(zipLink);
      actions.appendChild(reRunBtn);

      card.appendChild(host);
      card.appendChild(info);
      card.appendChild(actions);
      historyGrid.appendChild(card);
    }
  }

  clearHistoryBtn.addEventListener('click', function () {
    localStorage.removeItem(HISTORY_KEY);
    renderHistory();
  });

  initTheme();
  renderHistory();
})();
