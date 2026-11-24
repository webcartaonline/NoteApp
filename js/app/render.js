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
    const tabs = s.notes.map((n, i, all) => {
      const t = this.makeTab('note', n.id, n.name, n.id === s.activeNote, false), on = n.id === s.activeNote && t.readOnly;
      return { ...t, nid: n.id, canLeft: on && i > 0, canRight: on && i < all.length - 1,
        noFocus: e => e.preventDefault(), moveLeft: () => this.moveNote(n.id, -1), moveRight: () => this.moveNote(n.id, 1) };
    });
    const sheets = note ? note.sheets.map((x, i, all) => {
      const t = this.makeTab('sheet', x.id, x.name, x.id === note.activeSheet, true), on = x.id === note.activeSheet && t.readOnly;
      return { ...t, sid: x.id, canLeft: on && i > 0, canRight: on && i < all.length - 1,
        noFocus: e => e.preventDefault(), moveLeft: () => this.moveSheet(x.id, -1), moveRight: () => this.moveSheet(x.id, 1) };
    }) : [];

    const v = {
      tabs,
      sheets,
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
      toggleView: () => this.toggleView(),
      // Campos de texto MKD (componente panel-texto, uno por campo; cada uno recibe sus valores en "c").
      // Notas: la fila de campos de la hoja (campos, js/app/campos.js). Diagrama: el campo flotante (dgCampo).
      // Ocultar entidades: campo "full" de la hoja (js/motor/campos.js); entonces no se dibuja la columna de entidades.
      // Sin entidades en la hoja (Notas) tampoco se dibuja la columna: los campos aprovechan ese hueco (5.1.0.0).
      showEnts: !(nt && (campoFull(sheet) || !entList.length)),
      stopBar: e => e.stopPropagation(),
      fsPick: () => this.fsPick(),
      fsIcon: s.fs === 'on' ? '#fff' : '#5a5a5a',
      fsDot: s.fs === 'on' ? '#00a000' : s.fs === 'perm' || s.fs === 'err' ? '#d08a00' : 'transparent',
      fsTitle: !FS_OK ? 'Guardar en carpeta: solo disponible en Chrome o Edge de ordenador' : s.fs === 'on' ? 'Espacio de trabajo «' + s.fsName + '»: todo se guarda en esta carpeta. Clic para abrir otra carpeta (otro espacio de trabajo)' : s.fs === 'perm' ? 'Clic para volver a dar permiso a la carpeta «' + s.fsName + '»' : s.fs === 'err' ? 'Problema con la carpeta «' + s.fsName + '». Clic para reintentar' : 'Clic para elegir la carpeta (espacio de trabajo) donde guardar todo',
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
      addZona: () => this.dgAdd('zona'),
      addTablaDg: () => this.dgAdd('tabla'), // tabla de un diagrama entidad-relación
      // Campo de texto MKD flotante del Diagrama (campo "mkd" de cada hoja: true = se ve). Su texto va en hoja.lines.
      dgMkdBtn: dg && !!sheet,
      dgMkdOn: dg && !!(sheet && sheet.mkd),
      dgMkdToggle: () => this.dgMkdToggle(),
      dgMkdColor: dg && sheet && sheet.mkd ? '#008000' : '#8a8a8a',
      dgMkdTitle: dg && sheet && sheet.mkd ? 'Ocultar el campo de texto MKD' : 'Mostrar el campo de texto MKD de esta hoja',
      dgFlotDown: e => this.dgFlotDown(e)
    };
    Object.assign(v, this.confirmVals(s)); // ventana de confirmación al eliminar
    Object.assign(v, this.cmenuVals(s)); // menú de copiar de lo copiable (js/app/menu-copiar.js)
    Object.assign(v, this.novVals(s)); // ventana de novedades tras una actualización (js/app/novedades.js)
    Object.assign(v, this.calcVals(s)); // calculadora rápida con historial (js/app/calculadora.js)
    if (nt && sheet) Object.assign(v, this.camposVals(s, sheet)); // fila de campos MKD de la hoja (js/app/campos.js)
    else Object.assign(v, { campos: [], camposFlex: '0 1 auto', camposFila: '0 0 auto' });
    v.dgCampo = dg && sheet ? this.campoVals(s, sheet, CAMPO_MAIN, { diag: true }) : null; // campo MKD flotante del Diagrama
    if (dg && sheet) Object.assign(v, this.dgVals(s, sheet)); // lienzo del diagrama
    Object.assign(v, this.ajVals(s)); // página de Ajustes: Ayuda, Sincronización y Actualizaciones (js/app/ajustes.js)
    Object.assign(v, this.leVals(s, W)); // lista de entidades, a la izquierda del texto (js/app/lista-entidades.js)
    v.dgFlotOn = v.dgMkdOn || (dg && v.leOn); // paneles flotantes del Diagrama (index.html)
    // Ancho de la caja flotante: el del campo MKD (hoja.width) más el de la lista. Hace falta darlo: una caja flotante
    // sin ancho se encoge y aplastaría el campo MKD (su max-width en CSS evita que se salga del lienzo).
    v.dgFlotW = ((v.dgMkdOn ? ((sheet && sheet.width) || W0) : 0) + (dg && v.leOn ? 300 + (v.dgMkdOn ? 6 : 0) : 0)) + 'px';
    v.ui = v; // los componentes reciben todos estos valores con dc-props="{{ ui }}"
    return v;
  }
});
