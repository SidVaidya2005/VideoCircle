#!/usr/bin/env node
/**
 * Context and design-system integrity check.
 *
 * Every assertion here exists because the thing it checks ALREADY drifted or
 * broke once. This is not speculative hardening.
 *
 *   node context/Design/_verify.mjs
 *
 * Wire into `npm run lint` in feature 01. No dependencies — plain Node.
 */

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const KIT = dirname(fileURLToPath(import.meta.url));
const CTX = dirname(KIT);
const ROOT = dirname(CTX);

const read = (p) => readFileSync(p, 'utf8');
const fails = [];
const checks = [];
function check(name, fn) {
  try {
    const detail = fn();
    checks.push([true, name, detail || '']);
  } catch (e) {
    checks.push([false, name, e.message]);
    fails.push(name);
  }
}
const assert = (cond, msg) => { if (!cond) throw new Error(msg); };

/* ── 1. The token mirror ──────────────────────────────────────────────────
   library-docs.md carries a copy of the kit's :root for globals.css. Two
   copies of a literal is exactly what drifts — --shadow-soft already did. */
check('token mirror matches the kit', () => {
  const css = read(join(KIT, 'colors_and_type.css'));
  const lib = read(join(CTX, 'library-docs.md'));
  const block = lib.match(/VideoCircle design tokens[\s\S]*?\n:root \{([\s\S]*?)\n\}/);
  assert(block, 'could not find the mirrored :root block in library-docs.md');

  const decls = (s) => Object.fromEntries(
    [...s.matchAll(/(--[a-z0-9-]+):\s*([^;]+);/g)].map(m => [m[1], m[2].trim().toLowerCase()])
  );
  const src = decls(css), mir = decls(block[1]);

  const bad = Object.entries(mir).flatMap(([k, v]) => {
    if (!(k in src)) return [`${k} is mirrored but no longer exists in the kit`];
    if (src[k] !== v) return [`${k}: kit has "${src[k]}", library-docs has "${v}"`];
    return [];
  });
  assert(!bad.length, bad.join('; '));
  return `${Object.keys(mir).length} mirrored tokens in sync`;
});

