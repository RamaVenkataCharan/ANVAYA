const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '../..');
const IGNORE_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  '.expo',
  'audit-evidence',
  '.turbo',
  'coverage'
]);

const EXTENSIONS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.json', '.md', '.sql', '.prisma', '.yml', '.yaml', '.dockerfile', 'Dockerfile'
]);

const PATTERNS = [
  { type: 'TODO', regex: /\bTODO\b[:\s]*(.*)/i },
  { type: 'FIXME', regex: /\bFIXME\b[:\s]*(.*)/i },
  { type: 'HACK', regex: /\bHACK\b[:\s]*(.*)/i },
  { type: 'XXX', regex: /\bXXX\b[:\s]*(.*)/i },
  { type: 'TEMP', regex: /\bTEMP(?:ORARY)?\b[:\s]*(.*)/i },
  { type: 'STUB', regex: /\bSTUB\b[:\s]*(.*)/i },
  { type: 'MOCK', regex: /\bMOCK\b[:\s]*(.*)/i }
];

const findings = [];

function walk(dir) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (e) {
    return;
  }

  for (const entry of entries) {
    if (IGNORE_DIRS.has(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (EXTENSIONS.has(ext) || entry.name === 'Dockerfile') {
        scanFile(fullPath);
      }
    }
  }
}

function scanFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    const relPath = path.relative(rootDir, filePath).replace(/\\/g, '/');

    // Skip audit scripts themselves
    if (relPath.startsWith('scripts/audit/')) return;

    lines.forEach((line, idx) => {
      for (const { type, regex } of PATTERNS) {
        const match = line.match(regex);
        if (match) {
          findings.push({
            type,
            file: relPath,
            line: idx + 1,
            comment: match[0].trim(),
            context: line.trim()
          });
          break; // Avoid double matching same line
        }
      }
    });
  } catch (err) {
    // Ignore read errors
  }
}

walk(rootDir);

const evidenceDir = path.join(rootDir, 'docs/audit-evidence');
if (!fs.existsSync(evidenceDir)) {
  fs.mkdirSync(evidenceDir, { recursive: true });
}

fs.writeFileSync(
  path.join(evidenceDir, 'todo-inventory.json'),
  JSON.stringify(findings, null, 2),
  'utf8'
);

let textOutput = `=== ANVAYA CODEBASE TODO / FIXME / HACK / STUB INVENTORY ===\nTotal items found: ${findings.length}\n\n`;
const byType = {};
findings.forEach(f => {
  byType[f.type] = (byType[f.type] || 0) + 1;
});
textOutput += `Breakdown by type:\n${JSON.stringify(byType, null, 2)}\n\n`;

findings.forEach(f => {
  textOutput += `[${f.type}] ${f.file}:${f.line} -> ${f.context}\n`;
});

fs.writeFileSync(path.join(evidenceDir, 'todo-inventory.txt'), textOutput, 'utf8');
console.log(`Scan completed. Found ${findings.length} items. Written to docs/audit-evidence/todo-inventory.json & .txt`);
