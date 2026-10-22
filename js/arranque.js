// Arranque de NoteApp.
// 1) Prepara NoteApp.partes, donde cada archivo de js/app/ añade su parte de la lógica.
// 2) Descarga las plantillas de los componentes (carpeta componentes/).
// 3) Se las entrega al motor (support.js) y después carga el motor, que dibuja la app.
// Si añades un componente nuevo: crea componentes/<nombre>/<nombre>.html (+ .css), añádelo a COMPONENTES,
// enlaza su .css en index.html y añade sus archivos a la lista APP de sw.js.
(function () {
  const COMPONENTES = [
    'cabecera',
    'barra-lateral',
    'barra-hojas',
    'hoja-vacia',
    'panel-texto',
    'lineas',
    'entidad-separador',
    'entidad-cabecera',
    'entidad-texto',
    'entidad-aviso',
    'entidad-expresion',
    'entidad-interruptor',
    'entidad-deslizador',
    'entidad-porcentaje',
    'entidad-logica',
    'entidad-calendario',
    'entidad-contador',
    'entidad-tabla',
    'entidades',
    'mensajes'
  ];
  const ruta = n => 'componentes/' + n + '/' + n + '.html';

  // Une todas las partes de la lógica (js/app/*.js) en un solo componente, en el orden en que se cargan.
  window.NoteApp = {
    partes: [],
    crearComponente(Base) { return this.partes.reduce((B, parte) => parte(B), Base); }
  };

  const paginaLista = new Promise(ok => {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ok, { once: true });
    else ok();
  });
  const plantillas = {};
  const descargas = COMPONENTES.map(n => fetch(ruta(n))
    .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); })
    .then(t => { plantillas[n] = t; })
    .catch(err => console.error('[NoteApp] No se pudo cargar el componente «' + n + '»:', err)));

  // Lo que hay entre <x-dc> y </x-dc>
  const plantillaDe = t => {
    const a = /<x-dc(?:\s[^>]*)?>/.exec(t), b = t.lastIndexOf('</x-dc>');
    return a && b > a.index ? t.slice(a.index + a[0].length, b) : null;
  };

  Promise.all([paginaLista].concat(descargas)).then(() => {
    // El motor busca cada componente en "./<nombre>.dc.html": se lo damos ya descargado.
    const blobs = window.__resourceBlobs = window.__resourceBlobs || {};
    for (const n in plantillas) blobs['./' + n + '.dc.html'] = new Blob([plantillas[n]], { type: 'text/html' });
    // En cuanto el motor crea la raíz (#dc-root), y antes de dibujar, registramos las plantillas
    // para que toda la app aparezca a la vez (sin huecos mientras cargan los componentes).
    const obs = new MutationObserver(() => {
      if (!document.getElementById('dc-root') || typeof window.__dcUpdate !== 'function') return;
      obs.disconnect();
      for (const n in plantillas) {
        const tpl = plantillaDe(plantillas[n]);
        if (tpl) window.__dcUpdate(n, 'html', tpl, false);
      }
    });
    obs.observe(document.body, { childList: true, subtree: true });
    const s = document.createElement('script');
    s.src = 'support.js';
    document.head.appendChild(s);
  });
})();
