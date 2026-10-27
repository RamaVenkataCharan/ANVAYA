const fs = require('fs');
const path = require('path');

const moduleRouteFiles = [
  { prefix: '/api/v1/auth', file: 'apps/server/src/modules/auth/auth.routes.ts' },
  { prefix: '/api/v1/admin', file: 'apps/server/src/modules/admin/admin.routes.ts' },
  { prefix: '/api/v1/users', file: 'apps/server/src/modules/users/users.routes.ts' },
  { prefix: '/api/v1/prescriptions', file: 'apps/server/src/modules/prescriptions/prescription.routes.ts' },
  { prefix: '/api/v1/appointments', file: 'apps/server/src/modules/appointments/appointment.routes.ts' },
  { prefix: '/api/v1/billing', file: 'apps/server/src/modules/billing/billing.routes.ts' },
  { prefix: '/api/v1/refills', file: 'apps/server/src/modules/refills/refills.routes.ts' },
  { prefix: '/api/v1/reports', file: 'apps/server/src/modules/reports/report.routes.ts' },
  { prefix: '/api/v1/consent', file: 'apps/server/src/modules/consent/consent.routes.ts' },
];

const inventory = [
  {
    method: 'GET',
    path: '/api/v1/health',
    guards: ['None (Public)'],
    file: 'apps/server/src/routes.ts',
    line: 16,
    ownershipCheck: 'N/A',
  },
  {
    method: 'GET',
    path: '/',
    guards: ['None (Public)'],
    file: 'apps/server/src/app.ts',
    line: 82,
    ownershipCheck: 'N/A',
  }
];

moduleRouteFiles.forEach(m => {
  if (!fs.existsSync(m.file)) return;
  const content = fs.readFileSync(m.file, 'utf8');

  // Check top-level router.use(...) guards
  const routerGuards = [];
  const topUseMatch = content.match(/router\.use\(([^;]+)\);/);
  if (topUseMatch) {
    const rawUse = topUseMatch[1];
    if (rawUse.includes('authenticateJwt')) routerGuards.push('authenticateJwt');
    if (rawUse.includes('requireRole(')) {
      const match = rawUse.match(/requireRole\(([^)]+)\)/);
      if (match) routerGuards.push(`requireRole(${match[1].replace(/Role\./g, '')})`);
    }
    if (rawUse.includes('requireVerified')) routerGuards.push('requireVerified');
  }

  // Regex to match router.METHOD(PATH, ...
  const routeRegex = /router\.(get|post|put|patch|delete)\s*\(\s*['"`]([^'"`]+)['"`]/gi;
  let match;
  while ((match = routeRegex.exec(content)) !== null) {
    const method = match[1].toUpperCase();
    const subPath = match[2];
    const matchIndex = match.index;

    // Find line number
    const lineNum = content.substring(0, matchIndex).split('\n').length;

    // Extract the full argument block for this route
    const afterMatch = content.substring(matchIndex);
    const endParenIndex = afterMatch.indexOf(');');
    const routeBlock = endParenIndex !== -1 ? afterMatch.substring(0, endParenIndex) : afterMatch.substring(0, 300);

    const guards = [...routerGuards];

    if (routeBlock.includes('authenticateJwt') && !guards.includes('authenticateJwt')) {
      guards.push('authenticateJwt');
    }
    if (routeBlock.includes('requireRole(')) {
      const rMatch = routeBlock.match(/requireRole\(([^)]+)\)/);
      if (rMatch) guards.push(`requireRole(${rMatch[1].replace(/Role\./g, '').replace(/\s+/g, '')})`);
    }
    if (routeBlock.includes('requireVerified') && !guards.includes('requireVerified')) {
      guards.push('requireVerified');
    }
    if (routeBlock.includes('verifyLimiter')) {
      guards.push('rateLimit:verifyLimiter');
    }
    if (routeBlock.includes('upload.') || routeBlock.includes('uploadMiddleware')) {
      guards.push('multerUpload');
    }
    if (routeBlock.includes('validateBody(')) {
      const vMatch = routeBlock.match(/validateBody\(([^)]+)\)/);
      if (vMatch) guards.push(`validateBody(${vMatch[1]})`);
    }

    if (guards.length === 0) guards.push('None (Public)');

    const fullPath = subPath === '/' ? m.prefix : `${m.prefix}${subPath.startsWith('/') ? '' : '/'}${subPath}`;

    // Has ID in path?
    const hasId = /:[a-zA-Z0-9_]+/.test(fullPath);

    inventory.push({
      method,
      path: fullPath,
      hasId,
      guards,
      file: m.file,
      line: lineNum,
    });
  }
});

fs.writeFileSync('docs/audit-evidence/route-inventory.json', JSON.stringify(inventory, null, 2));

let markdown = '# Complete ANVAYA API Route Inventory\n\n';
markdown += `Total endpoints cataloged: **${inventory.length}**\n\n`;
markdown += '| Method | Path | Has ID Param | Guards & Middlewares | Source File:Line |\n';
markdown += '| :--- | :--- | :---: | :--- | :--- |\n';
inventory.forEach(r => {
  markdown += `| \`${r.method}\` | \`${r.path}\` | ${r.hasId ? 'YES' : 'NO'} | ${r.guards.join(', ')} | [\`${path.basename(r.file)}:${r.line}\`](file:///${path.resolve(r.file).replace(/\\/g, '/')}#L${r.line}) |\n`;
});

fs.writeFileSync('docs/audit-evidence/route-inventory.md', markdown);
console.log(`Generated route inventory with ${inventory.length} routes.`);
console.log(markdown);
