// Parte base de la app: estado, ciclo de vida (montar/actualizar), guardado automático y
// funciones para trabajar con la nota y la hoja activas.
NoteApp.partes.push(Base => class extends Base {
  state = naEstadoInicial();
  panelRef = React.createRef();
  taRef = React.createRef();
  componentDidMount() {
    this._down = e => {
      const a = document.activeElement;
      if (this.state.editing && a && a.tagName === 'INPUT' && e.target !== a) a.blur();
      if (this.state.menu && !(e.target.closest && e.target.closest('[data-menu]'))) this.setState({ menu: false });
      if (this.state.colMenu && !(e.target.closest && e.target.closest('[data-colmenu]'))) this.setState({ colMenu: null });
      if (this.state.entMenu && !(e.target.closest && e.target.closest('[data-entmenu]'))) this.setState({ entMenu: null });
      if (this.state.copyMenu && !(e.target.closest && e.target.closest('[data-copymenu]'))) this.setState({ copyMenu: false });
      if (this._msel && !(e.target.closest && e.target.closest('[data-lid]'))) this._msel = null;
    };
    // Selección libre de texto entre varias líneas (arrastrar, Mayús+clic, Mayús+flechas, Ctrl+A)
    this._move = e => this.selMove(e);
    this._up = () => this.selUp();
    this._copy = e => this.selCopy(e);
    this._paste = e => this.selPaste(e);
    document.addEventListener('mousemove', this._move);
    document.addEventListener('mouseup', this._up);
    document.addEventListener('copy', this._copy);
    document.addEventListener('paste', this._paste);
    document.addEventListener('mousedown', this._down, true);
    this._key = e => { if (this.state.confirm) { if (e.key === 'Escape') { e.preventDefault(); this.closeConfirm(); } return; } if (this.selKey(e)) return; if (e.key === 'Escape' && (this.state.menu || this.state.entMenu || this.state.copyMenu)) this.setState({ menu: false, entMenu: null, copyMenu: false }); };
    document.addEventListener('keydown', this._key);
    this._rev = NA_REV;
    this._naFlush = () => { clearTimeout(this._naT); naSave(this.state, this._rev); this.fsQueue(); };
    this._naPrev = this.state;
    window.addEventListener('pagehide', this._naFlush);
    window.addEventListener('beforeunload', this._naFlush);
    if (FS_OK) fsGetHandle().then(async h => { if (!h) return; this._fsDir = h; let p = 'prompt'; try { p = await h.queryPermission({ mode: 'readwrite' }); } catch (_) {} if (p === 'granted') this.fsStart(h, false); else this.setState({ fs: 'perm', fsName: h.name }); });
    this._last = Date.now(); this._tick = setInterval(() => { const s = this.state; this.checkNotifs(s); if (s.mode === 'agenda' || winLists(s).some(([w, list]) => w !== s.mode && list.some(n => n.sheets.some(x => (x.entities || []).some(e => e.type === 'count'))))) this.setState({ now: Date.now() }); }, 1000);
  }
  componentWillUnmount() { if (this._naFlush) { this._naFlush(); window.removeEventListener('pagehide', this._naFlush); window.removeEventListener('beforeunload', this._naFlush); } clearInterval(this._tick); document.removeEventListener('mousedown', this._down, true); document.removeEventListener('keydown', this._key); document.removeEventListener('mousemove', this._move); document.removeEventListener('mouseup', this._up); document.removeEventListener('copy', this._copy); document.removeEventListener('paste', this._paste); }
  componentDidUpdate() {
    const naS = this.state, naP = this._naPrev;
    if (naP && NA_KEEP.some(k => naP[k] !== naS[k])) {
      this._naPrev = naS;
      if (this._naHold) this._naHold = false; else this._rev = Date.now();
      clearTimeout(this._naT); this._naT = setTimeout(() => { naSave(this.state, this._rev); this.fsQueue(); }, 500);
    }
    const ta = this.taRef.current;
    if (ta && this._caret != null) {
      const k = this._caret, L = ta.value.length;
      this._caret = null;
      ta.focus();
      if (typeof k === 'object') { const a = Math.min(k.a, L), b = Math.min(k.b, L); ta.setSelectionRange(Math.min(a, b), Math.max(a, b), b < a ? 'backward' : 'forward'); }
      else { const c = Math.min(k, L); ta.setSelectionRange(c, c); }
    }
    this.applySel();
  }
  // Cambia de ventana (notas, agenda o diagrama). Ver js/motor/ventanas.js.
  setMode(m) {
    if (!WINS.includes(m)) return;
    const a = document.activeElement; if (a && (a.tagName === 'TEXTAREA' || a.tagName === 'INPUT')) a.blur();
    this._msel = null;
    this.setState(st => st.mode === m ? null : { ...winPatch(winsOf(st), m), focusId: null, search: null, field: null, entMenu: null, colMenu: null, menu: false, editing: null, dsel: null, dedit: null, dlabel: null, dmen: null, dlink: null, dbox: null });
  }
  curNote(s) { return s.notes.find(n => n.id === s.activeNote); }
  curSheet(s) { const n = this.curNote(s); return n && n.sheets.find(x => x.id === n.activeSheet); }
  mapSheet(s, fn) {
    return s.notes.map(n => n.id !== s.activeNote ? n : { ...n, sheets: n.sheets.map(x => x.id !== n.activeSheet ? x : fn(x)) });
  }
  focusLine(id, caret) { this._caret = caret; this.setState({ focusId: id }, () => this.componentDidUpdate()); }
  setLines(lines, focusId, caret, entId) {
    this._caret = caret;
    this.setState(s => ({ notes: this.mapSheet(s, x => entId ? { ...x, entities: (x.entities || []).map(e => e.id === entId ? { ...e, lines } : e) } : { ...x, lines }), focusId: focusId === undefined ? s.focusId : focusId }));
  }
  addText() {
    const ln = mkLines([''])[0];
    this.setState(s => { if (!this.entsOf(s)) return null; return this.pushEnt(s, { id: uid('e'), type: 'text', lines: [ln] }); }, () => { if (!this.state.clean) this.focusLine(ln.id, 0); });
  }
});
