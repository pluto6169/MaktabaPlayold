'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const ignoredDirectories = new Set(['.git', '.freebuff', 'node_modules']);
const localRefTags = new Set(['a', 'area', 'audio', 'embed', 'iframe', 'img', 'input', 'link', 'script', 'source', 'track', 'video']);

function findHtmlFiles(directory) {
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!ignoredDirectories.has(entry.name)) files.push(...findHtmlFiles(path.join(directory, entry.name)));
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.html')) {
      files.push(path.join(directory, entry.name));
    }
  }
  return files;
}

function attributes(tag) {
  const attrs = {};
  const pattern = /([^\s"'<>/=]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g;
  let match;
  while ((match = pattern.exec(tag))) {
    attrs[match[1].toLowerCase()] = match[2] ?? match[3] ?? match[4] ?? '';
  }
  return attrs;
}

function localTarget(page, reference) {
  const value = reference.trim();
  if (!value || value.startsWith('#') || /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(value)) return null;

  let pathname;
  try {
    pathname = decodeURIComponent(value.split(/[?#]/, 1)[0]);
  } catch {
    pathname = value.split(/[?#]/, 1)[0];
  }
  if (!pathname) return null;
  const target = pathname.startsWith('/')
    ? path.resolve(root, `.${pathname}`)
    : path.resolve(path.dirname(page), pathname);
  return { target, withinRoot: target.startsWith(root + path.sep) || target === root };
}

function existsAsPage(target) {
  try {
    const stat = fs.statSync(target);
    if (stat.isFile()) return true;
    return stat.isDirectory() && fs.statSync(path.join(target, 'index.html')).isFile();
  } catch {
    return false;
  }
}

const problems = [];
const htmlFiles = findHtmlFiles(root);

for (const page of htmlFiles) {
  const html = fs.readFileSync(page, 'utf8')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<(script|style)\b([^>]*)>[\s\S]*?<\/\1\s*>/gi, (_block, name, attrs) => `<${name}${attrs}>`);
  const seenScripts = new Set();
  const tagPattern = /<([a-z][a-z0-9-]*)\b[^>]*>/gi;
  let match;
  while ((match = tagPattern.exec(html))) {
    const tagName = match[1].toLowerCase();
    if (!localRefTags.has(tagName)) continue;
    const attrs = attributes(match[0]);
    for (const attribute of ['href', 'src']) {
      if (!attrs[attribute]) continue;
      const local = localTarget(page, attrs[attribute]);
      if (!local) continue;
      if (!local.withinRoot || !existsAsPage(local.target)) {
        problems.push(`MISSING ${path.relative(root, page)} ${attribute}="${attrs[attribute]}"`);
      }
      if (tagName === 'script' && attribute === 'src') {
        const normalized = path.normalize(local.target).toLowerCase();
        if (seenScripts.has(normalized)) {
          problems.push(`DUPLICATE_SCRIPT ${path.relative(root, page)} src="${attrs[attribute]}"`);
        } else {
          seenScripts.add(normalized);
        }
      }
    }
  }
}

problems.forEach(problem => console.error(problem));
console.log(`Checked ${htmlFiles.length} HTML files: ${problems.length} problem(s).`);

process.exitCode = problems.length ? 1 : 0;
