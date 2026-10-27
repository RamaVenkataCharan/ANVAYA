const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const SECRET_PATTERNS = [
  { name: 'Private Key', regex: /-----BEGIN (RSA|EC|OPENSSH|PGP|PRIVATE) KEY/i },
  { name: 'Generic API Key / Secret', regex: /(api[_-]?key|secret|token|password|auth[_-]?key)\s*[:=]\s*['"][a-zA-Z0-9_\-\.]{8,}['"]/i },
  { name: 'Hardcoded JWT Secret', regex: /(JWT_SECRET|SECRET_KEY|ACCESS_TOKEN_SECRET|REFRESH_TOKEN_SECRET)\s*[:=]\s*['"][^'"]+['"]/i },
  { name: 'Hardcoded Database URL with Password', regex: /(postgres|postgresql|mysql|mongodb):\/\/[^:\/\s]+:[^@\/\s]+@[^:\/\s]+/i },
  { name: 'High Entropy Hex/Base64 Token', regex: /['"][a-f0-9]{32,64}['"]/i },
  { name: 'Bearer Token', regex: /bearer\s+[a-zA-Z0-9_\-\.]{20,}/i },
  { name: 'Stripe/AWS/Sendgrid/Twilio/Firebase Key', regex: /(sk_live|pk_live|AKIA[0-9A-Z]{16}|SG\.[a-zA-Z0-9_\-]{22}|AIza[0-9A-Za-z-_]{35})/ },
];

const IGNORED_PATHS = [
  'node_modules',
  '.git',
  'dist',
  'build',
  '.next',
  '.expo',
  'docs/audit-evidence',
  'package-lock.json',
];

const results = {
  workingTree: [],
  gitHistory: [],
  envFiles: [],
};

// 1. Scan .env files explicitly
console.log('Scanning environment files...');
function findEnvFiles(dir) {
  const files = fs.readdirSync(dir, { withFileTypes: true });
  for (const f of files) {
    const full = path.join(dir, f.name);
    if (f.isDirectory() && !IGNORED_PATHS.some(p => full.includes(p))) {
      findEnvFiles(full);
    } else if (f.isFile() && f.name.startsWith('.env')) {
      const content = fs.readFileSync(full, 'utf8');
      results.envFiles.push({ file: full, content });
    }
  }
}
findEnvFiles('.');

// 2. Scan working tree
console.log('Scanning working tree files...');
function scanTree(dir) {
  const files = fs.readdirSync(dir, { withFileTypes: true });
  for (const f of files) {
    const full = path.join(dir, f.name);
    if (f.isDirectory()) {
      if (!IGNORED_PATHS.some(p => full.replace(/\\/g, '/').includes(p))) {
        scanTree(full);
      }
    } else if (f.isFile()) {
      const ext = path.extname(f.name);
      if (['.ts', '.tsx', '.js', '.jsx', '.json', '.yml', '.yaml', '.md', '.env', '.sh'].includes(ext) || f.name.startsWith('.env')) {
        try {
          const content = fs.readFileSync(full, 'utf8');
          const lines = content.split('\n');
          lines.forEach((line, idx) => {
            for (const pattern of SECRET_PATTERNS) {
              if (pattern.regex.test(line)) {
                // Ignore test fixtures if obvious, but record with note
                results.workingTree.push({
                  file: full,
                  line: idx + 1,
                  type: pattern.name,
                  snippet: line.trim().substring(0, 150),
                });
              }
            }
          });
        } catch (e) {}
      }
    }
  }
}
scanTree('.');

// 3. Scan git commit history (git log -p)
console.log('Scanning git history for leaked credentials...');
try {
  const gitLog = execSync('git log -p -n 100', { maxBuffer: 50 * 1024 * 1024, encoding: 'utf8' });
  const commitDiffs = gitLog.split(/^commit /m);
  
  commitDiffs.forEach(diffChunk => {
    if (!diffChunk.trim()) return;
    const lines = diffChunk.split('\n');
    const commitHash = lines[0]?.split(' ')[0] || 'unknown';
    const authorLine = lines.find(l => l.startsWith('Author:')) || '';
    const dateLine = lines.find(l => l.startsWith('Date:')) || '';
    
    lines.forEach((line, lineIdx) => {
      if (line.startsWith('+') && !line.startsWith('+++')) {
        for (const pattern of SECRET_PATTERNS) {
          if (pattern.regex.test(line)) {
            // Avoid flagging common sample words
            if (!line.includes('sample') && !line.includes('placeholder')) {
              results.gitHistory.push({
                commit: commitHash,
                line: lineIdx,
                type: pattern.name,
                snippet: line.trim().substring(0, 150),
              });
            }
          }
        }
      }
    });
  });
} catch (err) {
  console.error('Error running git log:', err.message);
}

fs.writeFileSync('docs/audit-evidence/secrets-scan.json', JSON.stringify(results, null, 2));
console.log(`Scan complete! Found:
- ${results.envFiles.length} .env files
- ${results.workingTree.length} potential secrets in working tree
- ${results.gitHistory.length} potential secrets in git commit history`);
