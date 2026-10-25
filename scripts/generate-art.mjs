#!/usr/bin/env node
// Deterministic procedural artwork for the devalpona profile README.
// Zero dependencies. Usage: node scripts/generate-art.mjs [--validate]
import { writeFileSync, readFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = resolve(ROOT, 'assets');

/* ───────────────────────── DESIGN SYSTEM ───────────────────────── */
const C = {
  void: '#05040A', deep: '#120D24',
  violet: '#8B5CF6', ultra: '#6D28D9', glow: '#A78BFA',
  silver: '#E6E8F2', steel: '#8E93A8', cyan: '#5EEAD4',
};
const FONT = {
  display: "'Helvetica Neue', 'Segoe UI', Arial, sans-serif",
  mono: "ui-monospace, 'SF Mono', SFMono-Regular, Menlo, Consolas, monospace",
};
const SEED = 20260425;
const GLOW = { soft: 6, hard: 14 };
const DENSITY = { hero: 240, footer: 170, grid: 60 };
const MOTION = { orbit: 90, orbitSlow: 140, drift: 36, pulse: 7, scan: 11, sweep: 9 }; // seconds
const SIZE = {
  hero: { w: 1200, h: 520 }, identity: { w: 1200, h: 220 },
  divider: { w: 1200, h: 56 }, footer: { w: 1200, h: 380 },
};
const NAME = 'ALPONA DEV';
const HANDLE = 'DEVALPONA';

/* ───────────────────────── PRIMITIVES ───────────────────────── */
function rng(seed) { // mulberry32
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const f = (n) => Number(n.toFixed(2));
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const polar = (cx, cy, r, deg) => [cx + r * Math.cos((deg * Math.PI) / 180), cy + r * Math.sin((deg * Math.PI) / 180)];

function svgDoc({ id, w, h, title, desc, defs = '', css = '', body }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-labelledby="${id}-t ${id}-d">
<title id="${id}-t">${esc(title)}</title>
<desc id="${id}-d">${esc(desc)}</desc>
<defs>${defs}
<style>${css}</style>
</defs>
${body}
</svg>
`;
}

function sharedDefs(p) {
  return `
<radialGradient id="${p}-bg1" cx="78%" cy="30%" r="70%"><stop offset="0" stop-color="${C.ultra}" stop-opacity=".55"/><stop offset=".45" stop-color="${C.deep}" stop-opacity=".6"/><stop offset="1" stop-color="${C.void}" stop-opacity="0"/></radialGradient>
<radialGradient id="${p}-bg2" cx="8%" cy="95%" r="55%"><stop offset="0" stop-color="${C.cyan}" stop-opacity=".12"/><stop offset="1" stop-color="${C.void}" stop-opacity="0"/></radialGradient>
<linearGradient id="${p}-silver" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFFFFF"/><stop offset=".55" stop-color="${C.silver}"/><stop offset="1" stop-color="${C.steel}"/></linearGradient>
<linearGradient id="${p}-scan" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${C.glow}" stop-opacity="0"/><stop offset=".5" stop-color="${C.glow}" stop-opacity=".55"/><stop offset="1" stop-color="${C.glow}" stop-opacity="0"/></linearGradient>
<linearGradient id="${p}-vig" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${C.void}" stop-opacity="0"/><stop offset="1" stop-color="${C.void}" stop-opacity=".85"/></linearGradient>
<filter id="${p}-glow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="${GLOW.soft}"/></filter>
<filter id="${p}-glowH" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="${GLOW.hard}"/></filter>
<pattern id="${p}-grid" width="${DENSITY.grid}" height="${DENSITY.grid}" patternUnits="userSpaceOnUse"><path d="M${DENSITY.grid} 0H0V${DENSITY.grid}" fill="none" stroke="${C.steel}" stroke-opacity=".07" stroke-width="1"/></pattern>`;
}

const background = (p, w, h) => `
<rect width="${w}" height="${h}" fill="${C.void}"/>
<rect width="${w}" height="${h}" fill="url(#${p}-bg1)"/>
<rect width="${w}" height="${h}" fill="url(#${p}-bg2)"/>
<rect width="${w}" height="${h}" fill="url(#${p}-grid)"/>`;

function particleField(p, w, h, count, rand, keepOut = null) {
  const layers = [
    { n: 0.6, r: [0.4, 0.9], o: [0.15, 0.4], cls: 'far' },
    { n: 0.3, r: [0.8, 1.4], o: [0.3, 0.65], cls: 'mid' },
    { n: 0.1, r: [1.4, 2.2], o: [0.5, 0.9], cls: 'near' },
  ];
  let out = '';
  for (const L of layers) {
    let g = '';
    const n = Math.round(count * L.n);
    for (let i = 0; i < n; i++) {
      const x = rand() * w, y = rand() * h;
      const r = L.r[0] + rand() * (L.r[1] - L.r[0]);
      const o = L.o[0] + rand() * (L.o[1] - L.o[0]);
      const k = rand();
      if (keepOut && x > keepOut.x0 && x < keepOut.x1 && y > keepOut.y0 && y < keepOut.y1) continue;
      const col = k < 0.08 ? C.cyan : k < 0.5 ? C.glow : C.silver;
      g += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="${col}" opacity="${f(o)}"/>`;
    }
    out += `<g class="${p}-${L.cls}">${g}</g>`;
  }
  return out;
}

