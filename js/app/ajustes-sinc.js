// Menú Sincronización de la página de Ajustes (componente componentes/ajustes-sinc/). Dos secciones (arriba a la derecha):
//   · Espacios de trabajo: cambiar a otra carpeta, copiar el espacio en otra carpeta o mudarlo (copiarlo y borrar el anterior)
//     y, debajo, el Historial: los espacios abiertos antes en este navegador, con su título y su ruta, para cambiar rápido.
//     (Hasta la 4.8.5.0 el Historial era una sección aparte.)
//   · Exportar: exportar a UN solo archivo (una nota, una agenda, un diagrama, todas las de una ventana o todo) e importar.
// Las funciones que no tocan la interfaz (copiar carpetas, crear y leer el archivo…) están en js/motor/espacios.js.
//
// Estado temporal (no se guarda: no está en NA_KEEP):
//   state.sinc    = { busy: texto mientras trabaja, msg: { tipo: 'ok' | 'aviso' | 'error', texto }, exp: { w, id } }
//                   exp = qué se va a exportar: w 'todo' | 'notas' | 'agenda' | 'diagrama'; id = una nota (null = todas)
//   state.hist    = historial de espacios de trabajo (se guarda aparte, en IndexedDB: histGet / histSet)
//   state.histCur = id del espacio de trabajo abierto dentro del historial
// Ventanas de confirmación (componente confirmar, js/app/confirmar.js): kind 'move' antes de mudar (carpeta pendiente en
// this._mv) y kind 'import' cuando lo importado se llama igual que algo que ya existe (pendiente en this._imp).
const AJ_SINC_SECS = [['espacios', 'Espacios de trabajo'], ['exportar', 'Exportar']];
const SINC_TODAS = { notas: 'Todas las notas', agenda: 'Toda la agenda', diagrama: 'Todos los diagramas' };
const sincCuantos = (n, uno, varios) => n + ' ' + (n === 1 ? uno : varios);

