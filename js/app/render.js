// renderVals(): todos los valores y funciones que usan las plantillas (index.html y componentes/).
// Para añadir algo nuevo a la interfaz: añade la clave aquí y úsala en la plantilla del componente.
NoteApp.partes.push(Base => class extends Base {
  renderVals() {
    const s = this.state;
    const note = this.curNote(s);
    const sheet = this.curSheet(s);
    NOW = Date.now();
    const W = makeWorld(s), ag = s.mode === 'agenda', get = W.at(sheet ? sheet.id : '');
    RESOLVE = get;
    const dirty = !s.clean;
    const entList = sheet ? (sheet.entities || []) : [];
    const tabs = s.notes.map(n => this.makeTab('note', n.id, n.name, n.id === s.activeNote, false));
    const sheets = note ? note.sheets.map((x, i, all) => {
      const t = this.makeTab('sheet', x.id, x.name, x.id === note.activeSheet, true), on = x.id === note.activeSheet && t.readOnly;
      return { ...t, sid: x.id, canLeft: on && i > 0, canRight: on && i < all.length - 1,
        noFocus: e => e.preventDefault(), moveLeft: () => this.moveSheet(x.id, -1), moveRight: () => this.moveSheet(x.id, 1) };
    }) : [];
    const src = sheet ? sheet.lines : [];

    const lines = this.mkdLines(src, null);

    const v = {
      tabs,
      sheets,
      lines,
      hasSheet: !!sheet,
      agendaEmpty: ag && !!sheet && !entList.length,
      colMax: ag ? '860px' : 'none',
      clockTxt: cap(new Date(NOW).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })) + ' · ' + new Date(NOW).toLocaleTimeString('es-ES'),
      addDate: () => this.addEnt('date'),
      addCount: () => this.addEnt('count'),
      addCheck: () => this.addEnt('toggle'),
      addNotif: () => { this.askPerm(); this.addEnt('notif'); },
      addText: () => this.addText(),
      toasts: (s.toasts || []).map(t => ({ ...t, close: () => this.setState(st => ({ toasts: (st.toasts || []).filter(x => x.id !== t.id) })) })),
      dirty,
      entGap: dirty ? '34px' : '27px',
      entities: entList.map((e, i) => Object.assign(this.entView(e, i, entList, get, dirty), { tipo: e.type })),
      addExpr: () => this.addEnt('expr'),
      addToggle: () => this.addEnt('toggle'),
      addTable: () => this.addEnt('table'),
      addSlider: () => this.addEnt('slider'),
      addPct: () => this.addEnt('pct'),
      addSep: () => this.addSep(),
      addLogic: () => this.addEnt('logic'),
      menuOpen: s.menu,
      noNote: !note,
      dotColor: s.menu ? '#a6a6a6' : '#7a7a7a',
      sheetItemOpacity: sheet ? 1 : 0.4,
      noteItemOpacity: note ? 1 : 0.4,
      toggleMenu: () => this.setState(st => ({ menu: !st.menu })),
      deleteSheet: () => this.setState(st => {
        const n = this.curNote(st); if (!n || !n.activeSheet) return { menu: false };
        const k = n.sheets.findIndex(x => x.id === n.activeSheet);
        const rest = n.sheets.filter(x => x.id !== n.activeSheet);
        const nx = rest[Math.min(k, rest.length - 1)];
        return { menu: false, focusId: null, notes: st.notes.map(m => m.id !== n.id ? m : { ...m, sheets: rest, activeSheet: nx ? nx.id : null }) };
      }),
      deleteNote: () => this.setState(st => {
        const k = st.notes.findIndex(m => m.id === st.activeNote); if (k < 0) return { menu: false };
        const rest = st.notes.filter(m => m.id !== st.activeNote);
        const nx = rest[Math.min(k, rest.length - 1)];
        return { menu: false, focusId: null, editing: null, notes: rest, activeNote: nx ? nx.id : null };
      }),
      noSheet: !sheet,
      addNote: () => { const n = { id: uid('n'), name: 'Nueva nota', sheets: [], activeSheet: null }; this.setState(st => ({ notes: st.notes.concat(n), activeNote: n.id, focusId: null })); },
      addSheet: () => { if (!note) return; const x = mkSheet('Nueva hoja'); this.setState(st => ({ focusId: null, notes: st.notes.map(n => n.id !== st.activeNote ? n : { ...n, sheets: n.sheets.concat(x), activeSheet: x.id }) })); },
      taRef: this.taRef,
      clean: s.clean,
      knobLeft: s.clean ? '16px' : '0px',
      knobColor: s.clean ? '#008000' : '#8a8a8a',
      toggleView: () => { const a = document.activeElement; if (a && a.tagName === 'TEXTAREA') a.blur(); this.setState(st => ({ clean: !st.clean, focusId: null, field: null, colMenu: null, entMenu: null })); },
      panelCursor: s.clean ? 'default' : 'text',
      panelRef: this.panelRef,
      panelWidth: (sheet ? sheet.width : W0) + 'px',
      handleColor: s.dragging ? '#008000' : 'transparent',
      panelDown: e => {
        if (s.clean) return;
        if (e.target.dataset && e.target.dataset.handle) return;
        if (e.target.closest && e.target.closest('[data-line]')) return;
        if (e.nativeEvent.offsetX >= e.target.clientWidth) return;
        e.preventDefault();
        const last = src[src.length - 1];
        if (last) this.focusLine(last.id, last.text.length);
      },
      resizeDown: e => { e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); this._rs = { x: e.clientX, w: this.panelRef.current.getBoundingClientRect().width }; this.setState({ dragging: true }); document.body.style.cursor = 'col-resize'; },
      resizeMove: e => { if (!this._rs) return; const p = this.panelRef.current.parentElement.closest(':not(.sc-host)').getBoundingClientRect().width; const w = Math.round(Math.max(200, Math.min(p - 440, this._rs.w + e.clientX - this._rs.x))); const cur = this.curSheet(this.state); if (cur && w !== cur.width) this.setWidth(w); },
      resizeUp: () => { if (!this._rs) return; this._rs = null; this.setState({ dragging: false }); document.body.style.cursor = ''; },
      resizeReset: () => this.setWidth(W0),
      fsPick: () => this.fsPick(),
      fsIcon: s.fs === 'on' ? '#fff' : '#5a5a5a',
      fsDot: s.fs === 'on' ? '#00a000' : s.fs === 'perm' || s.fs === 'err' ? '#d08a00' : 'transparent',
      fsTitle: !FS_OK ? 'Guardar en carpeta: solo disponible en Chrome o Edge de ordenador' : s.fs === 'on' ? 'Guardando en la carpeta «' + s.fsName + '». Clic para cambiar de carpeta' : s.fs === 'perm' ? 'Clic para volver a dar permiso a la carpeta «' + s.fsName + '»' : s.fs === 'err' ? 'Problema con la carpeta «' + s.fsName + '». Clic para reintentar' : 'Clic para elegir la carpeta donde guardar todo',
      isNotas: s.mode === 'notas',
      isAgenda: s.mode === 'agenda',
      pillTop: s.mode === 'notas' ? '37px' : '0px',
      toggleMode: () => this.setState(st => ({ mode: st.mode === 'notas' ? 'agenda' : 'notas', notes: st.other.notes, activeNote: st.other.activeNote, other: { notes: st.notes, activeNote: st.activeNote }, focusId: null, field: null, entMenu: null, colMenu: null, menu: false, editing: null }))
    };
    v.ui = v; // los componentes reciben todos estos valores con dc-props="{{ ui }}"
    return v;
  }
});