function ringSystem(p, cx, cy, radii, rand) {
  let s = '';
  radii.forEach((r, i) => {
    const dash = i % 3 === 0 ? '' : i % 3 === 1 ? `stroke-dasharray="${f(r * 0.04)} ${f(r * 0.09)}"` : `stroke-dasharray="${f(r * 0.5)} ${f(r * 0.12)} ${f(r * 0.02)} ${f(r * 0.12)}"`;
    const cls = i % 2 === 0 ? `${p}-spin` : `${p}-spinr`;
    const col = i === 2 ? C.cyan : i % 2 ? C.glow : C.steel;
    const op = i === 2 ? 0.35 : 0.22 + 0.05 * (i % 3);
    s += `<g class="${cls}" style="transform-origin:${cx}px ${cy}px"><circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${col}" stroke-opacity="${op}" stroke-width="${i === 0 ? 1.2 : 0.8}" ${dash}/>`;
    const [sx, sy] = polar(cx, cy, r, rand() * 360);
    s += `<circle cx="${f(sx)}" cy="${f(sy)}" r="${i === 0 ? 3 : 2}" fill="${i === 2 ? C.cyan : C.silver}" opacity=".9"/></g>`;
  });
  const R = radii[radii.length - 1] + 14;
  let ticks = '';
  for (let a = 0; a < 360; a += 5) {
    const len = a % 30 === 0 ? 10 : 4;
    const [x1, y1] = polar(cx, cy, R, a), [x2, y2] = polar(cx, cy, R + len, a);
    ticks += `M${f(x1)} ${f(y1)}L${f(x2)} ${f(y2)}`;
  }
  s += `<path d="${ticks}" stroke="${C.steel}" stroke-opacity=".35" stroke-width=".8" fill="none"/>`;
  return s;
}

function filaments(p, w, h, cx, cy, count, rand) {
  let glow = '', core = '';
  for (let i = 0; i < count; i++) {
    const side = rand() < 0.12 ? -40 : w + 40;
    const y0 = rand() * h;
    const c1x = cx + (rand() - 0.5) * 500, c1y = cy + (rand() - 0.5) * 360;
    const c2x = cx + (rand() - 0.5) * 300, c2y = cy + (rand() - 0.5) * 240;
    const ex = cx + (rand() - 0.5) * 120, ey = cy + (rand() - 0.5) * 120;
    const d = `M${f(side)} ${f(y0)}C${f(c1x)} ${f(c1y)} ${f(c2x)} ${f(c2y)} ${f(ex)} ${f(ey)}`;
    const op = 0.25 + rand() * 0.45;
    glow += `<path d="${d}" stroke="${C.violet}" stroke-width="3" opacity="${f(op * 0.8)}" fill="none"/>`;
    core += `<path d="${d}" stroke="${i % 5 === 0 ? C.cyan : C.glow}" stroke-width="${f(0.5 + rand() * 0.6)}" opacity="${f(op)}" fill="none"/>`;
  }
  return `<g filter="url(#${p}-glow)">${glow}</g><g>${core}</g>`;
}

