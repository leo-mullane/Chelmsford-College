#!/usr/bin/env node
/* validate.js
 *
 * Structural checks on the built wireframe pack. Run after every build:
 *   node build-includes.js && node validate.js
 *
 * These three classes of defect are the ones that actually bite during a
 * concatenation-based assembly, and all three are invisible until a client
 * hits them live in a review meeting:
 *
 *   1. Unbalanced tags     — a page silently renders with everything nested
 *                            inside the previous section.
 *   2. Dead handlers       — an onclick naming a function that no longer
 *                            exists; the control just does nothing.
 *   3. Broken links        — a nav item pointing at a page that was renamed
 *                            or never built.
 *
 * Exits non-zero on error so it can gate a commit or a share.
 */

const fs = require('fs');
const path = require('path');

const root = __dirname;
const distDir = path.join(root, 'dist');

if (!fs.existsSync(distDir)) {
  console.error('No dist/ directory. Run: node build-includes.js');
  process.exit(1);
}

const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'link', 'meta', 'param', 'source', 'track', 'wbr', 'command', 'keygen']);

const errors = [];
const warnings = [];

function htmlFiles(dir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) htmlFiles(full, acc);
    else if (entry.name.endsWith('.html')) acc.push(full);
  }
  return acc;
}

const pages = htmlFiles(distDir);

/* Collect every function name defined anywhere in the pack's JS, so a handler
 * defined in a shared script still counts as defined. */
const definedFunctions = new Set();
function collectFunctions(source) {
  const patterns = [
    /function\s+([A-Za-z_$][\w$]*)\s*\(/g,
    /(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:function|\([^)]*\)\s*=>)/g,
    /window\.([A-Za-z_$][\w$]*)\s*=/g
  ];
  for (const re of patterns) {
    let m;
    while ((m = re.exec(source)) !== null) definedFunctions.add(m[1]);
  }
}

const jsDir = path.join(distDir, 'js');
if (fs.existsSync(jsDir)) {
  for (const f of fs.readdirSync(jsDir).filter((f) => f.endsWith('.js'))) {
    collectFunctions(fs.readFileSync(path.join(jsDir, f), 'utf8'));
  }
}
for (const page of pages) {
  const html = fs.readFileSync(page, 'utf8');
  for (const block of html.match(/<script\b[^>]*>([\s\S]*?)<\/script>/gi) || []) {
    collectFunctions(block);
  }
}

for (const page of pages) {
  const rel = path.relative(distDir, page);
  const html = fs.readFileSync(page, 'utf8');
  const withoutScripts = html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '');

  /* 1. Tag balance ------------------------------------------------------- */
  const stack = [];
  const tagRe = /<(\/?)([a-zA-Z][\w-]*)\b([^>]*?)(\/?)>/g;
  let m;
  while ((m = tagRe.exec(withoutScripts)) !== null) {
    const [, closing, rawName, attrs, selfClose] = m;
    const name = rawName.toLowerCase();
    if (VOID.has(name) || selfClose === '/') continue;
    if (!closing) {
      stack.push(name);
    } else {
      const open = stack.pop();
      if (open !== name) {
        errors.push(`${rel}: closing </${name}> does not match open <${open || 'nothing'}>`);
        break;
      }
    }
  }
  if (stack.length) {
    errors.push(`${rel}: ${stack.length} unclosed tag(s): <${stack.slice(-5).join('>, <')}>`);
  }

  /* 2. Inline handlers name a function that exists ----------------------- */
  const handlerRe = /\bon[a-z]+\s*=\s*"([^"]*)"/gi;
  while ((m = handlerRe.exec(html)) !== null) {
    for (const call of m[1].match(/([A-Za-z_$][\w$]*)\s*\(/g) || []) {
      const fn = call.replace(/\s*\($/, '');
      if (['if', 'for', 'while', 'switch', 'return', 'function', 'catch', 'typeof'].includes(fn)) continue;
      if (typeof globalThis[fn] === 'function') continue;
      if (!definedFunctions.has(fn)) {
        errors.push(`${rel}: handler calls ${fn}() which is not defined anywhere in the pack`);
      }
    }
  }

  /* 3. Internal links resolve -------------------------------------------- */
  const linkRe = /(?:href|src)="([^"]+)"/g;
  while ((m = linkRe.exec(html)) !== null) {
    const href = m[1];
    if (/^(#|https?:|mailto:|tel:|data:|javascript:)/.test(href)) continue;
    if (href.startsWith('~/')) {
      errors.push(`${rel}: unresolved authoring path ${href} — did the build run?`);
      continue;
    }
    const target = path.resolve(path.dirname(page), href.split(/[?#]/)[0]);
    if (!fs.existsSync(target)) {
      errors.push(`${rel}: link target does not exist — ${href}`);
    }
  }

  /* Soft checks: fidelity drift ------------------------------------------ */
  /* Strip HTML entities first: &#9662; would otherwise read as a hex colour. */
  const hex = withoutScripts.replace(/&[#\w]+;/g, '').match(/#[0-9a-fA-F]{3,6}\b/g) || [];
  if (hex.length) {
    warnings.push(`${rel}: ${hex.length} inline hex colour(s) — colour belongs in theme.css`);
  }
  if (/\bstyle="[^"]*(?:background|gradient)/i.test(withoutScripts)) {
    warnings.push(`${rel}: inline background styling — move it to a stylesheet`);
  }
  if (!/<main\b/i.test(html) && !rel.endsWith('index.html')) {
    warnings.push(`${rel}: no <main> landmark`);
  }
}

for (const w of warnings) console.log(`  warn  ${w}`);
for (const e of errors) console.error(`  ERROR ${e}`);

console.log(`\nChecked ${pages.length} page(s): ${errors.length} error(s), ${warnings.length} warning(s).`);
process.exit(errors.length ? 1 : 0);
