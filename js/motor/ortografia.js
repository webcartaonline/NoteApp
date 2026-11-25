// Corrector ortográfico: qué palabras de una línea hay que revisar (sin interfaz). Ver AGENTS.md → «Corrector ortográfico».
// La revisión de verdad la hace el diccionario de español (Hunspell, el mismo de LibreOffice y Firefox) dentro de un
// Web Worker (js/ortografia-worker.js + diccionario/es.aff y es.dic); la parte de la app está en js/app/ortografia.js.
//
// Qué NO se revisa (para que no salgan falsos errores):
//   · código (`x`, bloques de código y celdas de código), lo copiable ('x', bloques '' y celdas copiables: suelen ser
//     comandos, códigos o datos literales), enlaces (su texto ya va subrayado en verde) e imágenes, casillas y
//     menciones (=Nombre);
//   · palabras con números, guion bajo, @, /, \, :, =, #… (p. ej. mi_archivo, 2ª, correo@web.com, archivo.js);
//   · siglas en mayúsculas (IVA, PK) y palabras con mayúsculas por dentro (NoteApp, iPhone);
//   · palabras de una sola letra.

// Máscara de una línea: 1 = esa posición no se revisa (código, copiables, enlaces, imágenes, casillas, menciones).
// bk = bloque de la línea (blockInfo): en una fila de tabla, las celdas de código (``x``) y copiables ('x') tampoco.
function ortoMascara(text, bk) {
  const n = text.length, m = new Uint8Array(n);
  const sc = mdScan(text, 0, n, true);
  for (let i = 0; i < n; i++) if (sc.cat[i] === 3) m[i] = 1; // código de una frase
  // Enlaces (texto y dirección: el texto ya va subrayado en verde y suele ser un nombre), copiables en la frase,
  // imágenes, casillas y menciones.
  // Casilla con nombre ([True] Nombre): el nombre de la entidad tampoco.
  sc.atoms.forEach(at => { const s0 = at.grp && at.name ? at.ps : at.s, e0 = at.grp && at.name ? at.pe + 1 : at.e; for (let q = s0; q < e0; q++) m[q] = 1; });
  if (bk && bk.kind === 'trow' && bk.cells) bk.cells.forEach(c => {
    if (!c) return;
    let ci = null; try { ci = mdCellInfo(text, c); } catch (_) {}
    if (ci && (ci.kind === 'code' || ci.kind === 'copy')) for (let q = c.s; q < c.e; q++) m[q] = 1;
  });
  return m;
}

// Separadores de trozos: espacios y signos que nunca van dentro de una palabra.
const ORTO_TROZO = /[^\s\[\](){}<>|"«»“”]+/g;
// Si el trozo (sin los signos de los bordes) tiene alguno de estos signos, es un nombre técnico: no se revisa.
const ORTO_TECNICO = /[\d_@\/\\:=#&%$+^]|[\p{L}\p{N}]\.[\p{L}\p{N}]/u;
const ORTO_BORDE = /[\p{L}\p{M}\p{N}]/u;
const ORTO_PALABRA = /[\p{L}\p{M}]+/gu;
// Palabras de una línea que hay que revisar: [{ s, e, w }] (posiciones en el texto de la línea, tal cual está escrito).
function ortoPalabras(text, mask) {
  const out = []; let m;
  const re = new RegExp(ORTO_TROZO.source, 'g');
  while ((m = re.exec(text))) {
    let s = m.index, e = s + m[0].length;
    while (s < e && !ORTO_BORDE.test(text[s])) s++;
    while (e > s && !ORTO_BORDE.test(text[e - 1])) e--;
    if (s >= e) continue;
    const core = text.slice(s, e);
    if (ORTO_TECNICO.test(core)) continue;
    const rw = new RegExp(ORTO_PALABRA.source, 'gu'); let w;
    while ((w = rw.exec(core))) {
      const word = w[0], ws = s + w.index, we = ws + word.length;
      if (word.length < 2) continue;
      if (word === word.toUpperCase()) continue; // siglas: IVA, PK
      if (/\p{Lu}/u.test(word.slice(1))) continue; // NoteApp, iPhone
      if (mask) { let tapada = false; for (let q = ws; q < we; q++) if (mask[q]) { tapada = true; break; } if (tapada) continue; }
      out.push({ s: ws, e: we, w: word.normalize('NFC') });
    }
  }
  return out;
}

// Palabras de una línea, recordadas por su texto (se dibujan muchas veces seguidas sin cambiar).
const ORTO_LINEAS = new Map();
function ortoPalabrasDe(text, bk) {
  const k = (bk && bk.kind === 'trow' ? 'T' : 'P') + text;
  let r = ORTO_LINEAS.get(k);
  if (!r) {
    if (ORTO_LINEAS.size > 4000) ORTO_LINEAS.clear();
    r = ortoPalabras(text, ortoMascara(text, bk));
    ORTO_LINEAS.set(k, r);
  }
  return r;
}

// Diccionario propio (Ajustes › Ortografía › Mi diccionario): palabras guardadas en state.config.ortoDicc.
// Se comparan sin distinguir mayúsculas: añadir «Espinardo» también acepta «espinardo».
const ortoClave = w => String(w || '').normalize('NFC').toLowerCase();
