// Espacios de trabajo (historial, copiar y mudar) y exportar / importar en un solo archivo.
// Funciones generales, sin interfaz: las usa js/app/ajustes-sinc.js (Ajustes › Sincronización).
// Se carga después de guardado.js e imagenes.js (usa fsIdb, fsWrite, fsRead, imgIdbGet…).

// ===== Historial de espacios de trabajo =====
// Cada carpeta que se ha abierto alguna vez en este navegador. Se guarda en IndexedDB (la misma base que recuerda la
// carpeta conectada, clave 'hist'), porque ahí se puede guardar el acceso a la carpeta. Cada espacio:
//   { id, dir (acceso a la carpeta), carpeta (nombre de la carpeta), titulo (lo pone el usuario),
//     ruta (la escribe el usuario: el navegador no deja ver la ruta real de una carpeta), ultima (cuándo se abrió) }
const HIST_MAX = 30;
const histGet = () => fsIdb('readonly', st => st.get('hist')).then(l => Array.isArray(l) ? l : []).catch(() => []);
const histSet = list => fsIdb('readwrite', st => st.put(list, 'hist')).catch(() => {});
async function histFind(list, dir) {
  for (const h of list) { try { if (h.dir && await h.dir.isSameEntry(dir)) return h; } catch (_) {} }
  return null;
}
// Apunta que se ha abierto (o creado) el espacio de trabajo de esa carpeta. Devuelve la lista nueva.
async function histTouch(list, dir) {
  const h = await histFind(list, dir), now = Date.now();
  if (h) return list.map(x => x === h ? { ...x, dir, carpeta: dir.name, ultima: now, falta: false } : x);
  const nuevo = { id: 'w' + now.toString(36) + Math.random().toString(36).slice(2, 6), dir, carpeta: dir.name, titulo: dir.name, ruta: '', ultima: now };
  return [nuevo].concat(list).slice(0, HIST_MAX);
}
// ¿Sigue existiendo la carpeta? (hace falta tener permiso para saberlo; si no se puede saber, se da por buena)
async function dirExists(dir) {
  try { for await (const _ of dir.keys()) break; return true; } catch (err) { return !(err && err.name === 'NotFoundError'); }
}
const fsSleep = ms => new Promise(r => setTimeout(r, ms));

// ===== Copiar y mudar un espacio de trabajo =====
// Escribe en una carpeta todo lo que hay abierto (igual que el guardado automático, pero entero y sin borrar nada).
// Devuelve los nombres de las imágenes que usan las notas.
async function fsWriteAll(dir, s, rev) {
  const secs = fsSections(s), imgs = new Set();
  const meta = { app: 'NoteApp', formato: 1, rev, config: s.config || {}, vista: { mode: s.mode, clean: s.clean, calView: s.calView || {}, lsel: s.lsel || {} } };
  for (const [key, folder] of FS_SECS) {
    const sec = secs[key], notes = (sec && sec.notes) || [];
    meta[key] = { activa: sec ? sec.activeNote : null, orden: notes.map(n => n.id) };
    const d = await dir.getDirectoryHandle(folder, { create: true });
    for (const n of notes) {
      const txt = JSON.stringify({ app: 'NoteApp', formato: 1, seccion: key, nota: n }, null, 2);
      imgNamesIn(txt, imgs); await fsWrite(d, fsFileName(n), txt);
    }
  }
  await fsWrite(dir, FS_META, JSON.stringify(meta, null, 2));
  return imgs;
}
const IMG_FILE_RX = /^i[a-z0-9]+\.(?:webp|png|jpe?g|gif)$/i;
// Busca una imagen guardada: primero en el navegador y después en la carpeta conectada.
async function imgBlob(n, dir) {
  let b = await imgIdbGet(n);
  if (!b && dir) { try { const d = await dir.getDirectoryHandle(IMG_DIR_NAME); b = await (await d.getFileHandle(n)).getFile(); } catch (_) { b = null; } }
  return b || null;
}
// Copia las imágenes a <dest>/Imágenes: las que usan las notas (names) y, si hay carpeta de origen, todas las de su
// carpeta Imágenes. Devuelve { hechas: nombres copiados, faltan: cuántas no se han podido copiar }.
async function fsCopyImgs(src, dest, names) {
  const all = new Set(names), hechas = new Set(); let sd = null, faltan = 0;
  if (src) { try { sd = await src.getDirectoryHandle(IMG_DIR_NAME); for await (const [n, h] of sd.entries()) if (h.kind === 'file' && IMG_FILE_RX.test(n)) all.add(n); } catch (_) { sd = null; } }
  if (!all.size) return { hechas, faltan };
  const dd = await dest.getDirectoryHandle(IMG_DIR_NAME, { create: true });
  for (const n of all) {
    let b = null;
    if (sd) { try { b = await (await sd.getFileHandle(n)).getFile(); } catch (_) { b = null; } }
    if (!b) b = await imgIdbGet(n);
    if (!b) { if (!names.has(n)) faltan++; continue; } // una imagen que ya no estaba en ningún sitio no cuenta como fallo
    try { const fh = await dd.getFileHandle(n, { create: true }), w = await fh.createWritable(); await w.write(b); await w.close(); hechas.add(n); } catch (_) { faltan++; }
  }
  return { hechas, faltan };
}
// Mudanza: borra de la carpeta anterior lo que es de NoteApp (NoteApp.json, los archivos de las notas y las imágenes
// que ya están copiadas). Lo que no es de NoteApp no se toca. Si la carpeta queda vacía, se borra también.
// Devuelve { vacia, borrada }.
async function fsCleanOld(old, imgs) {
  const limpiar = async (folder, vale) => {
    let d = null; try { d = await old.getDirectoryHandle(folder); } catch (_) { return; }
    const del = []; let rest = 0;
    for await (const [name, h] of d.entries()) { if (h.kind === 'file' && vale(name)) del.push(name); else rest++; }
    for (const name of del) { try { await d.removeEntry(name); } catch (_) { rest++; } }
    if (!rest) { try { await old.removeEntry(folder); } catch (_) {} }
  };
  for (const [, folder] of FS_SECS) await limpiar(folder, name => FS_FILE_RX.test(name));
  await limpiar(IMG_DIR_NAME, name => imgs.has(name));
  try { await old.removeEntry(FS_META); } catch (_) {}
  let quedan = 0; try { for await (const _ of old.keys()) quedan++; } catch (_) { quedan = -1; }
  let borrada = false;
  if (quedan === 0 && typeof old.remove === 'function') { try { await old.remove(); borrada = true; } catch (_) {} }
  return { vacia: quedan === 0, borrada };
}