function wireframe(cx, cy, r, sides, rotate, color, op) {
  const ring = (rad, rot) => Array.from({ length: sides }, (_, i) => polar(cx, cy, rad, rot + (360 / sides) * i));
  const a = ring(r, rotate), b = ring(r * 0.55, rotate + 180 / sides), c = ring(r * 0.25, rotate);
  const poly = (pts) => `M${pts.map(([x, y]) => `${f(x)} ${f(y)}`).join('L')}Z`;
  let d = poly(a) + poly(b) + poly(c);
  for (let i = 0; i < sides; i++) {
    const j = (i + sides - 1) % sides;
    d += `M${f(a[i][0])} ${f(a[i][1])}L${f(b[i][0])} ${f(b[i][1])}`;
    d += `M${f(b[i][0])} ${f(b[i][1])}L${f(c[i][0])} ${f(c[i][1])}`;
    d += `M${f(a[i][0])} ${f(a[i][1])}L${f(b[j][0])} ${f(b[j][1])}`;
  }
  return `<path d="${d}" fill="none" stroke="${color}" stroke-opacity="${op}" stroke-width=".8" stroke-linejoin="round"/>`;
}

const cornerMarks = (w, h, m = 28, len = 18) => {
  const c = (x, y, sx, sy) => `M${x} ${y + sy * len}V${y}H${x + sx * len}`;
  return `<path d="${c(m, m, 1, 1)}${c(w - m, m, -1, 1)}${c(m, h - m, 1, -1)}${c(w - m, h - m, -1, -1)}" fill="none" stroke="${C.silver}" stroke-opacity=".5" stroke-width="1"/>`;
};

const mono = (x, y, text, { size = 11, op = 0.7, fill = C.steel, anchor = 'start', ls = 3 } = {}) =>
  `<text x="${x}" y="${y}" font-family="${FONT.mono}" font-size="${size}" letter-spacing="${ls}" fill="${fill}" fill-opacity="${op}" text-anchor="${anchor}">${esc(text)}</text>`;

const baseMotion = (p) => `
@keyframes ${p}-spin{to{transform:rotate(360deg)}}
@keyframes ${p}-spinr{to{transform:rotate(-360deg)}}
@keyframes ${p}-drift{0%,100%{transform:translate(0,0)}50%{transform:translate(-14px,8px)}}
@keyframes ${p}-driftb{0%,100%{transform:translate(0,0)}50%{transform:translate(10px,-6px)}}
@keyframes ${p}-pulse{0%,100%{opacity:.55}50%{opacity:1}}
@keyframes ${p}-scan{0%{transform:translateY(0);opacity:0}8%{opacity:1}92%{opacity:1}100%{transform:translateY(var(--h));opacity:0}}
.${p}-spin{animation:${p}-spin ${MOTION.orbit}s linear infinite}
.${p}-spinr{animation:${p}-spinr ${MOTION.orbitSlow}s linear infinite}
.${p}-far{animation:${p}-drift ${MOTION.drift * 1.6}s ease-in-out infinite}
.${p}-mid{animation:${p}-driftb ${MOTION.drift}s ease-in-out infinite}
.${p}-near{animation:${p}-drift ${MOTION.drift * 0.7}s ease-in-out infinite}
.${p}-pulse{animation:${p}-pulse ${MOTION.pulse}s ease-in-out infinite}
.${p}-scanline{animation:${p}-scan ${MOTION.scan}s ease-in-out infinite}
@media (prefers-reduced-motion:reduce){[class^="${p}-"]{animation:none!important}}`;

