/**
 * engine.js — Shared game engine for all Git Games
 *
 * Exposes: window.GitEngine
 *   StepRunner                          — step-gated command progression
 *   startTimer(el)                      — live MM:SS timer
 *   stopTimer()                         — stops timer, returns elapsed seconds
 *   showCompletionModal(gameId, secs)   — victory modal + score block
 *   renderStepProgress(el, steps, idx) — sidebar checklist
 */

window.GitEngine = (function () {

  // ── Timer ─────────────────────────────────────────────────────────────────
  let _timerEl = null;
  let _timerStart = null;
  let _timerHandle = null;
  let _timerStopped = false;
  let _elapsedSecs = 0;

  function startTimer(el) {
    _timerEl = el;
    _timerStart = Date.now();
    _timerStopped = false;
    _elapsedSecs = 0;
    clearInterval(_timerHandle);
    _timerHandle = setInterval(() => {
      if (_timerStopped) return;
      _elapsedSecs = Math.floor((Date.now() - _timerStart) / 1000);
      if (_timerEl) _timerEl.textContent = _fmt(_elapsedSecs);
    }, 500);
  }

  function stopTimer() {
    _timerStopped = true;
    clearInterval(_timerHandle);
    _elapsedSecs = Math.floor((Date.now() - (_timerStart || Date.now())) / 1000);
    if (_timerEl) _timerEl.textContent = _fmt(_elapsedSecs);
    return _elapsedSecs;
  }

  function _fmt(s) {
    return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
  }

  // ── StepRunner ────────────────────────────────────────────────────────────
  const MAX_CMD_LENGTH = 512; // reject absurdly long inputs
  /**
   * new GitEngine.StepRunner(steps, { onComplete })
   *
   * Each step:
   *   label       : string   short checklist label
   *   prompt      : string   instruction shown to player
   *   hint        : string   shown on 'hint' command or wrong answer
   *   check(cmd)  : bool     true when the command is accepted
   *   success_msg : string   shown on advance
   *   wrong_msg   : string?  optional custom wrong-answer message
   *   cmd_example : string?  shown in wrong-answer message
   *
   * process(cmd) returns one of:
   *   { type:'advance',  msg, nextPrompt }   step done, more remain
   *   { type:'complete', msg, final:true }   last step done
   *   { type:'wrong',    msg, hint }         wrong command
   *   { type:'hint',     msg }               player typed 'hint'
   *   { type:'help',     msg }               player typed 'help'
   *   { type:'noop' }                        unrecognised — let game handle it
   */
  class StepRunner {
    constructor(steps, { onComplete } = {}) {
      if (!steps || steps.length === 0) throw new Error('StepRunner: steps array is empty');
      this.steps = steps;
      this.current = 0;
      this.onComplete = onComplete || (() => { });
      this._done = false;
    }

    get currentStep() { return this.steps[this.current]; }
    get isComplete() { return this._done; }

    process(cmd) {
      const raw = (cmd || '').trim();
      if (!raw) return { type: 'noop' };
      // Reject absurdly long inputs to avoid runaway regex on check() functions
      if (raw.length > MAX_CMD_LENGTH) return { type: 'wrong', msg: 'Command too long.', hint: '' };

      if (raw === 'hint') {
        const step = this.steps[this.current];
        return { type: 'hint', msg: step ? step.hint : 'No more hints available.' };
      }
      if (raw === 'help') {
        return { type: 'help', msg: 'Type hint for the next command, or follow the Steps panel.' };
      }

      if (this._done) return { type: 'noop' };

      const step = this.steps[this.current];
      if (!step) return { type: 'noop' };

      let correct = false;
      try { correct = !!step.check(raw); } catch (e) { /* ignore error and treat as incorrect */ correct = false; }

      if (correct) {
        const msg = step.success_msg || `✓ Step ${this.current + 1} complete.`;
        this.current++;

        if (this.current >= this.steps.length) {
          this._done = true;
          // Fire onComplete after the caller has a chance to render output
          setTimeout(() => this.onComplete(), 0);
          return { type: 'complete', msg, final: true };
        }

        return { type: 'advance', msg, nextPrompt: this.steps[this.current].prompt };
      }

      // Only report 'wrong' for commands that look like git subcommands or special keywords.
      // Unknown commands (e.g. 'ls', 'cat') are returned as 'noop' so the game can handle them.
      const looksLikeGit = /^git\s/.test(raw);
      if (!looksLikeGit) return { type: 'noop' };

      return {
        type: 'wrong',
        msg: step.wrong_msg || `Not quite. Expected: ${step.cmd_example || step.label}`,
        hint: step.hint,
      };
    }

    /**
     * forceAdvance() — advance without a command check.
     * Used by merge-mayhem after GUI conflict resolution clears a wave.
     */
    forceAdvance() {
      if (this._done) return { type: 'noop' };
      const step = this.steps[this.current];
      const msg = step ? (step.success_msg || `Step ${this.current + 1} complete.`) : '';
      this.current++;
      if (this.current >= this.steps.length) {
        this._done = true;
        setTimeout(() => this.onComplete(), 0);
        return { type: 'complete', msg, final: true };
      }
      return { type: 'advance', msg, nextPrompt: this.steps[this.current].prompt };
    }
  }

  // ── renderStepProgress ────────────────────────────────────────────────────
  function renderStepProgress(el, steps, currentIdx) {
    if (!el) return;
    function _esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
    el.innerHTML = steps.map((s, i) => {
      const done = i < currentIdx;
      const active = i === currentIdx;
      const icon = done ? '✓' : active ? '▶' : '○';
      const col = done ? 'var(--green)' : active ? 'var(--amber)' : '#4e4238';
      return `<div style="display:flex;gap:8px;padding:5px 0;border-bottom:1px solid #12141a;align-items:flex-start;">
        <span style="font-size:12px;color:${col};flex-shrink:0;margin-top:1px;">${icon}</span>
        <div>
          <div style="font-size:12px;color:${col};font-weight:700;">${_esc(s.label)}</div>
          ${active ? `<div style="font-size:11px;color:#8899bb;margin-top:2px;font-style:italic;">${_esc(s.prompt)}</div>` : ''}
        </div>
      </div>`;
    }).join('');
  }

  // ── Completion Modal ──────────────────────────────────────────────────────
  const MODAL_CSS = `
    .ge-bd{position:fixed;inset:0;background:rgba(0,0,0,.92);z-index:9999;display:flex;align-items:center;justify-content:center;animation:ge-fi .2s ease;}
    @keyframes ge-fi{from{opacity:0}to{opacity:1}}
    .ge-box{width:min(500px,94vw);background:#0a0c14;border:1px solid #151928;font-family:'JetBrains Mono',monospace;animation:ge-si .22s ease;}
    @keyframes ge-si{from{opacity:0;transform:translateY(-18px)}to{opacity:1;transform:none}}
    .ge-hd{padding:22px 24px 14px;text-align:center;border-bottom:1px solid #151928;}
    .ge-trophy{font-size:44px;display:block;margin-bottom:6px;}
    .ge-title{font-family:'Syne',sans-serif;font-size:24px;color:#00d4ff;text-shadow:0 0 30px rgba(0,212,255,.5);}
    .ge-time{font-size:42px;color:#a8ff3e;font-weight:bold;margin:10px 0 3px;letter-spacing:3px;}
    .ge-gametag{font-size:12px;letter-spacing:2px;color:#8899bb;}
    .ge-body{padding:18px 24px;}
    .ge-lbl{font-size:11px;letter-spacing:3px;color:#00d4ff;text-transform:uppercase;margin-bottom:7px;font-weight:700;}
    .ge-urow{display:flex;gap:8px;margin-bottom:12px;}
    .ge-uinput{flex:1;background:#060810;border:1px solid #151928;color:#00d4ff;font-family:'JetBrains Mono',monospace;font-size:13px;padding:8px 10px;outline:none;transition:border-color .2s;}
    .ge-uinput:focus{border-color:#00d4ff;}
    .ge-uinput::placeholder{color:#2a3050;}
    .ge-ubtn{padding:0 14px;background:rgba(0,212,255,0.1);border:1px solid #151928;color:#00d4ff;font-family:'JetBrains Mono',monospace;font-size:11px;cursor:pointer;white-space:nowrap;transition:background .2s;}
    .ge-ubtn:hover{background:rgba(0,212,255,0.2);}
    .ge-score{background:#060810;border:1px solid #151928;padding:10px 13px;font-size:11px;color:#8899bb;line-height:1.9;margin-bottom:12px;word-break:break-all;font-family:'JetBrains Mono',monospace;}
    .ge-score .hl{color:#00d4ff;}
    .ge-steps-box{background:rgba(0,0,0,.3);border:1px solid #151928;padding:12px 14px;margin-bottom:14px;}
    .ge-step{display:flex;gap:8px;padding:6px 0;font-size:12px;color:#ffffff;border-bottom:1px solid #151928;align-items:flex-start;}
    .ge-step:last-child{border-bottom:none;}
    .ge-step-num{color:#00d4ff;flex-shrink:0;min-width:14px;font-weight:700;}
    .ge-step .cmd{color:#a8ff3e;}
    .ge-btns{display:flex;gap:8px;}
    .ge-btn{flex:1;padding:10px;background:transparent;border:1px solid #151928;color:#00d4ff;font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:1px;cursor:pointer;transition:background .2s;}
    .ge-btn:hover{background:rgba(0,212,255,0.1);}
    .ge-btn.sec{border-color:#151928;color:#8899bb;}
    .ge-btn.sec:hover{border-color:#00d4ff;color:#00d4ff;}
    .ge-note{font-size:11px;color:#8899bb;margin-top:9px;line-height:1.6;text-align:center;}
    .ge-note .hl{color:#00d4ff;}
    .ge-copied{color:#a8ff3e;font-size:10px;margin-top:7px;display:none;letter-spacing:1px;text-align:center;}
  `;

  let _modalStyleInjected = false;
  function _injectModalStyle() {
    if (_modalStyleInjected) return;
    const s = document.createElement('style');
    s.textContent = MODAL_CSS;
    document.head.appendChild(s);
    _modalStyleInjected = true;
  }

  // Derive GitHub owner/repo from current hostname (GitHub Pages convention)
  function _ghInfo() {
    try {
      const m = window.location.hostname.match(/^([^.]+)\.github\.io$/);
      if (m) {
        const owner = m[1];
        const repo = window.location.pathname.split('/').filter(Boolean)[0] || 'git-games-hub';
        return { owner, repo };
      }
      // Vercel / Custom domain fallbacks
      return { owner: 'Abhisheksinha1506', repo: 'git-games-hub' };
    } catch (e) { return { owner: 'Abhisheksinha1506', repo: 'git-games-hub' }; }
  }

  // Probe for the repo's default branch (main → master → trunk → develop)
  // Returns the branch name string, or 'main' as safe fallback.
  const _DEFAULT_BRANCH_CACHE = {};
  async function _detectDefaultBranch(owner, repo) {
    const key = `${owner}/${repo}`;
    if (_DEFAULT_BRANCH_CACHE[key]) return _DEFAULT_BRANCH_CACHE[key];
    const candidates = ['main', 'master', 'trunk', 'develop'];
    for (const b of candidates) {
      try {
        const r = await fetch(
          `https://raw.githubusercontent.com/${owner}/${repo}/${b}/README.md`,
          { method: 'HEAD' }
        );
        if (r.ok) { _DEFAULT_BRANCH_CACHE[key] = b; return b; }
      } catch (_) { /* ignore fetch errors for probes */ }
    }
    _DEFAULT_BRANCH_CACHE[key] = 'main';
    return 'main';
  }

  // ── Persistent username storage (localStorage with graceful in-memory fallback) ──
  const _memStore = {};
  const _storage = {
    get(k) {
      try { return localStorage.getItem(k) || null; }
      catch (_) { return _memStore[k] || null; }
    },
    set(k, v) {
      try { localStorage.setItem(k, v); }
      catch (_) { _memStore[k] = v; }
    }
  };

  const GAME_TITLES = {
    'murder': '⚰️ Git Murder Mystery',
    'branch-quest': '🌿 Branch Quest',
    'commit-detective': '🔍 Commit Detective',
    'merge-mayhem': '⚔️ Merge Mayhem',
    'timeline-travel': '⏳ Timeline Travel',
    'escape-room': '🚪 Escape Room',
  };

  // README section headings — must match what's in README.md
  const README_HEADINGS = {
    'murder': 'Git Murder Mystery',
    'branch-quest': 'Branch Quest Adventure',
    'commit-detective': 'Commit History Detective',
    'merge-mayhem': 'Merge Conflict Mayhem',
    'timeline-travel': 'Git Timeline Time Travel',
    'escape-room': 'Repo Escape Room',
  };

  function showCompletionModal(gameId, elapsedSecs) {
    _injectModalStyle();

    const old = document.getElementById('ge-backdrop');
    if (old) old.remove();

    const timeStr = _fmt(elapsedSecs);
    const date = new Date().toISOString().slice(0, 10);
    const gameTitle = GAME_TITLES[gameId] || gameId;
    const { owner, repo } = _ghInfo();

    // Retrieve saved username via safe storage wrapper
    let savedUser = _storage.get('gg-github-username') || '';

    // Sanitize a raw username input: strip @ prefix, control chars, limit length
    // GitHub usernames: only alphanumeric and hyphens (underscores NOT allowed)
    function _sanitizeUsername(raw) {
      return (raw || '')
        .replace(/^@/, '')
        .replace(/[^a-zA-Z0-9-]/g, '')  // GitHub: alphanumeric + hyphens only (no underscore)
        .slice(0, 39)                    // GitHub max username length
        .trim();
    }

    function _buildScoreRow(username) {
      const u = _sanitizeUsername(username) || 'YOUR_USERNAME';
      return `| 🏅 | @${u} | ${timeStr} | ${date} |`;
    }

    // Build the PR URL asynchronously once we know the default branch
    async function _buildPrUrl(username) {
      if (!owner) return null;
      const u = _sanitizeUsername(username) || 'your-username';
      const branch = await _detectDefaultBranch(owner, repo);
      const scoreRow = _buildScoreRow(u);
      const heading = README_HEADINGS[gameId] || gameTitle.replace(/^[^\w]+/, '').trim();
      const body = [
        '## 🏆 Score Submission',
        '',
        `**Game:** ${gameTitle}`,
        `**Player:** @${u}`,
        `**Time:** \`${timeStr}\``,
        `**Date:** ${date}`,
        '',
        '### Instructions for maintainer',
        `Add the following row to the **${heading}** leaderboard table in \`README.md\`:`,
        '',
        '```',
        scoreRow,
        '```',
        '',
        '> _CI will verify the row format automatically._',
      ].join('\n');
      return (
        `https://github.com/${owner}/${repo}/compare/${branch}...score-entry/${u}` +
        `?quick_pull=1` +
        `&title=${encodeURIComponent('[Score] ' + gameId + ' — @' + u + ' — ' + timeStr)}` +
        `&body=${encodeURIComponent(body)}`
      );
    }

    // HTML-escape a string for safe injection into attribute values or text content
    function _htmlEsc(s) {
      return String(s)
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    }

    const bd = document.createElement('div');
    bd.className = 'ge-bd';
    bd.id = 'ge-backdrop';

    bd.innerHTML = `
      <div class="ge-box">
        <div class="ge-hd">
          <span class="ge-trophy">🏆</span>
          <div class="ge-title">GAME COMPLETE!</div>
          <div class="ge-time">${timeStr}</div>
          <div class="ge-gametag">${_htmlEsc(gameTitle.toUpperCase())}</div>
        </div>
        <div class="ge-body">

          <div class="ge-lbl">Your GitHub Username</div>
          <div class="ge-urow">
            <input class="ge-uinput" id="ge-uinput" type="text"
              placeholder="e.g. octocat" value="${_htmlEsc(savedUser)}"
              maxlength="39" autocomplete="off" spellcheck="false"
              aria-label="GitHub Username">
            <button class="ge-ubtn" id="ge-update-btn">UPDATE ↻</button>
          </div>

          <div class="ge-lbl">Your Score Row (mandatory for leaderboard)</div>
          <div class="ge-score" id="ge-score-text">${_htmlEsc(_buildScoreRow(savedUser))}</div>

          <div class="ge-lbl">How to submit your score</div>
          <div class="ge-steps-box">
            <div class="ge-step"><span class="ge-step-num">1.</span><span>Enter your GitHub username above, then click <span class="cmd">UPDATE</span>.</span></div>
            <div class="ge-step"><span class="ge-step-num">2.</span><span>Click <span class="cmd">COPY SCORE</span> to copy your table row.</span></div>
            <div class="ge-step"><span class="ge-step-num">3.</span><span>Click <span class="cmd">OPEN PR</span> — GitHub opens a pre-filled pull request in a new tab.</span></div>
            <div class="ge-step"><span class="ge-step-num">4.</span><span>In the PR, edit <code>README.md</code> and paste your row into the <strong>${_htmlEsc(README_HEADINGS[gameId] || gameId)}</strong> leaderboard table.</span></div>
            <div class="ge-step"><span class="ge-step-num">5.</span><span>Submit the PR — CI checks the row format, then the maintainer merges it. 🎉</span></div>
          </div>

          <div class="ge-btns">
            <button class="ge-btn" id="ge-copy-btn">📋 COPY SCORE</button>
            <button class="ge-btn" id="ge-pr-btn">🚀 OPEN PR ↗</button>
            <button class="ge-btn" id="ge-hub-btn">🏠 EXIT TO HUB</button>
            <button class="ge-btn sec" id="ge-close-btn">✕ CLOSE</button>
          </div>
          <div class="ge-copied" id="ge-copied">✓ Copied to clipboard!</div>
          <div class="ge-note" id="ge-pr-note">${owner ? '' : '⚠ PR button requires hosting on GitHub — URL not detected.'}</div>
        </div>
      </div>`;

    document.body.appendChild(bd);

    // Helper: rebuild score row and PR link from current username input.
    // Guards every DOM access: the modal may be dismissed while _buildPrUrl() is awaited.
    async function _refresh() {
      const inputEl = document.getElementById('ge-uinput');
      if (!inputEl) return; // modal was closed before this call completed
      const raw = inputEl.value;
      const u = _sanitizeUsername(raw);
      // Sync the input to show sanitized value (e.g. stripped special chars)
      if (u !== raw.replace(/^@/, '').trim()) {
        inputEl.value = u;
      }
      if (u) _storage.set('gg-github-username', u);
      const scoreEl = document.getElementById('ge-score-text');
      if (scoreEl) scoreEl.textContent = _buildScoreRow(u);

      const prBtn = document.getElementById('ge-pr-btn');
      if (!prBtn) return; // modal was closed
      prBtn.disabled = true;
      prBtn.textContent = '⏳ Detecting branch…';
      const url = await _buildPrUrl(u);
      // Re-check after await — modal may have been closed while we waited
      if (!prBtn.isConnected) return;
      if (url) {
        prBtn.onclick = () => window.open(url, '_blank');
        prBtn.style.opacity = '1';
        prBtn.disabled = false;
        prBtn.textContent = '🚀 OPEN PR ↗';
      } else {
        prBtn.style.opacity = '0.4';
        prBtn.disabled = true;
        prBtn.textContent = '🚀 OPEN PR ↗';
      }
    }

    // Initial render — async, but errors are caught internally
    _refresh().catch(() => { });

    document.getElementById('ge-update-btn').addEventListener('click', () => { _refresh().catch(() => { }); });
    document.getElementById('ge-uinput').addEventListener('keydown', e => { if (e.key === 'Enter') _refresh().catch(() => { }); });

    document.getElementById('ge-copy-btn').addEventListener('click', async () => {
      // Await refresh so score row is up-to-date before copying
      await _refresh().catch(() => { });
      const text = document.getElementById('ge-score-text') ? document.getElementById('ge-score-text').textContent : '';
      if (!text) return;
      const showCopied = () => {
        const el = document.getElementById('ge-copied');
        if (el) { el.style.color = '#a8ff3e'; el.textContent = '✓ Copied to clipboard!'; el.style.display = 'block'; setTimeout(() => { el.style.display = 'none'; }, 2500); }
      };
      const showFailed = () => {
        const el = document.getElementById('ge-copied');
        if (el) { el.style.color = '#ff4f6d'; el.textContent = '⚠ Copy failed — select the text above and copy manually (Ctrl+C / ⌘C).'; el.style.display = 'block'; setTimeout(() => { el.style.display = 'none'; }, 5000); }
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(showCopied).catch(() => _fallbackCopy(text, showCopied, showFailed));
      } else { _fallbackCopy(text, showCopied, showFailed); }
    });

    // Store onKey so BOTH close paths remove it (B2: was only removed on Escape, not close-btn)
    const onKey = e => { if (e.key === 'Escape') { bd.remove(); document.removeEventListener('keydown', onKey); } };
    document.addEventListener('keydown', onKey);

    document.getElementById('ge-hub-btn').addEventListener('click', () => { window.location.href = 'index.html'; });

    document.getElementById('ge-close-btn').addEventListener('click', () => { bd.remove(); document.removeEventListener('keydown', onKey); });

    // Dismiss on backdrop click — also removes keydown listener
    bd.addEventListener('click', e => { if (e.target === bd) { bd.remove(); document.removeEventListener('keydown', onKey); } });
  }

  function _fallbackCopy(text, onSuccess, onFail) {
    const ta = Object.assign(document.createElement('textarea'), { value: text, style: 'position:fixed;opacity:0;' });
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch (_) { /* ignore copy failures */ }
    ta.remove();
    if (ok) { if (onSuccess) onSuccess(); }
    else { if (onFail) onFail(); }
  }

  // ── Public API ────────────────────────────────────────────────────────────
  return { StepRunner, startTimer, stopTimer, renderStepProgress, showCompletionModal };

})();
