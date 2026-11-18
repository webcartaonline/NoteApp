// Lista de entidades (componente componentes/lista-entidades/). Se abre en las tres ventanas con el botón de la lista de la
// barra de hojas, a la derecha del interruptor de vista limpia/sucia (18/11/2026; antes estaba a la izquierda del buscador
// del texto y solo en Notas). En Notas va a la izquierda del texto MKD, en Agenda a la izquierda de las entidades y en
// Diagrama flota encima del lienzo (index.html). Sirve para consultar rápido el nombre, la descripción, el valor y la
// ruta de cualquier entidad sin ir a buscarla.
//   · Tres botones de filtro (Agenda, Notas, Diagramas): se pueden activar varios a la vez. Sin ninguno, solo salen las
//     entidades de la nota abierta (todas sus hojas; primero la hoja abierta).
//   · Buscador: texto normal = busca por nombre (y descripción) dentro de lo filtrado. Con una barra delante se navega:
//     «/» enseña los títulos, «/Título/» las hojas de ese título y «/Título/Hoja/» las entidades de esa hoja
//     (y lo que se escriba después busca por nombre dentro de esa hoja).
//   · Cada entidad: nombre, descripción, valor y un botón de copiar que deja elegir entre la ruta entera
//     (=/Notas/Nota/Hoja/Entidad) y solo el nombre (=Entidad).
// Estado temporal (no se guarda: no está en NA_KEEP):
//   state.elist = { on: abierta, f: { agenda, notas, diagrama }, q: texto del buscador, menu: entidad con el menú de copiar abierto }
const LE_WINS = ['agenda', 'notas', 'diagrama'], LE_NOMBRE = { agenda: 'Agenda', notas: 'Notas', diagrama: 'Diagramas' };
const LE_MAX = 200; // como mucho se dibujan 200 entidades (con más, hay que afinar la búsqueda)
const LE_ANCHO = 304; // ancho del panel más su hueco (lo descuenta el asa del ancho del texto, en render.js)
const leNorm = t => String(t == null ? '' : t).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim().replace(/\s+/g, ' ');
const leLimpio = t => String(t == null ? '' : t).trim().replace(/\s+/g, ' ');
const leMask = src => 'url(' + src + ') center / contain no-repeat';

