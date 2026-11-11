// Menú Actualizaciones de la página de Ajustes (componente componentes/ajustes-actualizaciones/).
// · Versión actual: la primera versión de NA_NOVEDADES (js/app/novedades.js), su fecha y sus novedades, y el botón
//   «Buscar actualizaciones». A la izquierda, las novedades ordenadas por tipo (visual, estructural, corrección; ver
//   ACT_TIPOS), cada una con una raya de color por tipo (las de varios tipos salen una sola vez, con varias rayas y
//   sus etiquetas); a la derecha, la leyenda de los colores.
// · Historial: las versiones de NA_NOVEDADES con sus cambios (como mucho 5: la actual y 4 más, ver NOV_GUARDAR).
// Para comprobar si hay una versión nueva se descarga js/app/novedades.js del servidor (sin copias guardadas) y se
// compara su primera versión con la que se está usando. «Actualizar ahora» recarga la página: el service worker
// trae primero lo de internet, así que se carga la versión nueva (las notas no se tocan).
// Estado temporal: state.ajustes.upd = { estado: 'buscando' | 'ultima' | 'nueva' | 'sinred' | 'error', version, t }.
const actVerNum = v => String(v || '').split('.').map(n => parseInt(n, 10) || 0);
// ¿La versión a es más nueva que la b? ('1.10' es más nueva que '1.9')
function actMayor(a, b) {
  const x = actVerNum(a), y = actVerNum(b);
  for (let i = 0; i < Math.max(x.length, y.length); i++) { const d = (x[i] || 0) - (y[i] || 0); if (d) return d > 0; }
  return false;
}

// Tipos de novedad (campo «tipos» de cada punto de NA_NOVEDADES), en el orden de las cifras del número de versión.
// Cada uno tiene su color (clase ajustes-act-tipo-<id> en ajustes-actualizaciones.css).
const ACT_TIPOS = [
  { id: 'visual', nombre: 'Visual', grupo: 'Mejoras visuales', desc: 'Cambia lo que ves o la forma de usar la app.' },
  { id: 'estructural', nombre: 'Estructural', grupo: 'Mejoras estructurales', desc: 'Cambios por dentro: no se ven, pero hacen que todo funcione mejor.' },
  { id: 'correccion', nombre: 'Corrección', grupo: 'Correcciones', desc: 'Arreglos de cosas que no funcionaban bien.' }
];
// Tipos de un punto (en el orden de ACT_TIPOS). Admite tipos: 'visual' o tipos: ['visual', 'estructural'].
const actTiposDe = c => { const t = [].concat(c.tipos || []); return ACT_TIPOS.filter(x => t.includes(x.id)); };
// Lo que la plantilla necesita de cada punto: una raya de color por tipo y, si son varios, sus etiquetas.
function actCambio(c) {
  const ts = actTiposDe(c);
  return {
    titulo: c.titulo, texto: c.texto, varios: ts.length > 1, tieneTipo: ts.length > 0,
    rayas: ts.length ? ts.map(t => ({ cls: 'ajustes-act-tipo-' + t.id })) : [{ cls: 'ajustes-act-tipo-otros' }],
    chips: ts.map(t => ({ nombre: t.nombre, cls: 'ajustes-act-tipo-' + t.id }))
  };
}
// Lista de la versión actual: los puntos ordenados por tipo (primero los visuales, después los estructurales, las
// correcciones, los de varios tipos a la vez y, al final, los que no tienen tipo). Cada punto sale una sola vez.
function actOrdenados(cambios) {
  const orden = c => { const ts = actTiposDe(c); return !ts.length ? 9 : ts.length > 1 ? 5 : ACT_TIPOS.indexOf(ts[0]); };
  return cambios.map((c, i) => ({ c, i, o: orden(c) })).sort((x, y) => x.o - y.o || x.i - y.i).map(x => actCambio(x.c));
}
// Leyenda de la derecha: cada tipo con su color, qué significa y cuántas novedades de la versión lo tienen
// (una novedad de varios tipos cuenta en cada uno de ellos).
function actLeyenda(cambios) {
  return ACT_TIPOS.map(t => {
    const n = cambios.filter(c => actTiposDe(c).some(x => x.id === t.id)).length;
    return { nombre: t.grupo, desc: t.desc, cls: 'ajustes-act-tipo-' + t.id, cuantos: n, apagado: n ? '' : 'ajustes-act-leyenda-apagado' };
  });
}

