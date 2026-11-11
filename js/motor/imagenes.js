// Imágenes pegadas en el texto MKD (Ctrl+V con una imagen en el portapapeles).
// El texto solo guarda una referencia corta, como cualquier imagen de Markdown:
//   ![Imagen](Imágenes/i<código>.webp)
// La imagen en sí se guarda aparte (así las notas no se llenan de letras y el navegador no se queda sin espacio):
//   1) Siempre en el navegador, en IndexedDB (base 'noteapp-imagenes', almacén 'i', clave = nombre del archivo).
//   2) Si hay una carpeta conectada, también como archivo en <carpeta>/Imágenes/<nombre> (fsSync en carpeta.js
//      copia las que falten). Así otro ordenador que abra la misma carpeta las ve.
// Al dibujar, imgSrc() cambia la referencia por la imagen guardada (primero el navegador, después la carpeta).
// Nunca se borran imágenes solas: si se quita la línea, el archivo sigue en la carpeta.
const IMG_DIR_NAME = 'Imágenes';
const IMG_REF_RX = /^Imágenes\/(i[a-z0-9]+\.(?:webp|png|jpe?g|gif))$/i;
const IMG_ALL_RX = /Imágenes\/(i[a-z0-9]+\.(?:webp|png|jpe?g|gif))/gi;
const IMG_MAX = 2000, IMG_Q = 0.85; // lado más largo (px) y calidad al comprimir
const IMG_WEBP = (() => { try { const c = document.createElement('canvas'); c.width = c.height = 1; return c.toDataURL('image/webp').indexOf('data:image/webp') === 0; } catch (_) { return false; } })();
const IMG_URLS = {}, IMG_STATE = {}; // nombre → dirección para dibujarla · nombre → 'cargando' | 'ok' | 'falta'
let IMG_FOLDER = null; // carpeta del espacio de trabajo abierto (la pone carpeta.js con imgFolder)
let IMG_ON = null;     // función de la app para volver a dibujar cuando termina de cargar una imagen
const imgSvg = (t, c) => 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="240" height="64"><rect width="240" height="64" rx="8" fill="#2a2a2a"/><text x="120" y="38" fill="' + c + '" font-family="sans-serif" font-size="14" text-anchor="middle">' + t + '<' + '/text><' + '/svg>');
const IMG_LOADING = imgSvg('Cargando imagen…', '#8a8a8a'), IMG_MISSING = imgSvg('Imagen no encontrada', '#b07a7a');
function imgIdb(mode, fn) {
  return new Promise((res, rej) => {
    const r = indexedDB.open('noteapp-imagenes', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('i');
    r.onerror = () => rej(r.error);
    r.onsuccess = () => { const db = r.result, tx = db.transaction('i', mode), q = fn(tx.objectStore('i')); tx.oncomplete = () => { db.close(); res(q && q.result); }; tx.onerror = tx.onabort = () => { db.close(); rej(tx.error); }; };
  });
}
const imgIdbGet = n => imgIdb('readonly', st => st.get(n)).catch(() => null);
const imgIdbPut = (n, b) => imgIdb('readwrite', st => st.put(b, n)).catch(() => {});
const imgRedraw = () => { if (IMG_ON) IMG_ON(); };
// Dirección para dibujar una imagen: las de NoteApp (Imágenes/…) salen de lo guardado; las demás, tal cual.
function imgSrc(u) {
  const m = IMG_REF_RX.exec(u || ''); if (!m) return u;
  const n = m[1];
  if (IMG_URLS[n]) return IMG_URLS[n];
  if (IMG_STATE[n] === 'falta') return IMG_MISSING;
  if (!IMG_STATE[n]) imgLoad(n);
  return IMG_LOADING;
}
async function imgLoad(n) {
  IMG_STATE[n] = 'cargando';
  let b = await imgIdbGet(n);
  if (!b && IMG_FOLDER) {
    try { const d = await IMG_FOLDER.getDirectoryHandle(IMG_DIR_NAME); b = await (await d.getFileHandle(n)).getFile(); if (b) imgIdbPut(n, b); } catch (_) { b = null; }
  }
  if (b) { IMG_URLS[n] = URL.createObjectURL(b); IMG_STATE[n] = 'ok'; } else IMG_STATE[n] = 'falta';
  imgRedraw();
}
// Carpeta conectada (o null). Las imágenes que no se encontraron se vuelven a buscar en ella.
function imgFolder(dir) {
  IMG_FOLDER = dir || null;
  let again = false; Object.keys(IMG_STATE).forEach(n => { if (IMG_STATE[n] === 'falta') { delete IMG_STATE[n]; again = true; } });
  if (again) imgRedraw();
}
// Hace la imagen más pequeña (como mucho IMG_MAX px de lado) y la comprime. Si no se puede leer, se guarda tal cual.
function imgShrink(file, ext) {
  return new Promise(res => {
    const url = URL.createObjectURL(file), im = new Image();
    im.onload = () => {
      try {
        const k = Math.min(1, IMG_MAX / Math.max(im.naturalWidth || 1, im.naturalHeight || 1));
        const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(im.naturalWidth * k)); c.height = Math.max(1, Math.round(im.naturalHeight * k));
        const g = c.getContext('2d');
        if (ext === 'jpg') { g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); } // el JPG no tiene transparencia
        g.drawImage(im, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
        c.toBlob(b => res(b || file), ext === 'webp' ? 'image/webp' : 'image/jpeg', IMG_Q);
      } catch (_) { URL.revokeObjectURL(url); res(file); }
    };
    im.onerror = () => { URL.revokeObjectURL(url); res(file); };
    im.src = url;
  });
}
// Imagen nueva pegada. Devuelve su nombre (para escribirlo ya en el texto) y una promesa que acaba cuando está guardada.
function imgNew(file) {
  const gif = /gif/i.test(file.type), keepPng = !IMG_WEBP && /png/i.test(file.type) && file.size < 1.5e6;
  const ext = gif ? 'gif' : IMG_WEBP ? 'webp' : keepPng ? 'png' : 'jpg'; // los GIF se guardan tal cual (para no perder la animación)
  const n = 'i' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7) + '.' + ext;
  IMG_URLS[n] = URL.createObjectURL(file); IMG_STATE[n] = 'ok'; // se ve al momento, mientras se guarda
  const ready = (gif || keepPng ? Promise.resolve(file) : imgShrink(file, ext)).then(async b => { await imgIdbPut(n, b); return n; });
  return { name: n, ready };
}
// Imágenes del portapapeles de un evento 'paste'.
function imgFiles(e) {
  const cd = e && (e.clipboardData || window.clipboardData); if (!cd) return [];
  const out = [];
  Array.from(cd.items || []).forEach(it => { if (it.kind === 'file' && /^image\//i.test(it.type)) { const f = it.getAsFile(); if (f) out.push(f); } });
  if (!out.length) Array.from(cd.files || []).forEach(f => { if (/^image\//i.test(f.type)) out.push(f); });
  return out;
}
// Texto de la línea de una imagen pegada.
const imgLine = n => '![Imagen](' + IMG_DIR_NAME + '/' + n + ')';
// Nombres de las imágenes que aparecen en un texto (p. ej. el JSON de una nota).
const imgNamesIn = (txt, set) => { for (const m of String(txt || '').matchAll(IMG_ALL_RX)) set.add(m[1]); return set; };
// Copia a <carpeta>/Imágenes las imágenes que falten. done = las que ya se sabe que están (no se vuelven a mirar).
async function imgSyncDir(dir, names, done) {
  if (!names.size) return;
  let d = null;
  for (const n of names) {
    if (done.has(n)) continue;
    if (!d) d = await dir.getDirectoryHandle(IMG_DIR_NAME, { create: true });
    try { await d.getFileHandle(n); done.add(n); continue; } catch (err) { if (!err || err.name !== 'NotFoundError') continue; }
    const b = await imgIdbGet(n); if (!b) continue; // aún no se ha guardado (o no está en este navegador)
    try { const fh = await d.getFileHandle(n, { create: true }), w = await fh.createWritable(); await w.write(b); await w.close(); done.add(n); } catch (_) {}
  }
}
// ===== Tamaño y recorte de una imagen =====
// Se guardan al final de la dirección, detrás de #, para que el texto siga siendo Markdown normal:
//   ![Imagen](Imágenes/iabc.webp#w=320&c=10,0,5,0)
//   w = ancho en píxeles de lo que se ve · c = recorte en % de la imagen: izquierda, arriba, derecha, abajo.
// Funciona con cualquier imagen (también https://…). Al exportar a Markdown se queda tal cual (los programas lo ignoran).
const IMG_DIMS = {}; // dirección ya resuelta → [ancho, alto] reales de la imagen (se apuntan al cargarla)
const IMG_FRAG_RX = /#((?:w|c)=[^#&]*(?:&(?:w|c)=[^#&]*)*)$/;
function imgParams(u) {
  u = String(u || ''); const m = IMG_FRAG_RX.exec(u), out = { base: m ? u.slice(0, m.index) : u, w: 0, c: [0, 0, 0, 0] };
  if (m) m[1].split('&').forEach(kv => {
    const k = kv[0], v = kv.slice(2);
    if (k === 'w') { const n = parseFloat(v); if (n > 0) out.w = Math.min(n, 5000); }
    else if (k === 'c') { const a = v.split(',').map(Number); if (a.length === 4 && a.every(n => isFinite(n) && n >= 0)) { const f = a.map(n => Math.min(n, 95) / 100); if (f[0] + f[2] < 0.97 && f[1] + f[3] < 0.97) out.c = f; } }
  });
  return out;
}
function imgUrlWith(base, w, c) {
  const parts = [];
  if (w > 0) parts.push('w=' + Math.round(w));
  if (c && c.some(x => x > 0.0005)) parts.push('c=' + c.map(x => +(x * 100).toFixed(1)).join(','));
  return base + (parts.length ? '#' + parts.join('&') : '');
}
// Al cargar una imagen se apuntan sus medidas reales (hacen falta para recortarla) y se vuelve a dibujar.
function imgDimsFrom(src, el) {
  if (!el || !el.naturalWidth || IMG_DIMS[src]) return;
  IMG_DIMS[src] = [el.naturalWidth, el.naturalHeight]; imgRedraw();
}
