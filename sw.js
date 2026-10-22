// Service worker de NoteApp: permite instalar la app y abrirla sin conexión.
// Siempre intenta cargar la versión más reciente; la copia guardada solo se usa sin conexión.
// Si añades o quitas archivos de la app, actualiza la lista APP y sube el número de VERSION.
const VERSION = 'noteapp-v3';
const APP = [
  '/',
  '/index.html',
  '/support.js',
  '/manifest.webmanifest',
  '/assets/agregar-activo.svg',
  '/assets/agregar-barra.svg',
  '/assets/ajustes.svg',
  '/assets/angulo-pequeno-derecho.svg',
  '/assets/boton-de-radio.svg',
  '/assets/campana.svg',
  '/assets/carpeta.svg',
  '/assets/cita-cuadrada-off.svg',
  '/assets/cita-cuadrada.svg',
  '/assets/clon.svg',
  '/assets/convertir-documento.svg',
  '/assets/entrada-numerica.svg',
  '/assets/funcion.svg',
  '/assets/lineas-de-calendario.svg',
  '/assets/lista-de-rectangulos.svg',
  '/assets/lista-de-tablas.svg',
  '/assets/papelera.svg',
  '/assets/porcentaje.svg',
  '/assets/rama-de-codigo.svg',
  '/assets/reloj.svg',
  '/assets/texto-grande.svg',
  '/assets/texto.svg',
  '/icons/apple-touch-icon.png',
  '/icons/favicon-32.png',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-maskable-512.png',
  '/icons/icon.svg'
];
// Librerías externas que usa la app (se guardan para poder abrirla sin internet).
const EXTERNAS = [
  'https://unpkg.com/react@18.3.1/umd/react.production.min.js',
  'https://unpkg.com/react-dom@18.3.1/umd/react-dom.production.min.js'
];

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(VERSION);
    await c.addAll(APP);
    await Promise.all(EXTERNAS.map(u => c.add(u).catch(() => {})));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== VERSION) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Archivos de la propia app: primero internet (para ver siempre la última versión); si no hay, la copia guardada.
  if (url.origin === location.origin) {
    e.respondWith((async () => {
      const c = await caches.open(VERSION);
      try {
        const res = await fetch(req);
        if (res.ok) c.put(req, res.clone());
        return res;
      } catch (_) {
        return (await c.match(req, { ignoreSearch: true })) || (req.mode === 'navigate' ? c.match('/index.html') : Response.error());
      }
    })());
    return;
  }
  // Librerías y tipografías externas: primero la copia guardada; si no existe, se descarga y se guarda.
  if (/^(unpkg\.com|fonts\.googleapis\.com|fonts\.gstatic\.com)$/.test(url.hostname)) {
    e.respondWith((async () => {
      const c = await caches.open(VERSION);
      const hit = await c.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok || res.type === 'opaque') c.put(req, res.clone());
      return res;
    })());
  }
});
