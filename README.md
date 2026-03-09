# 🎮 Git Games Hub

> **Learn Git the fun way** — six browser-based interactive challenges, each teaching a different Git concept through gameplay. No install required. Pure HTML + JS.

🔗 **Play now:** `https://Abhisheksinha1506.github.io/git-games-hub/`

---

## 🕹️ Games

| Game | Concept | Difficulty |
|------|---------|-----------|
| [⚰️ Git Murder Mystery](murder.html) | `git log`, `git show`, `git tag` | Hard |
| [🌿 Branch Quest](branch-quest.html) | `git branch`, `git merge` | Easy |
| [🔍 Commit Detective](commit-detective.html) | `git log`, `git blame`, `git revert` | Easy |
| [🚪 Repo Escape Room](escape-room.html) | `git grep`, `git ls-files` | Medium |
| [⚔️ Merge Conflict Mayhem](merge-mayhem.html) | Merge conflict resolution | Medium |
| [⏳ Timeline Time Travel](timeline-travel.html) | `git reset`, `git bisect` | Medium |

---

## 🏆 Leaderboards

> Scores are submitted via Pull Request after completing a game. The timer starts automatically and stops only when all steps are completed correctly — no skipping allowed.

---

### ⚰️ Git Murder Mystery

<!-- LEADERBOARD:murder -->
| Rank | Player | Time | Date |
|------|--------|------|------|
| 🥇 | @TestGitMurder | 01:21 | 2026-03-09 |
<!-- END:murder -->

---

### 🌿 Branch Quest Adventure

<!-- LEADERBOARD:branch-quest -->
| Rank | Player | Time | Date |
|------|--------|------|------|
| 🥇 | _no scores yet_ | — | — |
<!-- END:branch-quest -->

---

### 🔍 Commit History Detective

<!-- LEADERBOARD:commit-detective -->
| Rank | Player | Time | Date |
|------|--------|------|------|
| 🥇 | @Test | 00:59 | 2026-03-09 |
<!-- END:commit-detective -->

---

### 🚪 Repo Escape Room

<!-- LEADERBOARD:escape-room -->
| Rank | Player | Time | Date |
|------|--------|------|------|
| 🥇 | _no scores yet_ | — | — |
<!-- END:escape-room -->

---

### ⚔️ Merge Conflict Mayhem

<!-- LEADERBOARD:merge-mayhem -->
| Rank | Player | Time | Date |
|------|--------|------|------|
| 🥇 | _no scores yet_ | — | — |
<!-- END:merge-mayhem -->

---

### ⏳ Git Timeline Time Travel

<!-- LEADERBOARD:timeline-travel -->
| Rank | Player | Time | Date |
|------|--------|------|------|
| 🥇 | _no scores yet_ | — | — |
<!-- END:timeline-travel -->

---

## 📥 Submitting Your Score

When you complete a game, the **GAME COMPLETE** modal appears automatically. We've automated the leaderboard process:

1. Enter your GitHub username in the modal.
2. Click **SUBMIT SCORE** — a new tab opens with a pre-filled GitHub submission.
3. Click **Submit new issue** on GitHub.
4. **Done!** Our bot automatically creates a PR, updates the leaderboard, and closes the submission for you. 🤖

---

## 🚀 Setup & Deployment

### Option A — GitHub Pages (Recommended, Free)

```bash
# 1. Fork or clone this repo
git clone https://github.com/YOUR_USERNAME/git-games-hub.git
cd git-games-hub

# 2. Push to your own GitHub repo
git remote set-url origin https://github.com/YOUR_USERNAME/git-games-hub.git
git push origin main

# 3. Enable GitHub Pages
# Repo → Settings → Pages → Source: Deploy from branch → main → / (root) → Save

# Your hub is live at:
# https://YOUR_USERNAME.github.io/git-games-hub/
```

### Option B — Local

Just open `index.html` in any browser. No server needed.

---

## 🛠️ Tech Stack

- Pure HTML5 + Vanilla JS — zero dependencies, zero build step
- `engine.js` — shared step-runner, timer, completion modal
- `overlay.js` — rules panel + live leaderboard fetcher
- GitHub Actions — CI validates score PRs, CD auto-deploys to Pages

---

## 📁 File Structure

```
git-games-hub/
├── index.html               ← Game hub / home page
├── murder.html              ← ⚰️ Git Murder Mystery
├── branch-quest.html        ← 🌿 Branch Quest
├── commit-detective.html    ← 🔍 Commit Detective
├── escape-room.html         ← 🚪 Repo Escape Room
├── merge-mayhem.html        ← ⚔️ Merge Conflict Mayhem
├── timeline-travel.html     ← ⏳ Timeline Time Travel
├── engine.js                ← Shared game engine
├── overlay.js               ← Rules + leaderboard overlay
├── README.md                ← This file (contains leaderboards)
└── .github/
    └── workflows/
        ├── deploy.yml       ← Auto-deploy to GitHub Pages on push to main
        └── validate-score.yml ← Validate score PR format
```

---

## 🤝 Contributing

- **Score PRs**: Complete a game and submit via the in-game modal
- **Bug fixes**: Open an issue or PR against `main`
- **New games**: Follow the existing game structure — `StepRunner` + `GitEngine` + `GitOverlay`

---

## 📜 License

MIT — play, fork, learn, share.
