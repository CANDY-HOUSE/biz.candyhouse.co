const fs = require('fs');
const { execSync } = require('child_process');

function formatDateYYYYMMDD(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function tryExec(cmd) {
  try {
    return execSync(cmd, { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
  } catch (e) {
    return '';
  }
}

const gitHashFull = tryExec('git rev-parse HEAD');
const gitHash = gitHashFull ? gitHashFull.substring(0, 8) : 'unknown';

const versionInfo = {
  gitHash,
  buildTime: formatDateYYYYMMDD(),
  version: '1.0.0',
};

fs.writeFileSync('public/version.json', JSON.stringify(versionInfo, null, 2), 'utf8');
