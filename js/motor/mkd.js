// Formato MKD (Markdown adaptado a NoteApp): análisis del texto, vista limpia y vista sucia.
// ===== Formato MKD (Markdown adaptado a NoteApp) =====
// Escapar: \ delante de un signo lo muestra tal cual. Código en frase: `x`. Bloque de código: `` o ```.
// Línea copiable: 'x'. Bloque copiable: ''. Menciones: =Nombre sin nada pegado delante (salvo * o ~).
const MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
const ESC_CH = /[!-\/:-@\[-`{-~’‘]/;
const BOX_W = { True: true, False: false, x: true, X: true, ' ': false };
const isQ = c => c === "'" || c === '’' || c === '‘';
// Casillas-entidad: ([True] Nombre) o ([False] Nombre) en el texto crean una entidad True/False llamada Nombre.
const FLAG_NAME = new RegExp('^[' + NAME_START + '][' + ID_CH + ']*$');
const FLAG_HINT = /\(\[(?:True|False)\]/;
// Casillas-entidad de una lista de líneas (no dentro de bloques de código): [{ name, on }].
function lineFlags(lines) {
  if (!Array.isArray(lines) || !lines.some(l => FLAG_HINT.test(String(l.text || '')))) return [];
  const bi = blockInfo(lines), out = [];
  lines.forEach((l, i) => {
    const t = String(l.text || ''); if (!FLAG_HINT.test(t) || (bi[i] && bi[i].kind === 'code')) return;
    mdScan(t, 0, t.length).atoms.forEach(at => { if (at.kind === 'box' && at.name) out.push({ name: at.name, on: at.on }); });
  });
  return out;
}
// Casillas-entidad de una hoja: su texto y sus entidades de texto.
const sheetFlags = x => !x ? [] : lineFlags(x.lines).concat(...(x.entities || []).filter(e => e.type === 'text').map(e => lineFlags(e.lines)));
function safeUrl(u, img) {
  u = String(u || '').trim(); if (!u) return null;
  if (/^www\./i.test(u)) u = 'https://' + u;
  if (/^(https?:|mailto:)/i.test(u) || (img && /^data:image\//i.test(u))) return u;
  return /^[a-z][a-z0-9+.-]*:/i.test(u) || /^\/\//.test(u) ? null : u;
}
// Analiza el texto entre a y b: qué signos se ocultan, cuáles son literales y dónde hay casillas, menciones, enlaces e imágenes.
function mdScan(text, a, b) {
  const n = text.length, cat = new Uint8Array(n); // 0 normal · 1 signo escapado · 2 oculto · 3 código
  for (let i = a; i < b; i++) {
    const c = text[i];
    if (c === '\\' && i + 1 < b && ESC_CH.test(text[i + 1])) { cat[i] = 2; cat[i + 1] = 1; i++; continue; }
    if (c === '`') {
      let j = i; while (j < b && text[j] === '`') j++;
      if (j - i === 1) {
        let k = j, close = -1;
        while (k < b) { if (text[k] === '`') { let r = k; while (r < b && text[r] === '`') r++; if (r - k === 1) { close = k; break; } k = r; } else k++; }
        if (close > j) { cat[i] = 2; cat[close] = 2; for (let q = j; q < close; q++) cat[q] = 3; i = close; continue; }
      }
      i = j - 1;
    }
  }
  let w = '';
  for (let i = 0; i < n; i++) w += i < a || i >= b ? ' ' : cat[i] === 1 || cat[i] === 3 ? '' : cat[i] === 2 ? '' : text[i];
  const atoms = [], taken = new Uint8Array(n), seg = w.slice(a, b);
  const free = (s, e) => { for (let q = s; q < e; q++) if (taken[q]) return false; return true; };
  const take = at => { for (let q = at.s; q < at.e; q++) taken[q] = 1; atoms.push(at); };
  let m;
  const LINK = /(!?)\[([^\[\]]*)\]\(([^()\s]*)\)/g;
  while ((m = LINK.exec(seg))) {
    const s = a + m.index, e = s + m[0].length, img = !!m[1], ls = s + m[1].length + 1, le = ls + m[2].length;
    const url = safeUrl(text.slice(le + 2, e - 1), img);
    if (!url || (!img && !m[2].trim())) continue;
    take({ s, e, kind: img ? 'img' : 'link', url, ls, le });
  }
  const GRP = /\(\[(True|False|x|X| )\]([^)]*)\)/g;
  while ((m = GRP.exec(seg))) {
    const s = a + m.index, e = s + m[0].length; if (!free(s, e)) continue;
    const ts = s + 1, te = ts + m[1].length + 2, data = m[2], lead = data.length - data.replace(/^\s+/, '').length, trail = data.length - data.replace(/\s+$/, '').length;
    cat[s] = 2; cat[e - 1] = 2;
    // ([True] Nombre) / ([False] Nombre): si el texto es un nombre válido (sin espacios), la casilla es una entidad True/False con ese nombre.
    const name = (m[1] === 'True' || m[1] === 'False') && FLAG_NAME.test(data.trim()) ? data.trim() : null;
    if (name) { for (let q = te; q < e - 1; q++) cat[q] = 2; take({ s: ts, e: te, kind: 'box', on: BOX_W[m[1]], mr: '0px', grp: true, ps: s, pe: e - 1, name }); continue; }
    for (let q = te; q < te + lead; q++) cat[q] = 2;
    if (data.trim()) for (let q = e - 1 - trail; q < e - 1; q++) cat[q] = 2;
    take({ s: ts, e: te, kind: 'box', on: BOX_W[m[1]], mr: data.trim() ? '10px' : '0px', grp: true, ps: s, pe: e - 1 });
  }
  const BOX = /\[(True|False|x|X| )\]/g;
  while ((m = BOX.exec(seg))) { const s = a + m.index, e = s + m[0].length; if (free(s, e)) take({ s, e, kind: 'box', on: BOX_W[m[1]], mr: '0px' }); }
  const MEN = new RegExp(ENT.source, 'g');
  while ((m = MEN.exec(seg))) {
    const s = a + m.index, e = s + m[0].length, pc = s > a ? w[s - 1] : '';
    if (pc && !/[\s*~]/.test(pc)) continue;
    if (free(s, e)) take({ s, e, kind: 'ent', name: m[1] || m[2] });
  }
  atoms.sort((x, y) => x.s - y.s);
  let w2 = '';
  for (let i = 0; i < n; i++) w2 += taken[i] ? '' : w[i];
  return { text, cat, atoms, w, w2 };
}
const FMT = /(\*{1,3})(?=[^\s*])([^]*?[^\s*])\1(?!\*)|~~(?=[^\s~])([^]*?[^\s~])~~/g;
function mdFmt(sc, s, e, f, W, out) {
  const re = new RegExp(FMT.source, 'g'), str = W.slice(s, e); let last = 0, m;
  while ((m = re.exec(str))) {
    if (m.index > last) mdLeaf(sc, s + last, s + m.index, f, out);
    if (m[1]) { const L = m[1].length, is = s + m.index + L; mdFmt(sc, is, is + m[2].length, { ...f, b: f.b || L >= 2, i: f.i || L !== 2 }, W, out); }
    else { const is = s + m.index + 2; mdFmt(sc, is, is + m[3].length, { ...f, s: true }, W, out); }
    last = m.index + m[0].length;
  }
  if (last < str.length) mdLeaf(sc, s + last, e, f, out);
}
function mdLeaf(sc, s, e, f, out) {
  let i = s;
  for (const at of sc.atoms) {
    if (at.s < i || at.e > e) continue;
    if (at.s > i) mdText(sc, i, at.s, f, out);
    if (at.kind === 'link') { const k = out.length; mdFmt(sc, at.ls, at.le, f, sc.w, out); for (let j = k; j < out.length; j++) if (out[j].t === 'text') out[j].href = at.url; }
    else if (at.kind === 'img') out.push({ t: 'img', src: at.url, alt: sc.text.slice(at.ls, at.le), off: at.s });
    else if (at.kind === 'box') out.push({ t: 'box', on: at.on, off: at.s, mr: at.mr, name: at.name || '' });
    else out.push({ t: 'ent', name: at.name, off: at.s, b: f.b, i: f.i, s: f.s });
    i = at.e;
  }
  if (i < e) mdText(sc, i, e, f, out);
}
function mdText(sc, s, e, f, out) {
  let i = s;
  while (i < e) {
    if (sc.cat[i] === 2) { i++; continue; }
    const code = sc.cat[i] === 3; let j = i + 1;
    while (j < e && sc.cat[j] !== 2 && (sc.cat[j] === 3) === code) j++;
    out.push({ t: code ? 'code' : 'text', text: sc.text.slice(i, j), off: i, b: f.b, i: f.i, s: f.s });
    i = j;
  }
}
// Vista sucia: el texto tal cual, coloreando casillas, menciones y la barra de escapar.
function rawSegs(text) {
  const sc = mdScan(text, 0, text.length), out = [], pink = new Set();
  sc.atoms.forEach(at => { if (at.grp) { pink.add(at.ps); pink.add(at.pe); } });
  const col = i => pink.has(i) ? PINK : sc.cat[i] === 2 && text[i] === '\\' ? DIM : '#fff';
  const run = (s, e) => { let i = s; while (i < e) { const c = col(i); let j = i + 1; while (j < e && col(j) === c) j++; out.push({ t: 'text', text: text.slice(i, j), off: i, color: c }); i = j; } };
  let i = 0;
  for (const at of sc.atoms) {
    if (at.s > i) run(i, at.s);
    if (at.kind === 'box') out.push({ t: 'text', text: text.slice(at.s, at.e), off: at.s, color: TOKEN });
    else if (at.kind === 'ent') out.push({ t: 'ent', name: at.name, off: at.s, raw: true });
    else run(at.s, at.e);
    i = at.e;
  }
  if (i < text.length) run(i, text.length);
  return out;
}
const LI = /^( *)(-|\*|\+|\d{1,9}[.)]) (.*)$/;
const TSEP = /^\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/;
function cellsOf(t) {
  const cuts = [], r = t.replace(/\s+$/, '').length, cells = [];
  for (let i = 0; i < r; i++) { if (t[i] === '\\') { i++; continue; } if (t[i] === '|') cuts.push(i); }
  for (let k = 0; k < cuts.length; k++) {
    const s = cuts[k] + 1, e = k + 1 < cuts.length ? cuts[k + 1] : r;
    if (k + 1 === cuts.length && s >= r) break;
    let x = s, y = e; while (x < y && /\s/.test(t[x])) x++; while (y > x && /\s/.test(t[y - 1])) y--;
    cells.push({ s: x, e: y });
  }
  return cells;
}
// Formato propio de una celda de tabla. Dentro de una celda funciona el formato de una frase (negrita,
// menciones, `código`, casillas, enlaces…) y, además, la celda entera puede usar los formatos de línea:
// copiable 'x' (o ''x''), bloque de código ``x`` (o ```x```), título # x, punto de lista - x / 1. x,
// anotación > x y línea separadora --- / ***. Devuelve { kind, s, e } con la parte visible (sin los signos).
// kind: 'p' normal · 'copy' · 'code' · 'h' (lvl) · 'li' (li 'ul'|'ol', n) · 'quote' · 'hr'.
function cellInfo(t, c) {
  const s = c.s, e = c.e, x = t.slice(s, e), trim = (a, b) => { while (a < b && /\s/.test(t[a])) a++; while (b > a && /\s/.test(t[b - 1])) b--; return [a, b]; };
  let m;
  if (/^(-{3,}|\*{3,})$/.test(x)) return { kind: 'hr', s: e, e };
  for (const fl of [3, 2]) {
    const f = '`'.repeat(fl);
    if (x.length > fl * 2 && x.startsWith(f) && x.endsWith(f) && x.slice(fl, -fl).trim()) { const [a, b] = trim(s + fl, e - fl); return { kind: 'code', s: a, e: b }; }
  }
  if (x.length >= 5 && isQ(x[0]) && isQ(x[1]) && isQ(x[x.length - 1]) && isQ(x[x.length - 2]) && x.slice(2, -2).trim()) { const [a, b] = trim(s + 2, e - 2); return { kind: 'copy', s: a, e: b }; }
  if (x.length >= 3 && isQ(x[0]) && !isQ(x[1]) && isQ(x[x.length - 1])) { const [a, b] = trim(s + 1, e - 1); return { kind: 'copy', s: a, e: b }; }
  if ((m = /^(>(?: ?>)*) /.exec(x))) return { kind: 'quote', s: s + m[0].length, e };
  if ((m = /^(#{1,6}) /.exec(x))) return { kind: 'h', lvl: m[1].length, s: s + m[0].length, e };
  if ((m = LI.exec(x)) && m[1] === '') return { kind: 'li', li: m[2] === '-' || m[2] === '*' || m[2] === '+' ? 'ul' : 'ol', n: parseInt(m[2], 10), s: s + m[2].length + 1, e };
  return { kind: 'p', s, e };
}
// Texto de una celda de código: dentro de una tabla, | se escribe \| (si no, partiría la celda).
const cellCode = (t, ci) => t.slice(ci.s, ci.e).replace(/\\\|/g, '|');
function blockInfo(lines) {
  const n = lines.length, out = new Array(n), rtrim = t => t.replace(/\s+$/, '');
  const trail = (r, fn) => { let k = 0; while (k < r.length && fn(r[r.length - 1 - k])) k++; return k; };
  const tick = c => c === '`';
  for (let i = 0; i < n; i++) {
    const t = lines[i].text; let m;
    const fk = t.startsWith('``') ? 'code' : isQ(t[0]) && isQ(t[1]) ? 'copy' : null;
    if (fk) {
      const fl = fk === 'code' && t.startsWith('```') ? 3 : 2, is = fk === 'code' ? tick : isQ, r = rtrim(t), tl = trail(r, is);
      if (r.length >= fl + 2 && tl >= 2 && r.length - tl >= fl) { out[i] = { kind: fk, pos: 'single', start: fl, end: r.length - Math.min(tl, fl), from: i, to: i }; continue; }
      let j = i + 1; while (j < n && trail(rtrim(lines[j].text), is) < 2) j++;
      if (j < n) {
        const lang = fl === 3 && /^[\w+#.-]*$/.test(t.slice(3).trim());
        for (let k = i; k <= j; k++) {
          const tk = lines[k].text, rk = rtrim(tk);
          out[k] = { kind: fk, pos: k === i ? 'first' : k === j ? 'last' : 'mid', start: k === i ? (lang ? tk.length : fl) : 0, end: k === j ? Math.max(k === i ? fl : 0, rk.length - Math.min(trail(rk, is), fk === 'code' ? 3 : 2)) : tk.length, from: i, to: j };
          if (k === i && lang) out[k].end = tk.length;
        }
        i = j; continue;
      }
    }
    if (isQ(t[0]) && !isQ(t[1])) { const r = rtrim(t); if (r.length >= 3 && isQ(r[r.length - 1])) { out[i] = { kind: 'copy', pos: 'single', start: 1, end: r.length - 1, from: i, to: i }; continue; } }
    if (t[0] === '|' && i + 1 < n && TSEP.test(lines[i + 1].text) && lines[i + 1].text.includes('-')) {
      const head = cellsOf(t), sep = lines[i + 1].text, ncol = Math.max(1, head.length);
      const aligns = cellsOf(sep).map(c => { const x = sep.slice(c.s, c.e); return /^:.*:$/.test(x) ? 'center' : /:$/.test(x) ? 'right' : 'left'; });
      let j = i + 2; while (j < n && lines[j].text[0] === '|') j++;
      for (let k = i; k < j; k++) out[k] = k === i + 1 ? { kind: 'tsep', from: i, to: j - 1 } : { kind: 'trow', head: k === i, cells: k === i ? head : cellsOf(lines[k].text), ncol, aligns, last: k === j - 1, from: i, to: j - 1 };
      i = j - 1; continue;
    }
    if (/^(-{3,}|\*{3,})\s*$/.test(t)) out[i] = { kind: 'hr' };
    else if ((m = /^(>(?: ?>)*)( |$)/.exec(t))) {
      // Anotación: dentro también se aceptan títulos, listas y líneas separadoras.
      const q = { kind: 'quote', lvl: (m[1].match(/>/g) || []).length, start: Math.min(m[0].length, t.length), end: t.length }, in2 = t.slice(q.start); let k;
      if (/^(-{3,}|\*{3,})\s*$/.test(in2)) q.hr = true;
      else if ((k = /^(#{1,6}) (.*)$/.exec(in2))) { q.h = k[1].length; q.start += k[1].length + 1; }
      else if ((k = LI.exec(in2))) { q.li = k[2] === '-' || k[2] === '*' || k[2] === '+' ? 'ul' : 'ol'; q.ilvl = Math.min(6, Math.floor(k[1].length / 2)); q.n = parseInt(k[2], 10); q.start += k[1].length + k[2].length + 1; }
      out[i] = q;
    }
    else if ((m = LI.exec(t))) out[i] = { kind: m[2] === '-' || m[2] === '*' || m[2] === '+' ? 'ul' : 'ol', lvl: Math.min(6, Math.floor(m[1].length / 2)), start: m[1].length + m[2].length + 1, end: t.length, n: parseInt(m[2], 10) };
    else out[i] = { kind: 'p' };
  }
  let cnt = [], qcnt = [];
  out.forEach((b, i) => {
    if (b.kind === 'quote') {
      b.first = !(out[i - 1] && out[i - 1].kind === 'quote'); b.last = !(out[i + 1] && out[i + 1].kind === 'quote');
      if (b.first) qcnt = [];
      if (b.li) { qcnt = qcnt.slice(0, b.ilvl + 1); if (b.li === 'ol') { b.num = qcnt[b.ilvl] != null ? qcnt[b.ilvl] + 1 : b.n; qcnt[b.ilvl] = b.num; } else qcnt[b.ilvl] = null; } else qcnt = [];
    }
    if (b.kind === 'ul' || b.kind === 'ol') {
      cnt = cnt.slice(0, b.lvl + 1);
      if (b.kind === 'ol') { b.num = cnt[b.lvl] != null ? cnt[b.lvl] + 1 : b.n; cnt[b.lvl] = b.num; } else cnt[b.lvl] = null;
    } else cnt = [];
  });
  return out;
}
const plainOf = segs => segs.map(s => s.t === 'text' || s.t === 'code' ? s.text : s.t === 'ent' ? resolveEntity(s.name) : s.t === 'box' ? (s.on ? '[x]' : '[ ]') + (s.mr === '10px' ? ' ' : '') : s.t === 'img' ? s.alt : '').join('');
function cleanSegs(text, start, end) {
  const a = start || 0, b = end == null ? text.length : end, out = [];
  if (b <= a) return out;
  const sc = mdScan(text, a, b);
  mdFmt(sc, a, b, {}, sc.w2, out);
  return out;
}
// Conversión única de notas antiguas: el cuadro copiable pasó de `` a ''.
function mkdMigrate(lines) {
  const out = lines.map(l => ({ ...l })), n = out.length, ends = t => /``\s*$/.test(t), fix = t => t.replace(/``(\s*)$/, "''$1");
  for (let i = 0; i < n; i++) {
    const t = String(out[i].text || ''); if (!t.startsWith('``')) continue;
    if (t.length >= 4 && ends(t.slice(2))) { out[i].text = "''" + fix(t.slice(2)); continue; }
    let j = i + 1; while (j < n && !ends(String(out[j].text || ''))) j++;
    if (j < n) { out[i].text = "''" + t.slice(2); out[j].text = fix(out[j].text); i = j; }
  }
  return out;
}

// Conversión de las notas antiguas al formato MKD actual (se usa al cargar).
const mkdMigNotes = notes => (notes || []).map(n => ({ ...n, sheets: (n.sheets || []).map(x => ({ ...x, lines: Array.isArray(x.lines) ? mkdMigrate(x.lines) : x.lines, entities: (x.entities || []).map(e => e.type === 'text' && Array.isArray(e.lines) ? { ...e, lines: mkdMigrate(e.lines) } : e) })) }));

// ===== Exportar a Markdown estándar (botón de la barra superior del panel de texto) =====
// Reconstruye el texto de una hoja en Markdown que se pueda abrir en cualquier programa:
// - Las menciones se cambian por su valor (no por su ruta), igual que al copiar un cuadro copiable.
// - El bloque de código `` se cambia a ``` (Markdown estándar solo entiende tres o más comillas invertidas,
//   y si está en una sola línea se reparte en tres líneas, porque así lo exige el formato).
// - `_` nunca es formato en MKD (lo usan los nombres de entidad), así que se escapa como \_ para que
//   Markdown no lo confunda con cursiva.
// - El valor de una mención es un dato, no un formato: se escapan en él los símbolos de Markdown
//   (\ ` * _ ~ [ ] |) para que se vea tal cual, aunque contenga alguno de esos caracteres.
// - Cada línea de MKD es una línea aparte (no se juntan en párrafos como en Markdown): se separan con una
//   línea en blanco. Esto también evita que una línea --- justo debajo de un párrafo se confunda con un
//   título (en Markdown, un guion debajo de un párrafo lo convierte en título si no hay nada en medio).
// - Las casillas [True]/[False]/[x]/[ ] no tienen equivalente exacto fuera de una lista, así que se dejan
//   como texto [x] / [ ] (se ven igual, pero no son interactivas).
// - Lo copiable ('x' / '') no existe en Markdown estándar: se exporta como texto normal, con su valor y su
//   formato (igual que se ve en la app), sin las comillas.
const MD_ESC_VAL = /([\\`*_~\[\]|])/g;
const mdEscVal = t => String(t == null ? '' : t).replace(MD_ESC_VAL, '\\$1');
const mdEscUnderscore = t => String(t == null ? '' : t).replace(/_/g, '\\_');
// Envuelve el texto con los símbolos de formato (**, *, ~~), dejando fuera los espacios de los bordes
// (si no, Markdown no los reconoce como negrita/cursiva: "**texto **" no cierra la negrita).
function mdWrap(text, mark) {
  const m = /^(\s*)([^]*?)(\s*)$/.exec(text);
  return m[2] ? m[1] + mark + m[2] + mark + m[3] : text;
}
// Valla de comillas invertidas para un bloque o un código en una frase: más larga que la racha más larga
// que tenga el propio texto, para que no se cierre antes de tiempo.
function mdFence(text) {
  let max = 0, cur = 0;
  for (const c of String(text)) { if (c === '`') { cur++; if (cur > max) max = cur; } else cur = 0; }
  return '`'.repeat(Math.max(3, max + 1));
}
// Reconstruye el texto Markdown de una lista de "segs" (de cleanSegs): resuelve menciones, convierte
// casillas e imágenes, y aplica negrita/cursiva/tachado. esc = también escapar | (celda de tabla).
function mdSegsOut(segs, esc) {
  return segs.map(sg => {
    if (sg.t === 'box') return (sg.on ? '[x]' : '[ ]') + (sg.mr === '10px' ? ' ' : '');
    if (sg.t === 'img') return '![' + (sg.alt || '') + '](' + sg.src + ')';
    if (sg.t === 'code') {
      const fence = mdFence(sg.text), pad = /^`|`$/.test(sg.text) ? ' ' : '';
      let o = fence + pad + sg.text + pad + fence;
      if (sg.b && sg.i) o = mdWrap(o, '***'); else if (sg.b) o = mdWrap(o, '**'); else if (sg.i) o = mdWrap(o, '*');
      if (sg.s) o = mdWrap(o, '~~');
      return o;
    }
    let text = sg.t === 'ent' ? mdEscVal(resolveEntity(sg.name)) : mdEscUnderscore(sg.text);
    if (esc) text = text.replace(/\|/g, '\\|');
    if (sg.b && sg.i) text = mdWrap(text, '***'); else if (sg.b) text = mdWrap(text, '**'); else if (sg.i) text = mdWrap(text, '*');
    if (sg.s) text = mdWrap(text, '~~');
    return sg.href ? '[' + text + '](' + sg.href + ')' : text;
  }).join('');
}
// Convierte una línea (ya clasificada por blockInfo) a su línea de Markdown.
function mdOneLine(text, b) {
  if (b.kind === 'hr') return '---';
  if (b.kind === 'p') {
    const p = parseLine(text), body = mdSegsOut(cleanSegs(text, p.start, text.length), false);
    return p.level ? '#'.repeat(p.level) + ' ' + body : body;
  }
  if (b.kind === 'ul' || b.kind === 'ol') {
    const body = mdSegsOut(cleanSegs(text, b.start, b.end), false);
    return '  '.repeat(b.lvl) + (b.kind === 'ul' ? '- ' : b.num + '. ') + body;
  }
  // anotación (quote)
  const pre = '> '.repeat(b.lvl);
  if (b.hr) return pre.trimEnd() + ' ---';
  if (b.h) return pre + '#'.repeat(b.h) + ' ' + mdSegsOut(cleanSegs(text, b.start, b.end), false);
  if (b.li) return pre + '  '.repeat(b.ilvl) + (b.li === 'ul' ? '- ' : b.num + '. ') + mdSegsOut(cleanSegs(text, b.start, b.end), false);
  return pre + mdSegsOut(cleanSegs(text, b.start, b.end), false);
}
// Convierte una celda de tabla a Markdown. Markdown no tiene títulos, listas, anotaciones ni copiables dentro
// de una tabla: el título se exporta en negrita y el resto como texto normal (sin las comillas del copiable).
function mdCellOut(t, cell) {
  const ci = cellInfo(t, cell);
  if (ci.kind === 'hr') return '\\-\\-\\-';
  if (ci.kind === 'code') { const raw = t.slice(ci.s, ci.e), fence = '`'.repeat(Math.max(1, (raw.match(/`+/g) || []).reduce((a, r) => Math.max(a, r.length + 1), 1))), pad = /^`|`$/.test(raw) ? ' ' : ''; return fence + pad + raw + pad + fence; }
  const body = mdSegsOut(cleanSegs(t, ci.s, ci.e), true);
  if (ci.kind === 'h') return mdWrap(body, '**');
  if (ci.kind === 'li') return (ci.li === 'ul' ? '- ' : ci.n + '. ') + body;
  return body;
}
// Exporta una lista de líneas MKD (sheet.lines) a un texto en Markdown estándar.
function mdExportText(lines) {
  if (!Array.isArray(lines) || !lines.length) return '';
  const bi = blockInfo(lines), n = lines.length, out = [];
  let i = 0, prevB = null;
  const pushBlank = () => { if (out.length) out.push(''); };
  const quoteSep = lvl => Array.from({ length: Math.max(1, lvl) }, () => '>').join(' ');
  while (i < n) {
    const b = bi[i];
    if (b.kind === 'code' || b.kind === 'copy') {
      const from = b.from, to = b.to, blk = [];
      for (let k = from; k <= to; k++) {
        const bk = bi[k], t = lines[k].text;
        blk.push(b.kind === 'code' ? t.slice(bk.start, Math.max(bk.start, bk.end)) : mdSegsOut(cleanSegs(t, bk.start, bk.end), false));
      }
      pushBlank();
      if (b.kind === 'code') { const fence = mdFence(blk.join('\n')); out.push(fence, ...blk, fence); }
      else blk.forEach((t, k) => { if (k) out.push(''); out.push(t); });
      prevB = bi[to]; i = to + 1; continue;
    }
    if (b.kind === 'tsep') { i++; continue; }
    if (b.kind === 'trow') {
      const from = b.from, to = b.to, head = bi[from];
      pushBlank();
      for (let k = from; k <= to; k++) {
        const bk = bi[k];
        if (bk.kind === 'tsep') {
          const cells = (head.aligns || []).map(al => al === 'center' ? ':---:' : al === 'right' ? '---:' : '---');
          out.push('| ' + cells.join(' | ') + ' |');
          continue;
        }
        const row = [];
        for (let c = 0; c < bk.ncol; c++) { const cell = bk.cells[c]; row.push(cell ? mdCellOut(lines[k].text, cell) : ''); }
        out.push('| ' + row.join(' | ') + ' |');
      }
      prevB = bi[to]; i = to + 1; continue;
    }
    const joined = prevB && (prevB.kind === 'ul' || prevB.kind === 'ol') && (b.kind === 'ul' || b.kind === 'ol');
    const quoteRun = prevB && prevB.kind === 'quote' && b.kind === 'quote' && !b.first;
    if (!joined) { if (quoteRun) out.push(quoteSep(Math.max(b.lvl, prevB.lvl))); else pushBlank(); }
    out.push(mdOneLine(lines[i].text, b));
    prevB = b; i++;
  }
  return out.join('\n');
}
