// Guardado en una carpeta del ordenador (solo Chrome/Edge de escritorio).
// Cada carpeta es un ESPACIO DE TRABAJO independiente (como las bóvedas de Obsidian): tiene sus propias
// notas, agenda y diagramas. Al abrir otra carpeta NO se copia nada de la anterior a la nueva: si la nueva
// está vacía, se empieza de cero. Lo único que se conserva al cambiar es la configuración (state.config).
NoteApp.partes.push(Base => class extends Base {
  // ----- Guardado en carpeta -----
  fsToast(title, body) {
    const id = uid('t');
    this.setState(st => ({ toasts: (st.toasts || []).concat({ id, title, body, when: '' }).slice(-4) }));
    setTimeout(() => this.setState(st => ({ toasts: (st.toasts || []).filter(t => t.id !== id) })), 7000);
  }
  async fsPick() {
    if (!FS_OK) { this.fsToast('Guardado en carpeta no disponible', 'Este navegador no lo permite. Usa Chrome o Edge en un ordenador. Tus notas siguen guardadas en el navegador.'); return; }
    if (this._fsPicking) return;
    if (this._fsDir && (this.state.fs === 'perm' || this.state.fs === 'err')) {
      let p = 'denied'; try { p = await this._fsDir.requestPermission({ mode: 'readwrite' }); } catch (_) {}
      if (p === 'granted') { this.fsStart(this._fsDir, false); return; }
    }
    let dir; try { dir = await window.showDirectoryPicker({ id: 'noteapp', mode: 'readwrite' }); } catch (_) { return; }
    this._fsPicking = true;
    try {
      const prev = this.state.fsName, leave = await this.fsLeave(dir);
      if (leave === 'blocked') {
        this.fsToast('No se ha cambiado de carpeta', 'Hay cambios que aún no se han guardado en «' + prev + '». Pulsa el botón de la carpeta y da permiso a «' + prev + '» para guardarlos; después ya podrás abrir otra carpeta.');
        return;
      }
      // Sin carpeta anterior (primera vez) o la anterior ya no existe, y la elegida está vacía: las notas del
      // navegador son la única copia, así que se pregunta si pasarlas a la carpeta o empezar vacía (fsAnswer).
      if (leave === 'none' || leave === 'gone') {
        let empty = false; try { empty = !(await fsRead(dir)); } catch (_) {}
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
      await this.fsStart(dir, leave !== 'same', leave === 'ok' ? prev : null);
    } finally { this._fsPicking = false; }
  }
  // Antes de abrir otra carpeta, guarda lo último en la actual. Devuelve:
  // 'none' = no había carpeta · 'same' = ha elegido la misma · 'ok' = la anterior está guardada
  // 'gone' = la anterior ya no existe · 'blocked' = hay cambios sin guardar en la anterior y no hay permiso
  async fsLeave(dir) {
    const old = this._fsDir;
    if (!old) return 'none';
    try { if (await old.isSameEntry(dir)) return 'same'; } catch (_) {}
    clearTimeout(this._naT); naSave(this.state, this._rev);
    while (this._fsBusy) await new Promise(r => setTimeout(r, 50));
    let p = 'denied'; try { p = await old.queryPermission({ mode: 'readwrite' }); } catch (_) {}
    if (p === 'granted') {
      this._fsBusy = true;
      try { await this.fsSync(); return 'ok'; }
      catch (err) { if (err && err.name === 'NotFoundError') return 'gone'; }
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
      const data = await fsRead(dir);
      const has = !!data, fresh = !!prev || !!empty;
      const load = has && (chosen || (+data.meta.rev || 0) > (this._rev || 0));
      this._fsDir = dir; this._fsCache = {};
      if (load) this.fsApply(data, fresh);
      else if (fresh) this.fsBlank();
      await fsSetHandle(dir);
      this._fsGone = '';
      this.setState({ fs: 'on', fsName: dir.name }, () => this.fsQueue());
      if (prev) this.fsToast(load ? 'Espacio de trabajo abierto' : 'Espacio de trabajo nuevo', (load ? 'Se han cargado las notas de «' + dir.name + '».' : '«' + dir.name + '» empieza vacío; todo lo que crees se guardará ahí.') + ' Las notas de «' + prev + '» siguen en su carpeta: para volver, pulsa el botón de la carpeta y elígela.');
      else if (empty && !load) this.fsToast('Espacio de trabajo nuevo', '«' + dir.name + '» empieza vacío; todo lo que crees se guardará ahí.');
      else if (chosen) this.fsToast('Carpeta conectada', load ? 'Se han cargado las notas guardadas en «' + dir.name + '». A partir de ahora todo se guarda ahí automáticamente.' : 'A partir de ahora todo se guarda automáticamente en «' + dir.name + '».');
      else if (load) this.fsToast('Notas actualizadas', 'Se han cargado los cambios más recientes de la carpeta «' + dir.name + '».');
    } catch (_) {
      this._fsDir = dir; this.setState({ fs: 'err', fsName: dir.name });
      this.fsToast('No se pudo abrir la carpeta', 'Pulsa el botón de la carpeta (abajo a la izquierda) para intentarlo de nuevo.');
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
    const up = !(m.config && m.config.mkdV2), mig = list => refMigDeep(up ? mkdMigNotes(list) : list);
    const act = (list, sec) => { const id = sec && sec.activa; return list.some(n => n.id === id) ? id : list.length ? list[0].id : null; };
    // Cada ventana con sus notas de la carpeta. Si la carpeta no tiene una sección (p. ej. Diagramas en una
    // carpeta de antes): en la misma carpeta se mantiene la que ya había en la app; en otro espacio de trabajo, vacía.
    const now = winsOf(this.state), all = {};
    WINS.forEach(k => { const list = data[k]; all[k] = Array.isArray(list) ? { notes: mig(list), activeNote: act(list, m[k]) } : fresh ? WIN_EMPTY() : now[k]; });
    const mode = WINS.includes(v.mode) ? v.mode : 'notas';
    const config = fresh ? { ...(m.config || {}), ...(this.state.config || {}), mkdV2: true } : up ? { ...(m.config || {}), mkdV2: true } : (m.config || {});
    this._rev = +m.rev || 0; this._naHold = true; fsSetSavedRev(this._rev);
    this.setState({ ...winPatch(all, mode), clean: typeof v.clean === 'boolean' ? v.clean : this.state.clean, calView: v.calView || {}, lsel: v.lsel || {}, config, ...this.fsReset() });
  }
  // Espacio de trabajo nuevo (carpeta vacía): Notas, Agenda y Diagrama empiezan sin nada. Se conserva la configuración.
  fsBlank() {
    const all = {}; WINS.forEach(k => { all[k] = WIN_EMPTY(); });
    this._rev = Date.now(); this._naHold = true;
    this.setState({ ...winPatch(all, this.state.mode), calView: {}, lsel: {}, config: { ...(this.state.config || {}), mkdV2: true }, ...this.fsReset() });
  }
  fsQueue() {
    if (!this._fsDir || this.state.fs !== 'on') return;
    if (this._fsBusy) { this._fsAgain = true; return; }
    this._fsBusy = true;
    this.fsSync().catch(err => this.fsFail(err)).finally(() => { this._fsBusy = false; if (this._fsAgain) { this._fsAgain = false; this.fsQueue(); } });
  }
  fsFail(err) {
    if (this.state.fs !== 'on') return;
    // La carpeta ya no existe (borrada o movida): se olvida. Las notas siguen en el navegador.
    if (err && err.name === 'NotFoundError') {
      const name = this.state.fsName;
      this._fsGone = name; // para avisar en la ventana de fsPick de dónde venían las notas del navegador
      this._fsDir = null; this._fsCache = {}; fsSetHandle(null);
      this.setState({ fs: 'off', fsName: '' });
      this.fsToast('La carpeta «' + name + '» ya no existe', 'Lo que tenías abierto sigue en la app. Pulsa el botón de la carpeta (abajo a la izquierda) para elegir dónde guardarlo; si la moviste, elígela en su nuevo sitio.');
      return;
    }
    const perm = !!err && (err.name === 'NotAllowedError' || err.name === 'SecurityError');
    this.setState({ fs: perm ? 'perm' : 'err' });
    this.fsToast('No se pudo guardar en la carpeta', perm ? 'Pulsa el botón de la carpeta (abajo a la izquierda) para dar permiso de nuevo. Tus cambios siguen guardados en el navegador.' : 'Pulsa el botón de la carpeta (abajo a la izquierda) para reintentar. Tus cambios siguen guardados en el navegador.');
  }
  async fsSync() {
    const dir = this._fsDir, s = this.state, rev = this._rev || 0, secs = fsSections(s), cache = this._fsCache || (this._fsCache = {});
    const meta = { app: 'NoteApp', formato: 1, rev, config: s.config || {}, vista: { mode: s.mode, clean: s.clean, calView: s.calView || {}, lsel: s.lsel || {} } };
    for (const [key, folder] of FS_SECS) {
      const sec = secs[key], notes = (sec && sec.notes) || [];
      meta[key] = { activa: sec ? sec.activeNote : null, orden: notes.map(n => n.id) };
      const d = await dir.getDirectoryHandle(folder, { create: true }), want = {};
      for (const n of notes) {
        const fn = fsFileName(n), txt = JSON.stringify({ app: 'NoteApp', formato: 1, seccion: key, nota: n }, null, 2);
        want[fn] = 1;
        if (cache[folder + '/' + fn] !== txt) { await fsWrite(d, fn, txt); cache[folder + '/' + fn] = txt; }
      }
      const old = [];
      for await (const [name, h] of d.entries()) if (h.kind === 'file' && FS_FILE_RX.test(name) && !want[name]) old.push(name);
      for (const name of old) { await d.removeEntry(name); delete cache[folder + '/' + name]; }
    }
    const mtxt = JSON.stringify(meta, null, 2);
    if (cache[FS_META] !== mtxt) { await fsWrite(dir, FS_META, mtxt); cache[FS_META] = mtxt; }
    if (dir === this._fsDir) fsSetSavedRev(rev);
  }
});
