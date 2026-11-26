// node tools/check-i18n.mjs — every language has the same keys, and every literal t('key') in src exists.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const i18nDir = path.join(root, 'src/i18n');
const languages = ['ja', 'en', 'zh-CN', 'zh-TW'];

const flatten = (obj, prefix = '', out = {}) => {
  Object.entries(obj).forEach(([key, value]) => {
    const name = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object') flatten(value, name, out);
    else out[name] = value;
  });
  return out;
};

const errors = [];

// A language is the namespace files under <lang>/, each holding only the namespace it is named after.
const load = (lang) => {
  const dir = path.join(i18nDir, lang);
  const tree = {};
  fs.readdirSync(dir)
    .filter((file) => file.endsWith('.json'))
    .forEach((file) => {
      const namespace = path.basename(file, '.json');
      const content = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
      const keys = Object.keys(content);
      if (keys.length !== 1 || keys[0] !== namespace) errors.push(`${lang}/${file}: must contain only "${namespace}"`);
      Object.assign(tree, content);
    });
  return flatten(tree);
};

const bundles = Object.fromEntries(languages.map((lang) => [lang, load(lang)]));
const base = bundles.ja;
languages.slice(1).forEach((lang) => {
  Object.keys(base)
    .filter((key) => !(key in bundles[lang]))
    .forEach((key) => errors.push(`${lang}: missing ${key}`));
  Object.keys(bundles[lang])
    .filter((key) => !(key in base))
    .forEach((key) => errors.push(`${lang}: extra ${key}`));
});
languages.forEach((lang) =>
  Object.entries(bundles[lang])
    .filter(([, value]) => value === '')
    .forEach(([key]) => errors.push(`${lang}: empty ${key}`))
);

const files = [];
(function walk(dir) {
  fs.readdirSync(dir).forEach((file) => {
    const full = path.join(dir, file);
    if (fs.statSync(full).isDirectory()) {
      if (file !== 'i18n') walk(full);
    } else if (/\.(js|jsx|ts|tsx)$/.test(file)) files.push(full);
  });
})(path.join(root, 'src'));
files.forEach((file) => {
  const text = fs.readFileSync(file, 'utf8');
  for (const match of text.matchAll(/\bt\(\s*['"]([\w.-]+)['"]/g)) {
    const key = match[1];
    if (!(key in base) && !Object.keys(base).some((k) => k.startsWith(`${key}.`)) && !(`${key}_one` in base)) {
      errors.push(`${path.relative(root, file)}: unknown key ${key}`);
    }
  }
});

// Hard-coded Chinese / Japanese outside comments and logs must go through i18n, except stored data values.
const dataValues = [
  ...Object.values(
    JSON.parse(
      fs
        .readFileSync(path.join(root, 'src/routes/manifest.js'), 'utf8')
        .match(/export const pageNames = (\{[\s\S]*?\});/)[1]
        .replace(/(\w+):/g, '"$1":')
        .replace(/'/g, '"')
        .replace(/,\s*}/, '}')
    )
  ),
  'オーナー',
  'マネージャー',
  'ゲスト',
  '権限なし',
  'ロール管理',
  '常時利用',
  '一時利用',
];
// Whole files whose CJK is data or logs: carrier CSV formats, permission IDs, language names, internal tool
// texts, viewer debug logs.
const dataFiles = [
  'src/components/cs/CsUtils.js',
  'src/routes/manifest.js',
  'src/utils/accessLabels.js',
  'src/i18n.js',
  'src/constants/wordConfig.js',
  'src/components/AppInternalTest.js',
  'src/components/vision/protocols/kvsViewer.js',
];
const allowedSnippets = [
  ['src/utils/csvutils.js', "'csv.header."],
  ['src/components/biz/device/DataTableColumns.js', "name: '削除'"],
  ['src/api/useManageEmployee.js', "message === '"],
];
const cjk = /[\u3040-\u30ff\u4e00-\u9fff]/;
files.forEach((file) => {
  const relative = path.relative(root, file);
  if (dataFiles.includes(relative)) return;
  let inBlock = false;
  fs.readFileSync(file, 'utf8')
    .split('\n')
    .forEach((raw, index) => {
      let line = raw;
      if (inBlock) {
        if (!line.includes('*/')) return;
        inBlock = false;
        line = line.slice(line.indexOf('*/') + 2);
      }
      line = line.replace(/\/\*.*?\*\//g, '');
      if (line.includes('/*')) {
        inBlock = true;
        line = line.slice(0, line.indexOf('/*'));
      }
      line = line.replace(/(^|[^:'"`])\/\/.*$/, '$1');
      if (!cjk.test(line) || /console\.|logScope|logReason|throw new Error/.test(line)) return;
      if (allowedSnippets.some(([f, snippet]) => f === relative && line.includes(snippet))) return;
      const rest = dataValues
        .reduce((text, value) => text.split(`'${value}'`).join('').split(`"${value}"`).join(''), line)
        .replace(/\bt\(\s*'[\w.-]+',\s*'[^']*'\s*\)/g, '');
      if (cjk.test(rest)) errors.push(`${relative}:${index + 1}: hard-coded text: ${raw.trim().slice(0, 80)}`);
    });
});

if (errors.length) {
  console.error(errors.join('\n'));
  console.error(`${errors.length} problem(s)`);
  process.exit(1);
}
console.log(`i18n ok: ${Object.keys(base).length} keys x ${languages.length} languages`);
