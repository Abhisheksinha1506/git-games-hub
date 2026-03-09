import { Buffer } from 'buffer';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { gameId, username, time, date } = req.body;
    const token = process.env.GITHUB_TOKEN;

    if (!token) {
        console.error('Missing GITHUB_TOKEN environment variable');
        return res.status(500).json({ error: 'Server configuration error' });
    }

    // Configuration
    const OWNER = 'Abhisheksinha1506';
    const REPO = 'git-games-hub';
    const BRANCH = 'main';
    const PATH = 'README.md';

    const ROW_REGEX = /^\|\s*[🏅🥇🥈🥉\d🏆]+\s*\|\s*@([\w-]+)\s*\|\s*(\d{2}:\d{2})\s*\|\s*(\d{4}-\d{2}-\d{2})\s*\|$/;
    const scoreRow = `| 🏅 | @${username} | ${time} | ${date} |`;

    if (!ROW_REGEX.test(scoreRow)) {
        return res.status(400).json({ error: 'Invalid score format' });
    }

    try {
        // 1. Fetch current README
        const getUrl = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${PATH}?ref=${BRANCH}`;
        const getRes = await fetch(getUrl, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });

        if (!getRes.ok) {
            throw new Error(`Failed to fetch README: ${getRes.statusText}`);
        }

        const { content, sha } = await getRes.json();
        let readme = Buffer.from(content, 'base64').toString('utf8');

        // 2. Insert and Sort Logic
        const startTag = `<!-- LEADERBOARD:${gameId} -->`;
        const endTag = `<!-- END:${gameId} -->`;
        const startIdx = readme.indexOf(startTag);
        const endIdx = readme.indexOf(endTag);

        if (startIdx === -1 || endIdx === -1) {
            throw new Error(`Leaderboard markers for ${gameId} not found`);
        }

        // Extract section and existing rows
        const before = readme.slice(0, startIdx + startTag.length);
        const section = readme.slice(startIdx + startTag.length, endIdx);
        const after = readme.slice(endIdx);

        const rows = [];
        const allLines = (section + '\n' + scoreRow).split('\n');

        for (const line of allLines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith('|') || trimmed.includes('| Rank') || trimmed.includes('|---') || trimmed.includes('_no scores yet_')) {
                continue;
            }
            const m = trimmed.match(ROW_REGEX);
            if (m) {
                const [, u, t, d] = m;
                const [mins, secs] = t.split(':').map(Number);
                rows.push({ raw: trimmed, secs: mins * 60 + secs });
            }
        }

        // Sort fastest first
        rows.sort((a, b) => a.secs - b.secs);

        // Rebuild section
        let newSection = '\n| Rank | Player | Time | Date |\n|------|--------|------|------|\n';
        const MEDALS = ['🥇', '🥈', '🥉'];
        rows.forEach((r, i) => {
            const icon = MEDALS[i] || `\`${i + 1}\``;
            newSection += r.raw.replace(/^\|\s*[^|]+\s*\|/, `| ${icon} |`) + '\n';
        });

        const updatedReadme = before + newSection + after;

        if (updatedReadme === readme) {
            return res.status(200).json({ message: 'Score already recorded' });
        }

        // 3. Push update to GitHub
        const putUrl = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${PATH}`;
        const putRes = await fetch(putUrl, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/vnd.github.v3+json'
            },
            body: JSON.stringify({
                message: `🏅 New score: ${username} on ${gameId} [skip ci]`,
                content: Buffer.from(updatedReadme).toString('base64'),
                sha,
                branch: BRANCH
            })
        });

        if (!putRes.ok) {
            const err = await putRes.json();
            throw new Error(`GitHub Update Failed: ${err.message}`);
        }

        return res.status(200).json({ success: true, message: 'Leaderboard updated!' });

    } catch (error) {
        console.error('Submission Error:', error);
        return res.status(500).json({ error: error.message });
    }
}
