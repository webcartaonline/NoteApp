// Página de Ajustes (componente componentes/ajustes/). Ocupa toda la pantalla, encima de la app: los menús a la
// izquierda, el contenido en el panel gris y, arriba a la derecha, las secciones del menú elegido.
// Se abre con el botón del engranaje de la barra lateral y se cierra con la X o con Esc.
//
// Menús hechos: Ayuda (js/app/ajustes-ayuda.js) y Actualizaciones (js/app/ajustes-actualizaciones.js).
// Sincronización, Seguridad y Personalización se ven en la lista, pero de momento muestran «Próximamente».
//
// CÓMO TERMINAR UN MENÚ (más adelante):
//   1. Pon listo: true en su entrada de AJ_MENUS y sus secciones en ajSecciones() (lista de [id, nombre]).
//   2. Crea su componente componentes/ajustes-<nombre>/ (y su archivo js/app/ajustes-<nombre>.js con sus valores)
//      y dibújalo en ajustes.html con un sc-if, como Ayuda y Actualizaciones.
//   3. Lo que haya que guardar va en state.config (se guarda solo, ver NA_KEEP).
//
// Estado temporal (no se guarda: no está en NA_KEEP):
//   state.ajustes = null (cerrada) o { menu, sec: { [menu]: sección }, vista: 'lista' | 'panel', ej, upd }
//   vista: en el móvil se ve una parte cada vez (lista de menús o contenido). ej: casillas marcadas en los
//   ejemplos de la Ayuda. upd: resultado de «Buscar actualizaciones».
const AJ_MENUS = [
  { id: 'ayuda', nombre: 'Ayuda', icono: 'ayuda', listo: true,
    desc: 'Guías de uso sobre el campo de texto MKD y las entidades' },
  { id: 'sinc', nombre: 'Sincronización', icono: 'sincronizacion',
    desc: 'Importa o exporta el contenido y gestiona la conexión con la carpeta local',
    pronto: 'Aquí podrás importar y exportar todo tu contenido y gestionar la carpeta donde se guarda. Mientras tanto, la carpeta se elige con su botón, abajo a la izquierda.' },
  { id: 'seguridad', nombre: 'Seguridad', icono: 'seguridad',
    desc: 'Establece una contraseña para acceder a la app, nota u hoja concreta',
    pronto: 'Aquí podrás poner una contraseña para entrar en NoteApp o para abrir una nota u hoja concreta.' },
  { id: 'personal', nombre: 'Personalización', icono: 'personalizacion',
    desc: 'Cambia la forma en la que se muestra NoteApp',
    pronto: 'Aquí podrás cambiar cómo se ve NoteApp.' },
  { id: 'act', nombre: 'Actualizaciones', icono: 'actualizaciones', listo: true,
    desc: 'Información de versión y revisión de actualizaciones' }
];
const AJ_ACT_SECS = [['version', 'Versión actual'], ['historial', 'Historial']];
const AJ_MOVIL = '(max-width: 699px)'; // mismo ancho que en ajustes.css
// Icono de un menú o de un tema (se usa como máscara CSS, igual que los demás iconos de assets/)
const ajMask = n => 'url(assets/' + n + '.svg) center / contain no-repeat';

NoteApp.partes.push(Base => class extends Base {
  ajScrollRef = React.createRef();
  // Secciones de cada menú, en orden: [[id, nombre], ...]
  ajSecciones(menu) {
    if (menu === 'ayuda') return AYUDA.map(x => [x.id, x.nombre]);
    if (menu === 'act') return AJ_ACT_SECS;
    return [];
  }
  // Sección visible del menú (la última elegida, o la primera)
  ajSecDe(a) {
    const secs = this.ajSecciones(a.menu), cur = a.sec && a.sec[a.menu];
    return secs.some(x => x[0] === cur) ? cur : secs.length ? secs[0][0] : null;
  }
  ajAbrir() {
    const ae = document.activeElement; if (ae && ae !== document.body && ae.blur) ae.blur();
    this._msel = null;
    const last = this._ajLast || { menu: 'ayuda', sec: {}, upd: null };
    this.setState({ ajustes: { menu: last.menu, sec: last.sec, vista: 'lista', ej: {}, upd: last.upd },
      focusId: null, menu: false, copyMenu: false, entMenu: null, colMenu: null }, () => this.ajArriba());
  }
  // Al cerrar se recuerda el menú y la sección (mientras la página siga abierta)
  ajCerrar() {
    const a = this.state.ajustes;
    if (a) this._ajLast = { menu: a.menu, sec: a.sec, upd: a.upd && a.upd.estado !== 'buscando' ? a.upd : null };
    this.setState({ ajustes: null });
  }
  ajMenu(id) {
    this.setState(s => s.ajustes ? { ajustes: { ...s.ajustes, menu: id, vista: 'panel' } } : null, () => this.ajArriba());
  }
  ajSec(id) {
    this.setState(s => s.ajustes ? { ajustes: { ...s.ajustes, sec: { ...s.ajustes.sec, [s.ajustes.menu]: id } } } : null, () => this.ajArriba());
  }
  // Vuelve arriba del panel (al cambiar de menú o de sección) y deja a la vista la sección elegida
  // (en pantallas estrechas las secciones se desplazan de lado)
  ajArriba() {
    const el = this.ajScrollRef.current; if (el) el.scrollTop = 0;
    const t = document.querySelector('.ajustes-seccion-on');
    if (t) try { t.scrollIntoView({ block: 'nearest', inline: 'nearest' }); } catch (_) {}
  }
  // Esc: en el móvil, del contenido vuelve a la lista de menús; si no, cierra
  ajEsc() {
    const a = this.state.ajustes; if (!a) return;
    const movil = window.matchMedia && window.matchMedia(AJ_MOVIL).matches;
    if (movil && a.vista === 'panel') this.setState({ ajustes: { ...a, vista: 'lista' } });
    else this.ajCerrar();
  }
  // Valores para las plantillas (se añaden en renderVals)
  ajVals(s) {
    const a = s.ajustes, v = { ajOn: !!a, ajAbrir: () => this.ajAbrir() };
    if (!a) return v;
    const menu = AJ_MENUS.find(m => m.id === a.menu) || AJ_MENUS[0], sec = this.ajSecDe(a);
    v.ajVista = 'ajustes-v-' + (a.vista === 'panel' ? 'panel' : 'lista');
    v.ajTitulo = menu.nombre;
    v.ajMenus = AJ_MENUS.map(m => ({ nombre: m.nombre, desc: m.desc, ic: ajMask(m.icono), cur: m.id === menu.id,
      cls: m.id === menu.id ? 'ajustes-item-on' : '', pick: () => this.ajMenu(m.id) }));
    v.ajSecs = this.ajSecciones(menu.id).map(([id, txt]) => ({ txt, on: id === sec, cls: id === sec ? 'ajustes-seccion-on' : '', pick: () => this.ajSec(id) }));
    v.ajCerrar = () => this.ajCerrar();
    v.ajVolver = () => this.setState(st => st.ajustes ? { ajustes: { ...st.ajustes, vista: 'lista' } } : null);
    v.ajScrollRef = this.ajScrollRef;
    v.ajEsAyuda = menu.id === 'ayuda';
    v.ajEsAct = menu.id === 'act';
    v.ajPronto = !menu.listo;
    v.ajProntoTxt = menu.pronto || '';
    v.ajProntoIc = ajMask(menu.icono);
    if (v.ajEsAyuda) Object.assign(v, this.ayudaVals(s, sec));
    if (v.ajEsAct) Object.assign(v, this.actVals(s, sec));
    return v;
  }
});
