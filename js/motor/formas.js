// Formas de los diagramas (ventana Diagrama): tipos, tamaños, colores, dibujo y puntos de unión de las conexiones.
// Funciones generales, sin interfaz. La lógica de la ventana está en js/app/diagrama.js.
//
// Forma (se guarda en hoja.entities):  { id, type: 'node', shape, x, y, w, h, color, lines: [{ id, text }] }
// Tabla de un diagrama entidad-relación (también es una forma, shape 'tabla'; ver «Tablas» más abajo):
//   { id, type: 'node', shape: 'tabla', x, y, w, h, color, title, sub, rows: [{ id, k, name, note }], lines: [] }
// Conexión (se guarda en hoja.edges): { id, from, to, label, dash, head, route, c1, c2 }   head: 'end' | 'both' | 'none'
//   route: 'codo' = línea en ángulo recto (si falta, recta) · c1 / c2 = cuántos en el origen y en el destino ('1', 'N' o nada)
// Vista de la hoja (hoja.view):       { x, y, z }  (desplazamiento y zoom del lienzo)
const DG_GRID = 10, DG_ZMIN = 0.25, DG_ZMAX = 2.5;
const DG_SHAPES = {
  proceso:  { label: 'Proceso',      w: 180, h: 70,  color: 'gris' },
  decision: { label: 'Decisión',     w: 200, h: 120, color: 'azul' },
  inicio:   { label: 'Inicio / fin', w: 170, h: 56,  color: 'verde' },
  dato:     { label: 'Dato',         w: 190, h: 70,  color: 'morado' },
  nota:     { label: 'Nota',         w: 220, h: 130, color: 'amarillo' },
  texto:    { label: 'Texto libre',  w: 220, h: 40,  color: 'gris' },
  zona:     { label: 'Zona',         w: 460, h: 320, color: 'gris' },
  tabla:    { label: 'Tabla',        w: 340, h: 102, color: 'azul' }
};
// [relleno, borde] de cada color
const DG_COLORS = {
  gris:     ['#2a2a2a', '#6a6a6a'],
  verde:    ['#0d260f', '#008000'],
  azul:     ['#0f1f33', '#3d7cc9'],
  amarillo: ['#2b2510', '#c9a227'],
  rojo:     ['#2d1414', '#b84a4a'],
  morado:   ['#24152e', '#9a5cc6'],
  blanco:   ['#2e2e2e', '#e6e6e6']
};
const DG_COLOR_ORDER = ['gris', 'verde', 'azul', 'amarillo', 'rojo', 'morado', 'blanco'];
const DG_COLOR_NAME = { gris: 'Gris', verde: 'Verde', azul: 'Azul', amarillo: 'Amarillo', rojo: 'Rojo', morado: 'Morado', blanco: 'Blanco' };
const dgSnap = v => Math.round(v / DG_GRID) * DG_GRID;
const dgClampZ = z => Math.min(DG_ZMAX, Math.max(DG_ZMIN, z));
const dgSkew = n => Math.min(24, n.w * 0.14); // inclinación de la forma "Dato"
// Hoja nueva de un diagrama
const mkDiagSheet = (name, nodes, edges) => ({ id: uid('s'), name, lines: [], width: W0, entities: nodes || [], edges: edges || [], view: { x: 40, y: 40, z: 1 } });
// Forma nueva (texto: lista de líneas o texto con saltos de línea)
function dgNode(shape, x, y, text, extra) {
  const d = DG_SHAPES[shape] || DG_SHAPES.proceso;
  const lines = mkLines(Array.isArray(text) ? text : String(text || '').split('\n'));
  return Object.assign({ id: uid('e'), type: 'node', shape: DG_SHAPES[shape] ? shape : 'proceso', x, y, w: d.w, h: d.h, color: d.color, lines }, extra || {});
}
// ===== Tablas (diagramas entidad-relación) =====
// Una tabla es una forma con cabecera de color (nombre y descripción) y una lista de campos. Cada campo (fila):
//   k = clave: '' | 'PK' (primaria) | 'FK' (foránea) | 'PKFK' (primaria y foránea) | 'UQ' (único)
//   name = nombre del campo · note = valores permitidos, en pequeño debajo (p. ej. «mañana · tarde»)
// El alto no lo elige el usuario: sale de sus campos (dgTablaH). Estas medidas son las mismas que en diagrama.css.
const DG_TABLA = { head: 56, row: 26, note: 16, padT: 9, padB: 11, minW: 220, editW: 420 };
// Color de la cabecera: [fondo, nombre, descripción]
const DG_TABLA_COLORS = {
  gris:     ['#3a3a3a', '#ffffff', '#d6d6d6'],
  verde:    ['#17803a', '#ffffff', '#e2f5e7'],
  azul:     ['#1d4fb0', '#ffffff', '#e3ecff'],
  amarillo: ['#9a7410', '#ffffff', '#fbf0cf'],
  rojo:     ['#a13a3a', '#ffffff', '#fbe3e3'],
  morado:   ['#7446a6', '#ffffff', '#efe3fb'],
  blanco:   ['#ffffff', '#12305f', '#2f4f85']
};
// Resaltar con asteriscos: en el nombre de un campo y en sus valores, *texto* se ve en verde (sin los asteriscos)
// mientras no se está editando la tabla. Sirve para marcar a ojo lo importante, por ejemplo el nombre de la tabla a la
// que apunta una clave foránea: *role*_id. Para ver un asterisco tal cual se escribe \*. Devuelve los trozos del texto:
// [{ t: trozo, on: true si va en verde }]
const DG_MARK_RX = /\\\*|\*([^*\n]+)\*/g;
function dgMarks(txt) {
  const t = String(txt == null ? '' : txt), out = []; let last = 0, m;
  DG_MARK_RX.lastIndex = 0;
  while ((m = DG_MARK_RX.exec(t))) {
    if (m.index > last) out.push({ t: t.slice(last, m.index), on: false });
    out.push(m[1] != null ? { t: m[1], on: true } : { t: '*', on: false });
    last = m.index + m[0].length;
  }
  if (last < t.length || !out.length) out.push({ t: t.slice(last), on: false });
  return out;
}
const DG_KEYS = ['', 'PK', 'FK', 'PKFK', 'UQ'];
const DG_KEY_NAME = { '': 'Sin clave', PK: 'Clave primaria: identifica cada fila', FK: 'Clave foránea: apunta a otra tabla', PKFK: 'Clave primaria que además apunta a otra tabla', UQ: 'Único: no se puede repetir' };
const DG_CARD = ['', '1', 'N']; // cuántos en cada extremo de una relación
const dgRow = (name, k, note) => ({ id: uid('r'), k: DG_KEYS.includes(k) ? k : '', name: name || '', note: note || '' });
const dgTablaH = n => DG_TABLA.head + DG_TABLA.padT + (n.rows || []).reduce((a, r) => a + DG_TABLA.row + (r.note ? DG_TABLA.note : 0), 0) + DG_TABLA.padB;
// Tabla nueva. rows: lista de campos ya hechos (dgRow) o nada (empieza con un campo «id» como clave primaria).
function dgTabla(x, y, extra) {
  const n = Object.assign({ id: uid('e'), type: 'node', shape: 'tabla', x, y, w: DG_SHAPES.tabla.w, h: 0, color: DG_SHAPES.tabla.color, title: '', sub: '', rows: null, lines: [] }, extra || {});
  if (!Array.isArray(n.rows)) n.rows = [dgRow('id', 'PK')];
  n.h = dgTablaH(n); return n;
}
const dgEdge = (from, to, extra) => Object.assign({ id: uid('a'), from, to, label: '', dash: false, head: 'end' }, extra || {});
// Dibujo de la forma (SVG, en píxeles de la propia forma). d = contorno; d2 = detalle (esquina doblada de la nota).
function dgPath(n) {
  const w = n.w, h = n.h, a = 1, W = w - 1, H = h - 1, f = (x, y) => x.toFixed(1) + ',' + y.toFixed(1);
  const rr = r => { r = Math.max(0, Math.min(r, w / 2 - 1, h / 2 - 1)); return 'M' + f(a + r, a) + ' H' + (W - r).toFixed(1) + ' A' + r + ',' + r + ' 0 0 1 ' + f(W, a + r) + ' V' + (H - r).toFixed(1) + ' A' + r + ',' + r + ' 0 0 1 ' + f(W - r, H) + ' H' + (a + r).toFixed(1) + ' A' + r + ',' + r + ' 0 0 1 ' + f(a, H - r) + ' V' + (a + r).toFixed(1) + ' A' + r + ',' + r + ' 0 0 1 ' + f(a + r, a) + ' Z'; };
  switch (n.shape) {
    case 'decision': return { d: 'M' + f(w / 2, a) + ' L' + f(W, h / 2) + ' L' + f(w / 2, H) + ' L' + f(a, h / 2) + ' Z', d2: '' };
    case 'inicio': return { d: rr(h / 2), d2: '' };
    case 'dato': { const k = dgSkew(n); return { d: 'M' + f(a + k, a) + ' L' + f(W, a) + ' L' + f(W - k, H) + ' L' + f(a, H) + ' Z', d2: '' }; }
    case 'nota': { const c = Math.min(18, w / 4, h / 4); return { d: 'M' + f(a, a) + ' H' + (W - c).toFixed(1) + ' L' + f(W, a + c) + ' V' + H.toFixed(1) + ' H' + a + ' Z', d2: 'M' + f(W - c, a) + ' V' + (a + c).toFixed(1) + ' H' + W.toFixed(1) }; }
    case 'zona': return { d: rr(14), d2: '' };
    default: return { d: rr(10), d2: '' };
  }
}
// Margen interior del texto de cada forma [arriba, derecha, abajo, izquierda]
function dgPad(n) {
  switch (n.shape) {
    case 'decision': return [Math.round(n.h * 0.2), Math.round(n.w * 0.22), Math.round(n.h * 0.2), Math.round(n.w * 0.22)];
    case 'dato': { const k = Math.round(dgSkew(n)); return [10, k + 10, 10, k + 10]; }
    case 'inicio': return [8, 22, 8, 22];
    case 'nota': return [12, 20, 12, 14];
    case 'texto': return [6, 6, 6, 6];
    case 'zona': return [10, 16, 10, 16];
    default: return [10, 14, 10, 14];
  }
}
// ¿El punto (px, py) está dentro de la forma?
function dgInside(n, px, py) {
  const lx = px - n.x, ly = py - n.y, dx = Math.abs(lx - n.w / 2), dy = Math.abs(ly - n.h / 2);
  switch (n.shape) {
    case 'decision': return dx / (n.w / 2) + dy / (n.h / 2) <= 1;
    case 'inicio': { const r = n.h / 2, e = n.w / 2 - r; if (dx <= e) return dy <= r; return (dx - e) * (dx - e) + dy * dy <= r * r; }
    case 'dato': { if (ly < 0 || ly > n.h) return false; const k = dgSkew(n); return lx >= k * (1 - ly / n.h) && lx <= n.w - k * ly / n.h; }
    default: return dx <= n.w / 2 && dy <= n.h / 2;
  }
}
// Punto del borde de la forma en dirección a (tx, ty): ahí empieza o acaba la flecha.
function dgAnchor(n, tx, ty) {
  const cx = n.x + n.w / 2, cy = n.y + n.h / 2, dx = tx - cx, dy = ty - cy, L = Math.hypot(dx, dy);
  if (L < 1) return { x: cx, y: cy };
  const far = (n.w + n.h) / L; let lo = 0, hi = far;
  for (let i = 0; i < 22; i++) { const m = (lo + hi) / 2; if (dgInside(n, cx + dx * m, cy + dy * m)) lo = m; else hi = m; }
  return { x: cx + dx * lo, y: cy + dy * lo };
}
// Geometría de una conexión entre dos formas: línea, puntas de flecha y punto medio (para la etiqueta).
function dgEdgeGeo(a, b, k) {
  const ac = { x: a.x + a.w / 2, y: a.y + a.h / 2 }, bc = { x: b.x + b.w / 2, y: b.y + b.h / 2 };
  const p1 = dgAnchor(a, bc.x, bc.y), p2 = dgAnchor(b, ac.x, ac.y);
  const L = Math.hypot(p2.x - p1.x, p2.y - p1.y) || 1, ux = (p2.x - p1.x) / L, uy = (p2.y - p1.y) / L;
  const AL = 11, AW = 5.5, f = v => v.toFixed(1);
  const head = (p, sx, sy) => { const bx = p.x - sx * AL, by = p.y - sy * AL; return 'M' + f(p.x) + ',' + f(p.y) + ' L' + f(bx - sy * AW) + ',' + f(by + sx * AW) + ' L' + f(bx + sy * AW) + ',' + f(by - sx * AW) + ' Z'; };
  const end = k.head !== 'none', start = k.head === 'both';
  const q1 = start ? { x: p1.x + ux * (AL - 2), y: p1.y + uy * (AL - 2) } : p1, q2 = end ? { x: p2.x - ux * (AL - 2), y: p2.y - uy * (AL - 2) } : p2;
  return {
    d: 'M' + f(q1.x) + ',' + f(q1.y) + ' L' + f(q2.x) + ',' + f(q2.y),
    hit: 'M' + f(p1.x) + ',' + f(p1.y) + ' L' + f(p2.x) + ',' + f(p2.y),
    heads: (end ? head(p2, ux, uy) : '') + (start ? ' ' + head(p1, -ux, -uy) : ''),
    mx: (p1.x + p2.x) / 2, my: (p1.y + p2.y) / 2,
    e1: { x: p1.x, y: p1.y, dx: ux, dy: uy }, e2: { x: p2.x, y: p2.y, dx: -ux, dy: -uy } // extremos y hacia dónde sale la línea
  };
}
// ===== Conexiones en ángulo (route: 'codo') =====
// Geometría de TODAS las conexiones de una hoja: Map(idConexión → { d, hit, heads, mx, my, e1, e2 }).
// Las rectas se calculan como siempre (dgEdgeGeo). Las que van en ángulo salen de un lado de la forma y entran por el
// lado de enfrente de la otra, con uno o tres tramos rectos (vertical-horizontal-vertical o al revés). Si varias
// conexiones usan el mismo lado de una forma, se reparten a lo largo de ese lado para que no se monten.
function dgRoutes(byId, edges) {
  const out = new Map(), GAP = 24, M = 18, plan = [], groups = new Map();
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const rango = (n, v) => { const a = v ? n.x : n.y, l = v ? n.w : n.h, m = Math.min(M, l / 2); return [a + m, a + l - m]; };
  (edges || []).forEach(k => {
    const a = byId.get(k.from), b = byId.get(k.to); if (!a || !b) return;
    if (k.route !== 'codo') { out.set(k.id, dgEdgeGeo(a, b, k)); return; }
    const gx = Math.max(b.x - (a.x + a.w), a.x - (b.x + b.w)), gy = Math.max(b.y - (a.y + a.h), a.y - (b.y + b.h));
    const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
    // v = sale por arriba o por abajo (true) o por un lado (false). Si las formas se pisan, se dibuja recta.
    let v;
    if (gy > 0 && (ox >= 2 * M || gy >= gx)) v = true; else if (gx > 0) v = false; else if (gy > 0) v = true; else { out.set(k.id, dgEdgeGeo(a, b, k)); return; }
    const fwd = v ? b.y >= a.y + a.h : b.x >= a.x + a.w; // la otra forma está debajo (o a la derecha)
    const ra = rango(a, v), rb = rango(b, v), lo = Math.max(ra[0], rb[0]), hi = Math.min(ra[1], rb[1]);
    const ca = v ? a.x + a.w / 2 : a.y + a.h / 2, cb = v ? b.x + b.w / 2 : b.y + b.h / 2;
    const pa = lo <= hi ? (lo + hi) / 2 : clamp(cb, ra[0], ra[1]), pb = lo <= hi ? (lo + hi) / 2 : clamp(ca, rb[0], rb[1]);
    const p = { k, a, b, v, fwd, pa, pb }; plan.push(p);
    const add = (n, lado, end, pos, sort, r) => { const key = n.id + '|' + lado; let g = groups.get(key); if (!g) groups.set(key, g = []); g.push({ p, end, pos, sort, lo: r[0], hi: r[1] }); };
    add(a, (v ? 'v' : 'h') + (fwd ? '+' : '-'), 'pa', pa, cb, ra);
    add(b, (v ? 'v' : 'h') + (fwd ? '-' : '+'), 'pb', pb, ca, rb);
  });
  // Reparto por cada lado: en el orden en que están las otras formas, con un hueco mínimo entre líneas
  groups.forEach(g => {
    if (g.length > 1) {
      g.sort((x, y) => x.sort - y.sort || x.pos - y.pos);
      const lo = g[0].lo, hi = g[0].hi, n = g.length;
      for (let i = 1; i < n; i++) g[i].pos = Math.max(g[i].pos, g[i - 1].pos + GAP);
      g[n - 1].pos = Math.min(g[n - 1].pos, hi);
      for (let i = n - 2; i >= 0; i--) g[i].pos = Math.min(g[i].pos, g[i + 1].pos - GAP);
      if (g[0].pos < lo) g.forEach((x, i) => { x.pos = lo + (hi - lo) * (i + 0.5) / n; }); // no caben con ese hueco: a partes iguales
    }
    g.forEach(x => { x.p[x.end] = x.pos; });
  });
  const AL = 11, AW = 5.5, f = q => q.toFixed(1);
  plan.forEach(({ k, a, b, v, fwd, pa, pb }) => {
    // s1 / s2: coordenada del borde por el que sale de «a» y por el que entra en «b»
    const s1 = v ? (fwd ? a.y + a.h : a.y) : (fwd ? a.x + a.w : a.x), s2 = v ? (fwd ? b.y : b.y + b.h) : (fwd ? b.x : b.x + b.w), mid = (s1 + s2) / 2;
    const P = (along, across) => v ? { x: along, y: across } : { x: across, y: along };
    let pts = Math.abs(pa - pb) < 0.5 ? [P(pa, s1), P(pa, s2)] : [P(pa, s1), P(pa, mid), P(pb, mid), P(pb, s2)];
    const sg = fwd ? 1 : -1, d1 = v ? { dx: 0, dy: sg } : { dx: sg, dy: 0 }, d2 = { dx: -d1.dx, dy: -d1.dy };
    const p1 = pts[0], p2 = pts[pts.length - 1], end = k.head !== 'none', start = k.head === 'both';
    const head = (p, sx, sy) => { const bx = p.x - sx * AL, by = p.y - sy * AL; return 'M' + f(p.x) + ',' + f(p.y) + ' L' + f(bx - sy * AW) + ',' + f(by + sx * AW) + ' L' + f(bx + sy * AW) + ',' + f(by - sx * AW) + ' Z'; };
    const path = list => list.map((q, i) => (i ? 'L' : 'M') + f(q.x) + ',' + f(q.y)).join(' ');
    const draw = pts.slice();
    if (start) draw[0] = { x: p1.x + d1.dx * (AL - 2), y: p1.y + d1.dy * (AL - 2) };
    if (end) draw[draw.length - 1] = { x: p2.x + d2.dx * (AL - 2), y: p2.y + d2.dy * (AL - 2) };
    const m1 = pts.length === 4 ? pts[1] : p1, m2 = pts.length === 4 ? pts[2] : p2;
    out.set(k.id, { d: path(draw), hit: path(pts), heads: (end ? head(p2, -d2.dx, -d2.dy) : '') + (start ? ' ' + head(p1, -d1.dx, -d1.dy) : ''),
      mx: (m1.x + m2.x) / 2, my: (m1.y + m2.y) / 2, e1: { x: p1.x, y: p1.y, ...d1 }, e2: { x: p2.x, y: p2.y, ...d2 } });
  });
  return out;
}
// Dónde se escribe el «1» o la «N» de un extremo: junto a la forma y a un lado de la línea, para que no la tape.
function dgCardPos(e) {
  if (Math.abs(e.dx) < 0.01) return { x: e.x + 13, y: e.y + e.dy * 15 };   // línea vertical: a su derecha
  if (Math.abs(e.dy) < 0.01) return { x: e.x + e.dx * 15, y: e.y - 13 };   // línea horizontal: encima
  return { x: e.x + e.dx * 20 + e.dy * 12, y: e.y + e.dy * 20 - e.dx * 12 }; // línea inclinada
}
// Copia de una forma con IDs nuevos (para duplicar)
const dgCopyNode = (n, dx, dy) => {
  const c = { ...n, id: uid('e'), x: n.x + dx, y: n.y + dy, lines: (n.lines || []).map(l => ({ id: uid('l'), text: l.text })) };
  if (Array.isArray(n.rows)) c.rows = n.rows.map(r => ({ ...r, id: uid('r') })); // campos de una tabla
  return c;
};
