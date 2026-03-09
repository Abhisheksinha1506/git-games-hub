/**
 * overlay.js — Rules + Leaderboard overlay for Git Games Hub
 *
 * Usage: call GitOverlay.init(config) once per game page.
 *
 * config = {
 *   gameId:        'branch-quest',     // must match a key in GAME_HEADINGS (or auto-registered)
 *   title:         '🌿 Branch Quest',  // display title
 *   tagline:       'One-line summary',
 *   objective:     'What the player must do',
 *   howToPlay:     ['Step 1 HTML…', …],
 *   commands:      [{ cmd:'git branch <n>', desc:'Create a branch' }, …],
 *   tips:          ['Tip HTML…', …],
 *   scoring:       'How scoring works',
 *
 *   // Optional. If omitted the URL is auto-derived from the GitHub Pages hostname.
 *   // Supply when hosting outside GitHub Pages or when the repo cannot be inferred.
 *   // Supports any branch name — not locked to 'main'.
 *   readmeUrl:     'https://raw.githubusercontent.com/OWNER/REPO/BRANCH/README.md',
 *
 *   // Optional — override default leaderboard row limit (default: 20)
 *   leaderboardMax: 20,
 * }
 *
 * README leaderboard format expected:
 *   ### 🌿 Branch Quest Adventure
 *   | Rank | Username | Time | Date |
 *   |------|----------|------|------|
 *   | 🥇 | @alice | 02:12 | 2026-03-09 |
 */

