// Guardado de datos: navegador (localStorage) y carpeta del ordenador (archivos JSON).
// ¡Cuidado! Cambiar NA_KEY o el formato haría que no se encuentren los datos guardados.
// ===== Guardado =====
// 1) Siempre en el navegador (localStorage).
// 2) Además, si se conecta una carpeta del ordenador (Chrome/Edge), en archivos JSON:
//    NoteApp.json (configuración, vista y orden), Notas/<nota> (id).json, Agenda/<nota> (id).json y Diagramas/<diagrama> (id).json
// Se guarda todo: notas y agenda (hojas, textos, entidades y sus ajustes), la vista y la configuración (state.config).
const NA_KEY = 'noteapp:datos:v1';
const NA_KEEP = ['notes', 'activeNote', 'wins', 'mode', 'clean', 'calView', 'lsel', 'config'];
let NA_REV = 0;
const naMaxId = obj => { let mx = 0; JSON.stringify(obj).replace(/"[a-z](\d+)"/g, (m, n) => { mx = Math.max(mx, +n); return m; }); return mx; };
function naLoad(base) {
  try {
    const raw = localStorage.getItem(NA_KEY); if (!raw) return base;
    const d = JSON.parse(raw);
    if (!d || !Array.isArray(d.notes)) return base;
    // Datos de antes de la ventana Diagrama: la ventana oculta estaba en "other" (Notas o Agenda).
    if (!d.wins && d.other && Array.isArray(d.other.notes)) d.wins = { [d.mode === 'agenda' ? 'notas' : 'agenda']: d.other };
    if (!d.wins || typeof d.wins !== 'object') return base;
    if (!WINS.includes(d.mode)) d.mode = 'notas';
    _uid = Math.max(_uid, naMaxId(d));
    // Ventanas que falten en los datos guardados (p. ej. Diagrama la primera vez): se crea la de ejemplo
    // (después de subir _uid, para que sus IDs no se repitan con los de los datos guardados).
    WINS.forEach(k => { if (k !== d.mode && !(d.wins[k] && Array.isArray(d.wins[k].notes))) d.wins[k] = typeof naEjemplo === 'function' ? naEjemplo(k) : WIN_EMPTY(); });
    NA_REV = +d.rev || 0;
    const out = { ...base }; NA_KEEP.forEach(k => { if (d[k] !== undefined && d[k] !== null) out[k] = d[k]; });
    if (!out.notes.some(n => n.id === out.activeNote)) out.activeNote = out.notes.length ? out.notes[0].id : null;
    const all = winsOf(out), mig = !(d.config && d.config.mkdV2);
    WINS.forEach(k => { all[k] = { ...all[k], notes: refMigDeep(mig ? mkdMigNotes(all[k].notes) : all[k].notes) }; });
    if (mig) out.config = { ...(d.config || {}), mkdV2: true };
    delete out.other;
    return { ...out, ...winPatch(all, out.mode) };
  } catch (_) { return base; }
}
function naSave(s, rev) {
  try { const d = { rev: rev || 0 }; NA_KEEP.forEach(k => { d[k] = s[k]; }); localStorage.setItem(NA_KEY, JSON.stringify(d)); } catch (_) {}
}
const FS_OK = typeof window.showDirectoryPicker === 'function';
const FS_META = 'NoteApp.json', FS_SECS = [['notas', 'Notas'], ['agenda', 'Agenda'], ['diagrama', 'Diagramas']];
const FS_FILE_RX = /\(([a-z]\d+)\)\.json$/;
function fsIdb(mode, fn) {
  return new Promise((res, rej) => {
    const r = indexedDB.open('noteapp-carpeta', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('h');
    r.onerror = () => rej(r.error);
    r.onsuccess = () => { const db = r.result, tx = db.transaction('h', mode), q = fn(tx.objectStore('h')); tx.oncomplete = () => { db.close(); res(q && q.result); }; tx.onerror = tx.onabort = () => { db.close(); rej(tx.error); }; };
  });
}
const fsGetHandle = () => fsIdb('readonly', st => st.get('dir')).catch(() => null);
const fsSetHandle = h => fsIdb('readwrite', st => h ? st.put(h, 'dir') : st.delete('dir')).catch(() => {});
const fsFileName = n => (String(n.name || '').replace(/[\\/:*?"<>|\x00-\x1f]/g, '_').replace(/\s+/g, ' ').trim().slice(0, 40) || 'Nota') + ' (' + n.id + ').json';
async function fsReadText(dir, name) { const fh = await dir.getFileHandle(name); return (await fh.getFile()).text(); }
async function fsWrite(dir, name, text) { const fh = await dir.getFileHandle(name, { create: true }); const w = await fh.createWritable(); await w.write(text); await w.close(); }
const fsSections = s => winsOf(s);
async function fsRead(dir) {
  let meta; try { meta = JSON.parse(await fsReadText(dir, FS_META)); } catch (_) { return null; }
  if (!meta || meta.app !== 'NoteApp') return null;
  const out = { meta };
  for (const [key, folder] of FS_SECS) {
    const list = [];
    let d = null; try { d = await dir.getDirectoryHandle(folder); } catch (_) {}
    if (!d && !meta[key]) { out[key] = null; continue; } // sección que aún no existía (p. ej. Diagramas): no se toca
    if (d) for await (const [name, h] of d.entries()) {
      if (h.kind !== 'file' || !name.endsWith('.json')) continue;
      try { const j = JSON.parse(await (await h.getFile()).text()), n = j && j.nota; if (n && typeof n.id === 'string' && Array.isArray(n.sheets)) list.push(n); } catch (_) {}
    }
    const ord = (meta[key] && meta[key].orden) || [], pos = id => { const i = ord.indexOf(id); return i < 0 ? 1e9 : i; };
    list.sort((x, y) => pos(x.id) - pos(y.id));
    out[key] = list;
  }
  return out;
}
