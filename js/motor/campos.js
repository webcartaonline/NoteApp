// Varios campos de texto MKD en una misma hoja (solo en la ventana Notas; versión 5.0.0.0, 24/11/2026).
// Funciones generales (sin interfaz). La lógica de la ventana está en js/app/campos.js.
//
// Datos de cada hoja:
//   hoja.lines   = el campo principal, el de siempre (clave 'sheet'). Siempre es el primero, a la izquierda.
//   hoja.width   = ancho del campo principal.
//   hoja.campos  = los campos añadidos con el botón del círculo, de izquierda a derecha:
//     · campo nuevo:  { id: 'f…', lines: [{ id, text }], width }
//     · copia limpia: { id: 'f…', limpia: 'sheet' | 'f…' }   ← clave del campo que copia (su «fuente»). No tiene texto
//       propio: dibuja siempre el de su fuente, en vista limpia. Va siempre justo a la derecha de su fuente y mide lo
//       mismo que ella (usa el ancho de la fuente). Cada campo tiene como mucho una copia limpia.
//   hoja.full    = campo que ocupa todo el ancho (botón «Ocultar entidades»): true = el principal (como antes),
//                  'f…' = ese campo. Se ve ese campo y su copia limpia; el resto de campos y las entidades, no.
const CAMPO_MAIN = 'sheet';
const campoEsId = k => typeof k === 'string' && /^f\d+$/.test(k);
const camposDe = x => (x && Array.isArray(x.campos) ? x.campos : []);
const campoDe = (x, k) => camposDe(x).find(c => c.id === k) || null;
// Clave del campo cuyo texto se ve en k (una copia limpia enseña el de su fuente).
const campoFuente = (x, k) => { const c = campoDe(x, k); return c && c.limpia ? c.limpia : k; };
// Copia limpia de un campo (o null si no tiene).
const campoCopia = (x, k) => camposDe(x).find(c => c.limpia === k) || null;
// Líneas que se ven en el campo k (de la copia limpia, las de su fuente).
function campoLineas(x, k) {
  if (!x) return null;
  const f = campoFuente(x, k || CAMPO_MAIN);
  if (f === CAMPO_MAIN) return x.lines;
  const c = campoDe(x, f); return c ? (Array.isArray(c.lines) ? c.lines : []) : null;
}
// Hoja con las líneas del campo k cambiadas (en una copia limpia se cambian las de su fuente: p. ej. al marcar una casilla).
function campoPonLineas(x, k, lines) {
  const f = campoFuente(x, k || CAMPO_MAIN);
  if (f === CAMPO_MAIN) return { ...x, lines };
  return { ...x, campos: camposDe(x).map(c => c.id === f ? { ...c, lines } : c) };
}
// Ancho del campo k (la copia limpia mide lo mismo que su fuente).
function campoAncho(x, k) {
  const f = campoFuente(x, k || CAMPO_MAIN);
  if (f === CAMPO_MAIN) return (x && x.width) || W0;
  const c = campoDe(x, f); return (c && c.width) || W0;
}
// Número del campo para los nombres (principal = 1, los campos nuevos 2, 3…; la copia limpia lleva el de su fuente).
function campoNum(x, k) {
  const f = campoFuente(x, k || CAMPO_MAIN); if (f === CAMPO_MAIN) return 1;
  const i = camposDe(x).filter(c => !c.limpia).findIndex(c => c.id === f); return i < 0 ? 1 : i + 2;
}
// Listas de líneas de los campos nuevos (para las casillas-entidad, renombrar, etc.).
const camposLineas = x => camposDe(x).filter(c => !c.limpia && Array.isArray(c.lines)).map(c => c.lines);
// Clave del campo que ocupa todo el ancho (o null). true = el principal.
const campoFull = x => !x || !x.full ? null : x.full === true ? CAMPO_MAIN : (campoDe(x, x.full) ? x.full : null);
// Grupos que se dibujan: un campo suelto o un campo con su copia limpia pegada a la derecha.
// [{ src: clave, copia: clave | null }]
function campoGrupos(x) {
  const out = [{ src: CAMPO_MAIN, copia: null }];
  camposDe(x).forEach(c => { if (!c.limpia) out.push({ src: c.id, copia: null }); });
  camposDe(x).forEach(c => { if (!c.limpia) return; const g = out.find(o => o.src === c.limpia); if (g && !g.copia) g.copia = c.id; });
  return out;
}
// Ordena hoja.campos para que cada copia limpia quede justo detrás de su fuente (el orden de los campos nuevos no cambia).
function campoOrdena(campos) {
  const nuevos = campos.filter(c => !c.limpia), copias = campos.filter(c => c.limpia), out = [];
  const pon = k => { const cp = copias.find(c => c.limpia === k); if (cp && !out.includes(cp)) out.push(cp); };
  pon(CAMPO_MAIN);
  nuevos.forEach(c => { out.push(c); pon(c.id); });
  return out;
}