/* ───────────────────────── HERO ───────────────────────── */
function hero() {
  const { w, h } = SIZE.hero, p = 'hr', rand = rng(SEED);
  const cx = 900, cy = 250;
  const body = `
${background(p, w, h)}
${particleField(p, w, h, DENSITY.hero, rand, { x0: 60, x1: 840, y0: 150, y1: 350 })}
${filaments(p, w, h, cx, cy, 18, rand)}
<g class="${p}-pulse"><circle cx="${cx}" cy="${cy}" r="120" fill="${C.violet}" opacity=".16" filter="url(#${p}-glowH)"/></g>
${ringSystem(p, cx, cy, [64, 112, 164, 222, 286], rand)}
<g class="${p}-spinr" style="transform-origin:${cx}px ${cy}px">${wireframe(cx, cy, 92, 9, -90, C.silver, 0.55)}</g>
<circle cx="${cx}" cy="${cy}" r="3.2" fill="#fff"/>
<circle cx="${cx}" cy="${cy}" r="9" fill="none" stroke="${C.cyan}" stroke-opacity=".6"/>
<g style="--h:${h - 40}px"><rect class="${p}-scanline" x="0" y="20" width="${w}" height="1.2" fill="url(#${p}-scan)"/></g>
${mono(80, 128, '// CREATIVE SYSTEMS', { size: 12, fill: C.cyan, op: 0.85, ls: 5 })}
<text x="76" y="262" font-family="${FONT.display}" font-size="100" font-weight="800" letter-spacing="7" fill="${C.violet}" fill-opacity=".35" filter="url(#${p}-glow)">${NAME}</text>
<text x="76" y="262" font-family="${FONT.display}" font-size="100" font-weight="800" letter-spacing="7" fill="url(#${p}-silver)">${NAME}</text>
<path d="M80 300H836" stroke="${C.silver}" stroke-opacity=".35"/>
<path d="M80 300H260" stroke="${C.glow}" stroke-width="2"/>
${mono(80, 332, 'BUILD  /  EXPLORE  /  EVOLVE', { size: 14, fill: C.silver, op: 0.9, ls: 7 })}
${mono(80, 428, 'CIU  ·  CHITTAGONG INDEPENDENT UNIVERSITY', { size: 12, fill: C.silver, op: 0.85, ls: 4 })}
${mono(80, 456, `ID // ${HANDLE}`, { size: 11, ls: 4, op: 0.9 })}
${mono(836, 456, 'FIELD 01 · SEED ' + SEED, { size: 11, anchor: 'end', ls: 3, op: 0.9 })}
${cornerMarks(w, h)}
<rect y="${h - 120}" width="${w}" height="120" fill="url(#${p}-vig)"/>`;
  return svgDoc({
    id: p, w, h,
    title: 'ALPONA DEV — Creative Systems',
    desc: 'Generative hero artwork (affiliation line: Chittagong Independent University): obsidian field, violet filaments, rotating rings and a wireframe core beside the name ALPONA DEV.',
    defs: sharedDefs(p), css: baseMotion(p), body,
  });
}

/* ───────────────────────── IDENTITY ───────────────────────── */
function identity() {
  const { w, h } = SIZE.identity, p = 'id', rand = rng(SEED + 1);
  const mx = 130, my = 110;
  const body = `
${background(p, w, h)}
${particleField(p, w, h, 70, rand, { x0: 240, x1: 1040, y0: 50, y1: 175 })}
<g class="${p}-spin" style="transform-origin:${mx}px ${my}px"><circle cx="${mx}" cy="${my}" r="72" fill="none" stroke="${C.glow}" stroke-opacity=".4" stroke-dasharray="3 7"/></g>
<circle cx="${mx}" cy="${my}" r="54" fill="none" stroke="${C.silver}" stroke-opacity=".5"/>
<g filter="url(#${p}-glow)"><path d="M${mx - 30} ${my + 30}L${mx} ${my - 34}L${mx + 30} ${my + 30}" fill="none" stroke="${C.violet}" stroke-width="4" opacity=".6"/></g>
<path d="M${mx - 30} ${my + 30}L${mx} ${my - 34}L${mx + 30} ${my + 30}M${mx - 16} ${my + 6}H${mx + 16}" fill="none" stroke="${C.silver}" stroke-width="3" stroke-linecap="square"/>
<text x="250" y="132" font-family="${FONT.display}" font-size="84" font-weight="800" letter-spacing="8" fill="${C.violet}" fill-opacity=".12" stroke="${C.silver}" stroke-opacity=".75" stroke-width="1.2">${HANDLE}</text>
<g style="--h:${h - 40}px"><rect class="${p}-scanline" x="240" y="20" width="660" height="1.2" fill="url(#${p}-scan)"/></g>
${mono(252, 168, 'CODE  ·  MOTION  ·  GENERATIVE FORM', { size: 12, fill: C.silver, op: 0.8, ls: 6 })}
${mono(w - 60, 70, 'GITHUB.COM/DEVALPONA', { size: 11, anchor: 'end', ls: 4 })}
${mono(w - 60, 90, 'PROFILE REV. 01', { size: 11, anchor: 'end', ls: 4, fill: C.cyan, op: 0.8 })}
${mono(w - 60, 110, 'CIU // CHITTAGONG', { size: 11, anchor: 'end', ls: 4, fill: C.silver, op: 0.8 })}
<path d="M${w - 280} 124H${w - 60}" stroke="${C.steel}" stroke-opacity=".4"/>
${cornerMarks(w, h, 20, 14)}`;
  return svgDoc({
    id: p, w, h,
    title: 'DEVALPONA identity mark',
    desc: 'Outlined typographic identity for devalpona with a geometric monogram and the line Code, Motion, Generative Form.',
    defs: sharedDefs(p), css: baseMotion(p), body,
  });
}

/* ───────────────────────── DIVIDER ───────────────────────── */
function divider() {
  const { w, h } = SIZE.divider, p = 'dv', mid = w / 2, y = h / 2;
  let ticks = '';
  for (let i = 0; i <= 48; i++) {
    const x = 120 + i * ((w - 240) / 48);
    if (Math.abs(x - mid) < 40) continue;
    const t = i % 6 === 0 ? 8 : 3.5;
    ticks += `M${f(x)} ${y - t}V${y + t}`;
  }
  const body = `
<path d="M120 ${y}H${mid - 40}M${mid + 40} ${y}H${w - 120}" stroke="url(#${p}-line)" stroke-width="1"/>
<path d="${ticks}" stroke="${C.steel}" stroke-opacity=".6" stroke-width=".8"/>
<g class="${p}-spin" style="transform-origin:${mid}px ${y}px"><rect x="${mid - 11}" y="${y - 11}" width="22" height="22" transform="rotate(45 ${mid} ${y})" fill="none" stroke="${C.glow}" stroke-opacity=".9"/></g>
<rect x="${mid - 5}" y="${y - 5}" width="10" height="10" transform="rotate(45 ${mid} ${y})" fill="${C.cyan}" fill-opacity=".9"/>
<g class="${p}-sweep"><rect x="120" y="${y - 1}" width="160" height="2" fill="url(#${p}-fil)" filter="url(#${p}-glow)"/></g>`;
  const defs = `
<linearGradient id="${p}-line" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${C.steel}" stop-opacity="0"/><stop offset=".5" stop-color="${C.glow}" stop-opacity=".8"/><stop offset="1" stop-color="${C.steel}" stop-opacity="0"/></linearGradient>
<linearGradient id="${p}-fil" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${C.violet}" stop-opacity="0"/><stop offset=".5" stop-color="${C.glow}"/><stop offset="1" stop-color="${C.cyan}" stop-opacity="0"/></linearGradient>
<filter id="${p}-glow" x="-20%" y="-300%" width="140%" height="700%"><feGaussianBlur stdDeviation="3"/></filter>`;
  const css = `
@keyframes ${p}-spin{to{transform:rotate(360deg)}}
@keyframes ${p}-sweep{0%{transform:translateX(0);opacity:0}15%{opacity:1}85%{opacity:1}100%{transform:translateX(${w - 400}px);opacity:0}}
.${p}-spin{animation:${p}-spin ${MOTION.orbit}s linear infinite}
.${p}-sweep{animation:${p}-sweep ${MOTION.sweep}s ease-in-out infinite}
@media (prefers-reduced-motion:reduce){[class^="${p}-"]{animation:none!important}}`;
  return svgDoc({ id: p, w, h, title: 'Section divider', desc: 'A technical divider: ruled line with tick marks and a central rotating diamond.', defs, css, body });
}

/* ───────────────────────── FOOTER ───────────────────────── */
function footer() {
  const { w, h } = SIZE.footer, p = 'ft', rand = rng(SEED + 3);
  const cx = w / 2, cy = 150;
  let arcs = '';
  for (let i = 0; i < 9; i++) {
    const r = 40 + i * 14 * 2.4;
    const a0 = rand() * 360, span = 80 + rand() * 160;
    const [x1, y1] = polar(cx, cy, r, a0), [x2, y2] = polar(cx, cy, r, a0 + span);
    arcs += `<path d="M${f(x1)} ${f(y1)}A${f(r)} ${f(r)} 0 ${span > 180 ? 1 : 0} 1 ${f(x2)} ${f(y2)}" fill="none" stroke="${i % 4 === 0 ? C.cyan : C.glow}" stroke-opacity="${f(0.55 - i * 0.04)}" stroke-width="${i === 0 ? 1.6 : 0.9}"/>`;
  }
  const body = `
${background(p, w, h)}
${particleField(p, w, h, DENSITY.footer, rand, { x0: 300, x1: 900, y0: 235, y1: 320 })}
${filaments(p, w, h, cx, cy, 12, rand)}
<g class="${p}-pulse"><circle cx="${cx}" cy="${cy}" r="90" fill="${C.violet}" opacity=".2" filter="url(#${p}-glowH)"/></g>
<g class="${p}-spin" style="transform-origin:${cx}px ${cy}px">${arcs}</g>
<g class="${p}-spinr" style="transform-origin:${cx}px ${cy}px">${wireframe(cx, cy, 58, 7, -90, C.silver, 0.6)}</g>
<circle cx="${cx}" cy="${cy}" r="2.6" fill="#fff"/>
<g style="--h:${h - 40}px"><rect class="${p}-scanline" x="0" y="20" width="${w}" height="1.2" fill="url(#${p}-scan)"/></g>
<text x="${cx}" y="272" font-family="${FONT.display}" font-size="30" font-weight="300" letter-spacing="14" fill="${C.silver}" text-anchor="middle">SYSTEMS, SCULPTED.</text>
${mono(cx, 308, 'END OF SEQUENCE  ·  ' + HANDLE, { size: 11, anchor: 'middle', ls: 6, fill: C.cyan, op: 0.8 })}
${cornerMarks(w, h)}
<rect y="${h - 140}" width="${w}" height="140" fill="url(#${p}-vig)"/>`;
  return svgDoc({
    id: p, w, h,
    title: 'Closing frame — Systems, sculpted.',
    desc: 'Closing composition: converging orbital arcs and a wireframe core above the line Systems, sculpted.',
    defs: sharedDefs(p), css: baseMotion(p), body,
  });
}


/* ───────────────────────── ICON TILES ───────────────────────── */
// EDIT THESE LISTS to change which icons are generated. Keys must exist in scripts/icon-paths.json.
// Link targets live in README.md (SVG images cannot carry links themselves).
const SOCIALS = [
  { key: 'github', label: 'GITHUB' }, { key: 'linkedin', label: 'LINKEDIN' },
  { key: 'facebook', label: 'FACEBOOK' }, { key: 'instagram', label: 'INSTAGRAM' },
  { key: 'x', label: 'X' }, { key: 'gmail', label: 'EMAIL' },
];
const LANGUAGES = [
  { key: 'javascript', label: 'JAVASCRIPT' }, { key: 'typescript', label: 'TYPESCRIPT' },
  { key: 'python', label: 'PYTHON' }, { key: 'html5', label: 'HTML' },
  { key: 'css3', label: 'CSS' }, { key: 'nodejs', label: 'NODE.JS' }, { key: 'react', label: 'REACT' },
];
const ICON_PATHS = JSON.parse(readFileSync(resolve(ROOT, 'scripts', 'icon-paths.json'), 'utf8'));

function iconTile(group, { key, label }, withLabel) {
  const ic = ICON_PATHS[key];
  if (!ic) throw new Error(`Unknown icon key: ${key}`);
  const p = `ic${key}`, w = 72, h = withLabel ? 92 : 72, s = 1.25, ix = (w - 24 * s) / 2, iy = 14;
  const defs = `<linearGradient id="${p}-edge" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${C.glow}" stop-opacity=".9"/><stop offset=".6" stop-color="${C.violet}" stop-opacity=".25"/><stop offset="1" stop-color="${C.cyan}" stop-opacity=".6"/></linearGradient>
<radialGradient id="${p}-fill" cx=".5" cy=".3" r=".9"><stop offset="0" stop-color="${C.deep}"/><stop offset="1" stop-color="${C.void}"/></radialGradient>`;
  const body = `<rect x="1" y="1" width="${w - 2}" height="${h - 2}" rx="14" fill="url(#${p}-fill)" stroke="url(#${p}-edge)" stroke-width="1.2"/>
<g transform="translate(${f(ix)} ${iy}) scale(${s})"><path d="${ic.path}" fill="${C.silver}"/></g>
${withLabel ? mono(w / 2, 76, label, { size: 8, anchor: 'middle', ls: 1.5, fill: C.silver, op: 0.8 }) : ''}`;
  return svgDoc({ id: p, w, h, title: ic.title, desc: `${ic.title} icon tile (${group})`, defs, body });
}

/* ───────────────────────── RUN ───────────────────────── */
const files = { 'hero.svg': hero(), 'identity.svg': identity(), 'divider.svg': divider(), 'footer.svg': footer() };
for (const i of SOCIALS) files[`icons/social-${i.key}.svg`] = iconTile('social', i, false);
for (const i of LANGUAGES) files[`icons/lang-${i.key}.svg`] = iconTile('language', i, true);

function validate(xml) {
  const errs = [];
  const ids = [...xml.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
  const dup = ids.filter((v, i) => ids.indexOf(v) !== i);
  if (dup.length) errs.push(`duplicate ids: ${[...new Set(dup)].join(', ')}`);
  for (const m of xml.matchAll(/url\(#([^)]+)\)/g)) if (!ids.includes(m[1])) errs.push(`missing ref #${m[1]}`);
  if (/<script|onload=|onclick=|javascript:|<foreignObject|href="http/i.test(xml)) errs.push('forbidden content');
  return errs;
}

mkdirSync(resolve(OUT, 'icons'), { recursive: true });
const check = process.argv.includes('--validate');
let bad = 0;
for (const [name, xml] of Object.entries(files)) {
  const errs = validate(xml);
  if (check) {
    try { if (readFileSync(resolve(OUT, name), 'utf8') !== xml) errs.push('stale: run npm run generate:art'); }
    catch { errs.push('missing on disk'); }
  } else writeFileSync(resolve(OUT, name), xml);
  console.log(`${errs.length ? '✗' : '✓'} assets/${name}  ${(Buffer.byteLength(xml) / 1024).toFixed(1)} KB${errs.length ? '  ' + errs.join('; ') : ''}`);
  bad += errs.length;
}
process.exit(bad ? 1 : 0);
