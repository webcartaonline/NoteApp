// Guardado en una carpeta del ordenador (solo Chrome/Edge de escritorio).
// Cada carpeta es un ESPACIO DE TRABAJO independiente (como las bóvedas de Obsidian): tiene sus propias
// notas, agenda y diagramas. Al abrir otra carpeta NO se copia nada de la anterior a la nueva: si la nueva
// está vacía, se empieza de cero. Lo único que se conserva al cambiar es la configuración (state.config).
// Límites para no dejar la app «atascada» sin avisar (23/11/2026):
const FS_ATASCO = 30000;   // un cambio de carpeta que dura más que esto se da por atascado
const FS_ESPERA = 15000;   // lo que se espera, como mucho, a que termine de guardarse la carpeta anterior al cambiar
const FS_REINTENTOS = 3;   // veces que se reintenta guardar tras un «no se encuentra» antes de avisar
const FS_LEER = 30000;     // lo que puede tardar, como mucho, leer una carpeta (OneDrive puede tener que descargar archivos)
const FS_GUARDAR = 60000;  // lo que puede tardar, como mucho, un guardado automático en la carpeta
// Qué está haciendo un cambio de carpeta, para decirlo en los avisos (this._fsPaso)
const FS_PASOS = { guardar: 'guardar lo último en la carpeta anterior', leer: 'leer la carpeta nueva', abrir: 'abrir la carpeta nueva' };
// Aviso según el paso que no ha respondido a tiempo (err.paso de conLimite, guardado.js)
function fsTardaTexto(paso, nombre) {
  const od = ' Si la carpeta está en OneDrive, comprueba que OneDrive no está en pausa y, si puedes, marca la carpeta con «Mantener siempre en este dispositivo» (clic derecho en el Explorador de archivos).';
  if (paso === 'navegador') return 'El almacenamiento del navegador no responde. Cierra todas las ventanas de NoteApp (y de Edge) y vuelve a abrirla.';
  if (paso === 'guardar') return 'La carpeta «' + nombre + '» tarda demasiado en guardar.' + od;
  return 'La carpeta «' + nombre + '» tarda demasiado en leerse.' + od;
}
NoteApp.partes.push(Base => class extends Base {
  // ----- Guardado en carpeta -----
  fsToast(title, body) {
    const id = uid('t');
    this.setState(st => ({ toasts: (st.toasts || []).concat({ id, title, body, when: '' }).slice(-4) }));
    setTimeout(() => this.setState(st => ({ toasts: (st.toasts || []).filter(t => t.id !== id) })), 7000);
  }
  // otra = true: se quiere abrir OTRA carpeta sí o sí (botón «Cambiar» de Ajustes › Sincronización). Sin ello, si a la
  // carpeta conectada le falta el permiso, el botón de la carpeta primero intenta recuperarlo.
  async fsPick(otra) {
    if (!FS_OK) { this.fsToast('Guardado en carpeta no disponible', 'Este navegador no lo permite. Usa Chrome o Edge en un ordenador. Tus notas siguen guardadas en el navegador.'); return; }
    if (!this.fsLibre()) return;
    if (!otra && this._fsDir && (this.state.fs === 'perm' || this.state.fs === 'err')) {
      let p = 'denied'; try { p = await this._fsDir.requestPermission({ mode: 'readwrite' }); } catch (_) {}
      if (p === 'granted') { this.fsStart(this._fsDir, false); return; }
    }
    let dir; try { dir = await window.showDirectoryPicker({ id: 'noteapp', mode: 'readwrite' }); }
    catch (err) {
      // Cerrar la ventana de elegir carpeta (AbortError) no es un fallo. Cualquier otra cosa se avisa: antes no hacía nada.
      if (!err || err.name !== 'AbortError') this.fsToast('No se ha abierto la ventana para elegir carpeta', 'El navegador no la ha dejado abrir. Vuelve a pulsar el botón de la carpeta; si sigue sin abrirse, cierra NoteApp y ábrela otra vez.');
      return;
    }
    await this.fsGo(dir);
  }
  // ¿Se puede empezar a cambiar de carpeta? Si ya hay un cambio en marcha, avisa en vez de no hacer nada (23/11/2026:
  // la app se quedaba «atascada» y no respondía a los clics sin decir por qué). Si ese cambio lleva más de
  // FS_ATASCO ms, se da por atascado y se deja empezar otro.
  fsLibre() {
    if (!this._fsPicking) return true;
    if (Date.now() - (this._fsPickT || 0) > FS_ATASCO) { this._fsPicking = false; return true; }
    const s = Math.round((Date.now() - (this._fsPickT || 0)) / 1000), paso = FS_PASOS[this._fsPaso];
    this.fsToast('Espera un momento', 'NoteApp todavía está cambiando de carpeta' + (paso ? ' (intentando ' + paso + ', lleva ' + s + ' s)' : '') + '. Cuando termine, vuelve a intentarlo.');
    return false;
  }
  // Espera a que termine el guardado en la carpeta que esté en marcha, como mucho ms. Devuelve false si no ha terminado.
  async fsEsperaLibre(ms) {
    const fin = Date.now() + ms;
    while (this._fsBusy) { if (Date.now() > fin) return false; await new Promise(r => setTimeout(r, 50)); }
    return true;
  }
  // Un «no se encuentra» (NotFoundError) no siempre es que se haya borrado la carpeta: OneDrive o otra ventana de
  // NoteApp pueden quitar un archivo justo mientras se guarda. Solo se da por desaparecida si la carpeta ya no está.
  // Si comprobarlo no responde en 10 s, se da por que sigue ahí (mejor no desconectar sin estar seguros).
  async fsDesaparecida(dir) { if (!dir) return false; try { return !(await conLimite(dirExists(dir), 10000, 'leer')); } catch (_) { return false; } }
  // Abre el espacio de trabajo de una carpeta ya elegida (con el selector o desde el Historial de Ajustes › Sincronización).
  async fsGo(dir) {
    if (!this.fsLibre()) return;
    this._fsPicking = true; this._fsPickT = Date.now(); this._fsPaso = 'guardar';
    try {
      const prev = this.state.fsName, leave = await this.fsLeave(dir);
      if (leave === 'slow') {
        this.fsToast('No se ha cambiado de carpeta', 'La carpeta «' + prev + '» está tardando demasiado en guardar (puede que OneDrive la esté sincronizando). Espera un poco y vuelve a intentarlo.');
        return;
      }
      if (leave === 'blocked') {
        this.fsToast('No se ha cambiado de carpeta', 'Hay cambios que aún no se han guardado en «' + prev + '». Pulsa el botón de la carpeta y da permiso a «' + prev + '» para guardarlos; después ya podrás abrir otra carpeta.');
        return;
      }
      // Sin carpeta anterior (primera vez) o la anterior ya no existe, y la elegida está vacía: las notas del
      // navegador son la única copia, así que se pregunta si pasarlas a la carpeta o empezar vacía (fsAnswer).
      if (leave === 'none' || leave === 'gone') {
        this._fsPaso = 'leer';
        let empty = false;
        try { empty = !(await conLimite(fsRead(dir), FS_LEER, 'leer')); }
        catch (err) { if (err && err.name === 'TimeoutError') { this.fsToast('No se ha abierto la carpeta', fsTardaTexto('leer', dir.name)); return; } }
        const count = fsNoteCount(this.state);
        if (empty && count.total) {
          const gone = leave === 'gone' ? prev : this._fsGone || '';
          this._fsAsk = dir;
          this.setState({ menu: false, focusId: null, confirm: { kind: 'folder', name: dir.name, gone, count } }, () => { const b = document.querySelector('[data-confirmar="cancelar"]'); if (b) b.focus(); });
          return;
        }
      }
      // Misma carpeta: se queda con lo más reciente. Carpeta anterior guardada: la nueva es otro espacio de
      // trabajo (se carga lo suyo o empieza vacía).
      this._fsPaso = 'abrir';
      await this.fsStart(dir, leave !== 'same', leave === 'ok' ? prev : null);
    } finally { this._fsPicking = false; this._fsPaso = null; }
  }
  // Antes de abrir otra carpeta, guarda lo último en la actual. Devuelve:
  // 'none' = no había carpeta · 'same' = ha elegido la misma · 'ok' = la anterior está guardada
  // 'gone' = la anterior ya no existe · 'blocked' = hay cambios sin guardar en la anterior y no hay permiso
  // 'slow' = la anterior lleva demasiado rato guardando (no responde)
  async fsLeave(dir) {
    const old = this._fsDir;
    if (!old) return 'none';
    try { if (await old.isSameEntry(dir)) return 'same'; } catch (_) {}
    clearTimeout(this._naT); naSave(this.state, this._rev);
    if (!(await this.fsEsperaLibre(FS_ESPERA))) return 'slow';
    let p = 'denied'; try { p = await old.queryPermission({ mode: 'readwrite' }); } catch (_) {}
    if (p === 'granted') {
      this._fsBusy = true;
      try { await conLimite(this.fsSync(), FS_ESPERA, 'guardar'); return 'ok'; }
      catch (err) {
        if (err && err.name === 'TimeoutError') return 'slow';
        if (err && err.name === 'NotFoundError' && await this.fsDesaparecida(old)) return 'gone';
      }
      finally { this._fsBusy = false; }
    }
    return (this._rev || 0) > fsSavedRev() ? 'blocked' : 'ok';
  }
  // Respuesta de la ventana «¿Guardar aquí lo que tienes abierto?»: carry = guardar en la carpeta lo que hay abierto; si no, empieza vacía.
  fsAnswer(carry) {
    const dir = this._fsAsk; this._fsAsk = null;
    this.setState({ confirm: null });
    if (!dir) return;
    this._fsGone = '';
    this.fsStart(dir, true, null, !carry);
  }
  // chosen = elegida a mano · prev = nombre del espacio de trabajo anterior (solo al cambiar a otra carpeta)
  // empty = empezar vacía (se ha elegido no pasar las notas del navegador)
  async fsStart(dir, chosen, prev, empty) {
    try {
      const data = await conLimite(fsRead(dir), FS_LEER, 'leer');
      const has = !!data, fresh = !!prev || !!empty;
      const load = has && (chosen || (+data.meta.rev || 0) > (this._rev || 0));
      this._fsDir = dir; this._fsCache = {}; this._fsImgs = new Set(); imgFolder(dir);
      if (load) this.fsApply(data, fresh);
      else if (fresh) this.fsBlank();
      await fsSetHandle(dir);
      this._fsGone = '';
      this.setState({ fs: 'on', fsName: dir.name }, () => this.fsQueue());
      this.histRecord(dir); // Historial de espacios de trabajo (js/app/ajustes-sinc.js)
      if (prev) this.fsToast(load ? 'Espacio de trabajo abierto' : 'Espacio de trabajo nuevo', (load ? 'Se han cargado las notas de «' + dir.name + '».' : '«' + dir.name + '» empieza vacío; todo lo que crees se guardará ahí.') + ' Las notas de «' + prev + '» siguen en su carpeta: para volver, pulsa el botón de la carpeta y elígela.');
      else if (empty && !load) this.fsToast('Espacio de trabajo nuevo', '«' + dir.name + '» empieza vacío; todo lo que crees se guardará ahí.');
      else if (chosen) this.fsToast('Carpeta conectada', load ? 'Se han cargado las notas guardadas en «' + dir.name + '». A partir de ahora todo se guarda ahí automáticamente.' : 'A partir de ahora todo se guarda automáticamente en «' + dir.name + '».');
      else if (load) this.fsToast('Notas actualizadas', 'Se han cargado los cambios más recientes de la carpeta «' + dir.name + '».');
    } catch (err) {
      this._fsDir = dir; this.setState({ fs: 'err', fsName: dir.name });
      this.fsToast('No se pudo abrir la carpeta', err && err.name === 'TimeoutError' ? fsTardaTexto(err.paso, dir.name) : 'Pulsa el botón de la carpeta (abajo a la izquierda) para intentarlo de nuevo.');
    }
  }
  // Estado temporal que se limpia al cargar otros datos (menús abiertos, edición, selección…).
  fsReset() {
    this._msel = null;
    return { focusId: null, field: null, entMenu: null, colMenu: null, copyMenu: false, menu: false, editing: null, draft: '', search: null, confirm: null, dsel: null, dedit: null, dlabel: null, dmen: null, dlink: null, dbox: null };
  }
  // fresh = es otro espacio de trabajo: lo que falte en la carpeta empieza vacío y se conserva la configuración actual.
  fsApply(data, fresh) {
    const m = data.meta || {}, v = m.vista || {};
    _uid = Math.max(_uid, naMaxId([data.notas, data.agenda, data.diagrama]));
    const up = !(m.config && m.config.mkdV2), mig = list => refMigDeep(up ? mkdMigNotes(list) : list), rmig = !(m.config && m.config.rutasV3);
    const act = (list, sec) => { const id = sec && sec.activa; return list.some(n => n.id === id) ? id : list.length ? list[0].id : null; };
    // Cada ventana con sus notas de la carpeta. Si la carpeta no tiene una sección (p. ej. Diagramas en una
    // carpeta de antes): en la misma carpeta se mantiene la que ya había en la app; en otro espacio de trabajo, vacía.
    const now = winsOf(this.state); let all = {};
    WINS.forEach(k => { const list = data[k]; all[k] = Array.isArray(list) ? { notes: mig(list), activeNote: act(list, m[k]) } : fresh ? WIN_EMPTY() : now[k]; });
    if (rmig) all = rutasMig(all, !!(m.config && m.config.rutasV2)); // rutas a otra ventana sin su palabra delante (renombrar.js)
    const mode = WINS.includes(v.mode) ? v.mode : 'notas';
    const config = { ...(fresh ? { ...(m.config || {}), ...(this.state.config || {}) } : (m.config || {})), mkdV2: true, rutasV3: true }; delete config.rutasV2;
    this._rev = +m.rev || 0; this._naHold = true; fsSetSavedRev(this._rev);
    this.setState({ ...winPatch(all, mode), clean: typeof v.clean === 'boolean' ? v.clean : this.state.clean, calView: v.calView || {}, lsel: v.lsel || {}, config, ...this.fsReset() });
  }
  // Espacio de trabajo nuevo (carpeta vacía): Notas, Agenda y Diagrama empiezan sin nada. Se conserva la configuración.
  fsBlank() {
    const all = {}; WINS.forEach(k => { all[k] = WIN_EMPTY(); });
    this._rev = Date.now(); this._naHold = true;
    this.setState({ ...winPatch(all, this.state.mode), calView: {}, lsel: {}, config: { ...(this.state.config || {}), mkdV2: true, rutasV3: true }, ...this.fsReset() });
  }
  fsQueue() {
    if (!this._fsDir || this.state.fs !== 'on') return;
    if (this._fsBusy) { this._fsAgain = true; return; }
    this._fsBusy = true;
    const dir = this._fsDir;
    conLimite(this.fsSync(), FS_GUARDAR, 'guardar').then(() => { this._fsFallos = 0; }).catch(err => this.fsFail(err, dir)).finally(() => { this._fsBusy = false; if (this._fsAgain) { this._fsAgain = false; this.fsQueue(); } });
  }
  async fsFail(err, dir) {
    if (this.state.fs !== 'on' || (dir && dir !== this._fsDir)) return;
    // «No se encuentra» pero la carpeta sigue ahí: algo quitó un archivo mientras se guardaba. No se desconecta:
    // se reintenta en unos segundos. Solo si falla varias veces seguidas se avisa (punto naranja).
    if (err && err.name === 'NotFoundError' && !(await this.fsDesaparecida(this._fsDir))) {
      this._fsFallos = (this._fsFallos || 0) + 1;
      if (this._fsFallos < FS_REINTENTOS) { clearTimeout(this._fsReT); this._fsReT = setTimeout(() => this.fsQueue(), 2000 * this._fsFallos); return; }
      this._fsFallos = 0;
      this.setState({ fs: 'err' });
      this.fsToast('No se pudo guardar en la carpeta', 'La carpeta «' + this.state.fsName + '» sigue ahí, pero algo está moviendo sus archivos (por ejemplo, OneDrive sincronizando). Pulsa el botón de la carpeta (abajo a la izquierda) para reintentar. Tus cambios siguen guardados en el navegador.');
      return;
    }
    if (this.state.fs !== 'on') return;
    // La carpeta ya no existe (borrada o movida): se olvida. Las notas siguen en el navegador.
    if (err && err.name === 'NotFoundError') {
      const name = this.state.fsName;
      this._fsGone = name; // para avisar en la ventana de fsPick de dónde venían las notas del navegador
      this._fsDir = null; this._fsCache = {}; this._fsImgs = new Set(); imgFolder(null); fsSetHandle(null);
      this.setState({ fs: 'off', fsName: '' });
      this.fsToast('La carpeta «' + name + '» ya no existe', 'Lo que tenías abierto sigue en la app. Pulsa el botón de la carpeta (abajo a la izquierda) para elegir dónde guardarlo; si la moviste, elígela en su nuevo sitio.');
      return;
    }
    if (err && err.name === 'TimeoutError') { this.setState({ fs: 'err' }); this.fsToast('No se pudo guardar en la carpeta', fsTardaTexto(err.paso, this.state.fsName) + ' Tus cambios siguen guardados en el navegador; pulsa el botón de la carpeta para reintentar.'); return; }
    const perm = !!err && (err.name === 'NotAllowedError' || err.name === 'SecurityError');
    this.setState({ fs: perm ? 'perm' : 'err' });
    this.fsToast('No se pudo guardar en la carpeta', perm ? 'Pulsa el botón de la carpeta (abajo a la izquierda) para dar permiso de nuevo. Tus cambios siguen guardados en el navegador.' : 'Pulsa el botón de la carpeta (abajo a la izquierda) para reintentar. Tus cambios siguen guardados en el navegador.');
  }
  async fsSync() {
    const dir = this._fsDir, s = this.state, rev = this._rev || 0, secs = fsSections(s), cache = this._fsCache || (this._fsCache = {}), imgs = new Set();
    const meta = { app: 'NoteApp', formato: 1, rev, config: s.config || {}, vista: { mode: s.mode, clean: s.clean, calView: s.calView || {}, lsel: s.lsel || {} } };
    for (const [key, folder] of FS_SECS) {
      const sec = secs[key], notes = (sec && sec.notes) || [];
      meta[key] = { activa: sec ? sec.activeNote : null, orden: notes.map(n => n.id) };
      const d = await dir.getDirectoryHandle(folder, { create: true }), want = {};
      for (const n of notes) {
        const fn = fsFileName(n), txt = JSON.stringify({ app: 'NoteApp', formato: 1, seccion: key, nota: n }, null, 2);
        want[fn] = 1; imgNamesIn(txt, imgs);
        if (cache[folder + '/' + fn] !== txt) { await fsWrite(d, fn, txt); cache[folder + '/' + fn] = txt; }
      }
      const old = [];
      for await (const [name, h] of d.entries()) if (h.kind === 'file' && FS_FILE_RX.test(name) && !want[name]) old.push(name);
      for (const name of old) {
        try { await d.removeEntry(name); } catch (err) { if (!err || err.name !== 'NotFoundError') throw err; } // ya lo había quitado otro (OneDrive, otra ventana)
        delete cache[folder + '/' + name];
      }
    }
    // Imágenes pegadas (js/motor/imagenes.js): se copian a <carpeta>/Imágenes las que aún no estén. Nunca se borran.
    await imgSyncDir(dir, imgs, this._fsImgs || (this._fsImgs = new Set()));
    const mtxt = JSON.stringify(meta, null, 2);
    if (cache[FS_META] !== mtxt) { await fsWrite(dir, FS_META, mtxt); cache[FS_META] = mtxt; }
    if (dir === this._fsDir) fsSetSavedRev(rev);
  }
});
