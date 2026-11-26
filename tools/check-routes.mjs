// node tools/check-routes.mjs — every registered path has a page, and every permanent outside path still resolves.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { matchPath } from 'react-router';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const { PATHS, ROUTES, REDIRECTS, MENU, PERMANENT_PATHS } = await import(
  'data:text/javascript,' + encodeURIComponent(read('src/routes/manifest.js'))
);

const errors = [];
const resolveExpr = (expr) => expr.split('.').reduce((obj, key) => obj?.[key], PATHS);

const paths = ROUTES.map((route) => route.path);
paths.filter((p, i) => paths.indexOf(p) !== i).forEach((p) => errors.push(`duplicate route ${p}`));

const componentKeys = [...read('src/routes/routes.js').matchAll(/\[P\.([\w.]+)\]:/g)].map((m) => resolveExpr(m[1]));
paths.filter((p) => !componentKeys.includes(p)).forEach((p) => errors.push(`route without component ${p}`));
componentKeys.filter((p) => !paths.includes(p)).forEach((p) => errors.push(`component without route ${p}`));

const resolves = (pathname) =>
  pathname === PATHS.login ||
  paths.some((p) => matchPath({ path: p, end: true }, pathname)) ||
  REDIRECTS.some(({ from }) => matchPath({ path: from, end: true }, pathname));

REDIRECTS.forEach(({ from, to }) => {
  if (!paths.includes(to)) errors.push(`redirect ${from} -> ${to}: target is not a route`);
  if (paths.includes(from)) errors.push(`redirect ${from} shadows a route`);
});
PERMANENT_PATHS.forEach((url) => {
  if (!resolves(url.split('?')[0])) errors.push(`permanent path no longer resolves: ${url}`);
});
MENU.flatMap((entry) => (entry.items ? entry.items : [entry])).forEach(({ router }) => {
  if (!paths.includes(router)) errors.push(`menu entry ${router} is not a route`);
});

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log(
  `routes ok: ${paths.length} routes, ${REDIRECTS.length} redirects, ${PERMANENT_PATHS.length} permanent paths`
);
