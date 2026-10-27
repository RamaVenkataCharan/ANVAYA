const fs = require('fs');
const path = require('path');

const RULES = [
  {
    id: 'SEC-CODE-01',
    severity: 'CRITICAL',
    title: 'Code Execution / Dangerous Eval',
    description: 'Use of eval(), Function(), or child_process with dynamic input allows remote code execution.',
    regex: /(eval\s*\(|new\s+Function\s*\(|exec\s*\([^)]*\$|execSync\s*\([^)]*\$)/,
    ignore: ['node_modules', 'dist', 'scripts/audit'],
  },
  {
    id: 'SEC-SQL-01',
    severity: 'CRITICAL',
    title: 'Raw SQL Injection Sink',
    description: 'Use of $queryRawUnsafe or $executeRawUnsafe with template literals allows SQL injection.',
    regex: /(\$queryRawUnsafe|\$executeRawUnsafe|\.query\s*\(`)/,
    ignore: ['node_modules', 'dist'],
  },
  {
    id: 'SEC-TRAV-01',
    severity: 'HIGH',
    title: 'Potential Path Traversal in File Operations',
    description: 'Direct filesystem access (readFile, unlink, createReadStream) using parameters without path sanitization.',
    regex: /(fs\.readFile|fs\.readFileSync|fs\.unlink|fs\.unlinkSync|fs\.createReadStream)\s*\([^)]*(req\.params|req\.query|req\.body)/,
    ignore: ['node_modules', 'dist', 'tests'],
  },
  {
    id: 'SEC-CRYPTO-01',
    severity: 'HIGH',
    title: 'Weak Insecure Random Generator',
    description: 'Use of Math.random() in security or token generation contexts rather than crypto.randomUUID or crypto.randomBytes.',
    regex: /(token|secret|code|password|salt|hash|key)\s*[:=][^;]*Math\.random\(\)/i,
    ignore: ['node_modules', 'dist', 'tests'],
  },
  {
    id: 'SEC-JWT-01',
    severity: 'HIGH',
    title: 'Hardcoded Fallback Secret in JWT Verification',
    description: 'Fallback default secret string used when environment variable is unset (e.g. process.env.JWT_SECRET || "default").',
    regex: /(JWT_SECRET|ACCESS_TOKEN_SECRET|REFRESH_TOKEN_SECRET)\s*\|\|\s*['"][^'"]+['"]/,
    ignore: ['node_modules', 'dist'],
  },
  {
    id: 'SEC-MASS-01',
    severity: 'HIGH',
    title: 'Mass Assignment Vulnerability',
    description: 'Passing unfiltered req.body directly to database update or create operations.',
    regex: /(prisma\.[a-zA-Z0-9_]+\.(create|update)\s*\(\s*\{\s*data:\s*req\.body|data:\s*\{\s*\.\.\.req\.body)/,
    ignore: ['node_modules', 'dist'],
  },
  {
    id: 'SEC-XSS-01',
    severity: 'MEDIUM',
    title: 'Cross-Site Scripting (XSS) via dangerouslySetInnerHTML',
    description: 'Raw HTML injection via dangerouslySetInnerHTML without DOMPurify sanitization.',
    regex: /dangerouslySetInnerHTML\s*=\s*\{\s*\{\s*__html:/,
    ignore: ['node_modules', 'dist'],
  },
  {
    id: 'SEC-XSS-02',
    severity: 'MEDIUM',
    title: 'Unescaped Variable Interpolation in HTML Template String',
    description: 'Template literal containing HTML markup and dynamic unescaped variable expressions (e.g. PDF/email generator).',
    regex: /`[^`]*<(?:table|div|p|span|td|th|h[1-6])[^>]*>[^`]*\$\{[^}]+\}[^`]*`/,
    ignore: ['node_modules', 'dist', 'tests'],
  },
  {
    id: 'SEC-ERR-01',
    severity: 'LOW',
    title: 'Stack Trace / Internal Error Leakage',
    description: 'Sending raw error stack or internal exception details directly in HTTP JSON response.',
    regex: /res\.(status\([0-9]+\)\.)?json\s*\(\s*\{[^}]*(stack:\s*err\.stack|error:\s*err\b)/,
    ignore: ['node_modules', 'dist', 'tests'],
  },
  {
    id: 'SEC-CORS-01',
    severity: 'MEDIUM',
    title: 'Overly Permissive CORS with Credentials',
    description: 'CORS configuration using wildcard origin with credentials enabled.',
    regex: /origin:\s*['"]\*['"]\s*,\s*credentials:\s*true/,
    ignore: ['node_modules', 'dist'],
  },
  {
    id: 'SEC-DOS-01',
    severity: 'MEDIUM',
    title: 'Uncapped Database Query Pagination',
    description: 'Using take: req.query.limit or limit: req.query.limit without Math.min bounds capping.',
    regex: /(take|limit):\s*Number\(req\.query\.(limit|pageSize)\)/,
    ignore: ['node_modules', 'dist'],
  },
];

const SCAN_DIRS = ['apps/server/src', 'apps/web/src', 'apps/mobile', 'packages/shared/src'];

const findings = [];

function scanFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const normalizedPath = filePath.replace(/\\/g, '/');

  for (const rule of RULES) {
    if (rule.ignore && rule.ignore.some(ign => normalizedPath.includes(ign))) {
      continue;
    }

    lines.forEach((line, idx) => {
      if (rule.regex.test(line)) {
        findings.push({
          ruleId: rule.id,
          severity: rule.severity,
          title: rule.title,
          description: rule.description,
          file: normalizedPath,
          line: idx + 1,
          snippet: line.trim().substring(0, 160),
        });
      }
    });
  }
}

function walkDir(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!['node_modules', 'dist', 'build', '.git', '.expo'].includes(entry.name)) {
        walkDir(full);
      }
    } else if (entry.isFile() && /\.(ts|tsx|js|jsx)$/.test(entry.name)) {
      scanFile(full);
    }
  }
}

SCAN_DIRS.forEach(walkDir);

const summary = {
  totalFindings: findings.length,
  bySeverity: {
    CRITICAL: findings.filter(f => f.severity === 'CRITICAL').length,
    HIGH: findings.filter(f => f.severity === 'HIGH').length,
    MEDIUM: findings.filter(f => f.severity === 'MEDIUM').length,
    LOW: findings.filter(f => f.severity === 'LOW').length,
  },
  findings,
};

fs.writeFileSync('docs/audit-evidence/static-analysis.json', JSON.stringify(summary, null, 2), 'utf8');

const markdown = `# ANVAYA Static Application Security Testing (SAST) Report

Generated: ${new Date().toISOString()}
Total Scanned Directories: ${SCAN_DIRS.join(', ')}

## Summary Scorecard
- Total Findings: **${summary.totalFindings}**
- CRITICAL: **${summary.bySeverity.CRITICAL}**
- HIGH: **${summary.bySeverity.HIGH}**
- MEDIUM: **${summary.bySeverity.MEDIUM}**
- LOW: **${summary.bySeverity.LOW}**

## Detailed Findings

${findings.length === 0 ? 'No security vulnerabilities detected by rule set.' : findings.map((f, i) => `### ${i + 1}. [${f.severity}] ${f.title} (${f.ruleId})
- **Location:** \`${f.file}:${f.line}\`
- **Description:** ${f.description}
- **Code Snippet:**
  \`\`\`typescript
  ${f.snippet}
  \`\`\`
`).join('\n')}
`;

fs.writeFileSync('docs/audit-evidence/static-analysis.txt', markdown, 'utf8');
console.log(`Static analysis complete. Found ${findings.length} findings (${summary.bySeverity.CRITICAL} Critical, ${summary.bySeverity.HIGH} High, ${summary.bySeverity.MEDIUM} Medium, ${summary.bySeverity.LOW} Low).`);