NoteApp.partes.push(Base => class extends Base {
  componentDidMount() {
    super.componentDidMount();
    if (FS_OK) this.histReady();
  }
  // ----- Historial de espacios de trabajo -----
  histReady() {
    if (!this._histP) this._histP = histGet().then(l => new Promise(r => this.setState({ hist: l }, r))).catch(() => {});
    return this._histP;
  }
  // Apunta en el historial la carpeta que se acaba de abrir (la llama fsStart, en carpeta.js) o de crear (una copia).
  histRecord(dir) {
    if (!FS_OK || !dir) return Promise.resolve();
    this._histP = this.histReady().then(async () => {
      const l = await histTouch(this.state.hist || [], dir), h = await histFind(l, dir);
      histSet(l);
      await new Promise(r => this.setState(dir === this._fsDir && h ? { hist: l, histCur: h.id } : { hist: l }, r));
    }).catch(() => {});
    return this._histP;
  }
  histEdit(id, key, val) {
    const max = key === 'ruta' ? 260 : 40;
    this.setState(s => ({ hist: (s.hist || []).map(h => h.id === id ? { ...h, [key]: String(val).slice(0, max) } : h) }),
      () => { clearTimeout(this._histT); this._histT = setTimeout(() => histSet(this.state.hist || []), 400); });
  }
  histRemove(id) { this.setState(s => ({ hist: (s.hist || []).filter(h => h.id !== id) }), () => histSet(this.state.hist || [])); }
  // Abre un espacio de trabajo del historial (cambio rápido): pide permiso a su carpeta y sigue como al elegirla a mano.
  async histAbrir(id) {
    if (this.sincAvisoOcupado()) return;
    const h = (this.state.hist || []).find(x => x.id === id); if (!h || !h.dir) return;
    this.sincSet({ msg: null });
    let p = 'denied'; try { p = await h.dir.requestPermission({ mode: 'readwrite' }); } catch (_) {}
    if (p !== 'granted') { this.sincMsg('aviso', 'No se ha abierto «' + (h.titulo || h.carpeta) + '»: hace falta dar permiso a su carpeta cuando el navegador lo pregunta.'); return; }
    if (!(await dirExists(h.dir))) {
      this.setState(s => ({ hist: (s.hist || []).map(x => x.id === id ? { ...x, falta: true } : x) }), () => histSet(this.state.hist || []));
      this.sincMsg('error', 'La carpeta «' + h.carpeta + '» ya no está donde estaba (se ha borrado o movido). Si la moviste, ábrela desde su sitio nuevo con «Cambiar», en Espacios de trabajo.');
      return;
    }
    await this.fsGo(h.dir);
  }

  // ----- Mensajes de la página -----
  sincSet(p) { this.setState(s => ({ sinc: { ...(s.sinc || {}), ...p } })); }
  sincMsg(tipo, texto) { this.sincSet({ busy: '', msg: { tipo, texto } }); }
  sincOcupado() { return !!(this.state.sinc && this.state.sinc.busy) || !!this._fsPicking; }
  // Como sincOcupado, pero avisa en la página en vez de no hacer nada. Un cambio de carpeta atascado (más de
  // FS_ATASCO ms, ver carpeta.js) no cuenta como ocupado.
  sincAvisoOcupado() {
    if (this._fsPicking && Date.now() - (this._fsPickT || 0) > FS_ATASCO) this._fsPicking = false;
    if (!this.sincOcupado()) return false;
    this.sincSet({ msg: { tipo: 'aviso', texto: 'Espera un momento: NoteApp todavía está ' + ((this.state.sinc && this.state.sinc.busy) ? 'terminando otra tarea' : 'cambiando de carpeta') + '. Cuando termine, vuelve a intentarlo.' } });
    return true;
  }

  // ----- Espacios de trabajo: cambiar, copiar y mudar -----
  async wsCambiar() {
    if (this.sincAvisoOcupado()) return;
    this.sincSet({ msg: null });
    await this.fsPick(true);
  }
  // Copiar (mudar = false) o mudar (mudar = true): primero se elige la carpeta de destino y se comprueba que vale.
  async wsCopiar(mudar) {
    if (this.sincAvisoOcupado()) return;
    if (!FS_OK) { this.sincMsg('aviso', 'Este navegador no deja trabajar con carpetas. Usa Chrome o Edge en un ordenador.'); return; }
    const s = this.state, src = this._fsDir && s.fs === 'on' ? this._fsDir : null;
    if (mudar && !src) {
      this.sincMsg('aviso', s.fs === 'perm' || s.fs === 'err' ? 'Antes de mudar, da permiso a la carpeta «' + s.fsName + '» con el botón de la carpeta (abajo a la izquierda, fuera de Ajustes).' : 'No hay ninguna carpeta conectada, así que no hay nada que mudar. Conecta una con «Cambiar».');
      return;
    }
    if (!fsNoteCount(s).total) { this.sincMsg('aviso', 'Este espacio de trabajo está vacío: no hay nada que ' + (mudar ? 'mudar' : 'copiar') + '.'); return; }
    this.sincSet({ msg: null });
    let dest; try { dest = await window.showDirectoryPicker({ id: 'noteapp-destino', mode: 'readwrite' }); } catch (_) { return; }
    try {
      if (this._fsDir) {
        if (await this._fsDir.isSameEntry(dest)) { this.sincMsg('aviso', 'Has elegido la misma carpeta que ya tienes abierta. Elige otra distinta.'); return; }
        if (await this._fsDir.resolve(dest)) { this.sincMsg('aviso', 'Esa carpeta está dentro de la del espacio de trabajo abierto. Elige una que esté fuera.'); return; }
      }
      if (await fsRead(dest)) { this.sincMsg('aviso', '«' + dest.name + '» ya tiene un espacio de trabajo de NoteApp. Para no mezclar ni pisar nada, elige una carpeta vacía (puedes crear una nueva en la misma ventana de elegir carpeta).'); return; }
    } catch (_) {}
    if (mudar) {
      this._mv = dest;
      this.setState({ confirm: { kind: 'move', name: dest.name, from: s.fsName } }, () => { const b = document.querySelector('[data-confirmar="cancelar"]'); if (b) b.focus(); });
      return;
    }
    await this.wsHacer(dest, false);
  }
  // Respuesta «Mudar» de la ventana de confirmación
  wsMudarOk() { const dest = this._mv; this._mv = null; this.setState({ confirm: null }); if (dest) this.wsHacer(dest, true); }
  async wsHacer(dest, mudar) {
    this.sincSet({ busy: mudar ? 'Mudando el espacio de trabajo…' : 'Copiando el espacio de trabajo…', msg: null });
    let paso = 'copia';
    try {
      clearTimeout(this._naT); naSave(this.state, this._rev);
      while (this._fsBusy) await fsSleep(50);
      const s = this.state, old = this._fsDir && s.fs === 'on' ? this._fsDir : null, oldName = s.fsName, rev = this._rev || Date.now();
      const names = await fsWriteAll(dest, s, rev), im = await fsCopyImgs(old, dest, names);
      // Se comprueba la copia antes de dar nada por hecho: tiene que tener las mismas notas, agendas y diagramas.
      const chk = await fsRead(dest), all = winsOf(s);
      if (!chk || !WINS.every(k => (chk[k] || []).length === (all[k].notes || []).length)) throw new Error('copia');
      const aviso = im.faltan ? ' Aviso: ' + sincCuantos(im.faltan, 'imagen no se ha podido copiar.', 'imágenes no se han podido copiar.') : '';
      if (!mudar) {
        await this.histRecord(dest);
        this.sincMsg(im.faltan ? 'aviso' : 'ok', 'Copia creada en «' + dest.name + '». ' + (oldName ? 'Sigues trabajando en «' + oldName + '»' : 'Sigues trabajando donde estabas') + '; la copia está en el Historial, más abajo, para abrirla cuando quieras.' + aviso);
        return;
      }
      // Mudanza: desde aquí todo se guarda en la carpeta nueva…
      paso = 'cambio';
      while (this._fsBusy) await fsSleep(50);
      this._fsDir = dest; this._fsCache = {}; this._fsImgs = new Set(); imgFolder(dest); fsSetSavedRev(rev);
      await fsSetHandle(dest);
      const cur = this.state.histCur, tenia = (this.state.hist || []).some(h => h.id === cur);
      const hist = (this.state.hist || []).map(h => h.id !== cur ? h : { ...h, dir: dest, carpeta: dest.name, titulo: h.titulo === h.carpeta ? dest.name : h.titulo, ruta: '', ultima: Date.now(), falta: false });
      await new Promise(r => this.setState(tenia ? { fs: 'on', fsName: dest.name, hist } : { fs: 'on', fsName: dest.name }, r));
      if (tenia) histSet(hist); else await this.histRecord(dest);
      this.fsQueue();
      // …y se borra de la anterior lo que es de NoteApp (solo si se han copiado todas las imágenes).
      paso = 'limpieza';
      if (im.faltan) { this.sincMsg('aviso', 'Ahora todo se guarda en «' + dest.name + '», pero no se ha borrado nada de «' + oldName + '» porque ' + sincCuantos(im.faltan, 'imagen no se ha podido copiar', 'imágenes no se han podido copiar') + '. Revísala antes de borrarla tú.'); return; }
      const r = await fsCleanOld(old, im.hechas);
      this.sincMsg('ok', 'Mudanza hecha: ahora todo se guarda en «' + dest.name + '». ' + (r.borrada ? 'La carpeta anterior «' + oldName + '» se ha borrado, porque quedó vacía.' : r.vacia ? 'La carpeta anterior «' + oldName + '» ha quedado vacía; puedes borrarla tú.' : 'De «' + oldName + '» se han borrado los archivos de NoteApp; lo demás que había en esa carpeta no se ha tocado.'));
    } catch (_) {
      this.sincMsg('error', paso === 'copia' ? 'No se ha podido ' + (mudar ? 'mudar' : 'crear la copia') + '. Comprueba que se puede escribir en esa carpeta e inténtalo de nuevo.' + (mudar ? ' No se ha borrado nada de la carpeta anterior.' : '')
        : paso === 'cambio' ? 'La copia está hecha, pero no se ha podido terminar el cambio de carpeta. No se ha borrado nada de la carpeta anterior.'
        : 'Ahora todo se guarda en «' + dest.name + '», pero no se ha podido terminar de borrar la carpeta anterior. Puedes borrarla tú.');
    }
  }

  // ----- Exportar: un solo archivo -----
  expSel(s) {
    const e = (s.sinc && s.sinc.exp) || {}, w = e.w === 'todo' || WINS.includes(e.w) ? e.w : 'todo';
    const id = w !== 'todo' && e.id && (winsOf(s)[w].notes || []).some(n => n.id === e.id) ? e.id : null;
    return { w, id };
  }
  async expHacer() {
    if (this.sincAvisoOcupado()) return;
    const s = this.state, sel = this.expSel(s), data = expPick(s, sel);
    if (!WINS.some(k => (data[k] || []).length)) { this.sincMsg('aviso', 'Ahí no hay nada que exportar todavía.'); return; }
    this.sincSet({ busy: 'Preparando el archivo…', msg: null });
    try {
      const pack = await expBuild(s, sel, NA_NOVEDADES[0] ? NA_NOVEDADES[0].version : ''), name = expName(s, sel);
      fileDownload(name, JSON.stringify(pack));
      this.sincMsg('ok', 'Archivo creado: «' + name + '». Lo tienes en la carpeta de descargas, listo para guardarlo o enviarlo.');
    } catch (_) { this.sincMsg('error', 'No se ha podido crear el archivo. Inténtalo de nuevo.'); }
  }

  // ----- Importar -----
  impElegir() {
    if (this.sincAvisoOcupado()) return;
    const i = document.createElement('input'); i.type = 'file'; i.accept = '.json,application/json';
    i.onchange = () => { const f = i.files && i.files[0]; if (f) this.impArchivo(f); };
    i.click();
  }
  async impArchivo(f) {
    this.sincSet({ busy: 'Leyendo el archivo…', msg: null });
    let data = null; try { data = impParse(await f.text()); } catch (_) {}
    if (!data) { this.sincMsg('error', '«' + f.name + '» no es un archivo exportado con NoteApp.'); return; }
    if (!WINS.some(k => data[k].length)) { this.sincMsg('aviso', '«' + f.name + '» no trae ninguna nota, agenda ni diagrama.'); return; }
    const re = impReId({ notas: data.notas, agenda: data.agenda, diagrama: data.diagrama }), all = winsOf(this.state), dudas = [];
    WINS.forEach(k => re[k].forEach(n => { if ((all[k].notes || []).some(m => normN(m.name) === normN(n.name))) dudas.push({ w: k, id: n.id, name: n.name }); }));
    this._imp = { data: re, imagenes: data.imagenes, dudas, resp: {}, archivo: f.name };
    this.sincSet({ busy: '' });
    if (dudas.length) this.impPreguntar(0); else this.impTerminar();
  }
  // Una ventana por cada cosa importada que se llama igual que otra que ya existe
  impPreguntar(i) {
    const imp = this._imp, d = imp && imp.dudas[i]; if (!d) return;
    this.setState({ confirm: { kind: 'import', i, total: imp.dudas.length, name: d.name, w: d.w } }, () => { const b = document.querySelector('[data-confirmar="ambas"]'); if (b) b.focus(); });
  }
  // r = 'ambas' (se guardan las dos: la importada con un número al final) o 'sustituir' (la importada reemplaza a la que había)
  impResponder(r) {
    const c = this.state.confirm, imp = this._imp; if (!c || c.kind !== 'import' || !imp) return;
    imp.resp[imp.dudas[c.i].id] = r;
    if (c.i + 1 < imp.dudas.length) this.impPreguntar(c.i + 1);
    else { this.setState({ confirm: null }); this.impTerminar(); }
  }
  async impTerminar() {
    const imp = this._imp; this._imp = null; if (!imp) return;
    this.sincSet({ busy: 'Importando…', msg: null });
    try {
      // Imágenes del archivo: se guardan en el navegador (y el guardado automático las lleva a la carpeta)
      for (const n in imp.imagenes) { const b = dataUrlBlob(imp.imagenes[n]); if (b) { await imgIdbPut(n, b); if (IMG_STATE[n] === 'falta') delete IMG_STATE[n]; } }
      const s = this.state, all = winsOf(s), out = {}, cuenta = { nuevas: 0, dobles: 0, cambiadas: 0 };
      let data = imp.data;
      // 1) Las que se guardan «las dos» reciben su nombre nuevo dentro de lo importado (así sus rutas siguen apuntando a ellas)
      WINS.forEach(k => {
        const usados = new Set((all[k].notes || []).concat(data[k]).map(m => normN(m.name)));
        data[k].slice().forEach(n => { if (imp.resp[n.id] !== 'ambas') return; const nm = impNombre(n.name, usados, tabMax(k)); usados.add(normN(nm)); data = impRenombrar(data, n.id, nm); });
      });
      // 2) Se juntan con lo que ya hay
      WINS.forEach(k => {
        const notes = (all[k].notes || []).slice(); let act = all[k].activeNote;
        data[k].forEach(n => {
          const r = imp.resp[n.id], j = r === 'sustituir' ? notes.findIndex(m => normN(m.name) === normN(n.name)) : -1;
          if (j >= 0) { if (act === notes[j].id) act = n.id; notes[j] = n; cuenta.cambiadas++; return; }
          notes.push(n); if (r === 'ambas') cuenta.dobles++; else cuenta.nuevas++;
        });
        if (!notes.some(m => m.id === act)) act = notes.length ? notes[0].id : null;
        out[k] = { notes, activeNote: act };
      });
      this._msel = null;
      this.setState({ ...winPatch(out, s.mode), focusId: null, editing: null, search: null, dsel: null, dedit: null, dlabel: null, dmen: null }, () => imgRedraw());
      const partes = [cuenta.nuevas ? sincCuantos(cuenta.nuevas, 'añadida', 'añadidas') : '', cuenta.dobles ? sincCuantos(cuenta.dobles, 'guardada con otro nombre', 'guardadas con otro nombre') : '', cuenta.cambiadas ? sincCuantos(cuenta.cambiadas, 'sustituida', 'sustituidas') : ''].filter(Boolean);
      this.sincMsg('ok', 'Importado de «' + imp.archivo + '»: ' + partes.join(', ') + '. Ya lo tienes en sus ventanas (Notas, Agenda o Diagrama).');
    } catch (_) { this.sincMsg('error', 'No se ha podido importar «' + imp.archivo + '». No se ha cambiado nada.'); }
  }

  // ----- Valores para la plantilla (los añade ajVals, en ajustes.js) -----
  sincVals(s, sec) {
    const sc = s.sinc || {}, busy = !!sc.busy, msg = sc.msg, k = fsNoteCount(s), on = s.fs === 'on', off = s.fs !== 'on' && !s.fsName;
    const curId = s.fsName ? s.histCur : null, cur = (s.hist || []).find(h => h.id === curId);
    const v = {
      sincEsEspacios: sec !== 'exportar', sincEsExportar: sec === 'exportar',
      sincHayMsg: busy || !!msg, sincMsgTxt: busy ? sc.busy : msg ? msg.texto : '',
      sincMsgCls: 'ajustes-sinc-estado-' + (busy ? 'trabajando' : msg ? msg.tipo : 'ok'),
      sincNoFs: !FS_OK
    };
    if (v.sincEsEspacios) {
      v.sincActNombre = off ? 'Sin carpeta conectada' : (cur && String(cur.titulo || '').trim()) || s.fsName;
      v.sincActDetalle = off ? 'Ahora todo se guarda solo en este navegador. Conecta una carpeta con «Cambiar» para tener un espacio de trabajo.' : 'Carpeta «' + s.fsName + '»' + (cur && cur.ruta ? ' · ' + cur.ruta : '');
      v.sincActEstado = on ? 'Guardando en la carpeta' : off ? 'Solo en el navegador' : s.fs === 'perm' ? 'Falta dar permiso a la carpeta' : 'Hay un problema con la carpeta';
      v.sincActCls = 'ajustes-sinc-punto-' + (on ? 'ok' : off ? 'off' : 'aviso');
      v.sincActCuenta = sincCuantos(k.notas, 'nota', 'notas') + ' · ' + sincCuantos(k.agenda, 'agenda', 'agendas') + ' · ' + sincCuantos(k.diagrama, 'diagrama', 'diagramas');
      v.sincCambiar = () => this.wsCambiar();
      v.sincCopiar = () => this.wsCopiar(false);
      v.sincMudar = () => this.wsCopiar(true);
      v.sincOcupado = busy;
      // Historial (debajo de los botones; solo con carpetas: Chrome o Edge de ordenador)
      v.sincHistFs = FS_OK;
      const fecha = t => t ? new Date(t).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
      const lista = (s.hist || []).slice().sort((a, b) => (b.id === curId) - (a.id === curId) || (b.ultima || 0) - (a.ultima || 0));
      v.sincHist = lista.map(h => ({
        id: h.id, titulo: h.titulo || '', ruta: h.ruta || '', carpeta: h.carpeta, actual: h.id === curId, otro: h.id !== curId, falta: !!h.falta && h.id !== curId,
        cls: h.id === curId ? 'ajustes-sinc-hist-actual' : '',
        cuando: h.id === curId ? 'Abierto ahora' : 'Abierto por última vez el ' + fecha(h.ultima),
        onTitulo: e => this.histEdit(h.id, 'titulo', e.target.value), onRuta: e => this.histEdit(h.id, 'ruta', e.target.value),
        // Sube arriba del panel para ver el mensaje y la tarjeta del espacio que se abre
        abrir: () => { this.ajArriba(); this.histAbrir(h.id); }, quitar: () => this.histRemove(h.id)
      }));
      v.sincHistVacio = !lista.length;
      v.sincHistHay = !!lista.length;
    }
    if (v.sincEsExportar) {
      const sel = this.expSel(s), all = winsOf(s);
      v.sincExpWins = [['todo', 'Todo', k.total], ['notas', 'Notas', k.notas], ['agenda', 'Agenda', k.agenda], ['diagrama', 'Diagramas', k.diagrama]].map(([id, txt, n]) => ({
        txt, n, on: sel.w === id, cls: sel.w === id ? 'ajustes-sinc-chip-on' : '', pick: () => this.sincSet({ exp: { w: id, id: null }, msg: null }) }));
      v.sincExpTodo = sel.w === 'todo';
      v.sincExpLista = sel.w !== 'todo';
      v.sincExpTodoTxt = 'Todas tus notas (' + k.notas + '), toda tu agenda (' + k.agenda + ') y todos tus diagramas (' + k.diagrama + '), con sus imágenes.';
      const notes = sel.w === 'todo' ? [] : all[sel.w].notes || [];
      v.sincExpItems = sel.w === 'todo' ? [] : [{ id: null, txt: SINC_TODAS[sel.w], sub: sincCuantos(notes.length, 'título', 'títulos') }]
        .concat(notes.map(n => ({ id: n.id, txt: String(n.name || '').trim() || 'Sin nombre', sub: sincCuantos((n.sheets || []).length, 'hoja', 'hojas') })))
        .map(o => ({ ...o, on: sel.id === o.id, cls: sel.id === o.id ? 'ajustes-sinc-opcion-on' : '', pick: () => this.sincSet({ exp: { w: sel.w, id: o.id }, msg: null }) }));
      v.sincExpArchivo = expName(s, sel);
      v.sincExportar = () => this.expHacer();
      v.sincImportar = () => this.impElegir();
      v.sincOcupado = busy;
    }
    return v;
  }
});
