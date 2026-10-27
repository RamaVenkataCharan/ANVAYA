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
  envFiles: [],
  workingTree: [],
  gitHistory: [],
  summary: {
    totalWorkingTree: 0,
    totalGitHistory: 0,
    realSecretsCount: 0,
    falsePositivesCount: 0,
  }
};

// 1. Scan .env files explicitly - Store ONLY filename and key names, NO secret values
console.log('Scanning environment files for keys (values strictly redacted)...');
function findEnvFiles(dir) {
  const files = fs.readdirSync(dir, { withFileTypes: true });
  for (const f of files) {
    const full = path.join(dir, f.name);
    if (f.isDirectory() && !IGNORED_PATHS.some(p => full.replace(/\\/g, '/').includes(p))) {
      findEnvFiles(full);
    } else if (f.isFile() && f.name.startsWith('.env')) {
      const content = fs.readFileSync(full, 'utf8');
      const keys = content.split('\n')
        .map(l => l.trim())
        .filter(l => l && !l.startsWith('#') && l.includes('='))
        .map(l => l.split('=')[0].trim());
      results.envFiles.push({ file: full.replace(/\\/g, '/'), definedKeys: keys });
    }
  }
}
findEnvFiles('.');

// 2. Scan working tree - Store ONLY file, line, and type (no secret values!)
console.log('Scanning working tree files (values redacted)...');
function scanTree(dir) {
  const files = fs.readdirSync(dir, { withFileTypes: true });
  for (const f of files) {
    const full = path.join(dir, f.name);
    const normalized = full.replace(/\\/g, '/');
    if (f.isDirectory()) {
      if (!IGNORED_PATHS.some(p => normalized.includes(p))) {
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
                const isDoc = normalized.startsWith('docs/') || normalized.includes('README');
                const isTest = normalized.includes('.test.') || normalized.includes('scripts/qa/');
                const isExample = normalized.includes('.env.example');
                
                results.workingTree.push({
                  file: normalized,
                  line: idx + 1,
                  type: pattern.name,
                  context: isDoc ? 'DOCUMENTATION' : isTest ? 'TEST_FIXTURE' : isExample ? 'CONFIG_EXAMPLE' : 'SOURCE_CODE',
                  value: '[REDACTED]',
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

// 3. Scan ENTIRE git commit history (all commits)
console.log('Scanning full git commit history (all commits, values redacted)...');
try {
  const gitLog = execSync('git log -p', { maxBuffer: 100 * 1024 * 1024, encoding: 'utf8' });
  const commitDiffs = gitLog.split(/^commit /m);
  
  commitDiffs.forEach(diffChunk => {
    if (!diffChunk.trim()) return;
    const lines = diffChunk.split('\n');
    const commitHash = lines[0]?.split(' ')[0] || 'unknown';
    
    let currentFile = '';
    lines.forEach((line, lineIdx) => {
      if (line.startsWith('diff --git a/')) {
        const parts = line.split(' ');
        currentFile = parts[2]?.replace(/^a\//, '') || '';
      }
      if (line.startsWith('+') && !line.startsWith('+++')) {
        for (const pattern of SECRET_PATTERNS) {
          if (pattern.regex.test(line)) {
            const isTestOrDoc = currentFile.includes('test') || currentFile.includes('docs') || currentFile.includes('scripts/qa') || currentFile.includes('.env.example');
            results.gitHistory.push({
              commit: commitHash.substring(0, 10),
              file: currentFile,
              diffLine: lineIdx,
              type: pattern.name,
              context: isTestOrDoc ? 'TEST_OR_DOC' : 'SOURCE_OR_CONFIG',
              value: '[REDACTED]',
            });
          }
        }
      }
    });
  });
} catch (err) {
  console.error('Error running git log:', err.message);
}

results.summary.totalWorkingTree = results.workingTree.length;
results.summary.totalGitHistory = results.gitHistory.length;

// Filter and analyze Real vs False Positives:
// False positives: documentation examples, test mock passwords like 'Password123', .env.example, sample tokens.
// Real/suspicious: live production keys, private keys, actual passwords or database URLs in non-test files.
const realWorkingTree = results.workingTree.filter(item => 
  item.context === 'SOURCE_CODE' && 
  !item.file.includes('mock') && 
  !item.file.includes('dummy') &&
  !item.file.includes('prisma/seed.ts')
);

const realGit = results.gitHistory.filter(item => 
  item.context === 'SOURCE_OR_CONFIG' &&
  !item.file.includes('seed.ts') &&
  !item.file.includes('test')
);

results.summary.realSecretsCount = realWorkingTree.length;
results.summary.falsePositivesCount = results.workingTree.length - realWorkingTree.length;

fs.writeFileSync('docs/audit-evidence/secrets-scan.json', JSON.stringify(results, null, 2), 'utf8');

const summaryText = `# Git History & Working Tree Secret Scan Summary (Redacted)

## Total Findings
- Working Tree Matches: ${results.summary.totalWorkingTree}
- Git History Diff Matches: ${results.summary.totalGitHistory}
- Real / Actionable Secrets Identified: ${results.summary.realSecretsCount}
- False Positives (Tests, Docs, Examples, Mock DB URLs): ${results.summary.falsePositivesCount}

## .env Files Found
${results.envFiles.map(e => `- \`${e.file}\`: Defined keys: ${e.definedKeys.join(', ')}`).join('\n')}

## Real / High-Risk Candidates in Source Code:
${realWorkingTree.length === 0 ? '- None detected in source tree.' : realWorkingTree.map(r => `- [${r.type}] ${r.file}:${r.line} (${r.context})`).join('\n')}

## Notes on Secret Handling
All secret values in this report and in \`secrets-scan.json\` are strictly redacted to prevent credential exposure.
`;

fs.writeFileSync('docs/audit-evidence/secrets-scan-summary.txt', summaryText, 'utf8');
console.log(summaryText);
