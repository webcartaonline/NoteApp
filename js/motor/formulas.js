// Fórmulas y valores de las entidades: expresiones, tablas, deslizador, porcentaje, lógica,
// fechas, contador y aviso. makeWorld() resuelve las referencias entre entidades.
let NOW = Date.now();
const num = v => ({ t: 'num', v }), bool = v => ({ t: 'bool', v }), dt = v => ({ t: 'date', v });
const pad2 = n => String(n).padStart(2, '0');
const ymd = d => d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
const cap = t => t ? t[0].toUpperCase() + t.slice(1) : t;
const dateMs = e => { const p = String(e.date || '').split('-').map(Number), q = String(e.time || '00:00').split(':').map(Number); if (p.length < 3 || p.some(isNaN)) return NaN; return new Date(p[0], p[1] - 1, p[2], q[0] || 0, q[1] || 0).getTime(); };
function durTxt(a) { const d = Math.floor(a / 864e5), h = Math.floor(a / 36e5) % 24, m = Math.floor(a / 6e4) % 60, s = Math.floor(a / 1e3) % 60; return d ? d + ' d ' + h + ' h ' + m + ' min' : h ? h + ' h ' + m + ' min' : m ? m + ' min ' + s + ' s' : s + ' s'; }
const toNum = x => !x ? NaN : x.t === 'num' || x.t === 'date' ? x.v : x.t === 'bool' ? (x.v ? 1 : 0) : NaN;
const parseNum = s => { s = String(s == null ? '' : s).trim(); return /^-?\d+(?:[.,]\d+)?$/.test(s) ? parseFloat(s.replace(',', '.')) : null; };
function fmt(x) {
  if (!x) return 'ND';
  if (x.t === 'num') return isFinite(x.v) ? x.v.toLocaleString('es-ES', { maximumFractionDigits: 2, useGrouping: false }) : 'ND';
  if (x.t === 'bool') return x.v ? 'True' : 'False';
  if (x.t === 'date') { const f1 = ms => { const d = new Date(ms); return pad2(d.getDate()) + '/' + pad2(d.getMonth() + 1) + '/' + d.getFullYear() + ' ' + pad2(d.getHours()) + ':' + pad2(d.getMinutes()); }; if (x.end != null) { const a = f1(x.v), b = f1(x.end); return a.slice(0, 10) === b.slice(0, 10) ? a + ' – ' + b.slice(11) : a + ' – ' + b; } const d = new Date(x.v); return pad2(d.getDate()) + '/' + pad2(d.getMonth() + 1) + '/' + d.getFullYear() + ' ' + pad2(d.getHours()) + ':' + pad2(d.getMinutes()); }
  return String(x.v);
}
class NDErr extends Error {}
function evalExpr(src, get) {
  const s = String(src || '').trim(); if (!s) return null;
  const re = new RegExp('\\s*(' + PATH_RX + '|=?[' + NAME_START + '][' + ID_CH + ']*|\\d+(?:[.,]\\d+)?|[()+\\-*/])', 'y');
  const toks = []; let pos = 0;
  while (pos < s.length) { re.lastIndex = pos; const m = re.exec(s); if (!m) return { t: 'text', v: s }; toks.push(m[1]); pos = re.lastIndex; }
  const run = look => {
    let i = 0;
    const peek = () => toks[i], next = () => toks[i++];
    const arith = (a, b, op) => { if (a.t === 'date' || b.t === 'date') { if (op === '-' && a.t === 'date' && b.t === 'date') return num((a.v - b.v) / 864e5); const n = toNum(a.t === 'date' ? b : a); if (!isNaN(n) && (op === '+' || (op === '-' && a.t === 'date')) && !(a.t === 'date' && b.t === 'date')) return dt((a.t === 'date' ? a : b).v + (op === '-' ? -n : n) * 864e5); throw new NDErr(); } const x = toNum(a), y = toNum(b); if (isNaN(x) || isNaN(y)) throw new NDErr(); if (op === '/' && y === 0) throw new NDErr(); return num(op === '+' ? x + y : op === '-' ? x - y : op === '*' ? x * y : x / y); };
    const factor = () => {
      const t = next(); if (t === undefined) throw new SyntaxError();
      if (t === '-') { const v = toNum(factor()); if (isNaN(v)) throw new NDErr(); return num(-v); }
      if (t === '+') return factor();
      if (t === '(') { const v = expr(); if (next() !== ')') throw new SyntaxError(); return v; }
      if (/^\d/.test(t)) return num(parseFloat(t.replace(',', '.')));
      if (/^[)*/]$/.test(t)) throw new SyntaxError();
      const name = isPath(t) ? t : t.replace(/^=/, '');
      if (name === 'True') return bool(true);
      if (name === 'False') return bool(false);
      const v = look(name); if (!v) throw new NDErr(); return v;
    };
    // Como en una calculadora: primero * y /, después + y - (los paréntesis van antes que todo).
    const term = () => { let a = factor(); while (peek() === '*' || peek() === '/') { const op = next(); a = arith(a, factor(), op); } return a; };
    const expr = () => { let a = term(); while (peek() === '+' || peek() === '-') { const op = next(); a = arith(a, term(), op); } return a; };
    const v = expr(); if (i < toks.length) throw new SyntaxError(); return v;
  };
  try { run(() => num(0)); } catch (e) { if (!(e instanceof NDErr)) return { t: 'text', v: s }; }
  try { return run(get); } catch (e) { return e instanceof NDErr ? null : { t: 'text', v: s }; }
}
function cellInfo(text, get) {
  const t = String(text || '').trim();
  const b = /\[(True|False)\]/.exec(t);
  if (b) return { kind: 'box', on: b[1] === 'True', val: bool(b[1] === 'True') };
  const r = new RegExp('^=([' + NAME_START + '][' + ID_CH + ']*)$').exec(t);
  if (r) return { kind: 'ref', val: get(r[1]) };
  if (new RegExp('^' + PATH_RX + '$').test(t)) return { kind: 'ref', val: get(t) };
  const n = parseNum(t); if (n !== null) return { kind: 'num', val: num(n) };
  return { kind: t ? 'text' : 'empty', text: t };
}
const rowActive = (row, cols) => !cols.some(c => /\[False\]/.test(row.cells[c.id] || ''));
function colAlign(col, rows) {
  const infos = rows.map(r => cellInfo(r.cells[col.id], () => num(0))).filter(i => i.kind !== 'empty');
  if (infos.some(i => i.kind === 'box')) return 'center';
  if (infos.length && infos.every(i => i.kind === 'num' || i.kind === 'ref')) return 'right';
  return 'left';
}
function tableOut(e, get) {
  const col = e.cols.find(c => c.op); if (!col) return null;
  const xs = e.rows.filter(r => rowActive(r, e.cols)).map(r => toNum(cellInfo(r.cells[col.id], get).val)).filter(x => !isNaN(x));
  if (!xs.length) return num(0);
  const a = xs[0], rest = xs.slice(1);
  if (col.op === 'sum') return num(xs.reduce((p, q) => p + q, 0));
  if (col.op === 'sub') return num(rest.reduce((p, q) => p - q, a));
  if (col.op === 'mul') return num(xs.reduce((p, q) => p * q, 1));
  if (col.op === 'div') return rest.some(q => q === 0) ? null : num(rest.reduce((p, q) => p / q, a));
  return null;
}
function sliderRange(e, get) {
  let lo = toNum(evalExpr(e.min, get)), hi = toNum(evalExpr(e.max, get));
  if (isNaN(lo)) lo = 0; if (isNaN(hi)) hi = 100;
  if (hi < lo) { const t = lo; lo = hi; hi = t; } if (hi === lo) hi = lo + 1;
  return [lo, hi];
}
function sliderVal(e, get) { const r = sliderRange(e, get); const v = Math.min(r[1], Math.max(r[0], +e.value || 0)); return e.decimals ? Math.round(v * 10) / 10 : Math.round(v); }
// Botón de comillas (decimales) en expresión, interruptor, tabla y lógica: si está apagado, los números salen redondeados.
const DEC_T = new Set(['expr', 'toggle', 'table', 'logic']);
const roundOut = (e, r) => r && r.t === 'num' && e.decimals === false && DEC_T.has(e.type) && isFinite(r.v) ? num(Math.round(r.v)) : r;
const toggleShown = (e, get) => roundOut(e, (e.expr || '').trim() ? evalExpr(e.expr, get) : bool(e.on));
function entOut(e, get) {
  return DEC_T.has(e.type) ? roundOut(e, entOut0(e, get)) : entOut0(e, get);
}
function entOut0(e, get) {
  if (e.type === 'flag') return bool(!!e.on); // casilla-entidad del texto: ([True] Nombre)
  if (e.type === 'expr') return evalExpr(e.expr, get);
  if (e.type === 'toggle') { const has = (e.expr || '').trim(); if (!e.on) return has ? num(0) : bool(false); return has ? evalExpr(e.expr, get) : bool(true); }
  if (e.type === 'slider') return num(sliderVal(e, get));
  if (e.type === 'table') return tableOut(e, get);
  if (e.type === 'pct') return pctOut(e, get);
  if (e.type === 'logic') return logicOut(e, get);
  if (e.type === 'date') { const ms = dateMs(e); if (isNaN(ms)) return null; if (!e.range && !e.trange) return dt(ms); const m2 = dateMs({ date: e.range ? (e.date2 || e.date) : e.date, time: e.trange ? (e.timeEnd || e.time) : '23:59' }); return { t: 'date', v: ms, end: isNaN(m2) ? ms : Math.max(ms, m2) }; }
  if (e.type === 'notif') { const i = notifInfo(e, get); return i ? bool(NOW >= i.fire) : null; }
  if (e.type === 'count') { const c = countInfo(e, get); if (!c) return null; const a = Math.abs(c.diff), u = e.unit || 'd'; if (u === 'txt') return { t: 'text', v: (c.past ? 'hace ' : '') + durTxt(a) }; const eu = countUnit(a, u); return { t: 'num', v: (c.past ? -1 : 1) * Math.floor(a / UNIT_MS[eu]), unit: eu }; }
  return null;
}
function countInfo(e, get) {
  const t = evalExpr(e.target, get); if (!t || t.t !== 'date') return null;
  const end = t.end != null ? t.end : t.v, ref = e.ref || 'start';
  if (ref === 'span') return { diff: end - t.v, past: false, span: true, ref, t, shown: t };
  const to = ref === 'end' ? end : t.v, diff = to - NOW;
  return { diff, past: diff < 0, ref, t, shown: dt(to) };
}
const UNIT_MS = { d: 864e5, h: 36e5, m: 6e4, s: 1e3 }, UNIT_SFX = { d: ' d', h: ' h', m: ' min', s: ' s' };
function countUnit(a, u) { const order = ['d', 'h', 'm', 's']; let i = Math.max(0, order.indexOf(u)); while (i < 3 && Math.floor(a / UNIT_MS[order[i]]) === 0) i++; return order[i]; }
const normN = s => String(s || '').trim().replace(/\s+/g, ' ').toLowerCase();
function makeWorld(s) {
  // =Nombre busca solo en la hoja donde se escribe; =/Nota/Hoja/Entidad busca en cualquier nota (primero en la ventana de quien la escribe).
  const entries = [], sheetW = new Map();
  // Primero las entidades del panel y después las casillas-entidad del texto: si se repite un nombre, gana la del panel.
  [['c', s.notes], ['o', s.other.notes]].forEach(([w, list]) => list.forEach(n => n.sheets.forEach(x => {
    sheetW.set(x.id, w); const base = { w, sid: x.id, note: normN(n.name), sheet: normN(x.name) };
    (x.entities || []).forEach(e => { if (!NOVAL(e.type)) entries.push({ e, ...base }); });
    sheetFlags(x).forEach(f => entries.push({ e: { id: 'f:' + x.id + ':' + f.name, type: 'flag', name: f.name, on: f.on }, ...base }));
  })));
  const bySheet = new Map();
  entries.forEach(en => { let m = bySheet.get(en.sid); if (!m) bySheet.set(en.sid, m = new Map()); if (!m.has(en.e.name)) m.set(en.e.name, en); });
  const memo = new Map(), stack = new Set(), getters = new Map(), pmemo = new Map();
  const val = en => {
    const id = en.e.id; if (memo.has(id)) return memo.get(id); if (stack.has(id)) return null;
    stack.add(id); let v = null;
    try { v = entOut(en.e, at(en.sid)); } catch (_) { v = null; } finally { stack.delete(id); }
    memo.set(id, v); return v;
  };
  const findPath = (key, w) => {
    const k = w + key; if (pmemo.has(k)) return pmemo.get(k);
    const p = key.slice(2).split('/').map(normN); let en = null;
    if (p.length === 3) { const hits = entries.filter(x => x.note === p[0] && x.sheet === p[1] && x.e.name.toLowerCase() === p[2]); en = hits.find(x => x.w === w) || hits[0] || null; }
    pmemo.set(k, en); return en;
  };
  const at = sid => {
    if (getters.has(sid)) return getters.get(sid);
    const map = bySheet.get(sid) || new Map(), w = sheetW.get(sid) || 'c';
    const g = name => {
      if (isPath(name)) { const en = findPath(name, w); return en ? val(en) : null; }
      const en = map.get(name); if (en) return val(en);
      if (name === 'Ahora') return dt(NOW);
      if (name === 'Hoy') { const d = new Date(NOW); d.setHours(0, 0, 0, 0); return dt(d.getTime()); }
      return null;
    };
    g.has = name => isPath(name) ? !!findPath(name, w) : map.has(name) || name === 'Ahora' || name === 'Hoy';
    getters.set(sid, g); return g;
  };
  return { at };
}
function hlExpr(text) {
  const out = [], re = new RegExp('(' + PATH_RX + ')|(=?)([' + NAME_START + '][' + ID_CH + ']*)|(\\d+(?:[.,]\\d+)?)', 'g');
  let last = 0, m;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push({ text: text.slice(last, m.index), color: '#fff' });
    if (m[1]) out.push(...pathSegs(m[1]));
    else if (m[3]) { if (m[2]) out.push({ text: '=', color: '#fff' }); out.push({ text: m[3], color: '#008000' }); }
    else out.push({ text: m[4], color: '#008000' });
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ text: text.slice(last), color: '#fff' });
  return out;
}
function substSegs(text, get) {
  const src = String(text || '').trim(), out = [];
  const re = new RegExp('(' + PATH_RX + ')|(=?)([' + NAME_START + '][' + ID_CH + ']*)|(\\d+(?:[.,]\\d+)?)', 'g');
  let last = 0, m, refs = 0;
  while ((m = re.exec(src))) {
    if (m.index > last) out.push({ text: src.slice(last, m.index).replace(/\s+/g, ' '), color: '#fff' });
    if (m[1]) { refs++; out.push({ text: fmt(get(m[1])), color: '#008000' }); }
    else if (m[3]) {
      if (m[3] === 'True' || m[3] === 'False') out.push({ text: m[3], color: '#008000' });
      else { refs++; out.push({ text: fmt(get(m[3])), color: '#008000' }); }
    } else out.push({ text: m[4], color: '#008000' });
    last = m.index + m[0].length;
  }
  if (last < src.length) out.push({ text: src.slice(last).replace(/\s+/g, ' '), color: '#fff' });
  const show = !!src && /[-+*/()]/.test(src.replace(new RegExp(PATH_RX, 'g'), ''));
  return { segs: out, show };
}
function hlCell(text) {
  if (parseNum(text) !== null) return [{ text, color: '#008000' }];
  const out = [], re = new RegExp('\\(\\[(True|False)\\]([^)]*)\\)|\\[(True|False)\\]|=([' + NAME_START + '][' + ID_CH + ']*)|(' + PATH_RX + ')', 'g');
  let last = 0, m;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push({ text: text.slice(last, m.index), color: '#fff' });
    if (m[1]) { out.push({ text: '(', color: PINK }, { text: '[' + m[1] + ']', color: TOKEN }); if (m[2]) out.push({ text: m[2], color: '#fff' }); out.push({ text: ')', color: PINK }); }
    else if (m[3]) out.push({ text: m[0], color: TOKEN });
    else if (m[4]) out.push({ text: '=', color: '#fff' }, { text: m[4], color: '#008000' });
    else out.push(...pathSegs(m[5]));
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ text: text.slice(last), color: '#fff' });
  return out;
}
let _cv = null;
function textW(t) {
  if (!_cv) _cv = document.createElement('canvas').getContext('2d');
  _cv.font = "700 16px 'Google Sans','Product Sans',Figtree,system-ui,sans-serif";
  return _cv.measureText(String(t || '')).width;
}
const PCT_SLOTS = { part: 'Parte', pct: 'Porcentaje', total: 'Total' };
const PCT_MODES = [['pct', '%', 'El ?% de B es X'], ['total', 'Total', 'El A% de ? es X'], ['part', 'Parte', 'El A% de B es ?']];
function pctOut(e, get) {
  const r = pctRaw(e, get);
  return r && e.decimals === false ? num(Math.round(r.v)) : r;
}
function pctRaw(e, get) {
  const v = k => { const x = toNum(evalExpr(e[k], get)); return isNaN(x) ? null : x; };
  const m = e.mode || 'part';
  if (m === 'part') { const p = v('pct'), t = v('total'); return p == null || t == null ? null : num(p * t / 100); }
  if (m === 'pct') { const a = v('part'), t = v('total'); return a == null || t == null || t === 0 ? null : num(a / t * 100); }
  const a = v('part'), p = v('pct'); return a == null || p == null || p === 0 ? null : num(a * 100 / p);
}
const CMPS = [['=', '=', 'Igual que'], ['!', '≠', 'Diferente a'], ['<', '<', 'Menor que'], ['>', '>', 'Mayor que'], ['<=', '≤', 'Menor o igual que'], ['>=', '≥', 'Mayor o igual que']];
const LOGIC_SLOTS = { a: 'Dato A', b: 'Dato B', out: 'Salida', els: 'Si no' };
const QUOTE = /^(["'«“])([^]*)(["'»”])$/;
const interp = (t, get) => { const has = get.has || (() => true); return t.replace(new RegExp(PATH_RX + '|=([' + NAME_START + '][' + ID_CH + ']*)', 'g'), (m, n) => { const k = n || m; return has(k) ? fmt(get(k)) : m; }); };
function outVal(src, get) {
  const s = String(src || '').trim(); if (!s) return null;
  const q = s.length > 1 && QUOTE.exec(s); if (q) return { t: 'text', v: interp(q[2], get) };
  const v = evalExpr(s, get);
  if (v && v.t !== 'text') return v;
  if (!v) { const has = get.has || (() => true), paths = s.match(new RegExp(PATH_RX, 'g')) || [], names = s.replace(new RegExp(PATH_RX, 'g'), ' ').match(new RegExp('[' + NAME_START + '][' + ID_CH + ']*', 'g')) || []; if (paths.every(p => has(p)) && names.every(n => n === 'True' || n === 'False' || has(n))) return null; }
  return { t: 'text', v: interp(s, get) };
}
function hlOut(text, get) {
  const v = outVal(text, get); if (!v || v.t !== 'text') return hlExpr(text);
  const has = get.has || (() => true), out = [], re = new RegExp('(' + PATH_RX + ')|=([' + NAME_START + '][' + ID_CH + ']*)', 'g'); let last = 0, m;
  while ((m = re.exec(text))) { const k = m[1] || m[2]; if (!has(k)) continue; if (m.index > last) out.push({ text: text.slice(last, m.index), color: '#fff' }); if (m[1]) out.push(...pathSegs(m[1])); else out.push({ text: '=', color: '#fff' }, { text: m[2], color: '#008000' }); last = m.index + m[0].length; }
  if (last < text.length) out.push({ text: text.slice(last), color: '#fff' });
  return out;
}
const logicBranches = e => [{ id: 'main', a: e.a, cmp: e.cmp, b: e.b, out: e.out }].concat(e.alts || []);
function logicTest(e, get) {
  const a = outVal(e.a, get), b = outVal(e.b, get); if (!a || !b) return null;
  const c = e.cmp || '=', x = toNum(a), y = toNum(b);
  if (isNaN(x) || isNaN(y)) { if (c !== '=' && c !== '!') return null; const eq = fmt(a) === fmt(b); return c === '=' ? eq : !eq; }
  const eq = Math.abs(x - y) < 1e-9;
  return c === '=' ? eq : c === '!' ? !eq : c === '<' ? x < y && !eq : c === '>' ? x > y && !eq : c === '<=' ? x < y || eq : x > y || eq;
}
function logicEval(e, get) {
  const brs = logicBranches(e), anyOut = brs.some(b => (b.out || '').trim());
  for (const br of brs) {
    if (br.id !== 'main' && !(br.a || '').trim() && !(br.b || '').trim()) continue;
    const r = logicTest(br, get); if (r === null) return { val: null, hit: null };
    if (r) return { val: (br.out || '').trim() ? outVal(br.out, get) : bool(true), hit: br.id };
  }
  return { val: (e.els || '').trim() ? outVal(e.els, get) : anyOut ? num(0) : bool(false), hit: 'else' };
}
const logicOut = (e, get) => logicEval(e, get).val;
const NOVAL = t => t === 'sep' || t === 'text';
function notifInfo(e, get) {
  let t;
  if (e.mode === 'manual') { const ms = dateMs(e); if (isNaN(ms)) return null; t = dt(ms); }
  else { t = evalExpr(e.target, get); if (!t || t.t !== 'date') return null; }
  const range = t.end != null && t.end !== t.v, ref = range && e.ref === 'end' ? 'end' : 'start', tgt = ref === 'end' ? t.end : t.v;
  const n = k => Math.max(0, parseInt(e[k], 10) || 0), off = n('d') * 864e5 + n('h') * 36e5 + n('m') * 6e4;
  return { tgt, fire: tgt - off, off, range, ref };
}
function offTxt(e) { const n = k => Math.max(0, parseInt(e[k], 10) || 0), p = []; if (n('d')) p.push(n('d') + (n('d') === 1 ? ' día' : ' días')); if (n('h')) p.push(n('h') + ' h'); if (n('m')) p.push(n('m') + ' min'); return p.join(' '); }
const ENT_ICON = { notif: 'assets/campana.svg', text: 'assets/texto.svg', date: 'assets/lineas-de-calendario.svg', count: 'assets/reloj.svg', logic: 'assets/rama-de-codigo.svg', pct: 'assets/porcentaje.svg', expr: 'assets/entrada-numerica.svg', toggle: 'assets/boton-de-radio.svg', table: 'assets/lista-de-tablas.svg', slider: 'assets/agregar-barra.svg' };
const ENT_BASE = { notif: 'Aviso', date: 'Fecha', count: 'Contador', logic: 'Lógica', pct: 'Porcentaje', expr: 'Expresion', toggle: 'Interruptor', table: 'Tabla', slider: 'Deslizador' };
const OPS = [['sum', 'Sumar'], ['sub', 'Restar'], ['mul', 'Multiplicar'], ['div', 'Dividir']];
function newEnt(type, name, extra) {
  const e = { id: uid('e'), type, name, desc: 'Nombre descriptivo' };
  if (type === 'expr') e.expr = '';
  if (type === 'toggle') { e.on = false; e.expr = ''; }
  if (type === 'logic') { e.a = ''; e.cmp = '='; e.b = ''; e.out = ''; e.alts = []; e.els = ''; }
  if (type === 'pct') { e.mode = 'part'; e.pct = ''; e.total = ''; e.part = ''; e.decimals = true; }
  if (type === 'date') { e.date = ymd(new Date()); e.time = '09:00'; }
  if (type === 'count') { e.target = ''; e.unit = 'd'; }
  if (type === 'notif') { e.desc = 'Aviso'; e.mode = 'ent'; e.target = ''; e.ref = 'start'; e.date = ymd(new Date()); e.time = '09:00'; e.d = '1'; e.h = ''; e.m = ''; e.msg = ''; }
  if (type === 'slider') { e.value = 0; e.min = '0'; e.max = '100'; e.decimals = true; }
  if (type === 'table') { e.cols = [0, 1, 2].map(i => ({ id: uid('c'), title: 'Título', op: i === 2 ? 'sum' : null })); e.rows = [0, 1, 2].map(() => ({ id: uid('r'), cells: {} })); }
  return Object.assign(e, extra || {});
}
