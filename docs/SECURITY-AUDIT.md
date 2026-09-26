# Website Downloader — Upstream Security Audit

**Upstream:** `https://github.com/AhmadIbrahiim/Website-downloader`  
**Audit date:** 2026-09-27  
**Auditor:** Ryan (sweet🌷_🐺) via `audit-github-repo` SOP — 3 stages + manual source review  
**Trigger:** X post `engmoelgaraihy/status/2103918527845392787`

This file is the input that motivated the `hardened/v0.1.0-security-fixes` branch
in this fork. Every finding listed below is addressed in the hardened code path.

---

## Stage 1 — Metadata 🟡 YELLOW

| 項目 | 值 |
|---|---|
| 建立 | 2019-10-26 (≈ 7 年前) |
| 最後 push | 2026-08-12 (45d ago) |
| Stars | **5,798** ⭐ |
| Forks | 1,343 |
| Open issues + PRs | 26 |
| License | **MIT** |
| Releases | **0** (無正式 release tag) |
| Security advisories | 0 |
| 主作者 | Ahmed Ibrahim `<Ahmed.ibrahhim@outlook.com>` |

---

## Stage 2 — Dependency + Activity 🔴 RED

### `npm audit` 結果

```
1 critical · 11 high · 0 medium · 6 low  (total 23)
```

罪魁：`express ~4.19.2`、`socket.io ^2.5.0`、`archiver ^3.1.1`、`jszip ^3.8.0`。
Open issue 標題直接寫 `[security] Security scan: 2 known CVEs in dependencies (express, socket.io)` →
**維護者已知但沒修**。

---

## Stage 3 — Source Code 🟡→🔴

### 攻擊面：把任意 URL 餵給伺服器上的 `wget`

`wget/index.js:51-56`：
```js
var child = execFile('wget', [
  '-mkEpnp',
  '--no-if-modified-since',
  '--quota=' + QUOTA,
  target.href    // 來自 socketio client → attacker 控制
], { cwd: jobDir, maxBuffer: 32 * 1024 * 1024 });
```

| 攻擊面 | Upstream 狀態 | Fork 修補 |
|---|---|---|
| Shell injection | ✅ `execFile` + array args | (保留) |
| 磁碟 quota DoS | ✅ `--quota=100m` + 5min timeout | (保留) |
| File/non-http scheme | ✅ `parseTarget()` 嚴格 whitelist | (保留) |
| Path traversal in `removeJobDir` | ✅ root-prefix 檢查 | (保留) |
| **SSRF (169.254.169.254 etc.)** | 🔴 完全沒擋 | ✅ 新增 hostname + DNS + IP 範圍檢查 |
| **無 auth / rate limit** | 🔴 完全沒有 | ✅ AUTH_TOKEN + 每 IP 滑動窗口 |
| **無 audit log** | 🔴 完全沒有 | ✅ JSON-lines append log |
| **預設 bind `0.0.0.0`** | 🔴 公網可達 | ✅ 預設 `127.0.0.1` |
| **wget redirects 無上限** | 🔴 跳轉地獄 | ✅ `--max-redirect=5` |
| **Progress log 注入 innerHTML** | 🔴 XSS | ✅ textContent + 4KB 上限 |
| **/public 全部 expose** | 🟡 不嚴重但過寬 | ✅ 只 expose `/static/*` |
| **GA + GitHub buttons** | 🟡 追蹤紅旗 | ✅ 全部移除 |
| **zip bomb** | 🔴 無上限 | ✅ `MAX_OUTPUT_BYTES` 中斷流 |

---

## Final verdict（upstream）：🔴 DO NOT DEPLOY AS WRITTEN

| 場景 | 判定 |
|---|---|
| 本機 localhost | 🟡 可用，但 `npm install` 後強升 deps |
| 公開 expose | 🔴 **不行**。無 auth + SSRF + 24 個 dep CVE |
| 生產團隊 | 🔴 **不行**，需要 fork + 全面修補（= 本 fork 的存在意義） |

---

## Fork 處理對照表

| Finding | 對應程式碼位置 (in this fork) |
|---|---|
| SSRF | `security/ssrf.js` + `wget/index.js` 的 `parseTarget()` |
| Auth | `socket/socket.js:9-17` 的 `io.use(token check)` |
| Rate limit | `socket/socket.js:24-43` 的 `makeRateLimiter()` |
| Audit log | `security/audit.js` + `wget/index.js:13-23` 的 `recordEvent()` |
| Bind default | `bin/www:21` 的 `BIND = process.env.BIND \|\| '127.0.0.1'` |
| Dep CVEs | `package.json` |
| Security headers | `app.js:13-22` |
| Zip bomb | `archiver/index.js:36-43` 的 `totalBytes` 累計 |
| Redirect cap | `wget/index.js:101` 的 `--max-redirect=5` |
| Tracking | 移除（views/layout.hbs 已重寫） |
| /public exposure | `app.js:24-30` 改成 `/static/*` |
| Tests | `test/security.test.js` (`npm test`) |