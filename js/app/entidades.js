// Crear, cambiar, mover, duplicar y borrar entidades (y filas/columnas de tablas, ramas de lógica...).
NoteApp.partes.push(Base => class extends Base {
  setWidth(w) { this.setState(s => ({ notes: this.mapSheet(s, x => ({ ...x, width: w })) })); }
  // Ocultar/mostrar las entidades de la hoja activa (campo "full": el texto ocupa todo el ancho).
  toggleFull() { this.setState(s => ({ entMenu: null, colMenu: null, field: null, notes: this.mapSheet(s, x => { const { full, ...y } = x; return full ? y : { ...y, full: true }; }) })); }
  // Añade una entidad al final y, si estaban ocultas, vuelve a mostrar las entidades para que se vea.
  pushEnt(s, e) { return { notes: this.mapSheet(s, x => { const { full, ...y } = x; return { ...y, entities: (x.entities || []).concat(e) }; }) }; }
  commit(kind, id) {
    this.setState(s => {
      if (!s.editing || s.editing.kind !== kind || s.editing.id !== id) return null;
      const MAX = kind === 'ent' ? ENT_MAX : TAB_MAX;
      let v = s.draft.trim().slice(0, MAX);
      if (kind === 'ent') {
        v = v.replace(/\s+/g, '_').replace(new RegExp('[^' + ID_CH + ']', 'g'), '');
        if (/^\d/.test(v)) v = ('_' + v).slice(0, MAX);
        if (v) v = this.uniqueName(v, s, id);
      }
      if (!v) return { editing: null };
      const mapEnts = f => s.notes.map(n => ({ ...n, sheets: n.sheets.map(x => ({ ...x, entities: (x.entities || []).map(f) })) }));
      let notes;
      if (kind === 'note') notes = s.notes.map(n => n.id === id ? { ...n, name: v } : n);
      else if (kind === 'sheet') notes = s.notes.map(n => ({ ...n, sheets: n.sheets.map(x => x.id === id ? { ...x, name: v } : x) }));
      else if (kind === 'ent') notes = mapEnts(e => e.id === id ? { ...e, name: v } : e);
      else notes = mapEnts(e => e.type !== 'table' ? e : { ...e, cols: e.cols.map(c => c.id === id ? { ...c, title: v } : c) });
      if (kind === 'ent' || kind === 'note' || kind === 'sheet') {
        // Actualiza las menciones y fórmulas que apuntaban al nombre antiguo (en Notas y en Agenda).
        try { const r = renameIn({ ...s, notes }, renameFix(s, kind, id, v)); return { notes: r.notes, other: r.other, editing: null }; } catch (_) {}
      }
      return { notes, editing: null };
    });
  }
  allEnts(s) { return s.notes.flatMap(n => n.sheets.flatMap(x => (x.entities || []).filter(e => !NOVAL(e.type)))); }
  entsOf(s) { const sh = this.curSheet(s); return sh ? (sh.entities || []) : null; }
  mapEnts(s, fn) { return { notes: this.mapSheet(s, x => ({ ...x, entities: fn(x.entities || []) })) }; }
  addSep() {
    this.setState(s => {
      if (!this.entsOf(s)) return null;
      const e = { id: uid('e'), type: 'sep', title: 'Sección' };
      return this.pushEnt(s, e);
    });
  }
  uniqueName(base, s, skipId) {
    const taken = new Set((this.entsOf(s) || []).filter(e => !NOVAL(e.type) && e.id !== skipId).map(e => e.name).concat(sheetFlags(this.curSheet(s)).map(f => f.name)));
    if (!taken.has(base)) return base;
    for (let k = 2; ; k++) { const suf = '_' + k, nm = base.slice(0, ENT_MAX - suf.length) + suf; if (!taken.has(nm)) return nm; }
  }
  updEnt(id, fn) { this.setState(s => this.mapEnts(s, a => a.map(e => e.id === id ? fn(e) : e))); }
  addEnt(type) {
    this.setState(s => {
      if (!this.entsOf(s)) return null;
      const ag = s.mode === 'agenda', all = (this.entsOf(s) || []).filter(e => !NOVAL(e.type)), base = ag && type === 'toggle' ? 'Casilla' : ENT_BASE[type], flags = sheetFlags(this.curSheet(s)).map(f => f.name); let k = 1;
      while (all.some(e => e.name === base + '_' + k) || flags.includes(base + '_' + k)) k++;
      const e = newEnt(type, base + '_' + k, ag && type === 'toggle' ? { desc: 'Casilla' } : null);
      return this.pushEnt(s, e);
    });
  }
  removeEnt(id) { this.setState(s => ({ entMenu: null, field: null, colMenu: null, ...this.mapEnts(s, a => a.filter(e => e.id !== id)) })); }
  duplicateEnt(id) {
    this.setState(s => {
      const list = this.entsOf(s); if (!list) return { entMenu: null };
      const k = list.findIndex(e => e.id === id); if (k < 0) return { entMenu: null };
      const src = list[k], copy = JSON.parse(JSON.stringify(src));
      copy.id = uid('e'); if (copy.type === 'text') copy.lines = copy.lines.map(l => ({ ...l, id: uid('l') })); if (!NOVAL(copy.type)) copy.name = this.uniqueName(src.name, s, null);
      if (copy.type === 'table') {
        const map = {}; copy.cols = copy.cols.map(c => { const nid = uid('c'); map[c.id] = nid; return { ...c, id: nid }; });
        copy.rows = copy.rows.map(r => { const cells = {}; Object.keys(r.cells).forEach(cid => { if (map[cid]) cells[map[cid]] = r.cells[cid]; }); return { id: uid('r'), cells }; });
      }
      return { entMenu: null, ...this.mapEnts(s, a0 => { const a = a0.slice(); a.splice(k + 1, 0, copy); return a; }) };
    });
  }
  updBr(eid, bid, patch) { this.updEnt(eid, x => bid === 'main' ? { ...x, ...patch } : { ...x, alts: (x.alts || []).map(a => a.id === bid ? { ...a, ...patch } : a) }); }
  addBr(eid) { const b = { id: uid('b'), a: '', cmp: '=', b: '', out: '' }; this.updEnt(eid, x => ({ ...x, alts: (x.alts || []).concat(b) })); this.setState(st => ({ lsel: { ...(st.lsel || {}), [eid]: b.id } })); }
  rmBr(eid, bid) { this.setState({ field: null }); this.updEnt(eid, x => ({ ...x, alts: (x.alts || []).filter(a => a.id !== bid) })); }
  clearCal(id) { this.setState(st => { const cv = { ...(st.calView || {}) }; delete cv[id + ':0']; delete cv[id + ':1']; return { calView: cv, rangePick: { ...(st.rangePick || {}), [id]: false }, calPrev: { ...(st.calPrev || {}), [id]: null } }; }); }
  setAlign(eid, cid, al) { this.updEnt(eid, t => ({ ...t, cols: t.cols.map(c => c.id === cid ? { ...c, align: al } : c) })); }
  moveEnt(id, d) {
    this.setState(s => this.mapEnts(s, a0 => {
      const a = a0.slice(), i = a.findIndex(e => e.id === id), j = i + d;
      if (i < 0 || j < 0 || j >= a.length) return a0;
      const t = a[i]; a[i] = a[j]; a[j] = t; return a;
    }));
  }
  setCell(eid, rid, cid, val) { this.updEnt(eid, t => ({ ...t, rows: t.rows.map(r => r.id !== rid ? r : { ...r, cells: { ...r.cells, [cid]: val } }) })); }
  toggleCell(eid, rid, cid) { this.updEnt(eid, t => ({ ...t, rows: t.rows.map(r => r.id !== rid ? r : { ...r, cells: { ...r.cells, [cid]: (r.cells[cid] || '').replace(/\[(True|False)\]/, (m, w) => w === 'True' ? '[False]' : '[True]') } }) })); }
  addRow(eid, at) { this.updEnt(eid, t => { const rows = t.rows.slice(); rows.splice(at, 0, { id: uid('r'), cells: {} }); return { ...t, rows }; }); }
  addCol(eid, at) { this.updEnt(eid, t => { const cols = t.cols.slice(); cols.splice(at, 0, { id: uid('c'), title: 'Título', op: null }); return { ...t, cols }; }); }
  removeCol(eid, cid) { this.setState({ colMenu: null }); this.updEnt(eid, t => t.cols.length < 2 ? t : { ...t, cols: t.cols.filter(c => c.id !== cid) }); }
  setOp(eid, cid, op) { this.updEnt(eid, t => ({ ...t, cols: t.cols.map(c => c.id === cid ? { ...c, op: c.op === op ? null : op } : { ...c, op: null }) })); }
  slideTo(x) {
    const sl = this._sl; if (!sl) return;
    const f = Math.min(1, Math.max(0, (x - sl.rect.left) / sl.rect.width));
    let v = sl.lo + f * (sl.hi - sl.lo); v = sl.dec ? Math.round(v * 10) / 10 : Math.round(v);
    this.updEnt(sl.id, e => e.value === v ? e : { ...e, value: v });
  }
  field(key, value, segs, set, o) {
    o = o || {};
    const focused = this.state.field === key, align = o.align || 'right';
    return {
      value, segs: value ? segs : [{ text: o.ph || '', color: DIM }],
      hlVis: focused ? 'hidden' : 'visible', inOp: focused ? 1 : 0,
      justify: align === 'right' ? 'flex-end' : align === 'center' ? 'center' : 'flex-start', align,
      deco: o.deco || 'none',
      onFocus: () => this.setState({ field: key }),
      onBlur: () => this.setState(st => st.field === key ? { field: null } : null),
      onChange: ev => set(ev.target.value),
      onKey: ev => { if (ev.key === 'Enter' || ev.key === 'Escape') ev.target.blur(); }
    };
  }
});
