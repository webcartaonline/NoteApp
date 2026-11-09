// Menú Actualizaciones de la página de Ajustes (componente componentes/ajustes-actualizaciones/).
// · Versión actual: la primera versión de NA_NOVEDADES (js/app/novedades.js), su fecha y sus novedades, y el botón
//   «Buscar actualizaciones».
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
    v.actCambios = cur.cambios.map(c => ({ titulo: c.titulo, texto: c.texto }));
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
      cambios: n.cambios.map(c => ({ titulo: c.titulo, texto: c.texto }))
    }));
    return v;
  }
});