/* ── 2. Specimens only use tokens that exist ─────────────────────────────── */
check('specimen tokens all resolve', () => {
  const css = read(join(KIT, 'colors_and_type.css'));
  const declared = new Set([...css.matchAll(/(--[a-z0-9-]+)\s*:\s*[^;]/g)].map(m => m[1]));
  const bad = [];
  for (const f of readdirSync(join(KIT, 'preview')).filter(f => f.endsWith('.html'))) {
    const t = read(join(KIT, 'preview', f));
    const local = new Set([...t.matchAll(/(--[a-z0-9-]+)\s*:/g)].map(m => m[1]));
    for (const m of t.matchAll(/var\((--[a-z0-9-]+)/g))
      if (!declared.has(m[1]) && !local.has(m[1])) bad.push(`${f} uses undefined ${m[1]}`);
  }
  assert(!bad.length, bad.join('; '));
  return 'no undefined custom properties';
});

/* ── 3. Specimen links resolve ───────────────────────────────────────────── */
check('specimen hrefs/srcs resolve', () => {
  const bad = [];
  for (const f of readdirSync(join(KIT, 'preview')).filter(f => f.endsWith('.html'))) {
    const t = read(join(KIT, 'preview', f));
    for (const m of t.matchAll(/(?:href|src)="([^"#:?]+)"/g))
      if (!existsSync(resolve(KIT, 'preview', m[1]))) bad.push(`${f} -> ${m[1]}`);
  }
  assert(!bad.length, bad.join('; '));
  return 'all local links point at real files';
});

/* ── 4. SVGs parse ───────────────────────────────────────────────────────
   Both marks shipped broken once: an XML comment may not contain "--", and
   the comments referenced --bg-1 / --red-1. */
check('brand SVGs are well-formed XML', () => {
  const bad = [];
  for (const f of readdirSync(join(KIT, 'assets')).filter(f => f.endsWith('.svg'))) {
    const t = read(join(KIT, 'assets', f));
    for (const c of t.matchAll(/<!--([\s\S]*?)-->/g))
      if (c[1].includes('--')) bad.push(`${f}: comment contains "--", which is invalid XML`);
    if (!/<svg[\s>]/.test(t)) bad.push(`${f}: no <svg> root`);
  }
  assert(!bad.length, bad.join('; '));
  return 'no invalid comments, roots present';
});

/* ── 5. No Anime.js residue ──────────────────────────────────────────────
   Provenance notes may name it; live copy and asset paths may not. */
check('no upstream branding in shipped copy', () => {
  const bad = [];
  const scan = [
    ...readdirSync(join(KIT, 'preview')).map(f => ['preview/' + f, join(KIT, 'preview', f)]),
    ['colors_and_type.css', join(KIT, 'colors_and_type.css')],
  ];
  for (const [label, p] of scan) {
    const t = read(p);
    if (/ANIMEJS\.COM|animejs-v4-logo|assets\/images\//i.test(t))
      bad.push(`${label} still references upstream branding or a deleted asset path`);
  }
  assert(!bad.length, bad.join('; '));
  return 'specimens and tokens are clean';
});

/* ── 6. setup-context skill conformance ──────────────────────────────────── */
check('context docs conform to the skill', () => {
  const docs = readdirSync(CTX).filter(f => f.endsWith('.md'));
  assert(docs.length === 8, `expected 8 context docs, found ${docs.length}`);

  const noScaffold = docs.filter(f => !['build-journal.md', 'constraints.md'].includes(f));
  for (const f of [...noScaffold.map(f => join(CTX, f)), join(ROOT, 'CLAUDE.md')])
    assert(!/\{\{|<!-- AI:/.test(read(f)), `scaffolding left in ${f.replace(ROOT + '/', '')}`);

  for (const f of docs)
    assert(/^> \*\*Role:\*\*/m.test(read(join(CTX, f))), `${f} lost its Role blockquote`);

  const maint = docs.filter(f => read(join(CTX, f)).includes('How this file is maintained'));
  assert(maint.length === 3, `maintenance sections in ${maint.length} files, expected exactly 3: ${maint}`);

  const lines = read(join(ROOT, 'CLAUDE.md')).split('\n').length;
  assert(lines < 200, `CLAUDE.md is ${lines} lines, over the 200 budget`);
  return `8 docs, 3 maintenance sections, CLAUDE.md ${lines} lines`;
});

/* ── 7. build-plan and progress-tracker agree ────────────────────────────── */
check('build-plan and progress-tracker list the same features', () => {
  const feats = (s, re) => [...s.matchAll(re)].map(m => m[1].trim());
  const plan = feats(read(join(CTX, 'build-plan.md')), /^### (\d\d .+)$/gm);
  const track = feats(read(join(CTX, 'progress-tracker.md')), /^- \[[ x]\] (\d\d .+)$/gm);
  const at = plan.findIndex((f, i) => f !== track[i]);
  assert(plan.length === track.length && at === -1,
    at === -1
      ? `count differs — build-plan has ${plan.length}, tracker has ${track.length}`
      : `first mismatch at #${at + 1} — build-plan "${plan[at]}", tracker "${track[at] ?? '(missing)'}"`);
  return `${plan.length} features, same order`;
});

/* ── report ──────────────────────────────────────────────────────────────── */
for (const [ok, name, detail] of checks)
  console.log(`${ok ? '  ok  ' : '  FAIL'} ${name}${detail ? ` — ${detail}` : ''}`);
console.log(fails.length ? `\n${fails.length} check(s) failed` : `\nall ${checks.length} checks passed`);
process.exit(fails.length ? 1 : 0);
