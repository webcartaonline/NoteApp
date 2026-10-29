// renderVals(): todos los valores y funciones que usan las plantillas (index.html y componentes/).
// Para añadir algo nuevo a la interfaz: añade la clave aquí y úsala en la plantilla del componente.
NoteApp.partes.push(Base => class extends Base {
  renderVals() {
    const s = this.state;
    const note = this.curNote(s);
    const sheet = this.curSheet(s);
    NOW = Date.now();
    const W = makeWorld(s), ag = s.mode === 'agenda', dg = s.mode === 'diagrama', nt = s.mode === 'notas', get = W.at(sheet ? sheet.id : '');
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
      colMax: ag ? 'max(860px, 82%)' : 'none',
      clockTxt: cap(new Date(NOW).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })) + ' · ' + new Date(NOW).toLocaleTimeString('es-ES'),
      addDate: () => this.addEnt('date'),
      addCount: () => this.addEnt('count'),
      addCheck: () => this.addEnt('toggle'),
      addNotif: () => { this.askPerm(); this.addEnt('notif'); },
      addText: () => this.addText(),
      toasts: (s.toasts || []).map(t => ({ ...t, close: () => this.setState(st => ({ toasts: (st.toasts || []).filter(x => x.id !== t.id) })) })),
      dirty,
      entGap: dirty ? '34px' : '27px',
      entities: dg ? [] : entList.map((e, i) => Object.assign(this.entView(e, i, entList, get, dirty), { tipo: e.type })),
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
      deleteSheet: () => this.askDelete('sheet'), // abre la ventana de confirmación (js/app/confirmar.js)
      deleteNote: () => this.askDelete('note'),
      deleteNoteTxt: dg ? 'Eliminar diagrama' : 'Eliminar nota',
      noSheet: !sheet,
      addNote: () => { const n = { id: uid('n'), name: dg ? 'Nuevo diagrama' : 'Nueva nota', sheets: [], activeSheet: null }; this.setState(st => ({ notes: st.notes.concat(n), activeNote: n.id, focusId: null })); },
      addSheet: () => { if (!note) return; const x = dg ? mkDiagSheet('Nueva hoja') : mkSheet('Nueva hoja'); this.setState(st => ({ focusId: null, notes: st.notes.map(n => n.id !== st.activeNote ? n : { ...n, sheets: n.sheets.concat(x), activeSheet: x.id }) })); },
      taRef: this.taRef,
      clean: s.clean,
      knobLeft: s.clean ? '16px' : '0px',
      knobColor: s.clean ? '#008000' : '#8a8a8a',
      toggleView: () => { const a = document.activeElement; if (a && a.tagName === 'TEXTAREA') a.blur(); this.setState(st => ({ clean: !st.clean, focusId: null, field: null, colMenu: null, entMenu: null, dsel: null, dedit: null, dlabel: null, dmen: null })); },
      panelCursor: s.clean ? 'default' : 'text',
      panelRef: this.panelRef,
      panelWidth: (sheet ? sheet.width : W0) + 'px',
      // Ocultar entidades (solo Notas): campo "full" de la hoja. true = el texto usa todo el ancho.
      canFull: nt && !!sheet,
      full: nt && !!(sheet && sheet.full),
      showEnts: !(nt && sheet && sheet.full),
      panelFlex: nt && sheet && sheet.full ? '1 1 0%' : '0 1 ' + (sheet ? sheet.width : W0) + 'px',
      fullColor: sheet && sheet.full ? '#008000' : '#8a8a8a',
      fullTitle: sheet && sheet.full ? 'Mostrar entidades' : 'Ocultar entidades (el texto ocupa todo el ancho)',
      toggleFull: () => this.toggleFull(),
      // Copiar todo el texto de la hoja (barra superior del panel de texto): el botón abre un menú con
      // «Copiar Markdown» y «Copiado literal». El icono se pone verde un momento tras copiar con cualquiera.
      copyMenuOpen: !!s.copyMenu,
      toggleCopyMenu: () => this.setState(st => ({ copyMenu: !st.copyMenu })),
      copyMd: () => this.copySheetMd(),
      copyRaw: () => this.copySheetRaw(),
      copyMdColor: sheet && (s.copied === 'md:' + sheet.id || s.copied === 'lit:' + sheet.id) ? '#008000' : s.copyMenu ? '#fff' : '#8a8a8a',
      copyMdTitle: sheet && (s.copied === 'md:' + sheet.id || s.copied === 'lit:' + sheet.id) ? 'Copiado' : 'Copiar todo el texto de la hoja',
      // Exportar la hoja activa a Markdown (barra superior del panel de texto).
      exportMd: () => this.exportSheetMd(),
      exportColor: sheet && s.exported === sheet.id ? '#008000' : '#8a8a8a',
      exportTitle: sheet && s.exported === sheet.id ? 'Exportado' : 'Exportar esta hoja a un archivo Markdown (.md)',
      // Buscar dentro del texto de la hoja (barra superior del panel de texto). Las coincidencias
      // se calculan en mkdLines (js/app/lineas.js) y se guardan en this._matches.
      stopBar: e => e.stopPropagation(),
      searchQuery: (s.search && s.search.q) || '',
      hasSearch: !!(s.search && s.search.q),
      searchCountTxt: (() => { const t = (this._matches || []).length; if (!s.search || !s.search.q) return ''; if (!t) return 'Sin resultados'; const k = ((s.search.active % t) + t) % t; return (k + 1) + ' / ' + t; })(),
      onSearchChange: e => this.setState({ search: { q: e.target.value, active: 0 } }),
      onSearchKey: e => { if (e.key === 'Enter') { e.preventDefault(); this.searchStep(e.shiftKey ? -1 : 1); } else if (e.key === 'Escape') { e.preventDefault(); e.target.blur(); this.setState({ search: null }); } },
      searchPrev: () => this.searchStep(-1),
      searchNext: () => this.searchStep(1),
      searchClear: () => this.setState({ search: null }),
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
      isNotas: nt,
      isAgenda: ag,
      isDiagrama: dg,
      notDiagrama: !dg,
      // Selector de ventana (barra lateral): Agenda arriba, Notas en el centro y Diagrama abajo
      pillTop: ag ? '0px' : nt ? '37px' : '74px',
      goAgenda: () => this.setMode('agenda'),
      goNotas: () => this.setMode('notas'),
      goDiagrama: () => this.setMode('diagrama'),
      // Formas de la ventana Diagrama (js/app/diagrama.js)
      addProceso: () => this.dgAdd('proceso'),
      addDecision: () => this.dgAdd('decision'),
      addInicio: () => this.dgAdd('inicio'),
      addDato: () => this.dgAdd('dato'),
      addNotaDg: () => this.dgAdd('nota'),
      addTextoDg: () => this.dgAdd('texto'),
      addZona: () => this.dgAdd('zona')
    };
    Object.assign(v, this.confirmVals(s)); // ventana de confirmación al eliminar
    if (dg && sheet) Object.assign(v, this.dgVals(s, sheet)); // lienzo del diagrama
    v.ui = v; // los componentes reciben todos estos valores con dc-props="{{ ui }}"
    return v;
  }
});
