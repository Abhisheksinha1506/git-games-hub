const fs = require('fs');
const path = require('path');

// ── Config ────────────────────────────────────────────────────────
const GAMES = [
  'murder', 'branch-quest', 'commit-detective',
  'escape-room', 'merge-mayhem', 'timeline-travel'
];
const ROW_REGEX = /^\|\s*[🏅🥇🥈🥉\d🏆]+\s*\|\s*@([\w-]+)\s*\|\s*(\d{2}:\d{2})\s*\|\s*(\d{4}-\d{2}-\d{2})\s*\|$/;
const HEADER = '| Rank | Player | Time | Date |';
const DIVIDER = '|------|--------|------|------|';
const MEDALS = ['🥇', '🥈', '🥉'];

const readmePath = process.argv[2] || 'README.md';
let readme;
try {
  readme = fs.readFileSync(readmePath, 'utf8');
} catch (e) {
  console.error(`❌ Could not read ${readmePath}`);
  process.exit(1);
}

let errors = [];
let warnings = [];
let changed = false;

// ── Row Insertion Mode ───────────────────────────────────────────
const insertFlag = process.argv.indexOf('--insert');
if (insertFlag !== -1 && process.argv[insertFlag + 1]) {
  const newRow = process.argv[insertFlag + 1].trim();
  const m = newRow.match(ROW_REGEX);
  if (!m) {
    console.error(`❌ Cannot insert malformed row: ${newRow}`);
    process.exit(1);
  }

  // Identify which game this row belongs to by checking the README content
  // Note: in a more complex setup we'd pass gameId, but here we can infer 
  // if the user is submitting a score that matches a specific game prompt.
  // Actually, let's add --game parameter to be safe.
  const gameFlag = process.argv.indexOf('--game');
  const targetGame = gameFlag !== -1 ? process.argv[gameFlag + 1] : null;

  if (targetGame && GAMES.includes(targetGame)) {
    const startTag = `<!-- LEADERBOARD:${targetGame} -->`;
    const tagIdx = readme.indexOf(startTag);
    if (tagIdx !== -1) {
      // Insert right after the start tag (it will be sorted anyway)
      readme = readme.slice(0, tagIdx + startTag.length) + '\n' + newRow + readme.slice(tagIdx + startTag.length);
      changed = true;
      console.log(`✅ Inserted row into ${targetGame} section.`);
    } else {
      console.error(`❌ Could not find leaderboard markers for ${targetGame}`);
      process.exit(1);
    }
  } else {
    console.error(`❌ Must specify a valid --game [${GAMES.join('|')}] for insertion.`);
    process.exit(1);
  }
}

// ── Helpers ───────────────────────────────────────────────────────
function timeToSecs(t) {
  const [m, s] = t.split(':').map(Number);
  return m * 60 + s;
}

function rankIcon(i) {
  return MEDALS[i] || `\`${i + 1}\``;
}

// ── Process each leaderboard section ──────────────────────────────
for (const game of GAMES) {
  const startTag = `<!-- LEADERBOARD:${game} -->`;
  const endTag = `<!-- END:${game} -->`;
  const start = readme.indexOf(startTag);
  const end = readme.indexOf(endTag);

  if (start === -1 || end === -1) {
    warnings.push(`⚠️  Leaderboard markers for '${game}' not found in README.md — skipping.`);
    continue;
  }

  const before = readme.slice(0, start + startTag.length);
  const section = readme.slice(start + startTag.length, end);
  const after = readme.slice(end);

  // Collect all valid score rows in this section
  const rows = [];
  for (const line of section.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('|') === false) continue;
    if (trimmed.startsWith('| Rank') || trimmed.startsWith('|---')) continue;
    if (trimmed.includes('_no scores yet_')) continue;

    const m = trimmed.match(ROW_REGEX);
    if (!m) {
      errors.push(`❌  Malformed row in '${game}' section: \`${trimmed}\``);
      errors.push(`    Expected format: \`| 🏅 | @username | MM:SS | YYYY-MM-DD |\``);
      continue;
    }

    const [, username, time, date] = m;

    // Validate date
    const submittedDate = new Date(date);
    const now = new Date();
    // Allow for a bit of lag in PR review, but future dates are errors
    if (submittedDate > now) {
      errors.push(`❌  Date '${date}' for @${username} in '${game}' is in the future.`);
      continue;
    }

    rows.push({ username, time, date, secs: timeToSecs(time) });
  }

  // Sort by time ascending (fastest first)
  rows.sort((a, b) => a.secs - b.secs);

  // Rebuild section
  let newSection = '\n';
  if (rows.length === 0) {
    newSection += `| Rank | Player | Time | Date |\n`;
    newSection += `|------|--------|------|------|\n`;
    newSection += `| 🥇 | _no scores yet_ | — | — |\n`;
  } else {
    newSection += `| Rank | Player | Time | Date |\n`;
    newSection += `|------|--------|------|------|\n`;
    rows.forEach((r, i) => {
      newSection += `| ${rankIcon(i)} | @${r.username} | ${r.time} | ${r.date} |\n`;
    });
  }

  const rebuilt = before + newSection + after;
  if (rebuilt !== readme) {
    readme = rebuilt;
    changed = true;
  }
}

// ── Write results ─────────────────────────────────────────────────
if (errors.length > 0) {
  console.error('VALIDATION ERRORS:\n' + errors.join('\n'));
  process.exit(1);
}

if (warnings.length > 0) {
  console.warn('WARNINGS:\n' + warnings.join('\n'));
}

if (changed) {
  fs.writeFileSync(readmePath, readme);
  console.log('✅ Leaderboard sorted and updated.');
} else {
  console.log('✅ Leaderboard already sorted — no changes needed.');
}

process.exit(0);
