const fs = require('fs');
const path = require('path');

const WORKSPACES = [
  { name: 'packages/shared', path: 'packages/shared' },
  { name: 'apps/server', path: 'apps/server' },
  { name: 'apps/web', path: 'apps/web' },
  { name: 'apps/mobile', path: 'apps/mobile' },
];

const results = {};

WORKSPACES.forEach(ws => {
  const tsconfigPath = path.join(ws.path, 'tsconfig.json');
  let tsconfig = {};
  try {
    const raw = fs.readFileSync(tsconfigPath, 'utf8');
    // Remove comments
    const stripped = raw.replace(/\/\*[\s\S]*?\*\/|([^:]|^)\/\/.*$/gm, '$1');
    tsconfig = JSON.parse(stripped);
  } catch (e) {
    tsconfig = { error: e.message };
  }

  const counts = {
    totalFiles: 0,
    totalLines: 0,
    anyCount: 0,
    tsIgnoreCount: 0,
    tsExpectErrorCount: 0,
    nonNullAssertionCount: 0,
    unsafeAsAnyCastCount: 0,
    unsafeAsUnknownCastCount: 0,
    locations: [],
  };

  function scan(dir) {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const ent of entries) {
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        if (!['node_modules', 'dist', 'build', '.expo'].includes(ent.name)) {
          scan(full);
        }
      } else if (ent.isFile() && (ent.name.endsWith('.ts') || ent.name.endsWith('.tsx'))) {
        counts.totalFiles++;
        const content = fs.readFileSync(full, 'utf8');
        const lines = content.split('\n');
        counts.totalLines += lines.length;

        lines.forEach((line, idx) => {
          // any type annotation
          const anyMatches = line.match(/:\s*any\b|\bas\s+any\b|<any>/g);
          if (anyMatches) {
            counts.anyCount += anyMatches.length;
            counts.locations.push({ file: full, line: idx + 1, type: 'any', snippet: line.trim() });
          }

          if (line.includes('@ts-ignore')) {
            counts.tsIgnoreCount++;
            counts.locations.push({ file: full, line: idx + 1, type: '@ts-ignore', snippet: line.trim() });
          }

          if (line.includes('@ts-expect-error')) {
            counts.tsExpectErrorCount++;
            counts.locations.push({ file: full, line: idx + 1, type: '@ts-expect-error', snippet: line.trim() });
          }

          if (/\bas\s+any\b/.test(line)) {
            counts.unsafeAsAnyCastCount++;
          }

          if (/\bas\s+unknown\s+as\b/.test(line)) {
            counts.unsafeAsUnknownCastCount++;
          }

          // non-null assertions like `foo!.bar` or `item!` (excluding != or !==)
          const nonNull = line.match(/([a-zA-Z0-9_\)\]])!(?!=|\.)/g);
          if (nonNull) {
            counts.nonNullAssertionCount += nonNull.length;
          }
        });
      }
    }
  }

  scan(ws.path);

  results[ws.name] = {
    tsconfigCompilerOptions: tsconfig.compilerOptions || {},
    counts: {
      totalFiles: counts.totalFiles,
      totalLines: counts.totalLines,
      anyCount: counts.anyCount,
      tsIgnoreCount: counts.tsIgnoreCount,
      tsExpectErrorCount: counts.tsExpectErrorCount,
      nonNullAssertionCount: counts.nonNullAssertionCount,
      unsafeAsAnyCastCount: counts.unsafeAsAnyCastCount,
      unsafeAsUnknownCastCount: counts.unsafeAsUnknownCastCount,
    },
    sampleLocations: counts.locations.slice(0, 30),
  };
});

fs.writeFileSync('docs/audit-evidence/ts-strictness.json', JSON.stringify(results, null, 2));

// Also generate markdown / text summary
let txt = '# TypeScript Strictness & Type Safety Audit\n\n';
for (const [ws, data] of Object.entries(results)) {
  txt += `## Workspace: ${ws}\n`;
  txt += `- Strict Mode: ${data.tsconfigCompilerOptions.strict ?? false}\n`;
  txt += `- noImplicitAny: ${data.tsconfigCompilerOptions.noImplicitAny ?? data.tsconfigCompilerOptions.strict ?? false}\n`;
  txt += `- strictNullChecks: ${data.tsconfigCompilerOptions.strictNullChecks ?? data.tsconfigCompilerOptions.strict ?? false}\n`;
  txt += `- Files scanned: ${data.counts.totalFiles} (${data.counts.totalLines} lines)\n`;
  txt += `- \`any\` occurrences: ${data.counts.anyCount}\n`;
  txt += `- \`@ts-ignore\` occurrences: ${data.counts.tsIgnoreCount}\n`;
  txt += `- \`@ts-expect-error\` occurrences: ${data.counts.tsExpectErrorCount}\n`;
  txt += `- Non-null assertions (\`!\`): ${data.counts.nonNullAssertionCount}\n`;
  txt += `- \`as any\` casts: ${data.counts.unsafeAsAnyCastCount}\n`;
  txt += `- \`as unknown as ...\` casts: ${data.counts.unsafeAsUnknownCastCount}\n\n`;
}

fs.writeFileSync('docs/audit-evidence/ts-strictness.txt', txt);
console.log(txt);
