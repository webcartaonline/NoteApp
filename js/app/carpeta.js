// Guardado en una carpeta del ordenador (solo Chrome/Edge de escritorio).
NoteApp.partes.push(Base => class extends Base {
  // ----- Guardado en carpeta -----
  fsToast(title, body) {
    const id = uid('t');
    this.setState(st => ({ toasts: (st.toasts || []).concat({ id, title, body, when: '' }).slice(-4) }));
    setTimeout(() => this.setState(st => ({ toasts: (st.toasts || []).filter(t => t.id !== id) })), 7000);
  }
  async fsPick() {
    if (!FS_OK) { this.fsToast('Guardado en carpeta no disponible', 'Este navegador no lo permite. Usa Chrome o Edge en un ordenador. Tus notas siguen guardadas en el navegador.'); return; }
    if (this._fsDir && (this.state.fs === 'perm' || this.state.fs === 'err')) {
      let p = 'denied'; try { p = await this._fsDir.requestPermission({ mode: 'readwrite' }); } catch (_) {}
      if (p === 'granted') { this.fsStart(this._fsDir, false); return; }
    }
    let dir; try { dir = await window.showDirectoryPicker({ id: 'noteapp', mode: 'readwrite' }); } catch (_) { return; }
    this.fsStart(dir, true);
  }
  async fsStart(dir, chosen) {
    try {
      const data = await fsRead(dir);
      const has = !!data;
      const load = has && (chosen || (+data.meta.rev || 0) > (this._rev || 0));
      this._fsDir = dir; this._fsCache = {};
      if (load) this.fsApply(data);
      await fsSetHandle(dir);
      this.setState({ fs: 'on', fsName: dir.name }, () => this.fsQueue());
      if (chosen) this.fsToast('Carpeta conectada', load ? 'Se han cargado las notas guardadas en «' + dir.name + '». A partir de ahora todo se guarda ahí automáticamente.' : 'A partir de ahora todo se guarda automáticamente en «' + dir.name + '».');
      else if (load) this.fsToast('Notas actualizadas', 'Se han cargado los cambios más recientes de la carpeta «' + dir.name + '».');
    } catch (_) {
      this._fsDir = dir; this.setState({ fs: 'err', fsName: dir.name });
      this.fsToast('No se pudo abrir la carpeta', 'Pulsa el botón de la carpeta (abajo a la izquierda) para intentarlo de nuevo.');
    }
  }
  fsApply(data) {
    const m = data.meta || {}, v = m.vista || {};
    _uid = Math.max(_uid, naMaxId([data.notas, data.agenda, data.diagrama]));
    const up = !(m.config && m.config.mkdV2), mig = list => refMigDeep(up ? mkdMigNotes(list) : list);
    const act = (list, sec) => { const id = sec && sec.activa; return list.some(n => n.id === id) ? id : list.length ? list[0].id : null; };
    // Cada ventana con sus notas de la carpeta. Si la carpeta no tiene una sección (p. ej. Diagramas en una
    // carpeta de antes), se mantiene la que ya había en la app.
    const now = winsOf(this.state), all = {};
    WINS.forEach(k => { const list = data[k]; all[k] = Array.isArray(list) ? { notes: mig(list), activeNote: act(list, m[k]) } : now[k]; });
    const mode = WINS.includes(v.mode) ? v.mode : 'notas';
    this._rev = +m.rev || 0; this._naHold = true;
    this.setState({ ...winPatch(all, mode), clean: typeof v.clean === 'boolean' ? v.clean : this.state.clean, calView: v.calView || {}, lsel: v.lsel || {}, config: up ? { ...(m.config || {}), mkdV2: true } : (m.config || {}), focusId: null, field: null, entMenu: null, colMenu: null, menu: false, editing: null, draft: '' });
  }
  fsQueue() {
    if (!this._fsDir || this.state.fs !== 'on') return;
    if (this._fsBusy) { this._fsAgain = true; return; }
    this._fsBusy = true;
    this.fsSync().catch(err => this.fsFail(err)).finally(() => { this._fsBusy = false; if (this._fsAgain) { this._fsAgain = false; this.fsQueue(); } });
  }
  fsFail(err) {
    if (this.state.fs !== 'on') return;
    const perm = !!err && (err.name === 'NotAllowedError' || err.name === 'SecurityError');
    this.setState({ fs: perm ? 'perm' : 'err' });
    this.fsToast('No se pudo guardar en la carpeta', perm ? 'Pulsa el botón de la carpeta (abajo a la izquierda) para dar permiso de nuevo. Tus cambios siguen guardados en el navegador.' : 'Pulsa el botón de la carpeta (abajo a la izquierda) para reintentar. Tus cambios siguen guardados en el navegador.');
  }
  async fsSync() {
    const dir = this._fsDir, s = this.state, secs = fsSections(s), cache = this._fsCache || (this._fsCache = {});
    const meta = { app: 'NoteApp', formato: 1, rev: this._rev || 0, config: s.config || {}, vista: { mode: s.mode, clean: s.clean, calView: s.calView || {}, lsel: s.lsel || {} } };
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
  }
});