window.GitOverlay = (function () {
  'use strict';

  // ── CSS (injected once) ──────────────────────────────────────────────────
  const STYLE = `
  .go-backdrop {
    position:fixed;inset:0;background:rgba(0,0,0,.88);z-index:8888;
    display:flex;align-items:center;justify-content:center;
    animation:go-fade-in .18s ease;
  }
  @keyframes go-fade-in{from{opacity:0}to{opacity:1}}
  .go-panel {
    width:min(540px,94vw);max-height:88vh;
    background:#0a0c14;border:1px solid #151928;
    display:flex;flex-direction:column;overflow:hidden;
    animation:go-slide-in .2s ease;
    font-family:'JetBrains Mono',monospace;
  }
  @keyframes go-slide-in{from{opacity:0;transform:translateY(-14px)}to{opacity:1;transform:none}}
  .go-header{
    padding:14px 20px;border-bottom:1px solid #151928;
    display:flex;align-items:flex-start;justify-content:space-between;flex-shrink:0;
  }
  .go-title{font-family:'Syne',sans-serif;font-size:20px;color:#00d4ff;line-height:1.2;}
  .go-tagline{font-size:12px;color:#8899bb;margin-top:3px;letter-spacing:1px;}
  .go-close{
    background:transparent;border:1px solid #151928;color:#8899bb;
    width:26px;height:26px;font-size:14px;cursor:pointer;flex-shrink:0;
    font-family:'JetBrains Mono',monospace;transition:all .15s;
  }
  .go-close:hover{border-color:#00d4ff;color:#00d4ff;}
  .go-tabs{display:flex;border-bottom:1px solid #151928;flex-shrink:0;}
  .go-tab{
    flex:1;padding:9px 4px;background:transparent;border:none;
    border-bottom:2px solid transparent;
    color:#8899bb;font-family:'JetBrains Mono',monospace;
    font-size:11px;letter-spacing:1px;cursor:pointer;transition:all .15s;
  }
  .go-tab:hover{color:#ffffff;}
  .go-tab.go-active{color:#00d4ff;border-bottom-color:#00d4ff;}
  .go-body{flex:1;overflow-y:auto;padding:20px;}
  .go-body::-webkit-scrollbar{width:4px;}
  .go-body::-webkit-scrollbar-thumb{background:#151928;}

  /* Rules */
  .go-section{margin-bottom:20px;}
  .go-sh{
    font-size:11px;letter-spacing:3px;color:#00d4ff;text-transform:uppercase;
    border-bottom:1px solid #151928;padding-bottom:6px;margin-bottom:10px;
    font-weight:700;
  }
  .go-objective{
    background:rgba(0,212,255,0.05);border:1px solid #151928;
    padding:10px 14px;font-size:12px;color:#ffffff;line-height:1.7;
  }
  .go-steps{list-style:none;}
  .go-steps li{
    display:flex;gap:10px;padding:6px 0;border-bottom:1px solid #151928;
    font-size:12px;color:#ffffff;align-items:flex-start;
  }
  .go-step-num{
    width:18px;height:18px;border-radius:2px;border:1px solid #151928;
    background:rgba(0,212,255,0.05);color:#00d4ff;font-size:10px;
    display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:1px;
  }
  .go-cmd-table{width:100%;border-collapse:collapse;}
  .go-cmd-table tr{border-bottom:1px solid #151928;}
  .go-cmd-table td{padding:7px 0;font-size:12px;vertical-align:top;}
  .go-cmd-table .cmd{color:#00d4ff;padding-right:16px;white-space:nowrap;}
  .go-cmd-table .desc{color:#ffffff;}
  .go-tips li{font-size:12px;color:#ffffff;padding:4px 0;padding-left:14px;position:relative;}
  .go-tips li::before{content:'▸';position:absolute;left:0;color:#00d4ff;}
  .go-scoring{
    font-size:12px;color:#ffffff;line-height:1.7;
    padding:8px 12px;background:rgba(168,255,62,0.04);border:1px solid #174d27;
  }

  /* Leaderboard */
  .go-lb-loading{text-align:center;padding:30px;color:#8899bb;font-size:12px;}
  .go-lb-error{text-align:center;padding:20px;color:#ff4f6d;font-size:12px;line-height:1.8;}
  .go-lb-meta{
    font-size:11px;color:#8899bb;letter-spacing:1px;margin-bottom:14px;
    display:flex;justify-content:space-between;align-items:center;
  }
  .go-lb-refresh{
    background:transparent;border:1px solid #151928;color:#8899bb;
    padding:4px 10px;font-family:'JetBrains Mono',monospace;font-size:11px;
    cursor:pointer;transition:all .15s;
  }
  .go-lb-refresh:hover{border-color:#00d4ff;color:#00d4ff;}
  .go-lb-table{width:100%;border-collapse:collapse;margin-bottom:16px;}
  .go-lb-table th{
    font-size:10px;letter-spacing:2px;color:#8899bb;text-transform:uppercase;
    padding:5px 10px;text-align:left;border-bottom:1px solid #151928;
  }
  .go-lb-table td{padding:9px 10px;border-bottom:1px solid #151928;font-size:12px;}
  .go-lb-table tr:first-child td{background:rgba(0,212,255,0.03);}
  .go-rank{color:#8899bb;font-size:13px;}
  .go-rank.gold  {color:#00d4ff;}
  .go-rank.silver{color:#9ca3af;}
  .go-rank.bronze{color:#b45309;}
  .go-username{color:#ffffff;}
  .go-username a{color:#00d4ff;text-decoration:none;}
  .go-username a:hover{text-decoration:underline;}
  .go-time{color:#a8ff3e;font-weight:bold;}
  .go-date{color:#8899bb;font-size:11px;}
  .go-empty{text-align:center;padding:20px;color:#8899bb;font-size:12px;font-style:italic;}
  .go-lb-howto{
    background:rgba(0,212,255,0.04);border:1px solid #151928;
    padding:12px 14px;font-size:11px;color:#8899bb;line-height:1.9;
  }
  .go-lb-howto strong{color:#00d4ff;}
  .go-lb-howto code{color:#a8ff3e;background:rgba(168,255,62,0.1);padding:1px 5px;}
  .go-lb-source-link{display:block;margin-top:10px;font-size:11px;color:#00d4ff;text-decoration:none;}
  .go-lb-source-link:hover{text-decoration:underline;}

  /* Header icon buttons */
  .go-icon-btn{
    background:transparent;border:1px solid #151928;color:#8899bb;
    width:28px;height:28px;font-size:13px;cursor:pointer;
    display:flex;align-items:center;justify-content:center;
    transition:all .15s;border-radius:2px;font-family:'JetBrains Mono',monospace;
  }
  .go-icon-btn:hover{border-color:#00d4ff;color:#00d4ff;}
  .go-icon-btn.go-lb-btn:hover{border-color:#a8ff3e;color:#a8ff3e;}
  `;

  let _styleInjected = false;
  function injectStyle() {
    if (_styleInjected) return;
    const s = document.createElement('style');
    s.textContent = STYLE;
    document.head.appendChild(s);
    _styleInjected = true;
  }

  // ── Stored config ────────────────────────────────────────────────────────
  let _cfg = null;

  // ── GAME_HEADINGS: gameId → README H3 heading fragment ───────────────────
  // This map is the single source of truth for README section matching.
  // New games self-register via _registerGame() when GitOverlay.init() is called,
  // so you never need to edit this object to add a new game.
  const GAME_HEADINGS = {
    'murder': 'Git Murder Mystery',
    'branch-quest': 'Branch Quest Adventure',
    'commit-detective': 'Commit History Detective',
    'merge-mayhem': 'Merge Conflict Mayhem',
    'timeline-travel': 'Git Timeline Time Travel',
    'escape-room': 'Repo Escape Room',
  };

  // Strip leading emoji + whitespace to get plain text heading fragment
  function _titleToFragment(title) {
    return (title || '').replace(/^[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\s]+/u, '').trim();
  }

  // Auto-register a game so future games don't need to edit GAME_HEADINGS
  function _registerGame(gameId, title) {
    if (!gameId || GAME_HEADINGS[gameId]) return;
    const fragment = _titleToFragment(title);
    if (fragment) GAME_HEADINGS[gameId] = fragment;
  }

  // ── Repo / URL helpers ───────────────────────────────────────────────────

  // Extract owner from a raw.githubusercontent URL or from GitHub Pages hostname
  function _repoOwner(cfg) {
    try {
      if (cfg && cfg.readmeUrl) {
        const m = cfg.readmeUrl.match(/githubusercontent\.com\/([^/]+)\//);
        if (m) return m[1];
      }
      const host = window.location.hostname;
      const m = host.match(/^([^.]+)\.github\.io$/);
      if (m) return m[1];
      // Vercel / Custom domain fallbacks
      return 'Abhisheksinha1506';
    } catch (_) { return 'Abhisheksinha1506'; }
  }

  // Extract repo name from a raw URL or from the first path segment on GitHub Pages
  function _repoName(cfg) {
    try {
      if (cfg && cfg.readmeUrl) {
        const m = cfg.readmeUrl.match(/githubusercontent\.com\/[^/]+\/([^/]+)\//);
        if (m) return m[1];
      }
      const host = window.location.hostname;
      if (host.match(/^([^.]+)\.github\.io$/)) {
        return window.location.pathname.split('/').filter(Boolean)[0] || 'git-games-hub';
      }
      // Vercel / Custom domain fallbacks
      return 'git-games-hub';
    } catch (_) { return 'git-games-hub'; }
  }

  // Determine the raw README URL (or a probe descriptor) to use for leaderboard fetch.
  // FIX: no longer hardcodes 'main' — when auto-detecting we probe main then master.
  function _deriveReadmeSource(cfg) {
    // 1. Explicit readmeUrl in config — use verbatim (any branch supported)
    if (cfg && cfg.readmeUrl) return cfg.readmeUrl;

    // 2. Auto-detect from GitHub Pages hostname
    try {
      const host = window.location.hostname;
      const m = host.match(/^([^.]+)\.github\.io$/);
      if (m) {
        const owner = m[1];
        const repo = window.location.pathname.split('/').filter(Boolean)[0];
        if (owner && repo) return { owner, repo }; // probe descriptor — branch resolved at fetch time
      }
    } catch (_) { /* ignore */ }

    return null; // local dev — no source available
  }

  // Fetch README text, probing 'main' then 'master' for probe descriptors.
  // Returns { text, rawUrl, branch }
  async function _fetchReadme(source) {
    if (!source) {
      throw new Error(
        'No README source available.\n' +
        'Deploy on GitHub Pages or set readmeUrl in GitOverlay.init().'
      );
    }

    // Plain string → single fetch
    if (typeof source === 'string') {
      const resp = await fetch(source, { cache: 'no-store' });
      if (!resp.ok) throw new Error(`HTTP ${resp.status} fetching README from:\n${source}`);
      const branch = source.split('/')[5] || 'main';
      return { text: await resp.text(), rawUrl: source, branch };
    }

    // Probe descriptor → try known default branches in order
    const { owner, repo } = source;
    const candidates = ['main', 'master', 'trunk', 'develop'];
    let lastErr;
    for (const branch of candidates) {
      const url = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/README.md`;
      try {
        const resp = await fetch(url, { cache: 'no-store' });
        if (resp.ok) return { text: await resp.text(), rawUrl: url, branch };
        lastErr = new Error(`HTTP ${resp.status}`);
      } catch (e) { lastErr = e; }
    }
    throw new Error(
      `Could not fetch README for ${owner}/${repo}.\n` +
      `Tried branches: ${candidates.join(', ')}.\n` +
      `Is the repo public? — ${lastErr ? lastErr.message : 'unknown error'}`
    );
  }

  // ── README leaderboard parser ────────────────────────────────────────────
  function parseLeaderboardSection(markdown, headingFragment) {
    const lines = markdown.split('\n');
    let inSection = false;
    let headerPassed = false;
    const entries = [];

    for (const line of lines) {
      const t = line.trim();

      // Find matching H3
      if (/^###/.test(t) && t.includes(headingFragment)) {
        inSection = true;
        headerPassed = false;
        continue;
      }
      // End of section — any subsequent H2 or H3
      if (inSection && /^#{2,3}\s/.test(t) && !t.includes(headingFragment)) break;
      if (!inSection) continue;

      if (t.startsWith('|')) {
        const cells = t.split('|').map(c => c.trim()).filter(c => c.length > 0);
        if (cells[0].toLowerCase() === 'rank') { headerPassed = true; continue; } // header row
        if (/^[-:\s|]+$/.test(t)) continue;                                       // separator row
        if (!headerPassed || cells.length < 3) continue;
        const [rank, username, time, date] = cells;
        if (!time || time === '—' || username.toLowerCase().includes('be the first')) continue;
        entries.push({
          rank: rank.trim(),
          username: username.trim().replace(/^@/, ''),
          time: time.trim(),
          date: (date || '').trim(),
        });
      }
    }
    return entries;
  }

  // ── Modal open / close ───────────────────────────────────────────────────
  let _activeBackdrop = null;

  // Track the active keydown listener so _closeAll() always removes it (prevents listener leak)
  let _activeKeyListener = null;

  function _closeAll() {
    if (_activeKeyListener) {
      document.removeEventListener('keydown', _activeKeyListener);
      _activeKeyListener = null;
    }
    if (_activeBackdrop) {
      _activeBackdrop.style.animation = 'go-fade-in .15s ease reverse';
      const el = _activeBackdrop;
      setTimeout(() => { el.remove(); if (_activeBackdrop === el) _activeBackdrop = null; }, 140);
    }
  }

  function _open(buildFn) {
    _closeAll();
    injectStyle();
    const backdrop = document.createElement('div');
    backdrop.className = 'go-backdrop';
    backdrop.addEventListener('click', e => { if (e.target === backdrop) _closeAll(); });
    backdrop.appendChild(buildFn());
    document.body.appendChild(backdrop);
    _activeBackdrop = backdrop;
    _activeKeyListener = e => { if (e.key === 'Escape') _closeAll(); };
    document.addEventListener('keydown', _activeKeyListener);
  }

  // ── Tab switcher ─────────────────────────────────────────────────────────
  function _tab(btn, name) {
    const panel = btn.closest('.go-panel');
    if (!panel) return;
    panel.querySelectorAll('.go-tab').forEach(t => t.classList.remove('go-active'));
    btn.classList.add('go-active');
    ['rules', 'commands', 'tips'].forEach(t => {
      const el = panel.querySelector('#go-tab-' + t);
      if (el) el.style.display = (t === name) ? 'block' : 'none';
    });
  }

  // ── Rules panel ──────────────────────────────────────────────────────────
  function showRules(cfg) {
    _open(() => {
      const panel = document.createElement('div');
      panel.className = 'go-panel';
      panel.innerHTML = `
        <div class="go-header">
          <div>
            <div class="go-title">${_esc(cfg.title || '')}</div>
            <div class="go-tagline">${_esc(cfg.tagline || '')}</div>
          </div>
          <button class="go-close" id="go-rules-close">✕</button>
        </div>
        <div class="go-tabs">
          <button class="go-tab go-active" data-tab="rules">📋 RULES</button>
          <button class="go-tab" data-tab="commands">⌨ COMMANDS</button>
          <button class="go-tab" data-tab="tips">💡 TIPS</button>
        </div>
        <div class="go-body">
          <div id="go-tab-rules">
            <div class="go-section">
              <div class="go-sh">🎯 Objective</div>
              <div class="go-objective">${cfg.objective || 'Complete all steps using real git commands.'}</div>
            </div>
            <div class="go-section">
              <div class="go-sh">📖 How to Play</div>
              <ul class="go-steps">
                ${(cfg.howToPlay || []).map((s, i) =>
        `<li><div class="go-step-num">${i + 1}</div><div>${s}</div></li>`
      ).join('')}
              </ul>
            </div>
            <div class="go-section">
              <div class="go-sh">⏱ Scoring</div>
              <div class="go-scoring">${cfg.scoring || 'Time from page load to completion. Lower is better.'}</div>
            </div>
          </div>

          <div id="go-tab-commands" style="display:none">
            <div class="go-section">
              <div class="go-sh">⌨ Commands You Will Use</div>
              <table class="go-cmd-table">
                ${(cfg.commands || []).map(c =>
        `<tr><td class="cmd">${c.cmd}</td><td class="desc">${c.desc}</td></tr>`
      ).join('')}
              </table>
            </div>
          </div>

          <div id="go-tab-tips" style="display:none">
            <div class="go-section">
              <div class="go-sh">💡 Pro Tips</div>
              <ul class="go-tips">
                ${(cfg.tips || []).map(t => `<li>${t}</li>`).join('')}
              </ul>
            </div>
          </div>
        </div>
      `;
      panel.querySelector('#go-rules-close').addEventListener('click', _closeAll);
      // Wire tab buttons via addEventListener (no inline onclick — CSP safe)
      panel.querySelectorAll('.go-tab[data-tab]').forEach(btn => {
        btn.addEventListener('click', () => _tab(btn, btn.dataset.tab));
      });
      return panel;
    });
  }

  // ── Leaderboard panel ────────────────────────────────────────────────────
  function showLeaderboard(cfg) {
    _open(() => {
      const panel = document.createElement('div');
      panel.className = 'go-panel';

      panel.innerHTML = `
        <div class="go-header">
          <div>
            <div class="go-title">🏆 ${_esc(cfg.title || 'Leaderboard')}</div>
            <div class="go-tagline">Live from GitHub README · updated on every merged PR</div>
          </div>
          <button class="go-close" id="go-lb-close">✕</button>
        </div>
        <div class="go-body">
          <div class="go-lb-meta">
            <span id="go-lb-status">Fetching scores…</span>
            <button class="go-lb-refresh" id="go-lb-refresh">↺ Refresh</button>
          </div>
          <div id="go-lb-content">
            <div class="go-lb-loading">⏳ Loading leaderboard…</div>
          </div>
          <div class="go-lb-howto">
            <strong>How to get on this board:</strong><br>
            1. Complete the game → click <strong>COPY SCORE</strong> in the completion modal.<br>
            2. Copy the markdown score row shown.<br>
            3. Open a PR on branch <strong>score-entry/your-username</strong> and paste it into README.md.<br>
            4. Once merged, the leaderboard updates automatically.<br>
            <a class="go-lb-source-link" id="go-readme-link" href="#" target="_blank" rel="noopener">
              📄 View README leaderboard on GitHub ↗
            </a>
            <a class="go-lb-source-link" id="go-submit-link" href="#" target="_blank" rel="noopener">
              🚀 Submit your score via PR ↗
            </a>
          </div>
        </div>
      `;

      panel.querySelector('#go-lb-close').addEventListener('click', _closeAll);

      const container = panel.querySelector('#go-lb-content');
      const statusEl = panel.querySelector('#go-lb-status');

      panel.querySelector('#go-lb-refresh').addEventListener('click', () => {
        container.innerHTML = '<div class="go-lb-loading">⏳ Refreshing…</div>';
        statusEl.textContent = 'Fetching…';
        _loadLbInto(cfg, container, statusEl, panel);
      });

      _loadLbInto(cfg, container, statusEl, panel);
      return panel;
    });
  }

  async function _loadLbInto(cfg, container, statusEl, panel) {
    const source = _deriveReadmeSource(cfg);

    if (!source) {
      container.innerHTML = `<div class="go-lb-error">
        ⚠ Leaderboard unavailable in local development.<br><br>
        Scores live in the README on GitHub after merged PRs.<br>
        Set <code>readmeUrl</code> in <code>GitOverlay.init()</code> to load scores here.<br><br>
        <strong>Format:</strong><br>
        <code>https://raw.githubusercontent.com/OWNER/REPO/BRANCH/README.md</code>
      </div>`;
      if (statusEl) statusEl.textContent = 'Not available locally';
      return;
    }

    try {
      const { text, rawUrl, branch } = await _fetchReadme(source);

      // Update GitHub links now that we know the real branch
      if (panel) {
        const owner = _repoOwner(cfg) || (rawUrl.split('/')[3] || '');
        const repo = _repoName(cfg) || (rawUrl.split('/')[4] || '');
        if (owner && repo) {
          const ghLink = panel.querySelector('#go-readme-link');
          if (ghLink) ghLink.href = `https://github.com/${owner}/${repo}/blob/${branch}/README.md`;

          const prBody = encodeURIComponent(
            'Add your score row to the **' + (cfg.title || cfg.gameId) + '** leaderboard table in README.md.\n' +
            'Replace `your-username` with your GitHub handle.'
          );
          const prLink = panel.querySelector('#go-submit-link');
          if (prLink) {
            prLink.href =
              `https://github.com/${owner}/${repo}/compare/${branch}...score-entry/your-username` +
              `?quick_pull=1&title=${encodeURIComponent('Score ' + (cfg.gameId || ''))}` +
              `&body=${prBody}`;
          }
        }
      }

      // Resolve heading fragment — registered map first, then strip emoji from title
      const heading = GAME_HEADINGS[cfg.gameId]
        || _titleToFragment(cfg.title || '');

      if (!heading) {
        throw new Error('Cannot determine leaderboard heading. Set gameId or title in GitOverlay.init().');
      }

      const entries = parseLeaderboardSection(text, heading);
      const max = (cfg.leaderboardMax && cfg.leaderboardMax > 0) ? cfg.leaderboardMax : 20;

      if (statusEl) {
        statusEl.textContent =
          `${entries.length} entr${entries.length === 1 ? 'y' : 'ies'} · branch: ${branch} · GitHub README`;
      }

      if (entries.length === 0) {
        container.innerHTML = `<div class="go-empty">
          No completions yet for this game.<br>Be the first to submit a score! 🏆
        </div>`;
        return;
      }

      const medals = ['🥇', '🥈', '🥉'];
      const rankClass = i => (i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : '');

      container.innerHTML = `
        <table class="go-lb-table">
          <thead><tr>
            <th>Rank</th><th>Username</th><th>Time</th><th>Date</th>
          </tr></thead>
          <tbody>
            ${entries.slice(0, max).map((e, i) => `
              <tr>
                <td><span class="go-rank ${rankClass(i)}">${medals[i] || '#' + (i + 1)}</span></td>
                <td class="go-username">
                  <a href="https://github.com/${_esc(e.username)}" target="_blank" rel="noopener">
                    @${_esc(e.username)}
                  </a>
                </td>
                <td class="go-time">${_esc(e.time)}</td>
                <td class="go-date">${_esc(e.date)}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      `;

    } catch (err) {
      container.innerHTML = `<div class="go-lb-error">
        ❌ Could not load leaderboard.<br><br>
        <strong>Error:</strong> ${_esc(String(err.message))}<br><br>
        Make sure the repo is <strong>public</strong> and the README URL is correct.<br>
        Expected format:<br>
        <code>https://raw.githubusercontent.com/OWNER/REPO/BRANCH/README.md</code>
      </div>`;
      if (statusEl) statusEl.textContent = 'Error loading';
    }
  }

  // ── Header button injection ──────────────────────────────────────────────
  function _injectHeaderButtons(cfg) {
    const hright = document.querySelector('.hright');
    if (!hright) return;

    const infoBtn = document.createElement('button');
    infoBtn.className = 'go-icon-btn';
    infoBtn.title = 'Rules & Info';
    infoBtn.innerHTML = 'ⓘ';
    infoBtn.addEventListener('click', () => showRules(cfg));

    const lbBtn = document.createElement('button');
    lbBtn.className = 'go-icon-btn go-lb-btn';
    lbBtn.title = 'Leaderboard';
    lbBtn.innerHTML = '🏆';
    lbBtn.addEventListener('click', () => showLeaderboard(cfg));

    hright.insertBefore(lbBtn, hright.firstChild);
    hright.insertBefore(infoBtn, hright.firstChild);
  }

  // ── Utility ──────────────────────────────────────────────────────────────
  function _esc(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // ── Public API ───────────────────────────────────────────────────────────
  function init(cfg) {
    _cfg = cfg;
    injectStyle();
    _registerGame(cfg.gameId, cfg.title || '');
    _injectHeaderButtons(cfg);
    // Keep public _cfg reference in sync (it was previously always null)
    window.GitOverlay._cfg = _cfg;
  }

  window.GitOverlay = {
    init,
    showRules,
    showLeaderboard,
    _close: _closeAll,
    _tab,
    // Legacy compat: called by old inline onclick="window.GitOverlay._reloadLb(...)"
    _reloadLb: function (gameId, readmeUrl) {
      const container = document.getElementById('go-lb-content');
      const statusEl = document.getElementById('go-lb-status');
      if (!container) return;
      container.innerHTML = '<div class="go-lb-loading">⏳ Refreshing…</div>';
      if (statusEl) statusEl.textContent = 'Fetching…';
      const fakeCfg = Object.assign({}, _cfg || {}, {
        gameId,
        readmeUrl: readmeUrl || undefined,
      });
      _loadLbInto(fakeCfg, container, statusEl, null);
    },
    _cfg: null,
  };

  return window.GitOverlay;
})();
