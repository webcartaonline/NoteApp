// Ventana Diagrama: lienzo con formas y conexiones (componente componentes/diagrama/).
// Formas, colores y geometría: js/motor/formas.js. Las formas se guardan en hoja.entities (tipo 'node', con
// líneas de texto MKD, así que admiten menciones =/Nota/Hoja/Entidad), las conexiones en hoja.edges y el
// desplazamiento/zoom del lienzo en hoja.view.
// Estado temporal (no se guarda): dsel { nodes, edge } selección · dedit forma cuyo texto se edita ·
// dlabel/ddraft etiqueta de conexión que se edita · dlink línea mientras se conecta · dlinkTo forma de destino ·
// dbox recuadro de selección · ddrag qué se arrastra · dmen { id, q } buscador de menciones ·
// dkey campo de una tabla con el menú de las claves abierto.
// Diagramas entidad-relación: la forma «tabla» (título, descripción y campos con su clave; se edita en la propia tabla,
// con dedit) y las conexiones en ángulo con «1» y «N» en los extremos (route, c1 y c2). Ver «Tablas» en formas.js.
NoteApp.partes.push(Base => class extends Base {
  componentDidMount() {
    if (super.componentDidMount) super.componentDidMount();
    this._dgMoveH = e => this.dgMove(e);
    this._dgUpH = e => this.dgUp(e);
    this._dgWheelH = e => this.dgWheel(e);
    this._dgKeyH = e => this.dgKey(e);
    // Un clic fuera del menú de las claves de un campo lo cierra
    this._dgKeyMenuH = e => {
      if (this.state.dkey && !(e.target.closest && e.target.closest('[data-keymenu]'))) this.setState({ dkey: null });
      if (this.state.dcard && !(e.target.closest && e.target.closest('[data-cardmenu]'))) this.dgCardClose(); // menú del texto de un extremo
    };
    document.addEventListener('mousedown', this._dgKeyMenuH, true);
    document.addEventListener('pointermove', this._dgMoveH);
    document.addEventListener('pointerup', this._dgUpH);
    document.addEventListener('pointercancel', this._dgUpH);
    document.addEventListener('wheel', this._dgWheelH, { passive: false });
    document.addEventListener('keydown', this._dgKeyH);
  }
  componentWillUnmount() {
    if (super.componentWillUnmount) super.componentWillUnmount();
    document.removeEventListener('pointermove', this._dgMoveH);
    document.removeEventListener('pointerup', this._dgUpH);
    document.removeEventListener('pointercancel', this._dgUpH);
    document.removeEventListener('wheel', this._dgWheelH);
    document.removeEventListener('keydown', this._dgKeyH);
    document.removeEventListener('mousedown', this._dgKeyMenuH, true);
  }
  componentDidUpdate(a, b) {
    if (super.componentDidUpdate) super.componentDidUpdate(a, b);
    this.dgGrow();
  }

  // ----- Utilidades -----
  dgSheet(s) { s = s || this.state; return s.mode === 'diagrama' ? this.curSheet(s) : null; }
  dgView(x) { const v = (x && x.view) || {}; return { x: isFinite(v.x) ? +v.x : 40, y: isFinite(v.y) ? +v.y : 40, z: isFinite(v.z) && v.z > 0 ? dgClampZ(+v.z) : 1 }; }
  dgNodes(x) { return ((x && x.entities) || []).filter(e => e.type === 'node'); }
  dgEl() { return document.querySelector('[data-diagrama]'); }
  // Posición del puntero en coordenadas del lienzo
  dgPt(e, x) {
    const el = this.dgEl(), v = this.dgView(x || this.dgSheet()); if (!el) return { x: 0, y: 0 };
    const r = el.getBoundingClientRect();
    return { x: (e.clientX - r.left - v.x) / v.z, y: (e.clientY - r.top - v.y) / v.z };
  }
  // Cambia la hoja del diagrama: fn(hoja) => hoja nueva. snap: guarda antes una copia para poder deshacer.
  dgSet(fn, snap, extra, cb) {
    if (snap) this.dgSnap();
    this.setState(s => { if (!this.dgSheet(s)) return null; return { ...(extra || {}), notes: this.mapSheet(s, fn) }; }, cb);
  }
  dgSetNodes(fn, snap, extra) { this.dgSet(x => ({ ...x, entities: (x.entities || []).map(e => e.type === 'node' ? fn(e) : e) }), snap, extra); }
  dgSetView(v) { this.setState(s => this.dgSheet(s) ? { notes: this.mapSheet(s, x => ({ ...x, view: { x: Math.round(v.x * 10) / 10, y: Math.round(v.y * 10) / 10, z: Math.round(dgClampZ(v.z) * 1000) / 1000 } })) } : null); }

  // ----- Deshacer / rehacer (por hoja, solo mientras la app está abierta) -----
  dgHist(sid) { const H = this._dgH || (this._dgH = {}); return H[sid] || (H[sid] = { past: [], fut: [] }); }
  dgSnap() {
    const x = this.dgSheet(); if (!x) return;
    const h = this.dgHist(x.id); h.past.push({ entities: x.entities || [], edges: x.edges || [] }); if (h.past.length > 80) h.past.shift(); h.fut = [];
  }
  dgUndo(redo) {
    const x = this.dgSheet(); if (!x) return;
    const h = this.dgHist(x.id), from = redo ? h.fut : h.past, to = redo ? h.past : h.fut; if (!from.length) return;
    to.push({ entities: x.entities || [], edges: x.edges || [] });
    const st = from.pop();
    this.setState(s => ({ notes: this.mapSheet(s, y => ({ ...y, entities: st.entities, edges: st.edges })), dsel: null, dedit: null, dlabel: null, dmen: null, focusId: null }));
  }

  // ----- Añadir, borrar, duplicar, colores -----
  dgAdd(shape) {
    const s = this.state, x = this.dgSheet(s); if (!x) return;
    const d = DG_SHAPES[shape] || DG_SHAPES.proceso, el = this.dgEl(), v = this.dgView(x);
    const W = el ? el.clientWidth : 800, H = el ? el.clientHeight : 500;
    let px = dgSnap((W / 2 - v.x) / v.z - d.w / 2), py = dgSnap((H / 2 - v.y) / v.z - d.h / 2);
    const used = this.dgNodes(x), ids = (s.dsel && s.dsel.nodes) || [], prev = ids.length === 1 ? used.find(n => n.id === ids[0]) : null;
    // Si hay una forma seleccionada, la nueva se pone debajo; si no, en el centro de la pantalla. Se evita taparlas.
    if (prev && shape !== 'zona') { px = dgSnap(prev.x + prev.w / 2 - d.w / 2); py = dgSnap(prev.y + prev.h + 60); }
    const hit = (x0, y0) => used.some(n => n.shape !== 'zona' && x0 < n.x + n.w + 10 && x0 + d.w + 10 > n.x && y0 < n.y + n.h + 10 && y0 + d.h + 10 > n.y);
    let k = 0;
    if (shape !== 'zona') while (k < 80 && hit(px, py)) { py += 20; k++; }
    const n = shape === 'tabla' ? dgTabla(px, py) : dgNode(shape, px, py, '');
    this.dgSnap();
    // Las zonas van detrás de todo: se ponen al principio de la lista
    this.setState(st => ({ clean: false, dmen: null, dlabel: null, notes: this.mapSheet(st, y => ({ ...y, entities: shape === 'zona' ? [n].concat(y.entities || []) : (y.entities || []).concat(n) })) }), () => this.dgEdit(n.id, true));
  }
  dgDelete() {
    const s = this.state, sel = s.dsel; if (!sel) return;
    const ids = new Set(sel.nodes || []);
    if (!ids.size && !sel.edge) return;
    this.dgSet(x => ({ ...x, entities: (x.entities || []).filter(e => !ids.has(e.id)), edges: (x.edges || []).filter(k => k.id !== sel.edge && !ids.has(k.from) && !ids.has(k.to)) }), true, { dsel: null, dedit: null, dlabel: null, dmen: null });
  }
  dgDuplicate() {
    const s = this.state, x = this.dgSheet(s), sel = s.dsel; if (!x || !sel || !(sel.nodes || []).length) return;
    const ids = new Set(sel.nodes), map = {}, copies = [];
    this.dgNodes(x).forEach(n => { if (ids.has(n.id)) { const c = dgCopyNode(n, 20, 20); map[n.id] = c.id; copies.push(c); } });
    const edges = (x.edges || []).filter(k => map[k.from] && map[k.to]).map(k => ({ ...k, id: uid('a'), from: map[k.from], to: map[k.to] }));
    this.dgSet(y => ({ ...y, entities: (y.entities || []).concat(copies), edges: (y.edges || []).concat(edges) }), true, { dsel: { nodes: copies.map(c => c.id), edge: null }, dmen: null });
  }
  dgColor(c) {
    const sel = this.state.dsel; if (!sel || !(sel.nodes || []).length) return;
    const ids = new Set(sel.nodes);
    this.dgSetNodes(n => ids.has(n.id) ? { ...n, color: c } : n, true);
  }
  dgShape(shape) {
    const sel = this.state.dsel; if (!sel || !(sel.nodes || []).length || !DG_SHAPES[shape]) return;
    const ids = new Set(sel.nodes);
    this.dgSetNodes(n => ids.has(n.id) && n.shape !== 'zona' && n.shape !== 'tabla' ? { ...n, shape } : n, true);
  }

  // ----- Editar el texto de una forma -----
  dgEdit(id, noSnap, foco) {
    const s = this.state, x = this.dgSheet(s); if (!x || s.clean) return;
    const n = this.dgNodes(x).find(m => m.id === id); if (!n) return;
    if (!noSnap) this.dgSnap();
    if (n.shape === 'tabla') { // las tablas se editan con sus propios campos (foco = id de la fila, o nada = el título)
      this.setState({ dedit: id, dsel: { nodes: [id], edge: null }, dmen: null, dlabel: null, focusId: null }, () => this.dgTablaFoco(id, foco));
      return;
    }
    let lines = n.lines && n.lines.length ? n.lines : null;
    const ready = () => { const ls = (this.dgNodes(this.dgSheet()).find(m => m.id === id) || {}).lines || []; const last = ls[ls.length - 1]; if (last) this.focusLine(last.id, last.text.length); };
    if (!lines) { lines = mkLines(['']); this.setState(st => ({ dedit: id, dsel: { nodes: [id], edge: null }, dmen: null, dlabel: null, notes: this.mapSheet(st, y => ({ ...y, entities: (y.entities || []).map(e => e.id === id ? { ...e, lines } : e) })) }), ready); }
    else this.setState({ dedit: id, dsel: { nodes: [id], edge: null }, dmen: null, dlabel: null }, ready);
  }
  dgEndEdit() {
    const a = document.activeElement; if (a && (a.tagName === 'TEXTAREA' || (a.tagName === 'INPUT' && a.closest('[data-node]')))) a.blur();
    this._msel = null;
    this.setState({ dedit: null, dkey: null, focusId: null });
  }

  // ----- Campo de texto MKD flotante de la hoja (botón de la barra de hojas, a la derecha del interruptor de vista) -----
  // Campo "mkd" de la hoja (true = se ve; se guarda) y su texto en hoja.lines, igual que una hoja de Notas: buscar, copiar,
  // exportar, menciones, casillas-entidad… Su ancho es hoja.width (asa de la derecha).
  dgMkdToggle() {
    const a = document.activeElement; if (a && a.closest && a.closest('[data-lines="sheet"]')) a.blur();
    this._msel = null;
    let foco = null;
    this.setState(s => {
      const x = this.dgSheet(s); if (!x) return null;
      const on = !x.mkd, lines = x.lines && x.lines.length ? x.lines : mkLines(['']);
      if (on && !s.clean) foco = lines[lines.length - 1];
      return { copyMenu: false, search: on ? s.search : null, focusId: on ? s.focusId : null, dedit: on ? null : s.dedit, dmen: null,
        notes: this.mapSheet(s, y => { const { mkd, ...z } = y; return on ? { ...z, mkd: true, lines, width: y.width || W0 } : z; }) };
    }, () => { if (foco) this.focusLine(foco.id, foco.text.length); });
  }
  // Un clic en los paneles flotantes termina lo que se estaba editando en el lienzo
  dgFlotDown(e) {
    const s = this.state;
    if (s.dedit) this.dgEndEdit();
    if (s.dlabel) this.dgLabelDone(true);
    if (s.dmen || s.dkey) this.setState({ dmen: null, dkey: null });
  }

  // ----- Conexiones -----
  dgEdgeSet(id, fn) { this.dgSet(x => ({ ...x, edges: (x.edges || []).map(k => k.id === id ? fn(k) : k) }), true); }
  dgConnect(from, to) {
    if (!from || !to || from === to) return null;
    const x = this.dgSheet(); if (!x) return null;
    if ((x.edges || []).some(k => k.from === from && k.to === to)) return null;
    const k = dgEdge(from, to, this.dgEdgeExtra(x, from, to));
    this.dgSet(y => ({ ...y, edges: (y.edges || []).concat(k) }), true, { dsel: { nodes: [], edge: k.id } });
    return k;
  }
  // Una conexión que toca una tabla nace como relación: en ángulo, sin flecha y de «1» (origen) a «N» (destino).
  dgEdgeExtra(x, from, to) {
    const ns = this.dgNodes(x), esTabla = id => { const n = ns.find(m => m.id === id); return !!n && n.shape === 'tabla'; };
    return esTabla(from) || esTabla(to) ? { route: 'codo', head: 'none', c1: '1', c2: 'N' } : null;
  }

  // ----- Tablas (entidad-relación): título, descripción y campos -----
  // cb: se llama cuando la tabla ya está dibujada con el cambio (para poner el cursor en su sitio sin perder teclas)
  dgTablaSet(id, fn, cb) {
    this.dgSet(x => ({ ...x, entities: (x.entities || []).map(e => { if (e.id !== id || e.shape !== 'tabla') return e; const n = fn(e); return { ...n, h: dgTablaH(n) }; }) }), false, null, cb);
  }
  // Pone el cursor en el campo de una fila (rid) o, sin fila, en el título de la tabla
  dgTablaFoco(id, rid, nota) {
    const nd = document.querySelector('[data-node="' + id + '"]'); if (!nd) return;
    const el = rid ? nd.querySelector('[data-fila="' + rid + '"] ' + (nota ? '[data-campo-nota]' : '[data-campo]')) : nd.querySelector('[data-tabla-titulo]');
    if (el) { el.focus(); try { el.setSelectionRange(el.value.length, el.value.length); } catch (_) {} }
  }
  // Sin límite de largo (los saltos de línea de lo pegado se cambian por espacios: cada campo es una sola línea que se parte sola)
  dgRowSet(id, rid, key, val) { const v = String(val).replace(/\r?\n/g, ' '); this.dgTablaSet(id, n => ({ ...n, rows: (n.rows || []).map(r => r.id === rid ? { ...r, [key]: v } : r) })); }
  // Elige una opción rápida (–, 1 o N) para un extremo de una conexión y cierra su menú (botones y atajos 1 / N)
  dgCardPick(edge, end, c) { this.dgEdgeSet(edge, k => ({ ...k, [end]: c })); this.setState({ dcard: null }); }
  // Cierra el menú del texto de un extremo de una conexión (quitando los espacios de sobra de lo escrito)
  dgCardClose() {
    const d = this.state.dcard; if (!d) return;
    this.setState(st => ({ dcard: null, notes: this.mapSheet(st, x => ({ ...x, edges: (x.edges || []).map(k => k.id === d.edge && typeof k[d.end] === 'string' && k[d.end] !== k[d.end].trim() ? { ...k, [d.end]: k[d.end].trim() } : k) })) }));
  }
  // Pone o quita una clave (PK, FK o UQ) de un campo; se pueden tener varias a la vez (menú de las claves, state.dkey)
  dgRowKey(id, rid, key) {
    this.dgTablaSet(id, n => ({ ...n, rows: (n.rows || []).map(r => { if (r.id !== rid) return r; const ks = dgKeys(r.k); return { ...r, k: dgKeyStr(ks.includes(key) ? ks.filter(x => x !== key) : ks.concat(key)) }; }) }));
  }
  // Campo nuevo debajo de la fila «tras» (o al final)
  dgRowAdd(id, tras) {
    const r = dgRow('');
    this.dgTablaSet(id, n => { const rows = (n.rows || []).slice(), i = rows.findIndex(q => q.id === tras); rows.splice(i < 0 ? rows.length : i + 1, 0, r); return { ...n, rows }; }, () => this.dgTablaFoco(id, r.id));
  }
  dgRowDel(id, rid) {
    const x = this.dgSheet(), n = x && this.dgNodes(x).find(m => m.id === id), rows = (n && n.rows) || [], i = rows.findIndex(r => r.id === rid); if (i < 0) return;
    const vecina = rows[i - 1] || rows[i + 1];
    this.dgTablaSet(id, m => ({ ...m, rows: (m.rows || []).filter(r => r.id !== rid) }), () => this.dgTablaFoco(id, vecina ? vecina.id : null));
  }
  dgRowMove(id, rid, dir) {
    this.dgTablaSet(id, n => { const rows = (n.rows || []).slice(), i = rows.findIndex(r => r.id === rid), j = i + dir; if (i < 0 || j < 0 || j >= rows.length) return n; [rows[i], rows[j]] = [rows[j], rows[i]]; return { ...n, rows }; }, () => this.dgTablaFoco(id, rid));
  }
  dgLabelEdit(id) {
    const x = this.dgSheet(), k = x && (x.edges || []).find(e => e.id === id); if (!k || this.state.clean) return;
    this.setState({ dlabel: id, ddraft: k.label || '', dsel: { nodes: [], edge: id }, dedit: null, dmen: null }, () => { const i = document.querySelector('[data-etiqueta]'); if (i) { i.focus(); i.select(); } });
  }
  dgLabelDone(save) {
    const s = this.state, id = s.dlabel; if (!id) return;
    const t = String(s.ddraft || '').replace(/\s+/g, ' ').trim(); // sin límite de largo
    if (save) { const x = this.dgSheet(), k = x && (x.edges || []).find(e => e.id === id); if (k && (k.label || '') !== t) { this.dgEdgeSet(id, e => ({ ...e, label: t })); } }
    this.setState({ dlabel: null, ddraft: '' });
  }

  // ----- Menciones: buscador de entidades de Notas y Agenda -----
  dgMention(path) {
    const s = this.state, id = s.dmen && s.dmen.id, x = this.dgSheet(s), n = x && this.dgNodes(x).find(m => m.id === id); if (!n) return;
    const lines = (n.lines && n.lines.length ? n.lines : mkLines([''])).slice(), last = lines[lines.length - 1];
    lines[lines.length - 1] = { ...last, text: last.text && !/\s$/.test(last.text) ? last.text + ' ' + path : last.text + path };
    this.dgSet(y => ({ ...y, entities: (y.entities || []).map(e => e.id === id ? { ...e, lines } : e) }), true, { dmen: null });
  }
  dgMentionItems(s, q) {
    const out = [], norm = t => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(), nq = norm(q).trim();
    const all = winsOf(s);
    ['notas', 'agenda'].forEach(k => (all[k].notes || []).forEach(n => (n.sheets || []).forEach(h => {
      const nn = String(n.name || '').trim().replace(/\s+/g, ' '), hn = String(h.name || '').trim().replace(/\s+/g, ' ');
      if (!nn || !hn || /[\/=\n]/.test(nn + hn)) return; // la ruta no se podría escribir
      const names = (h.entities || []).filter(e => !NOVAL(e.type) && e.name).map(e => e.name).concat(sheetFlags(h).map(f => f.name));
      names.forEach(name => {
        const path = '=/' + PATH_WINS[k] + '/' + nn + '/' + hn + '/' + name; // desde el Diagrama, siempre con la ventana delante (Notas/ o Agenda/)
        if (nq && !norm(WIN_TITLE[k] + ' ' + nn + ' ' + hn + ' ' + name).includes(nq)) return;
        out.push({ path, win: WIN_TITLE[k], where: nn + ' › ' + hn, name });
      });
    })));
    return out;
  }

  // ----- Ratón / dedo -----
  dgBgDown(e) {
    const s = this.state, x = this.dgSheet(s); if (!x) return;
    if (e.pointerType === 'mouse' && e.button !== 0 && e.button !== 1) return;
    if (e.target.closest && e.target.closest('[data-dg-ui]')) return; // barras y botones del lienzo
    if (s.dedit) this.dgEndEdit();
    if (s.dlabel) this.dgLabelDone(true);
    if (!s.clean && e.shiftKey && e.button === 0) {
      const el = this.dgEl(), r = el.getBoundingClientRect();
      this._dg = { kind: 'box', sx: e.clientX, sy: e.clientY, r, base: (s.dsel && s.dsel.nodes) || [] };
      return;
    }
    if (s.dsel || s.dmen) this.setState({ dsel: null, dmen: null });
    this.dgPanStart(e);
  }
  dgPanStart(e) {
    const v = this.dgView(this.dgSheet());
    this._dg = { kind: 'pan', sx: e.clientX, sy: e.clientY, vx: v.x, vy: v.y, z: v.z, moved: false };
  }
  dgNodeDown(e, n) {
    const s = this.state;
    e.stopPropagation();
    if (e.pointerType === 'mouse' && e.button !== 0) { if (e.button === 1) this.dgPanStart(e); return; }
    if (s.clean) { this.dgPanStart(e); return; }
    if (s.dedit === n.id) return; // se está escribiendo en esta forma: el texto se encarga
    if (s.dedit) this.dgEndEdit();
    if (s.dlabel) this.dgLabelDone(true);
    const sel = (s.dsel && s.dsel.nodes) || [], has = sel.includes(n.id);
    const nodes = e.shiftKey ? (has ? sel.filter(i => i !== n.id) : sel.concat(n.id)) : (has ? sel : [n.id]);
    this.setState({ dsel: { nodes, edge: null }, dmen: null, entMenu: null, menu: false });
    if (e.shiftKey && has) return;
    const x = this.dgSheet(s), all = this.dgNodes(x), ids = new Set(nodes);
    // Al mover una zona se mueven también las formas que están dentro
    all.forEach(z => { if (z.shape === 'zona' && ids.has(z.id)) all.forEach(m => { if (m.id !== z.id && m.x >= z.x && m.y >= z.y && m.x + m.w <= z.x + z.w && m.y + m.h <= z.y + z.h) ids.add(m.id); }); });
    this._dg = { kind: 'move', sx: e.clientX, sy: e.clientY, z: this.dgView(x).z, start: new Map(all.filter(m => ids.has(m.id)).map(m => [m.id, { x: m.x, y: m.y }])), moved: false, only: !e.shiftKey && has && sel.length > 1 ? n.id : null };
  }
  dgResizeDown(e, n) {
    e.stopPropagation(); e.preventDefault();
    const x = this.dgSheet();
    this._dg = { kind: 'resize', id: n.id, sx: e.clientX, sy: e.clientY, z: this.dgView(x).z, w: n.w, h: n.h, moved: false };
  }
  dgLinkDown(e, n) {
    e.stopPropagation(); e.preventDefault();
    if (this.state.dedit) this.dgEndEdit();
    const p = this.dgPt(e), a = dgAnchor(n, p.x, p.y);
    this._dg = { kind: 'link', from: n.id, sx: e.clientX, sy: e.clientY };
    this.setState({ dlink: { x1: a.x, y1: a.y, x2: p.x, y2: p.y }, dlinkTo: null, ddrag: 'link', dsel: { nodes: [n.id], edge: null }, dmen: null });
  }
  dgEdgeDown(e, k) {
    e.stopPropagation();
    const s = this.state;
    if (s.clean || (e.pointerType === 'mouse' && e.button !== 0)) { this.dgPanStart(e); return; }
    if (s.dedit) this.dgEndEdit();
    if (s.dlabel && s.dlabel !== k.id) this.dgLabelDone(true);
    this.setState({ dsel: { nodes: [], edge: k.id }, dmen: null });
  }
  // Forma que hay bajo el puntero (sin contar la forma "skip")
  dgNodeAt(cx, cy, skip) {
    const els = document.elementsFromPoint ? document.elementsFromPoint(cx, cy) : [];
    for (const el of els) { const nd = el.closest && el.closest('[data-node]'); if (nd && nd.getAttribute('data-node') !== skip) return nd.getAttribute('data-node'); }
    return null;
  }
  dgMove(e) {
    const g = this._dg; if (!g) return;
    const dxs = e.clientX - g.sx, dys = e.clientY - g.sy;
    if (!g.moved && Math.hypot(dxs, dys) < 3) return;
    const first = !g.moved; g.moved = true;
    if (g.kind === 'pan') {
      if (first) this.setState({ ddrag: 'pan' });
      this.dgSetView({ x: g.vx + dxs, y: g.vy + dys, z: g.z });
    } else if (g.kind === 'move') {
      if (first) { this.dgSnap(); this.setState({ ddrag: 'move' }); }
      const dx = dxs / g.z, dy = dys / g.z;
      this.dgSetNodes(n => { const st = g.start.get(n.id); return st ? { ...n, x: dgSnap(st.x + dx), y: dgSnap(st.y + dy) } : n; });
    } else if (g.kind === 'resize') {
      if (first) { this.dgSnap(); this.setState({ ddrag: 'resize' }); }
      const n0 = this.dgNodes(this.dgSheet()).find(m => m.id === g.id), mw = n0 && n0.shape === 'texto' ? 40 : 60, mh = n0 && n0.shape === 'texto' ? 24 : 36;
      const w = Math.max(mw, dgSnap(g.w + dxs / g.z)), h = Math.max(mh, dgSnap(g.h + dys / g.z));
      this.dgSetNodes(n => n.id !== g.id ? n : n.shape === 'tabla' ? { ...n, w: Math.max(DG_TABLA.minW, w) } : { ...n, w, h }); // el alto de una tabla sale de sus campos
    } else if (g.kind === 'link') {
      const x = this.dgSheet(), p = this.dgPt(e, x), from = this.dgNodes(x).find(m => m.id === g.from); if (!from) return;
      const to = this.dgNodeAt(e.clientX, e.clientY, g.from), a = dgAnchor(from, p.x, p.y);
      this.setState({ dlink: { x1: a.x, y1: a.y, x2: p.x, y2: p.y }, dlinkTo: to });
    } else if (g.kind === 'box') {
      const r = g.r, x1 = Math.min(g.sx, e.clientX) - r.left, y1 = Math.min(g.sy, e.clientY) - r.top;
      this.setState({ ddrag: 'box', dbox: { x: x1, y: y1, w: Math.abs(dxs), h: Math.abs(dys) } });
    }
  }
  dgUp(e) {
    const g = this._dg; if (!g) return;
    this._dg = null;
    const s = this.state;
    if (g.kind === 'move' && !g.moved && g.only) this.setState({ dsel: { nodes: [g.only], edge: null } });
    if (g.kind === 'link') {
      const x = this.dgSheet(s), to = this.dgNodeAt(e.clientX, e.clientY, g.from);
      this.setState({ dlink: null, dlinkTo: null, ddrag: null });
      if (to) { this.dgConnect(g.from, to); return; }
      // Soltar en un hueco crea una forma nueva ya conectada
      if (x && Math.hypot(e.clientX - g.sx, e.clientY - g.sy) > 40 && e.type === 'pointerup') {
        const from = this.dgNodes(x).find(m => m.id === g.from); if (!from) return;
        const shape = ['proceso', 'dato', 'nota', 'tabla'].includes(from.shape) ? from.shape : 'proceso', d = DG_SHAPES[shape], p = this.dgPt(e, x);
        const n = shape === 'tabla' ? dgTabla(dgSnap(p.x - d.w / 2), dgSnap(p.y - 28)) : dgNode(shape, dgSnap(p.x - d.w / 2), dgSnap(p.y - d.h / 2), '');
        const k = dgEdge(from.id, n.id, shape === 'tabla' ? { route: 'codo', head: 'none', c1: '1', c2: 'N' } : null);
        this.dgSet(y => ({ ...y, entities: (y.entities || []).concat(n), edges: (y.edges || []).concat(k) }), true);
        setTimeout(() => this.dgEdit(n.id, true), 0);
      }
      return;
    }
    if (g.kind === 'box') {
      const x = this.dgSheet(s), v = this.dgView(x), b = s.dbox;
      if (b && x) {
        const wx1 = (b.x - v.x) / v.z, wy1 = (b.y - v.y) / v.z, wx2 = wx1 + b.w / v.z, wy2 = wy1 + b.h / v.z;
        const hit = this.dgNodes(x).filter(n => n.x < wx2 && n.x + n.w > wx1 && n.y < wy2 && n.y + n.h > wy1).map(n => n.id);
        this.setState({ dsel: { nodes: Array.from(new Set(g.base.concat(hit))), edge: null }, dbox: null, ddrag: null });
      } else this.setState({ dbox: null, ddrag: null });
      return;
    }
    if (s.ddrag) this.setState({ ddrag: null });
  }
  // Rueda: mover el lienzo. Ctrl + rueda (o pellizcar en el panel táctil): zoom.
  dgWheel(e) {
    const s = this.state; if (s.mode !== 'diagrama' || s.confirm || s.calc || s.ajustes) return;
    const el = this.dgEl(); if (!el || !el.contains(e.target)) return;
    if (e.target.closest && e.target.closest('[data-dg-scroll]')) return; // listas con su propio desplazamiento
    e.preventDefault();
    const x = this.dgSheet(s), v = this.dgView(x);
    const k = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1;
    if (e.ctrlKey || e.metaKey) {
      const r = el.getBoundingClientRect(), mx = e.clientX - r.left, my = e.clientY - r.top;
      const z2 = dgClampZ(v.z * Math.exp(-e.deltaY * k * 0.0016));
      this.dgSetView({ x: mx - (mx - v.x) * (z2 / v.z), y: my - (my - v.y) * (z2 / v.z), z: z2 });
    } else {
      const dx = e.shiftKey && !e.deltaX ? e.deltaY : e.deltaX, dy = e.shiftKey && !e.deltaX ? 0 : e.deltaY;
      this.dgSetView({ x: v.x - dx * k, y: v.y - dy * k, z: v.z });
    }
  }
  dgZoom(f) {
    const x = this.dgSheet(), el = this.dgEl(); if (!x || !el) return;
    const v = this.dgView(x), mx = el.clientWidth / 2, my = el.clientHeight / 2, z2 = f === 0 ? 1 : dgClampZ(v.z * f);
    this.dgSetView({ x: mx - (mx - v.x) * (z2 / v.z), y: my - (my - v.y) * (z2 / v.z), z: z2 });
  }
  // Encaja todo el diagrama en la pantalla
  dgFitView() {
    const x = this.dgSheet(), el = this.dgEl(); if (!x || !el) return;
    const ns = this.dgNodes(x); if (!ns.length) { this.dgSetView({ x: 40, y: 40, z: 1 }); return; }
    const x1 = Math.min(...ns.map(n => n.x)), y1 = Math.min(...ns.map(n => n.y)), x2 = Math.max(...ns.map(n => n.x + n.w)), y2 = Math.max(...ns.map(n => n.y + n.h));
    const W = el.clientWidth, H = el.clientHeight, m = 50;
    const z = dgClampZ(Math.min(1.25, (W - 2 * m) / Math.max(1, x2 - x1), (H - 2 * m) / Math.max(1, y2 - y1)));
    this.dgSetView({ x: (W - (x2 - x1) * z) / 2 - x1 * z, y: (H - (y2 - y1) * z) / 2 - y1 * z, z });
  }
  // Teclado: Supr borrar · Ctrl+Z / Ctrl+Y deshacer y rehacer · Ctrl+D duplicar · Ctrl+A seleccionar todo ·
  // Intro editar el texto · flechas mover · Esc salir / quitar selección
  dgKey(e) {
    const s = this.state; if (s.mode !== 'diagrama' || s.confirm || s.calc || s.ajustes || e.defaultPrevented) return;
    const ae = document.activeElement, typing = ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA' || ae.isContentEditable);
    const k = e.key, mod = e.ctrlKey || e.metaKey, sel = s.dsel, nodes = (sel && sel.nodes) || [];
    if (k === 'Escape') {
      if (s.dkey) { e.preventDefault(); this.setState({ dkey: null }); return; } // menú de las claves de un campo
      if (s.dcard) { e.preventDefault(); this.dgCardClose(); return; } // menú del texto de un extremo de una conexión
      if (s.dedit) { e.preventDefault(); this.dgEndEdit(); return; }
      if (s.dlabel || typing) return;
      if (s.dmen) { this.setState({ dmen: null }); return; }
      if (sel) this.setState({ dsel: null });
      return;
    }
    // Menú del texto de un extremo abierto: la tecla 1 elige «1» y la N elige «N». Mientras se escribe en «Otro» (typing),
    // no hay atajos: esas teclas escriben.
    if (s.dcard && !typing && !mod && !e.altKey && (k === '1' || k === 'n' || k === 'N')) { e.preventDefault(); this.dgCardPick(s.dcard.edge, s.dcard.end, k === '1' ? '1' : 'N'); return; }
    if (typing || s.clean || !this.dgSheet(s)) return;
    if (mod && !e.altKey && (k === 'z' || k === 'Z')) { e.preventDefault(); this.dgUndo(e.shiftKey); return; }
    if (mod && !e.altKey && (k === 'y' || k === 'Y')) { e.preventDefault(); this.dgUndo(true); return; }
    if (mod && !e.altKey && (k === 'a' || k === 'A')) { e.preventDefault(); this.setState({ dsel: { nodes: this.dgNodes(this.dgSheet(s)).map(n => n.id), edge: null } }); return; }
    if (mod && !e.altKey && (k === 'd' || k === 'D')) { e.preventDefault(); this.dgDuplicate(); return; }
    if (mod || e.altKey) return;
    if (k === 'Delete' || k === 'Backspace') { if (nodes.length || (sel && sel.edge)) { e.preventDefault(); this.dgDelete(); } return; }
    if ((k === 'Enter' || k === 'F2') && nodes.length === 1) { e.preventDefault(); this.dgEdit(nodes[0]); return; }
    if ((k === 'Enter' || k === 'F2') && sel && sel.edge) { e.preventDefault(); this.dgLabelEdit(sel.edge); return; }
    const mv = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[k];
    if (mv && nodes.length) {
      e.preventDefault(); const ids = new Set(nodes), st = e.shiftKey ? DG_GRID * 5 : DG_GRID;
      this.dgSetNodes(n => ids.has(n.id) ? { ...n, x: n.x + mv[0] * st, y: n.y + mv[1] * st } : n, true);
    }
  }
  // Las formas crecen solas si su texto no cabe. Las tablas, además, encogen: su alto es siempre el que ocupan sus campos
  dgGrow() {
    const s = this.state; if (s.mode !== 'diagrama' || (this._dg && this._dg.kind === 'resize')) return;
    const x = this.curSheet(s); if (!x) return;
    const els = document.querySelectorAll('[data-node]'); if (!els.length) return;
    const byId = new Map(this.dgNodes(x).map(n => [n.id, n])), fix = {}, tfix = {};
    els.forEach(el => {
      const n = byId.get(el.getAttribute('data-node')); if (!n || n.shape === 'zona') return;
      if (n.shape === 'tabla') {
        // Tabla: su alto = cabecera + campos (cada uno con las líneas que necesite) + márgenes. Crece y también encoge.
        if (s.dedit === n.id) return; // mientras se edita, la tabla se dibuja con su alto natural
        const cab = el.querySelector('.diagrama-tabla-cabeza'); if (!cab) return;
        let need = cab.offsetHeight + DG_TABLA.padT + DG_TABLA.padB;
        el.querySelectorAll('.diagrama-tabla-fila').forEach(f => { need += f.offsetHeight; });
        if (Math.abs(need - n.h) > 0.5) tfix[n.id] = need;
        return;
      }
      const inner = el.querySelector('.diagrama-texto-in'); if (!inner) return;
      const p = dgPad(n), c = inner.offsetHeight;
      const need = n.shape === 'decision' ? c / 0.6 : c + p[0] + p[2];
      if (need > n.h + 1) fix[n.id] = Math.ceil(need / DG_GRID) * DG_GRID;
    });
    if (Object.keys(fix).length || Object.keys(tfix).length) this.setState(st => ({ notes: this.mapSheet(st, y => ({ ...y, entities: (y.entities || []).map(n => tfix[n.id] ? { ...n, h: tfix[n.id] } : fix[n.id] ? { ...n, h: Math.max(n.h, fix[n.id]) } : n) })) }));
  }

  // ----- Valores para la plantilla (componentes/diagrama/) -----
  dgVals(s, x) {
    const dirty = !s.clean, view = this.dgView(x), z = view.z;
    const all = this.dgNodes(x), byId = new Map(all.map(n => [n.id, n]));
    const sel = s.dsel || {}, selN = new Set((sel.nodes || []).filter(id => byId.has(id))), edit = dirty ? s.dedit : null, drag = s.ddrag;
    const CENTER = { proceso: 1, decision: 1, inicio: 1, dato: 1 };
    const one = selN.size === 1 && !edit ? byId.get([...selN][0]) : null;
    // Tabla de un diagrama entidad-relación: cabecera de color y campos (en la vista sucia se edita en la propia tabla)
    // *texto* se ve en verde (sin los asteriscos) mientras no se edita la tabla; ver dgMarks en formas.js
    const marcas = t => dgMarks(t).map((g, i) => ({ ...g, key: i, cls: g.on ? 'diagrama-tabla-marca' : '' }));
    const mkTabla = n => {
      const editing = edit === n.id, on = dirty && selN.has(n.id), col = DG_TABLA_COLORS[n.color] || DG_TABLA_COLORS.azul, rows = n.rows || [];
      // Columna de las claves: más ancha si algún campo tiene las tres (PK FK UQ); igual en toda la tabla, para que los nombres sigan alineados
      const tres = rows.some(r => dgKeys(r.k).length === 3);
      return {
        id: n.id, x: n.x + 'px', y: n.y + 'px', w: (editing ? Math.max(n.w, DG_TABLA.editW) : n.w) + 'px', h: editing ? 'auto' : n.h + 'px',
        esTabla: true, noTabla: false, editing, ver: !editing, zi: editing ? 5 : 'auto',
        cab: col[0], cabTxt: col[1], cabSub: col[2],
        titulo: n.title || '', sub: n.sub || '', tituloVer: n.title || 'tabla', hasSub: !!n.sub,
        onTitulo: e => this.dgTablaSet(n.id, m => ({ ...m, title: e.target.value.replace(/\r?\n/g, ' ') })),
        onSub: e => this.dgTablaSet(n.id, m => ({ ...m, sub: e.target.value.replace(/\r?\n/g, ' ') })),
        cabKey: e => { if (e.key === 'Enter') { e.preventDefault(); if (e.target.hasAttribute('data-tabla-titulo')) { const i = e.target.parentElement.querySelector('[data-tabla-sub]'); if (i) i.focus(); } else if (rows.length) this.dgTablaFoco(n.id, rows[0].id); else this.dgRowAdd(n.id); } },
        filas: rows.map((r, i) => ({
          id: r.id, nombre: r.name, nombreVer: marcas(r.name || '\u00a0'), nota: r.note || '', notaVer: marcas(r.note), hasNota: !!r.note,
          kTxt: dgKeyTxt(r.k), kEdit: dgKeyTxt(r.k) || 'clave', sinClave: !dgKeys(r.k).length, kTitle: 'Elegir las claves del campo (PK, FK, UQ)',
          // Menú de las claves: se abre con el botón y deja marcar varias; se cierra con Esc o con un clic fuera
          clave: () => this.setState(st => ({ dkey: st.dkey === r.id ? null : r.id })), kMenu: s.dkey === r.id,
          kOpts: DG_KEY_LIST.map(key => { const on = dgKeys(r.k).includes(key); return { key, nombre: DG_KEY_INFO[key][0], desc: DG_KEY_INFO[key][1], on, cls: on ? 'diagrama-tabla-claves-on' : '', pick: () => this.dgRowKey(n.id, r.id, key) }; }),
          onNombre: e => this.dgRowSet(n.id, r.id, 'name', e.target.value), onNota: e => this.dgRowSet(n.id, r.id, 'note', e.target.value),
          // Intro: campo nuevo debajo · Retroceso en un campo vacío: lo borra · Alt + flechas: lo sube o lo baja
          key: e => {
            if (e.key === 'Enter') { e.preventDefault(); this.dgRowAdd(n.id, r.id); }
            else if (e.key === 'Backspace' && !r.name && !r.note && !e.target.hasAttribute('data-campo-nota')) { e.preventDefault(); this.dgRowDel(n.id, r.id); }
            else if (e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) { e.preventDefault(); this.dgRowMove(n.id, r.id, e.key === 'ArrowUp' ? -1 : 1); }
            else if (!e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
              // El texto largo ocupa varias líneas: las flechas se mueven por él y solo saltan de campo desde el principio o el final
              const el = e.target, arriba = e.key === 'ArrowUp', borde = arriba ? el.selectionStart === 0 : el.selectionEnd === el.value.length;
              const o = rows[i + (arriba ? -1 : 1)]; if (o && borde) { e.preventDefault(); this.dgTablaFoco(n.id, o.id, el.hasAttribute('data-campo-nota')); }
            }
          },
          sube: () => this.dgRowMove(n.id, r.id, -1), baja: () => this.dgRowMove(n.id, r.id, 1), borra: () => this.dgRowDel(n.id, r.id),
          noSube: i === 0, noBaja: i === rows.length - 1
        })),
        kw: tres ? '68px' : '56px', kwEdit: tres ? '70px' : '54px',
        sinFilas: !rows.length, anadir: () => this.dgRowAdd(n.id),
        sel: on ? '1' : '', hl: s.dlinkTo === n.id ? '1' : '',
        cur: !dirty ? 'grab' : editing ? 'default' : 'move',
        dots: dirty && !editing && !drag,
        resize: dirty && !!one && one.id === n.id,
        down: e => this.dgNodeDown(e, n),
        dbl: e => { e.stopPropagation(); if (!dirty || editing) return; const f = e.target.closest && e.target.closest('[data-fila]'); this.dgEdit(n.id, false, f ? f.getAttribute('data-fila') : null); },
        link: e => this.dgLinkDown(e, n),
        resizeDown: e => this.dgResizeDown(e, n)
      };
    };
    const mk = n => {
      if (n.shape === 'tabla') return mkTabla(n);
      const p = dgPath(n), col = DG_COLORS[n.color] || DG_COLORS.gris, isT = n.shape === 'texto', isZ = n.shape === 'zona', pad = dgPad(n);
      const editing = edit === n.id, on = dirty && selN.has(n.id), src = n.lines || [];
      const lines = editing ? this.mkdLines(src, n.id) : this.mkdLines(src, n.id, true).map(l => ({ ...l, onDown: undefined }));
      return {
        id: n.id, x: n.x + 'px', y: n.y + 'px', w: n.w + 'px', h: n.h + 'px', vb: '0 0 ' + n.w + ' ' + n.h,
        esTabla: false, noTabla: true, zi: 'auto',
        d: p.d, d2: p.d2,
        fill: isT ? 'transparent' : isZ ? col[1] + '0f' : col[0],
        stroke: isT ? (dirty ? '#4a4a4a' : 'transparent') : col[1],
        dash: isZ || isT ? '6 5' : 'none',
        pad: pad.map(q => q + 'px').join(' '),
        align: CENTER[n.shape] ? 'center' : 'left',
        vjust: CENTER[n.shape] ? 'center' : 'flex-start',
        lines, editing,
        sel: on ? '1' : '',
        hl: s.dlinkTo === n.id ? '1' : '',
        cur: !dirty ? 'grab' : editing ? 'text' : 'move',
        dots: dirty && !editing && !drag,
        resize: dirty && !!one && one.id === n.id,
        down: e => this.dgNodeDown(e, n),
        dbl: e => { e.stopPropagation(); if (dirty && !editing) this.dgEdit(n.id); },
        link: e => this.dgLinkDown(e, n),
        resizeDown: e => this.dgResizeDown(e, n)
      };
    };
    const zones = all.filter(n => n.shape === 'zona').map(mk), nodes = all.filter(n => n.shape !== 'zona').map(mk);
    const edges = [], labels = [], cards = [], geo = dgRoutes(byId, x.edges || []);
    (x.edges || []).forEach(k => {
      const a = byId.get(k.from), b = byId.get(k.to); if (!a || !b) return;
      const g = geo.get(k.id), on = dirty && sel.edge === k.id, color = on ? '#00a000' : '#8a8a8a'; if (!g) return;
      // «1» o «N» en cada extremo (relaciones de un diagrama entidad-relación)
      [[k.c1, g.e1, k.head === 'both'], [k.c2, g.e2, k.head !== 'none']].forEach(([txt, e, punta], i) => {
        if (!txt) return; const q = dgCardPos(punta ? { ...e, x: e.x + e.dx * 10, y: e.y + e.dy * 10 } : e);
        cards.push({ id: k.id + ':' + i, x: q.x + 'px', y: q.y + 'px', tf: q.tf, text: txt, color: on ? '#3fd45f' : '#e6e6e6' });
      });
      edges.push({ id: k.id, d: g.d, hit: g.hit, heads: g.heads, color, dash: k.dash ? '7 6' : 'none', cur: dirty ? 'pointer' : 'grab', down: e => this.dgEdgeDown(e, k), dbl: e => { e.stopPropagation(); this.dgLabelEdit(k.id); } });
      const editing = dirty && s.dlabel === k.id;
      if (k.label || editing) {
        let txt = k.label || ''; try { txt = plainOf(cleanSegs(txt)); } catch (_) {}
        labels.push({ id: k.id, x: g.mx + 'px', y: g.my + 'px', text: txt, editing, show: !editing, raw: k.label || '', color: on ? '#00a000' : '#4a4a4a', title: k.label && /=/.test(k.label) ? k.label : '',
          down: e => this.dgEdgeDown(e, k), dbl: e => { e.stopPropagation(); this.dgLabelEdit(k.id); } });
      }
    });
    const L = s.dlink, scr = (wx, wy) => ({ x: view.x + wx * z, y: view.y + wy * z });
    const v = {
      dgCursor: drag === 'pan' ? 'grabbing' : drag === 'link' ? 'crosshair' : 'default',
      dgWorld: 'translate(' + view.x + 'px,' + view.y + 'px) scale(' + z + ')',
      dgGridSize: (20 * z) + 'px ' + (20 * z) + 'px',
      dgGridPos: view.x + 'px ' + view.y + 'px',
      dgZones: zones, dgNodes: nodes, dgEdges: edges, dgLabels: labels, dgCards: cards,
      dgLinkD: L ? 'M' + L.x1.toFixed(1) + ',' + L.y1.toFixed(1) + ' L' + L.x2.toFixed(1) + ',' + L.y2.toFixed(1) : '',
      dgEmpty: !all.length,
      dgHint: dirty ? 'Añade formas con los botones de la barra lateral' : 'Diagrama vacío. Pasa a la vista sucia para editarlo',
      dgHint2: dirty ? 'Arrastra desde los puntos de una forma para conectarla con otra' : '',
      dgBox: !!s.dbox, dgBoxStyle: s.dbox ? 'left:' + s.dbox.x + 'px;top:' + s.dbox.y + 'px;width:' + s.dbox.w + 'px;height:' + s.dbox.h + 'px;' : '',
      dgDown: e => this.dgBgDown(e),
      dgDbl: e => {
        if (!dirty || (e.target.closest && e.target.closest('[data-node],[data-dg-ui],[data-edge]'))) return;
        const p = this.dgPt(e, x), d = DG_SHAPES.proceso, n = dgNode('proceso', dgSnap(p.x - d.w / 2), dgSnap(p.y - d.h / 2), '');
        this.dgSet(y => ({ ...y, entities: (y.entities || []).concat(n) }), true);
        setTimeout(() => this.dgEdit(n.id, true), 0);
      },
      // Zoom
      dgZoomTxt: Math.round(z * 100) + ' %',
      dgZoomIn: () => this.dgZoom(1.2), dgZoomOut: () => this.dgZoom(1 / 1.2), dgZoomReset: () => this.dgZoom(0), dgFit: () => this.dgFitView(),
      // Etiqueta de conexión en edición
      dgLabelDraft: s.ddraft || '',
      dgLabelChange: e => this.setState({ ddraft: e.target.value }),
      dgLabelKey: e => { if (e.key === 'Enter') { e.preventDefault(); this.dgLabelDone(true); } else if (e.key === 'Escape') { e.preventDefault(); this.dgLabelDone(false); } },
      dgLabelBlur: () => this.dgLabelDone(true),
      dgStop: e => e.stopPropagation()
    };
    // Barra de la forma seleccionada (colores, texto, mención, duplicar, borrar)
    const showBar = dirty && selN.size > 0 && !edit && !drag;
    v.dgBar = showBar;
    if (showBar) {
      const ns = [...selN].map(id => byId.get(id)), x1 = Math.min(...ns.map(n => n.x)), x2 = Math.max(...ns.map(n => n.x + n.w)), y1 = Math.min(...ns.map(n => n.y)), y2 = Math.max(...ns.map(n => n.y + n.h));
      const a = scr((x1 + x2) / 2, y1), b = scr(0, y2), top = a.y - 50 < 6 ? b.y + 12 : a.y - 50;
      v.dgBarStyle = 'left:' + a.x.toFixed(0) + 'px;top:' + top.toFixed(0) + 'px;';
      v.dgColors = DG_COLOR_ORDER.map(c => ({ c, bg: DG_COLORS[c][1], title: DG_COLOR_NAME[c], ring: ns.every(n => (n.color || 'gris') === c) ? '0 0 0 2px #1c1c1c, 0 0 0 4px #fff' : 'none', pick: () => this.dgColor(c) }));
      v.dgOne = !!one;
      v.dgShapes = one && one.shape !== 'zona' ? ['proceso', 'decision', 'inicio', 'dato', 'nota', 'texto'].map(k => ({ k, title: DG_SHAPES[k].label, cls: 'diagrama-forma-' + k, bg: one.shape === k ? '#008000' : '#8a8a8a', pick: () => this.dgShape(k) })) : [];
      v.dgCanShape = !!one && one.shape !== 'zona' && one.shape !== 'tabla';
      v.dgEsTabla = !!one && one.shape === 'tabla';
      v.dgConTexto = !!one && one.shape !== 'tabla';
      v.dgAddFila = () => { if (one) { this.dgSnap(); this.setState({ dedit: one.id, dmen: null, dlabel: null }, () => this.dgRowAdd(one.id)); } };
      v.dgEditTxt = () => { if (one) this.dgEdit(one.id); };
      v.dgMenOpen = () => { if (one) this.setState(st => ({ dmen: st.dmen && st.dmen.id === one.id ? null : { id: one.id, q: '' } }), () => { const i = document.querySelector('[data-menciones] input'); if (i) i.focus(); }); };
      v.dgMenOn = !!(one && s.dmen && s.dmen.id === one.id);
      v.dgDup = () => this.dgDuplicate();
      v.dgDel = () => this.dgDelete();
    }
    // Barra de la conexión seleccionada
    const ek = dirty && sel.edge && !s.dlabel && !drag ? (x.edges || []).find(k => k.id === sel.edge) : null;
    const ea = ek && byId.get(ek.from), eb = ek && byId.get(ek.to);
    v.dgEdgeBar = !!(ek && ea && eb);
    if (v.dgEdgeBar) {
      const g = dgEdgeGeo(ea, eb, ek), m = scr(g.mx, g.my);
      v.dgEdgeBarStyle = 'left:' + m.x.toFixed(0) + 'px;top:' + Math.max(6, m.y - 58).toFixed(0) + 'px;';
      v.dgEdgeLabel = () => this.dgLabelEdit(ek.id);
      v.dgEdgeDash = () => this.dgEdgeSet(ek.id, k => ({ ...k, dash: !k.dash }));
      v.dgEdgeDashTxt = ek.dash ? 'Discontinua' : 'Continua';
      v.dgEdgeHead = () => this.dgEdgeSet(ek.id, k => ({ ...k, head: k.head === 'end' ? 'both' : k.head === 'both' ? 'none' : 'end' }));
      v.dgEdgeHeadTxt = ek.head === 'both' ? '↔' : ek.head === 'none' ? '—' : '→';
      v.dgEdgeFlip = () => this.dgEdgeSet(ek.id, k => ({ ...k, from: k.to, to: k.from }));
      // Entidad-relación: línea recta o en ángulo, y cuántos en cada extremo (nada → 1 → N)
      v.dgEdgeRoute = () => this.dgEdgeSet(ek.id, k => ({ ...k, route: k.route === 'codo' ? '' : 'codo' }));
      v.dgEdgeRouteTxt = ek.route === 'codo' ? 'En ángulo' : 'Recta';
      // Texto de cada extremo (18/11/2026): el botón abre un menú con «–» (nada), «1», «N» y un campo «Otro» para escribir
      // cualquier texto (0..1, muchos…). state.dcard = { edge, end: 'c1' | 'c2', txt } mientras está abierto; txt = lo escrito
      // en «Otro» desde que se abrió (null si no se ha escrito nada): así, escribir «1» en «Otro» se queda en el campo y no
      // se confunde con la opción rápida «1». Atajos: con el menú abierto y fuera de «Otro», las teclas 1 y N (dgKey).
      const dc = s.dcard && s.dcard.edge === ek.id ? s.dcard.end : null;
      v.dgEnds = [['c1', 'Origen'], ['c2', 'Destino']].map(([end, nombre]) => {
        const val = ek[end] || '', abierto = dc === end, tx = abierto && s.dcard.txt != null ? s.dcard.txt : null;
        const otro = tx != null ? tx : val && !DG_CARD.includes(val) ? val : '';
        return {
          end, txt: nombre + ': ' + (val || '–'), title: nombre === 'Origen' ? 'Qué se escribe en el extremo de origen: nada, 1, N o lo que quieras' : 'Qué se escribe en el extremo de destino: nada, 1, N o lo que quieras',
          abierto, cls: abierto ? 'diagrama-card-boton-on' : '',
          // Al abrir, el cursor NO va a «Otro»: así funcionan los atajos 1 y N hasta que se pulse el campo
          toggle: () => { this._dcardSnap = false; this.setState(st => ({ dcard: st.dcard && st.dcard.edge === ek.id && st.dcard.end === end ? null : { edge: ek.id, end, txt: null } })); },
          titulo: nombre,
          opts: DG_CARD.map(c => ({ txt: c || '–', title: c ? (c === '1' ? '1 (tecla 1)' : 'N (tecla N)') : 'Nada', cls: !otro && val === c ? 'diagrama-card-opcion-on' : '', pick: () => this.dgCardPick(ek.id, end, c) })),
          otro, otroCls: otro ? 'diagrama-card-otro-on' : '',
          // Un solo paso de deshacer para todo lo que se escriba cada vez que se abre el menú (se guarda al escribir la primera letra)
          otroChange: e => { if (!this._dcardSnap) { this.dgSnap(); this._dcardSnap = true; } const t = e.target.value.replace(/\r?\n/g, ' '); this.dgSet(x => ({ ...x, edges: (x.edges || []).map(k => k.id === ek.id ? { ...k, [end]: t } : k) }), false, { dcard: { edge: ek.id, end, txt: t } }); },
          otroKey: e => { if (e.key === 'Enter' || e.key === 'Escape') { e.preventDefault(); this.dgCardClose(); } }
        };
      });
      v.dgEdgeDel = () => this.dgDelete();
    }
    // Buscador de menciones
    const men = dirty && s.dmen && byId.get(s.dmen.id) ? s.dmen : null;
    v.dgMen = !!men;
    if (men) {
      const items = this.dgMentionItems(s, men.q);
      v.dgMenQ = men.q;
      v.dgMenChange = e => { const q = e.target.value; this.setState(st => st.dmen ? { dmen: { ...st.dmen, q } } : null); };
      v.dgMenKey = e => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); this.setState({ dmen: null }); } else if (e.key === 'Enter' && items.length) { e.preventDefault(); this.dgMention(items[0].path); } };
      v.dgMenItems = items.slice(0, 80).map(it => ({ ...it, val: resolveEntity(it.path), pick: () => this.dgMention(it.path) }));
      v.dgMenNone = !items.length;
      v.dgMenClose = () => this.setState({ dmen: null });
    }
    return v;
  }
});
