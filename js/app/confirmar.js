// Ventana de confirmación antes de eliminar una nota o una hoja (componente componentes/confirmar/).
// state.confirm = { kind: 'sheet' | 'note', noteId, sheetId } mientras la ventana está abierta (no se guarda).
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
  closeConfirm() { this.setState({ confirm: null }); }
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
    const c = s.confirm, v = { confirmOpen: !!c };
    if (!c) return v;
    const n = s.notes.find(m => m.id === c.noteId), x = n && c.kind === 'sheet' ? n.sheets.find(h => h.id === c.sheetId) : null;
    const nm = t => (t || '').trim() || 'Sin nombre';
    if (c.kind === 'sheet') {
      v.confirmTitle = 'Eliminar hoja';
      v.confirmName = nm(x && x.name);
      v.confirmDetail = 'Hoja de la nota «' + nm(n && n.name) + '»';
      v.confirmWarn = 'Esta acción es irreversible: se borrarán la hoja, su texto y sus entidades, y no se podrán recuperar.';
    } else {
      const k = n ? n.sheets.length : 0;
      v.confirmTitle = 'Eliminar nota';
      v.confirmName = nm(n && n.name);
      v.confirmDetail = 'Nota ' + (k === 0 ? 'sin hojas' : k === 1 ? 'con 1 hoja' : 'con ' + k + ' hojas');
      v.confirmWarn = 'Esta acción es irreversible: se borrarán la nota y todas sus hojas, y no se podrán recuperar.';
    }
    v.confirmCancel = () => this.closeConfirm();
    v.confirmOk = () => this.confirmDelete();
    v.confirmBack = e => { if (e.target === e.currentTarget) this.closeConfirm(); };
    return v;
  }
});