NoteApp.partes.push(Base => class extends Base {
  componentDidMount() {
    super.componentDidMount();
    // Un clic fuera del menú de copiar de una entidad lo cierra
    this._leDown = e => { const L = this.state.elist; if (L && L.menu && !(e.target.closest && e.target.closest('[data-lemenu]'))) this.leSet({ menu: null }); };
    document.addEventListener('mousedown', this._leDown, true);
  }
  componentWillUnmount() { document.removeEventListener('mousedown', this._leDown, true); super.componentWillUnmount(); }
  leSet(p) { this.setState(s => s.elist ? { elist: { ...s.elist, ...p } } : null); }
  leFoco() { const i = document.querySelector('[data-lebuscar]'); if (i) { i.focus(); try { i.setSelectionRange(i.value.length, i.value.length); } catch (_) {} } }
  leToggle() {
    this.setState(s => ({ elist: { f: {}, q: '', ...(s.elist || {}), on: !(s.elist && s.elist.on), menu: null } }), () => { if (this.state.elist.on) this.leFoco(); });
  }
  leFiltro(k) { this.setState(s => s.elist ? { elist: { ...s.elist, f: { ...(s.elist.f || {}), [k]: !(s.elist.f || {})[k] }, menu: null } } : null); }
  leCopiar(texto, key) { this.leSet({ menu: null }); this.copyText(texto, 'le:' + key); }

  // Qué se enseña: las filas (cabecera de cada hoja + sus entidades) y, si se está navegando con /, las opciones.
  leDatos(s, W) {
    const L = s.elist, f = L.f || {}, alguno = LE_WINS.some(k => f[k]), all = winsOf(s), note = this.curNote(s), sheet = this.curSheet(s);
    // Dónde se busca: con filtros, en todos los títulos de las ventanas elegidas; sin filtros, solo en la nota abierta.
    const titulos = [];
    if (alguno) LE_WINS.forEach(k => { if (f[k]) (all[k].notes || []).forEach(n => titulos.push([k, n])); });
    else if (note) titulos.push([s.mode, note]);
    const hojasDe = list => { const o = []; list.forEach(([w, n]) => (n.sheets || []).forEach(x => o.push([w, n, x]))); return o; };
    const q = String(L.q || ''); let hojas, nombre = '', opciones = null;
    if (q[0] === '/') {
      // Sin filtros, los títulos entre los que se navega son los de la ventana abierta.
      const base = alguno ? titulos : (all[s.mode].notes || []).map(n => [s.mode, n]), p = q.slice(1).split('/'), tq = leNorm(p[0]);
      if (p.length === 1) {
        const hits = base.filter(([w, n]) => !tq || leNorm(n.name).includes(tq));
        opciones = { titulo: 'Títulos', vacio: 'Ningún título coincide', lista: hits.filter(([w, n]) => leLimpio(n.name) && !/\//.test(n.name)).map(([w, n]) => ({ txt: leLimpio(n.name), sub: LE_NOMBRE[w], q: '/' + leLimpio(n.name) + '/' })) };
        hojas = hojasDe(hits);
      } else {
        const notas = base.filter(([w, n]) => leNorm(n.name) === tq), hq = leNorm(p[1]);
        if (p.length === 2) {
          const hs = hojasDe(notas).filter(([w, n, x]) => !hq || leNorm(x.name).includes(hq));
          opciones = { titulo: 'Hojas de «' + leLimpio(p[0]) + '»', vacio: notas.length ? 'Ninguna hoja coincide' : 'No hay ningún título que se llame así', lista: hs.filter(([w, n, x]) => leLimpio(x.name) && !/\//.test(x.name)).map(([w, n, x]) => ({ txt: leLimpio(x.name), sub: LE_NOMBRE[w], q: '/' + leLimpio(n.name) + '/' + leLimpio(x.name) + '/' })) };
          hojas = hs;
        } else { hojas = hojasDe(notas).filter(([w, n, x]) => leNorm(x.name) === hq); nombre = p.slice(2).join('/'); }
      }
    } else {
      hojas = hojasDe(titulos); nombre = q;
      if (!alguno && sheet) hojas.sort((a, b) => (b[2].id === sheet.id) - (a[2].id === sheet.id)); // primero la hoja abierta
    }
    const nq = leNorm(nombre), filas = []; let total = 0, hayDiagrama = false;
    hojas.forEach(([w, n, x]) => {
      const panel = (x.entities || []).filter(e => !NOVAL(e.type) && e.name), usados = new Set(panel.map(e => e.name));
      const casillas = sheetFlags(x).filter(c => !usados.has(c.name) && usados.add(c.name));
      const ents = panel.map(e => ({ name: e.name, desc: e.desc || '', icon: ENT_ICON[e.type] }))
        .concat(casillas.map(c => ({ name: c.name, desc: 'Casilla con nombre, escrita en el texto', icon: ENT_ICON.toggle })))
        .filter(e => !nq || leNorm(e.name).includes(nq) || leNorm(e.desc).includes(nq));
      if (!ents.length) return;
      if (w === 'diagrama') hayDiagrama = true;
      const nn = leLimpio(n.name), hn = leLimpio(x.name), rutaOk = !!nn && !!hn && !/[\/=\n]/.test(nn + hn), get = W.at(x.id);
      total += ents.length;
      if (filas.length >= LE_MAX) return;
      filas.push({ key: 'h:' + x.id, head: true, item: false, ventana: LE_NOMBRE[w], donde: (nn || 'Sin nombre') + ' › ' + (hn || 'Sin nombre'), cls: sheet && x.id === sheet.id ? 'lista-entidades-hoja-actual' : '' });
      ents.forEach(e => {
        const key = x.id + ':' + e.name, ruta = rutaOk ? '=/' + PATH_WINS[w] + '/' + nn + '/' + hn + '/' + e.name : '', copiado = s.copied === 'le:' + key, abierto = L.menu === key;
        let val = 'ND'; try { val = fmt(get(e.name)); } catch (_) {}
        filas.push({ key, head: false, item: true, name: e.name, desc: e.desc, hasDesc: !!e.desc, val, ic: leMask(e.icon || ENT_ICON.expr),
          menu: abierto, hasRuta: !!ruta, ruta, soloNombre: '=' + e.name,
          copyColor: copiado ? '#008000' : abierto ? '#fff' : '#8a8a8a', copyTitle: copiado ? 'Copiado' : 'Copiar la ruta o el nombre',
          toggleMenu: () => this.leSet({ menu: abierto ? null : key }),
          copiarRuta: () => this.leCopiar(ruta, key), copiarNombre: () => this.leCopiar('=' + e.name, key) });
      });
    });
    return { filas, total, opciones, alguno, hayDiagrama, nq, note };
  }

  // Valores para las plantillas (se añaden en renderVals). W = makeWorld(s) de este dibujo.
  leVals(s, W) {
    const L = s.elist, hay = !!this.curSheet(s), on = !!(L && L.on) && hay;
    const v = { leOn: on, leBtn: hay, leToggle: () => this.leToggle(), leColor: on ? '#008000' : '#8a8a8a', leTitle: on ? 'Cerrar la lista de entidades' : 'Lista de entidades: consulta nombres, valores y rutas' };
    if (!on) return v;
    const d = this.leDatos(s, W), f = L.f || {};
    v.leFiltros = LE_WINS.map(k => ({ txt: LE_NOMBRE[k], on: !!f[k], cls: f[k] ? 'lista-entidades-filtro-on' : '', pick: () => this.leFiltro(k), title: f[k] ? 'Dejar de buscar en ' + LE_NOMBRE[k] : 'Buscar también en ' + LE_NOMBRE[k] }));
    const elegidas = LE_WINS.filter(k => f[k]).map(k => LE_NOMBRE[k]);
    v.leAmbito = d.alguno ? 'En ' + (elegidas.length > 1 ? elegidas.slice(0, -1).join(', ') + ' y ' + elegidas[elegidas.length - 1] : elegidas[0]) : (L.q || '')[0] === '/' ? 'En los títulos de ' + LE_NOMBRE[s.mode] : d.note ? 'En la nota abierta: «' + (leLimpio(d.note.name) || 'Sin nombre') + '»' : 'Sin nota abierta';
    v.leCuenta = d.total === 1 ? '1 entidad' : d.total + ' entidades';
    v.leQ = L.q || '';
    v.leOnQ = e => this.leSet({ q: e.target.value, menu: null });
    v.leOnKey = e => {
      if (e.key === 'Enter' && d.opciones && d.opciones.lista.length) { e.preventDefault(); this.leSet({ q: d.opciones.lista[0].q }); }
      else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); if (L.q) this.leSet({ q: '' }); else e.target.blur(); }
    };
    v.leHayQ = !!L.q;
    v.leBorrarQ = () => { this.leSet({ q: '' }); this.leFoco(); };
    v.leOpciones = !!d.opciones;
    v.leOpTitulo = d.opciones ? d.opciones.titulo : '';
    v.leOpLista = d.opciones ? d.opciones.lista.slice(0, 60).map((o, i) => ({ ...o, key: i + ':' + o.q, noFocus: e => e.preventDefault(), pick: () => { this.leSet({ q: o.q, menu: null }); this.leFoco(); } })) : [];
    v.leOpVacio = !!d.opciones && !d.opciones.lista.length;
    v.leOpVacioTxt = d.opciones ? d.opciones.vacio : '';
    v.leFilas = d.filas;
    v.leVacio = !d.filas.length;
    v.leVacioTxt = !d.note && !d.alguno ? 'Abre una nota para ver sus entidades.' : d.nq ? 'Ninguna entidad coincide con lo que buscas.'
      : !d.alguno && s.mode === 'diagrama' ? 'Este diagrama no tiene entidades: solo las casillas con nombre que escribas en su texto MKD, como ([True] Hecho). Para ver las de Notas o la Agenda, activa sus botones de arriba.'
      : 'Aquí no hay ninguna entidad todavía.';
    v.leAvisoDg = !!f.diagrama && !d.hayDiagrama;
    v.leMas = d.total > LE_MAX;
    v.leStop = e => e.stopPropagation();
    return v;
  }
});
