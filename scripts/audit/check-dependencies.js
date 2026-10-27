const fs = require('fs');
const path = require('path');

const workspaces = [
  { name: 'root', pkg: require('../../package.json'), dir: '.' },
  { name: 'apps/server', pkg: require('../../apps/server/package.json'), dir: 'apps/server' },
  { name: 'apps/web', pkg: require('../../apps/web/package.json'), dir: 'apps/web' },
  { name: 'apps/mobile', pkg: require('../../apps/mobile/package.json'), dir: 'apps/mobile' },
  { name: 'packages/shared', pkg: require('../../packages/shared/package.json'), dir: 'packages/shared' },
];

const report = {
  unusedCandidates: {},
  packagesWithScripts: [],
  duplicatePackages: {},
  deprecatedOrUnmaintained: [],
  overridesInRoot: require('../../package.json').overrides || {},
};

// Check for install scripts in node_modules
function checkNodeModulesScripts(dir) {
  const nmPath = path.join(dir, 'node_modules');
  if (!fs.existsSync(nmPath)) return;
  const entries = fs.readdirSync(nmPath, { withFileTypes: true });
  for (const ent of entries) {
    if (ent.name.startsWith('@')) {
      const scopePath = path.join(nmPath, ent.name);
      const scopedEnts = fs.readdirSync(scopePath, { withFileTypes: true });
      for (const sent of scopedEnts) {
        checkPackageJson(path.join(scopePath, sent.name));
      }
    } else {
      checkPackageJson(path.join(nmPath, ent.name));
    }
  }
}

function checkPackageJson(pkgDir) {
  const pkgJsonPath = path.join(pkgDir, 'package.json');
  if (fs.existsSync(pkgJsonPath)) {
    try {
      const p = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
      const scripts = p.scripts || {};
      const suspiciousScripts = ['preinstall', 'install', 'postinstall'].filter(s => scripts[s]);
      if (suspiciousScripts.length > 0) {
        report.packagesWithScripts.push({
          name: p.name,
          version: p.version,
          scripts: suspiciousScripts.reduce((acc, s) => { acc[s] = scripts[s]; return acc; }, {}),
        });
      }
    } catch (e) {}
  }
}

checkNodeModulesScripts('.');

// Check for unused dependencies in each workspace by searching for `import ... from 'pkg'` or `require('pkg')`
workspaces.forEach(ws => {
  if (ws.name === 'root') return;
  const deps = Object.keys(ws.pkg.dependencies || {});
  const unused = [];

  // Read all src files
  const allCode = [];
  function readAllCode(d) {
    if (!fs.existsSync(d)) return;
    const items = fs.readdirSync(d, { withFileTypes: true });
    for (const item of items) {
      const full = path.join(d, item.name);
      if (item.isDirectory() && !['node_modules', 'dist', 'build', '.expo'].includes(item.name)) {
        readAllCode(full);
      } else if (item.isFile() && (item.name.endsWith('.ts') || item.name.endsWith('.tsx') || item.name.endsWith('.js'))) {
        allCode.push(fs.readFileSync(full, 'utf8'));
      }
    }
  }
  readAllCode(ws.dir);
  const combinedCode = allCode.join('\n');

  deps.forEach(dep => {
    // Escape regex
    const escaped = dep.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`['"\`]${escaped}(?:/.*)?['"\`]`, 'g');
    if (!regex.test(combinedCode)) {
      unused.push(dep);
    }
  });

  report.unusedCandidates[ws.name] = unused;
});

fs.writeFileSync('docs/audit-evidence/dependency-hygiene.json', JSON.stringify(report, null, 2));

let summary = '# Dependency Hygiene & Supply Chain Audit\n\n';
summary += '## Unused Dependency Candidates\n';
for (const [ws, list] of Object.entries(report.unusedCandidates)) {
  summary += `### ${ws}\n`;
  if (list.length === 0) {
    summary += '- None detected.\n';
  } else {
    list.forEach(item => summary += `- \`${item}\`\n`);
  }
}

summary += '\n## Installed Packages with Lifecycle Scripts (preinstall/install/postinstall)\n';
summary += `Found ${report.packagesWithScripts.length} packages with lifecycle scripts.\n\n`;
report.packagesWithScripts.slice(0, 25).forEach(p => {
  summary += `- **${p.name}@${p.version}**:\n`;
  for (const [s, cmd] of Object.entries(p.scripts)) {
    summary += `  - \`${s}\`: \`${cmd}\`\n`;
  }
});

summary += '\n## Overrides in Root package.json\n';
summary += '```json\n' + JSON.stringify(report.overridesInRoot, null, 2) + '\n```\n';

fs.writeFileSync('docs/audit-evidence/dependency-hygiene.txt', summary);
console.log(summary);