// ===== Exportar: un solo archivo =====
// El archivo es un .json con todo lo elegido dentro (también las imágenes pegadas), para poder mandarlo de una vez:
//   { app: 'NoteApp', tipo: 'exportacion', formato: 1, version, fecha, contenido,
//     notas: [...], agenda: [...], diagrama: [...], imagenes: { 'iabc.webp': 'data:image/webp;base64,…' } }
// Solo lleva las ventanas que se exportan. sel = { w: 'todo' | 'notas' | 'agenda' | 'diagrama', id: una nota o null = todas }.
const EXP_TIPO = 'exportacion';
const EXP_UNA = { notas: 'Nota', agenda: 'Agenda', diagrama: 'Diagrama' }, EXP_TODAS = { notas: 'Notas', agenda: 'Agenda', diagrama: 'Diagramas' };
function expPick(s, sel) {
  const all = winsOf(s), out = {};
  WINS.forEach(k => { if (sel.w !== 'todo' && sel.w !== k) return; const list = all[k].notes || []; out[k] = sel.w !== 'todo' && sel.id ? list.filter(n => n.id === sel.id) : list; });
  return out;
}
const blobDataUrl = b => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = () => rej(r.error); r.readAsDataURL(b); });
function dataUrlBlob(u) {
  const m = /^data:([^;,]*)(;base64)?,([\s\S]*)$/.exec(String(u || '')); if (!m) return null;
  try { const bin = m[2] ? atob(m[3]) : decodeURIComponent(m[3]), a = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i); return new Blob([a], { type: m[1] || 'application/octet-stream' }); } catch (_) { return null; }
}
async function expBuild(s, sel, version) {
  const data = expPick(s, sel), imagenes = {};
  for (const n of imgNamesIn(JSON.stringify(data), new Set())) { const b = await imgBlob(n, IMG_FOLDER); if (b) { try { imagenes[n] = await blobDataUrl(b); } catch (_) {} } }
  return { app: 'NoteApp', tipo: EXP_TIPO, formato: 1, version, fecha: new Date().toISOString(), contenido: sel.w === 'todo' ? 'todo' : sel.id ? 'una' : sel.w, ...data, imagenes };
}
// Nombre del archivo: «NoteApp - Nota - Viajes.json», «NoteApp - Notas - 2026-11-15.json», «NoteApp - Todo - 2026-11-15.json»
function expName(s, sel) {
  const d = new Date(), hoy = d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
  let mid = 'Todo - ' + hoy;
  if (sel.w !== 'todo') {
    const n = sel.id && (winsOf(s)[sel.w].notes || []).find(x => x.id === sel.id);
    mid = n ? EXP_UNA[sel.w] + ' - ' + (String(n.name || '').trim() || 'Sin nombre') : EXP_TODAS[sel.w] + ' - ' + hoy;
  }
  return ('NoteApp - ' + mid).replace(/[\\/:*?"<>|\x00-\x1f]/g, '-').replace(/\s+/g, ' ').trim() + '.json';
}
function fileDownload(name, text, type) {
  const blob = new Blob([text], { type: type || 'application/json;charset=utf-8' }), url = URL.createObjectURL(blob), a = document.createElement('a');
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

// ===== Importar =====
// Lee un archivo exportado (o el archivo de una sola nota de una carpeta de NoteApp, Notas/<nota> (id).json).
// Devuelve { notas, agenda, diagrama, imagenes } o null si no es un archivo de NoteApp.
function impParse(txt) {
  let j; try { j = JSON.parse(txt); } catch (_) { return null; }
  if (!j || typeof j !== 'object' || j.app !== 'NoteApp') return null;
  const hoja = x => x && typeof x === 'object' && typeof x.id === 'string';
  const nota = n => n && typeof n === 'object' && typeof n.id === 'string' && Array.isArray(n.sheets) && n.sheets.every(hoja);
  const limpia = n => ({ ...n, name: String(n.name == null ? '' : n.name).slice(0, TAB_MAX), sheets: n.sheets.map(x => ({ ...x, name: String(x.name == null ? '' : x.name).slice(0, TAB_MAX), lines: Array.isArray(x.lines) ? x.lines : [], entities: Array.isArray(x.entities) ? x.entities : [] })) });
  const out = { notas: [], agenda: [], diagrama: [], imagenes: {} };
  if (j.tipo === EXP_TIPO) {
    WINS.forEach(k => { if (Array.isArray(j[k])) out[k] = j[k].filter(nota).map(limpia); });
    if (j.imagenes && typeof j.imagenes === 'object') for (const n in j.imagenes) if (IMG_FILE_RX.test(n) && typeof j.imagenes[n] === 'string') out.imagenes[n] = j.imagenes[n];
  } else if (j.nota && WINS.includes(j.seccion) && nota(j.nota)) out[j.seccion] = [limpia(j.nota)];
  else return null;
  return out;
}
// Da IDs nuevos a todo lo importado (notas, hojas, líneas, entidades, columnas, filas, conexiones…): los del archivo
// pueden estar ya usados aquí, porque cada espacio de trabajo numera por su cuenta. No toca los textos.
const IMP_TEXTO = new Set(['text', 'name', 'desc', 'title', 'label']);
function impReId(data) {
  const map = new Map(), rx = /^[a-z]\d+$/;
  const collect = v => {
    if (Array.isArray(v)) v.forEach(collect);
    else if (v && typeof v === 'object') { if (typeof v.id === 'string' && rx.test(v.id) && !map.has(v.id)) map.set(v.id, uid(v.id[0])); for (const k in v) collect(v[k]); }
  };
  collect(data);
  const walk = (v, key) => {
    if (typeof v === 'string') return IMP_TEXTO.has(key) ? v : map.get(v) || v;
    if (Array.isArray(v)) return v.map(x => walk(x, key));
    if (v && typeof v === 'object') { const o = {}; for (const k in v) o[map.get(k) || k] = walk(v[k], k); return o; }
    return v;
  };
  return walk(data, '');
}
// Nombre libre para una nota importada que se llama igual que otra: «Viajes» → «Viajes (2)», «Viajes (3)»…
// usados = nombres que ya existen (pasados por normN).
function impNombre(base, usados) {
  base = String(base || '').trim() || 'Sin nombre';
  for (let k = 2; ; k++) { const suf = ' (' + k + ')', nm = base.slice(0, TAB_MAX - suf.length).trimEnd() + suf; if (!usados.has(normN(nm))) return nm; }
}
// Cambia el nombre de una nota importada DENTRO de lo importado, poniendo al día las rutas que la mencionan
// (=/Viajes/Hoja/Entidad → =/Viajes (2)/Hoja/Entidad). data = { notas, agenda, diagrama }.
function impRenombrar(data, id, nombre) {
  const g = k => ({ notes: data[k] || [], activeNote: null });
  const tmp = { mode: 'notas', notes: g('notas').notes, activeNote: null, wins: { agenda: g('agenda'), diagrama: g('diagrama') } };
  const all = winsOf({ ...tmp, ...renameIn(tmp, renameFix(tmp, 'note', id, nombre)) }), out = { ...data };
  WINS.forEach(k => { out[k] = (all[k].notes || []).map(n => n.id === id ? { ...n, name: nombre } : n); });
  return out;
}
