// Formas de los diagramas (ventana Diagrama): tipos, tamaños, colores, dibujo y puntos de unión de las conexiones.
// Funciones generales, sin interfaz. La lógica de la ventana está en js/app/diagrama.js.
//
// Forma (se guarda en hoja.entities):  { id, type: 'node', shape, x, y, w, h, color, lines: [{ id, text }] }
// Conexión (se guarda en hoja.edges): { id, from, to, label, dash, head }   head: 'end' | 'both' | 'none'
// Vista de la hoja (hoja.view):       { x, y, z }  (desplazamiento y zoom del lienzo)
const DG_GRID = 10, DG_ZMIN = 0.25, DG_ZMAX = 2.5;
const DG_SHAPES = {
  proceso:  { label: 'Proceso',      w: 180, h: 70,  color: 'gris' },
  decision: { label: 'Decisión',     w: 200, h: 120, color: 'azul' },
  inicio:   { label: 'Inicio / fin', w: 170, h: 56,  color: 'verde' },
  dato:     { label: 'Dato',         w: 190, h: 70,  color: 'morado' },
  nota:     { label: 'Nota',         w: 220, h: 130, color: 'amarillo' },
  texto:    { label: 'Texto libre',  w: 220, h: 40,  color: 'gris' },
  zona:     { label: 'Zona',         w: 460, h: 320, color: 'gris' }
};
// [relleno, borde] de cada color
const DG_COLORS = {
  gris:     ['#2a2a2a', '#6a6a6a'],
  verde:    ['#0d260f', '#008000'],
  azul:     ['#0f1f33', '#3d7cc9'],
  amarillo: ['#2b2510', '#c9a227'],
  rojo:     ['#2d1414', '#b84a4a'],
  morado:   ['#24152e', '#9a5cc6']
};
const DG_COLOR_ORDER = ['gris', 'verde', 'azul', 'amarillo', 'rojo', 'morado'];
const DG_COLOR_NAME = { gris: 'Gris', verde: 'Verde', azul: 'Azul', amarillo: 'Amarillo', rojo: 'Rojo', morado: 'Morado' };
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
    mx: (p1.x + p2.x) / 2, my: (p1.y + p2.y) / 2
  };
}
// Copia de una forma con IDs nuevos (para duplicar)
const dgCopyNode = (n, dx, dy) => ({ ...n, id: uid('e'), x: n.x + dx, y: n.y + dy, lines: (n.lines || []).map(l => ({ id: uid('l'), text: l.text })) });
