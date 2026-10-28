// Service worker de NoteApp: permite instalar la app y abrirla sin conexión.
// Siempre intenta cargar la versión más reciente; la copia guardada solo se usa sin conexión.
// Si añades o quitas archivos de la app, actualiza la lista APP y sube el número de VERSION.
const VERSION = 'noteapp-v9';
const APP = [
  '/',
  '/index.html',
  '/support.js',
  '/manifest.webmanifest',
  '/css/base.css',
  '/css/app.css',
  '/js/arranque.js',
  '/js/motor/ventanas.js',
  '/js/motor/menciones.js',
  '/js/motor/formulas.js',
  '/js/motor/mkd.js',
  '/js/motor/renombrar.js',
  '/js/motor/ids.js',
  '/js/motor/formas.js',
  '/js/motor/guardado.js',
  '/js/app/estado-inicial.js',
  '/js/app/base.js',
  '/js/app/carpeta.js',
  '/js/app/avisos.js',
  '/js/app/entidades.js',
  '/js/app/vista-entidades.js',
  '/js/app/pestanas.js',
  '/js/app/busqueda.js',
  '/js/app/exportar.js',
  '/js/app/seleccion.js',
  '/js/app/confirmar.js',
  '/js/app/lineas.js',
  '/js/app/diagrama.js',
  '/js/app/render.js',
  '/componentes/cabecera/cabecera.html',
  '/componentes/cabecera/cabecera.css',
  '/componentes/barra-lateral/barra-lateral.html',
  '/componentes/barra-lateral/barra-lateral.css',
  '/componentes/barra-hojas/barra-hojas.html',
  '/componentes/barra-hojas/barra-hojas.css',
  '/componentes/hoja-vacia/hoja-vacia.html',
  '/componentes/hoja-vacia/hoja-vacia.css',
  '/componentes/panel-texto/panel-texto.html',
  '/componentes/panel-texto/panel-texto.css',
  '/componentes/lineas/lineas.html',
  '/componentes/lineas/lineas.css',
  '/componentes/entidad-separador/entidad-separador.html',
  '/componentes/entidad-separador/entidad-separador.css',
  '/componentes/entidad-cabecera/entidad-cabecera.html',
  '/componentes/entidad-cabecera/entidad-cabecera.css',
  '/componentes/entidad-texto/entidad-texto.html',
  '/componentes/entidad-texto/entidad-texto.css',
  '/componentes/entidad-aviso/entidad-aviso.html',
  '/componentes/entidad-aviso/entidad-aviso.css',
  '/componentes/entidad-expresion/entidad-expresion.html',
  '/componentes/entidad-expresion/entidad-expresion.css',
  '/componentes/entidad-interruptor/entidad-interruptor.html',
  '/componentes/entidad-interruptor/entidad-interruptor.css',
  '/componentes/entidad-deslizador/entidad-deslizador.html',
  '/componentes/entidad-deslizador/entidad-deslizador.css',
  '/componentes/entidad-porcentaje/entidad-porcentaje.html',
  '/componentes/entidad-porcentaje/entidad-porcentaje.css',
  '/componentes/entidad-logica/entidad-logica.html',
  '/componentes/entidad-logica/entidad-logica.css',
  '/componentes/entidad-calendario/entidad-calendario.html',
  '/componentes/entidad-calendario/entidad-calendario.css',
  '/componentes/entidad-contador/entidad-contador.html',
  '/componentes/entidad-contador/entidad-contador.css',
  '/componentes/entidad-tabla/entidad-tabla.html',
  '/componentes/entidad-tabla/entidad-tabla.css',
  '/componentes/entidades/entidades.html',
  '/componentes/entidades/entidades.css',
  '/componentes/mensajes/mensajes.html',
  '/componentes/mensajes/mensajes.css',
  '/componentes/confirmar/confirmar.html',
  '/componentes/confirmar/confirmar.css',
  '/componentes/diagrama/diagrama.html',
  '/componentes/diagrama/diagrama.css',
  '/assets/agregar-activo.svg',
  '/assets/ancho-completo.svg',
  '/assets/buscar.svg',
  '/assets/exportar.svg',
  '/assets/diagrama.svg',
  '/assets/forma-proceso.svg',
  '/assets/forma-decision.svg',
  '/assets/forma-inicio.svg',
  '/assets/forma-dato.svg',
  '/assets/forma-nota.svg',
  '/assets/forma-texto.svg',
  '/assets/forma-zona.svg',
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
