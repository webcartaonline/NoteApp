// Renombrar: actualiza todo lo que apunta a la entidad, nota u hoja renombrada.
// ===== Renombrar: actualiza todo lo que apunta a la entidad, nota u hoja renombrada =====
// Campos de cada entidad que son fórmulas (los nombres pueden ir sin =).
const EXPR_KEYS = { expr: ['expr'], toggle: ['expr'], slider: ['min', 'max'], pct: ['part', 'total', 'pct'], count: ['target'], notif: ['target'], logic: ['a', 'b', 'out', 'els'] };
// Índice para saber a qué entidad apunta cada referencia (mismas reglas que makeWorld).
function refIndex(s) {
  const entries = [], bySheet = new Map();
  [['c', s.notes], ['o', s.other.notes]].forEach(([w, list]) => list.forEach(n => n.sheets.forEach(x => {
    const add = (id, name) => { const en = { id, name, w, sid: x.id, nid: n.id, note: normN(n.name), sheet: normN(x.name) }; entries.push(en); let m = bySheet.get(x.id); if (!m) bySheet.set(x.id, m = new Map()); if (!m.has(name)) m.set(name, en); };
    (x.entities || []).forEach(e => { if (!NOVAL(e.type)) add(e.id, e.name); });
    sheetFlags(x).forEach(f => add('f:' + x.id + ':' + f.name, f.name)); // casillas-entidad del texto
  })));
  return (ref, sid, w) => {
    if (isPath(ref)) { const p = ref.slice(2).split('/').map(normN); if (p.length !== 3) return null; const hits = entries.filter(x => x.note === p[0] && x.sheet === p[1] && x.name.toLowerCase() === p[2]); return hits.find(x => x.w === w) || hits[0] || null; }
    const m = bySheet.get(sid); return (m && m.get(ref)) || null;
  };
}
// fix(ref, idHoja, ventana) devuelve la referencia nueva (nombre sin = o ruta con =) o null si no cambia.
function renameIn(s, fix) {
  const NAME = '[' + NAME_START + '][' + ID_CH + ']*', put = (nn, eq) => isPath(nn) ? nn : eq + nn;
  const inText = (t, sid, w) => {
    const sc = mdScan(t, 0, t.length); let out = '', last = 0;
    sc.atoms.forEach(at => { if (at.kind !== 'ent') return; const nn = fix(at.name, sid, w); if (nn == null) return; out += t.slice(last, at.s) + put(nn, '='); last = at.e; });
    return last ? out + t.slice(last) : t;
  };
  const inExpr = (t, sid, w) => {
    const tt = t.trim(); if (!tt) return t;
    if (tt.length > 1 && QUOTE.test(tt)) return t.replace(new RegExp(PATH_RX + '|=(' + NAME + ')', 'g'), (m, n) => { const nn = fix(n || m, sid, w); return nn == null ? m : put(nn, '='); });
    return t.replace(new RegExp('(' + PATH_RX + ')|(=?)(' + NAME + ')|\\d+(?:[.,]\\d+)?', 'g'), (m, pa, eq, n) => { if (!pa && !n) return m; const nn = fix(pa || n, sid, w); return nn == null ? m : put(nn, eq || ''); });
  };
  const inCell = (t, sid, w) => {
    const tt = String(t || '').trim(), r = new RegExp('^=(' + NAME + ')$').exec(tt), pa = new RegExp('^' + PATH_RX + '$').test(tt) ? tt : null;
    if (!r && !pa) return t; const nn = fix(pa || r[1], sid, w); return nn == null ? t : put(nn, '=');
  };
  const doLines = (lines, sid, w) => {
    const bi = blockInfo(lines); let ch = false;
    const o = lines.map((l, i) => { if (bi[i] && bi[i].kind === 'code') return l; const t = inText(String(l.text || ''), sid, w); if (t === l.text) return l; ch = true; return { ...l, text: t }; });
    return ch ? o : lines;
  };
  const doEnt = (e, sid, w) => {
    let ne = e; const set = (k, v) => { if (v === ne[k]) return; if (ne === e) ne = { ...e }; ne[k] = v; };
    if (e.type === 'text' && Array.isArray(e.lines)) set('lines', doLines(e.lines, sid, w));
    (EXPR_KEYS[e.type] || []).forEach(k => { if (typeof e[k] === 'string') set(k, inExpr(e[k], sid, w)); });
    if (e.type === 'logic' && Array.isArray(e.alts)) { let ch = false; const alts = e.alts.map(a => { let na = a; ['a', 'b', 'out'].forEach(k => { if (typeof a[k] !== 'string') return; const v = inExpr(a[k], sid, w); if (v !== na[k]) { if (na === a) na = { ...a }; na[k] = v; } }); if (na !== a) ch = true; return na; }); if (ch) set('alts', alts); }
    if (e.type === 'table' && Array.isArray(e.rows)) { let ch = false; const rows = e.rows.map(r => { let nc = null; for (const k in (r.cells || {})) { const v = inCell(r.cells[k], sid, w); if (v !== r.cells[k]) { nc = nc || { ...r.cells }; nc[k] = v; } } if (!nc) return r; ch = true; return { ...r, cells: nc }; }); if (ch) set('rows', rows); }
    return ne;
  };
  const doWin = (list, w) => list.map(n => {
    let chN = false;
    const sheets = n.sheets.map(x => {
      const lines = Array.isArray(x.lines) ? doLines(x.lines, x.id, w) : x.lines;
      let chE = false; const ents = (x.entities || []).map(e => { const ne = doEnt(e, x.id, w); if (ne !== e) chE = true; return ne; });
      if (lines === x.lines && !chE) return x; chN = true; return { ...x, lines, entities: chE ? ents : x.entities };
    });
    return chN ? { ...n, sheets } : n;
  });
  return { notes: doWin(s.notes, 'c'), other: { ...s.other, notes: doWin(s.other.notes, 'o') } };
}
// Crea la función fix para cada tipo de cambio de nombre.
function renameFix(before, kind, id, v) {
  const R = refIndex(before), badSeg = /[\/=\n]/.test(v);
  return (ref, sid, w) => {
    const en = R(ref, sid, w); if (!en) return null;
    if (kind === 'ent') { if (en.id !== id) return null; if (!isPath(ref)) return v; const p = ref.slice(2).split('/'); p[2] = v; return '=/' + p.join('/'); }
    if (!isPath(ref) || badSeg) return null;
    const k = kind === 'note' ? 0 : 1; if ((kind === 'note' ? en.nid : en.sid) !== id) return null;
    const p = ref.slice(2).split('/'); p[k] = v; return '=/' + p.join('/');
  };
}