NoteApp.partes.push(Base => class extends Base {
  actBuscar() {
    const set = upd => this.setState(s => s.ajustes ? { ajustes: { ...s.ajustes, upd } } : null);
    if (navigator.onLine === false) return set({ estado: 'sinred', t: Date.now() });
    set({ estado: 'buscando' });
    // De paso, que el navegador revise también el service worker
    try { if (navigator.serviceWorker) navigator.serviceWorker.getRegistration().then(r => r && r.update()).catch(() => {}); } catch (_) {}
    const t0 = Date.now(), fin = upd => setTimeout(() => set({ ...upd, t: Date.now() }), Math.max(0, 700 - (Date.now() - t0)));
    const actual = NA_NOVEDADES[0] ? NA_NOVEDADES[0].version : '0';
    fetch('js/app/novedades.js', { cache: 'no-store' })
      .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); })
      .then(txt => {
        const m = /version:\s*['"]([^'"]+)['"]/.exec(txt);
        if (!m) throw new Error('No se encuentra la versión');
        fin(actMayor(m[1], actual) ? { estado: 'nueva', version: m[1] } : { estado: 'ultima' });
      })
      .catch(() => fin({ estado: navigator.onLine === false ? 'sinred' : 'error' }));
  }
  // Valores para la plantilla del componente ajustes-actualizaciones (se añaden en ajVals, js/app/ajustes.js)
  actVals(s, sec) {
    const u = (s.ajustes && s.ajustes.upd) || null, est = u ? u.estado : null;
    const cur = NA_NOVEDADES[0] || { version: '—', fecha: '', cambios: [] };
    const hora = u && u.t ? new Date(u.t).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : '';
    const v = { actEsVersion: sec !== 'historial', actEsHistorial: sec === 'historial' };
    v.actNum = cur.version;
    v.actFecha = cur.fecha ? 'Publicada el ' + cur.fecha : '';
    v.actLista = actOrdenados(cur.cambios);
    v.actLeyenda = actLeyenda(cur.cambios);
    v.actBuscando = est === 'buscando';
    v.actHayNueva = est === 'nueva';
    v.actBotonTxt = est === 'buscando' ? 'Buscando…' : est ? 'Volver a buscar' : 'Buscar actualizaciones';
    v.actBuscarCls = est ? '' : 'ajustes-act-boton-verde';
    v.actBuscar = () => this.actBuscar();
    v.actRecargar = () => { try { location.reload(); } catch (_) {} };
    const E = {
      buscando: ['ajustes-act-estado-buscando', 'Comprobando si hay una versión más nueva…'],
      ultima: ['ajustes-act-estado-ok', 'Tienes la última versión (comprobado a las ' + hora + ').'],
      nueva: ['ajustes-act-estado-nueva', 'Hay una versión nueva: la ' + (u && u.version) + '. Pulsa «Actualizar ahora» para cargarla; tus notas no se tocan.'],
      sinred: ['ajustes-act-estado-aviso', 'No hay conexión a internet, así que no se ha podido comprobar.'],
      error: ['ajustes-act-estado-aviso', 'No se ha podido comprobar ahora. Inténtalo dentro de un rato.']
    }[est] || ['', 'Pulsa «Buscar actualizaciones» para comprobar si ha salido una versión más nueva.'];
    v.actEstadoCls = E[0];
    v.actEstadoTxt = E[1];
    v.actVersiones = NA_NOVEDADES.map((n, i) => ({
      nombre: 'Versión ' + n.version, fecha: n.fecha, actual: i === 0, cls: i === 0 ? 'ajustes-act-hito-marca-actual' : '',
      cuantos: n.cambios.length + (n.cambios.length === 1 ? ' novedad' : ' novedades'),
      cambios: n.cambios.map(actCambio)
    }));
    return v;
  }
});
