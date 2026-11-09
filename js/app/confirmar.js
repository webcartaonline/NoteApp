// Ventana de confirmación (componente componentes/confirmar/), mientras está abierta state.confirm (no se guarda):
// - antes de eliminar una nota o una hoja: { kind: 'sheet' | 'note', noteId, sheetId }
// - al conectar una carpeta vacía sin carpeta anterior (o si la anterior ya no existe), para preguntar si se pasan
//   las notas del navegador: { kind: 'folder', name, gone, count } (ver fsPick y fsAnswer en js/app/carpeta.js)
// - al pulsar el botón de copiar de algo copiable ('x', '' o celda copiable), para elegir cómo copiarlo:
//   { kind: 'copy', md, lit, key, what } (md = en Markdown, lit = tal cual está escrito; ver askCopy)
NoteApp.partes.push(Base => class extends Base {
  // Abre la ventana para la hoja activa o la nota activa
  askDelete(kind) {
    const a = document.activeElement; if (a && (a.tagName === 'TEXTAREA' || a.tagName === 'INPUT')) a.blur();
    this.setState(st => {
      const n = this.curNote(st); if (!n) return { menu: false };
      if (kind === 'sheet' && !n.activeSheet) return { menu: false };
      return { menu: false, focusId: null, confirm: { kind, noteId: n.id, sheetId: kind === 'sheet' ? n.activeSheet : null } };
    }, () => { const b = document.querySelector('[data-confirmar="cancelar"]'); if (b) b.focus(); });
  }
  closeConfirm() { this._fsAsk = null; this.setState({ confirm: null }); }
  // Menú de copiar de lo copiable: { md, lit, key, what }. Al elegir, copia y el botón de copiar se pone verde.
  askCopy(c) {
    const a = document.activeElement; if (a && (a.tagName === 'TEXTAREA' || a.tagName === 'INPUT')) a.blur();
    this.setState({ menu: false, copyMenu: false, confirm: { kind: 'copy', ...c } }, () => { const b = document.querySelector('[data-confirmar="md"]'); if (b) b.focus(); });
  }
  doCopy(lit) { const c = this.state.confirm; if (!c || c.kind !== 'copy') return; this.setState({ confirm: null }); this.copyText(lit ? c.lit : c.md, c.key); }
  // Elimina de verdad lo que se estaba confirmando
  confirmDelete() {
    this.setState(st => {
      const c = st.confirm; if (!c) return null;
      if (c.kind === 'sheet') {
        const n = st.notes.find(m => m.id === c.noteId); if (!n) return { confirm: null };
        const k = n.sheets.findIndex(x => x.id === c.sheetId); if (k < 0) return { confirm: null };
        const rest = n.sheets.filter(x => x.id !== c.sheetId);
        const nx = rest[Math.min(k, rest.length - 1)];
        const act = n.activeSheet === c.sheetId ? (nx ? nx.id : null) : n.activeSheet;
        return { confirm: null, focusId: null, notes: st.notes.map(m => m.id !== n.id ? m : { ...m, sheets: rest, activeSheet: act }) };
      }
      const k = st.notes.findIndex(m => m.id === c.noteId); if (k < 0) return { confirm: null };
      const rest = st.notes.filter(m => m.id !== c.noteId);
      const nx = rest[Math.min(k, rest.length - 1)];
      const act = st.activeNote === c.noteId ? (nx ? nx.id : null) : st.activeNote;
      return { confirm: null, focusId: null, editing: null, notes: rest, activeNote: act };
    });
  }
  // Valores para la plantilla (se añaden en renderVals)
  confirmVals(s) {
    const c = s.confirm, v = { confirmOpen: !!c, confirmFolder: !!c && c.kind === 'folder', confirmCopy: !!c && c.kind === 'copy', confirmDel: !!c && c.kind !== 'folder' && c.kind !== 'copy' };
    if (!c) return v;
    v.confirmCancel = () => this.closeConfirm();
    v.confirmBack = e => { if (e.target === e.currentTarget) this.closeConfirm(); };
    if (c.kind === 'copy') {
      const first = (c.lit.split('\n').find(l => l.trim()) || '').trim();
      v.confirmTitle = 'Copiar';
      v.confirmName = first || '(vacío)';
      v.confirmDetail = c.what || 'Copiable';
      v.confirmWarn = 'Copiar Markdown: con el formato en Markdown estándar y las menciones con su valor, igual que al exportar. Copiado literal: tal cual está escrito, con las menciones y todos los símbolos.';
      v.confirmMd = () => this.doCopy(false);
      v.confirmLit = () => this.doCopy(true);
      return v;
    }
    if (c.kind === 'folder') {
      const k = c.count || {}, part = (n, one, many) => n ? n + ' ' + (n === 1 ? one : many) : '';
      const what = [part(k.notas, 'nota', 'notas'), part(k.agenda, 'nota de agenda', 'notas de agenda'), part(k.diagrama, 'diagrama', 'diagramas')].filter(Boolean);
      const list = what.length > 1 ? what.slice(0, -1).join(', ') + ' y ' + what[what.length - 1] : what[0] || 'notas';
      v.confirmTitle = '¿Guardar aquí lo que tienes abierto?';
      v.confirmName = c.name;
      v.confirmDetail = 'Carpeta vacía';
      v.confirmWarn = c.gone
        ? 'La carpeta «' + c.gone + '» ya no está (se ha borrado o movido). Lo último que tenías abierto de ella (' + list + ') sigue en la app. Puedes guardarlo en esta carpeta o empezar con ella vacía. Si moviste «' + c.gone + '» a otro sitio, pulsa Cancelar y ábrela desde su nuevo sitio.'
        : 'Lo que tienes abierto ahora (' + list + ') todavía no está guardado en ninguna carpeta. Puedes guardarlo en esta carpeta o empezar con ella vacía. Si empiezas vacía, eso se descarta, porque no hay ninguna carpeta que lo guarde.';
      v.confirmCarry = () => this.fsAnswer(true);
      v.confirmEmpty = () => this.fsAnswer(false);
      return v;
    }
    const n = s.notes.find(m => m.id === c.noteId), x = n && c.kind === 'sheet' ? n.sheets.find(h => h.id === c.sheetId) : null;
    const nm = t => (t || '').trim() || 'Sin nombre', dg = s.mode === 'diagrama';
    if (c.kind === 'sheet') {
      v.confirmTitle = 'Eliminar hoja';
      v.confirmName = nm(x && x.name);
      v.confirmDetail = (dg ? 'Hoja del diagrama «' : 'Hoja de la nota «') + nm(n && n.name) + '»';
      v.confirmWarn = dg ? 'Esta acción es irreversible: se borrarán la hoja, sus formas y sus conexiones, y no se podrán recuperar.' : 'Esta acción es irreversible: se borrarán la hoja, su texto y sus entidades, y no se podrán recuperar.';
    } else {
      const k = n ? n.sheets.length : 0;
      v.confirmTitle = dg ? 'Eliminar diagrama' : 'Eliminar nota';
      v.confirmName = nm(n && n.name);
      v.confirmDetail = (dg ? 'Diagrama ' : 'Nota ') + (k === 0 ? 'sin hojas' : k === 1 ? 'con 1 hoja' : 'con ' + k + ' hojas');
      v.confirmWarn = 'Esta acción es irreversible: se borrarán ' + (dg ? 'el diagrama' : 'la nota') + ' y todas sus hojas, y no se podrán recuperar.';
    }
    v.confirmOk = () => this.confirmDelete();
    return v;
  }
});
