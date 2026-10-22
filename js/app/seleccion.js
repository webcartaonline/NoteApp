// Selección de texto entre varias líneas (vista sucia): ratón, Mayús+clic, Mayús+flechas, Ctrl+A,
// copiar, cortar, pegar y borrar.
NoteApp.partes.push(Base => class extends Base {
  // ----- Selección de texto entre varias líneas (vista sucia) -----
  // this._msel = { key, ent, a: { id, o }, f: { id, o } }: a = donde empezó la selección, f = donde termina. key = 'sheet' o id de la entidad de texto.
  linesOf(ent, s) {
    s = s || this.state; const sh = this.curSheet(s); if (!sh) return null;
    if (!ent) return sh.lines;
    const e = (sh.entities || []).find(x => x.id === ent); if (!e) return null;
    return e.lines && e.lines.length ? e.lines : [{ id: e.id + 'l', text: '' }];
  }
  boxOf(key) { const list = document.querySelectorAll('[data-lines]'); for (const el of list) if (el.getAttribute('data-lines') === key) return el; return null; }
  lineEl(box, id) { const list = box.querySelectorAll('[data-lid]'); for (const el of list) if (el.getAttribute('data-lid') === id) return el; return null; }
  textNodes(lineEl) {
    const out = [], w = document.createTreeWalker(lineEl, NodeFilter.SHOW_TEXT); let t;
    while ((t = w.nextNode())) { const sp = t.parentElement && t.parentElement.closest('[data-off]'); if (sp && lineEl.contains(sp)) out.push({ t, d: +sp.getAttribute('data-off') }); }
    return out;
  }
  pointPos(node, off) {
    const el = node && (node.nodeType === 3 ? node.parentElement : node); if (!el || !el.closest) return null;
    const lineEl = el.closest('[data-lid]'), box = lineEl && lineEl.closest('[data-lines]'); if (!box) return null;
    const key = box.getAttribute('data-lines'), ent = key === 'sheet' ? null : key, id = lineEl.getAttribute('data-lid');
    const ln = (this.linesOf(ent) || []).find(l => l.id === id); if (!ln) return null;
    const nodes = this.textNodes(lineEl); let o = ln.text.length;
    if (node.nodeType === 3) { const hit = nodes.find(x => x.t === node); if (hit) o = hit.d + Math.min(off, node.length); }
    else { const r = document.createRange(); try { r.setStart(node, off); r.collapse(true); const nx = nodes.find(x => r.comparePoint(x.t, 0) >= 0); if (nx) o = nx.d; } catch (_) {} }
    return { key, ent, id, o: Math.max(0, Math.min(o, ln.text.length)) };
  }
  posToDom(box, id, o) {
    const lineEl = this.lineEl(box, id); if (!lineEl) return null;
    const nodes = this.textNodes(lineEl);
    for (const x of nodes) if (o >= x.d && o <= x.d + x.t.length) return { node: x.t, off: o - x.d };
    const w = document.createTreeWalker(lineEl, NodeFilter.SHOW_TEXT); let t, last = null; while ((t = w.nextNode())) last = t;
    return last ? { node: last, off: 0 } : { node: lineEl, off: 0 };
  }
  pointFromXY(x, y, key) {
    const box = this.boxOf(key); if (!box) return null;
    let node = null, off = 0;
    // El cuadro de edición transparente tapa el texto: se oculta un instante para medir sobre el texto real
    const ta = this.taRef.current, vis = ta ? ta.style.visibility : '';
    if (ta) ta.style.visibility = 'hidden';
    if (document.caretRangeFromPoint) { const r = document.caretRangeFromPoint(x, y); if (r) { node = r.startContainer; off = r.startOffset; } }
    else if (document.caretPositionFromPoint) { const p = document.caretPositionFromPoint(x, y); if (p) { node = p.offsetNode; off = p.offset; } }
    if (ta) ta.style.visibility = vis;
    const p = node ? this.pointPos(node, off) : null;
    if (p && p.key === key) return p;
    // Fuera de una línea: se usa la más cercana (encima → su principio, debajo → su final)
    const ent = key === 'sheet' ? null : key, lines = this.linesOf(ent); if (!lines || !lines.length) return null;
    let best = null, bd = Infinity;
    box.querySelectorAll('[data-lid]').forEach(el => { const r = el.getBoundingClientRect(), d = y < r.top ? r.top - y : y > r.bottom ? y - r.bottom : 0; if (d < bd) { bd = d; best = { el, r }; } });
    if (!best) return null;
    const id = best.el.getAttribute('data-lid'), ln = lines.find(l => l.id === id); if (!ln) return null;
    const start = y < best.r.top || (y <= best.r.bottom && x < best.r.left + 4);
    return { key, ent, id, o: start ? 0 : ln.text.length };
  }
  setMulti(key, ent, a, f) {
    this._msel = { key, ent, a: { id: a.id, o: a.o }, f: { id: f.id, o: f.o } };
    if (this.state.focusId) { const ae = document.activeElement; if (ae && ae.tagName === 'TEXTAREA') ae.blur(); this.setState({ focusId: null }); }
    else this.applySel();
  }
  applySel() {
    const m = this._msel; if (!m) return;
    const box = this.boxOf(m.key), lines = this.linesOf(m.ent);
    if (!box || !lines || !lines.some(l => l.id === m.a.id) || !lines.some(l => l.id === m.f.id)) { this._msel = null; return; }
    const A = this.posToDom(box, m.a.id, m.a.o), F = this.posToDom(box, m.f.id, m.f.o); if (!A || !F) return;
    const sel = window.getSelection(); if (!sel) return;
    if (sel.anchorNode === A.node && sel.anchorOffset === A.off && sel.focusNode === F.node && sel.focusOffset === F.off) return;
    try { sel.setBaseAndExtent(A.node, A.off, F.node, F.off); } catch (_) {}
  }
  readSel() {
    const m = this._msel, sel = window.getSelection(); if (!m || !sel || !sel.anchorNode) return;
    const a = this.pointPos(sel.anchorNode, sel.anchorOffset), f = this.pointPos(sel.focusNode, sel.focusOffset);
    if (a && f && a.key === m.key && f.key === m.key) { m.a = { id: a.id, o: a.o }; m.f = { id: f.id, o: f.o }; }
    if (m.a.id === m.f.id) this.selToLine();
  }
  selToLine() { const m = this._msel; if (!m) return; this._msel = null; const sel = window.getSelection(); if (sel) sel.removeAllRanges(); this.focusLine(m.a.id, { a: m.a.o, b: m.f.o }); }
  selRange() {
    const m = this._msel; if (!m) return null;
    const lines = this.linesOf(m.ent); if (!lines) return null;
    const ia = lines.findIndex(l => l.id === m.a.id), iff = lines.findIndex(l => l.id === m.f.id); if (ia < 0 || iff < 0) return null;
    const A = { i: ia, o: Math.min(m.a.o, lines[ia].text.length) }, F = { i: iff, o: Math.min(m.f.o, lines[iff].text.length) };
    const fwd = A.i < F.i || (A.i === F.i && A.o <= F.o);
    return { lines, s: fwd ? A : F, e: fwd ? F : A };
  }
  selText() {
    const r = this.selRange(); if (!r) return null;
    const out = []; for (let i = r.s.i; i <= r.e.i; i++) { const t = r.lines[i].text; out.push(t.slice(i === r.s.i ? r.s.o : 0, i === r.e.i ? r.e.o : t.length)); }
    return out.join('\n');
  }
  replaceSel(text) {
    const m = this._msel, r = this.selRange(); this._msel = null;
    const sel = window.getSelection(); if (sel) sel.removeAllRanges();
    if (!m || !r) return;
    const src = r.lines, a = r.s, b = r.e;
    const before = src[a.i].text.slice(0, a.o), after = src[b.i].text.slice(b.o);
    const made = String(text).replace(/\r/g, '').split('\n').map((t, k) => ({ id: k === 0 ? src[a.i].id : uid('l'), text: t }));
    made[0].text = before + made[0].text;
    const last = made[made.length - 1], caret = last.text.length; last.text += after;
    this.setLines(src.slice(0, a.i).concat(made, src.slice(b.i + 1)), last.id, caret, m.ent);
  }
  selectAll(key, ent) {
    const lines = this.linesOf(ent); if (!lines || !lines.length) return;
    const last = lines[lines.length - 1];
    if (lines.length === 1) { this._msel = null; this.focusLine(last.id, { a: 0, b: last.text.length }); return; }
    this.setMulti(key, ent, { id: lines[0].id, o: 0 }, { id: last.id, o: last.text.length });
  }
  // Punto de partida para Mayús+clic: la selección actual o el cursor de la línea que se está editando
  anchorNow(key, ent) {
    const m = this._msel; if (m && m.key === key) return m.a;
    const s = this.state, lines = this.linesOf(ent) || [], ta = this.taRef.current;
    if (s.focusId && ta && lines.some(l => l.id === s.focusId)) return { id: s.focusId, o: ta.selectionDirection === 'backward' ? ta.selectionEnd : ta.selectionStart };
    return null;
  }
  autoScroll(key, y) {
    const box = this.boxOf(key), sc = box && (box.hasAttribute('data-scroll') ? box : box.closest('[data-scroll]')); if (!sc) return;
    const r = sc.getBoundingClientRect();
    if (y < r.top + 24) sc.scrollTop -= 18; else if (y > r.bottom - 24) sc.scrollTop += 18;
  }
  selMove(e) {
    const d = this._drag; if (!d) return;
    if (!(e.buttons & 1)) { this._drag = null; return; }
    this.autoScroll(d.key, e.clientY);
    const p = this.pointFromXY(e.clientX, e.clientY, d.key); if (!p) return;
    if (!d.multi) {
      if (p.id === d.id) {
        if (!d.ta && d.anchor) { const ta = this.taRef.current; if (ta && this.state.focusId === p.id && document.activeElement === ta) { const a = d.anchor.o; ta.setSelectionRange(Math.min(a, p.o), Math.max(a, p.o), p.o < a ? 'backward' : 'forward'); } }
        return;
      }
      if (d.ta) { const ta = this.taRef.current; d.anchor = { id: d.id, o: ta ? (ta.selectionDirection === 'backward' ? ta.selectionEnd : ta.selectionStart) : 0 }; }
      d.multi = true;
    }
    e.preventDefault();
    this.setMulti(d.key, d.ent, d.anchor, p);
  }
  selUp() {
    const d = this._drag; this._drag = null;
    if (d && d.multi && this._msel && this._msel.a.id === this._msel.f.id) this.selToLine();
  }
  selCopy(e) {
    const m = this._msel, ae = document.activeElement;
    if (ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA')) return;
    let t = null;
    if (m) t = this.selText();
    else { const sel = window.getSelection(), n = sel && sel.anchorNode, el = n && (n.nodeType === 3 ? n.parentElement : n); if (sel && !sel.isCollapsed && el && el.closest && el.closest('[data-lines]')) t = sel.toString().replace(/​/g, ''); }
    if (t == null || !e.clipboardData) return;
    e.clipboardData.setData('text/plain', t); e.preventDefault();
  }
  selPaste(e) {
    if (!this._msel) return;
    const ae = document.activeElement; if (ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA')) return;
    const t = (e.clipboardData || window.clipboardData).getData('text/plain'); e.preventDefault(); this._pasted = true;
    this.replaceSel(t || '');
  }
  selKey(e) {
    if (e.naSel) return true; // ya lo resolvió la línea que se estaba editando
    const ae = document.activeElement, typing = ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA' || ae.isContentEditable);
    const k = e.key, mod = e.ctrlKey || e.metaKey;
    // Ctrl+A fuera de un campo: selecciona solo el texto de la hoja
    if (!typing && mod && !e.altKey && (k === 'a' || k === 'A')) {
      const m = this._msel, s = this.state;
      if (m) { e.preventDefault(); this.selectAll(m.key, m.ent); return true; }
      const box = this.boxOf('sheet'); if (!box) return false;
      e.preventDefault();
      if (s.clean) { const r = document.createRange(); r.selectNodeContents(box); const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(r); }
      else this.selectAll('sheet', null);
      return true;
    }
    const m = this._msel; if (!m || typing) return false;
    if (mod && (k === 'x' || k === 'X')) {
      e.preventDefault(); const t = this.selText() || '';
      const fb = () => { const ta = document.createElement('textarea'); ta.value = t; ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0;'; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); } catch (_) {} ta.remove(); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).catch(fb); else fb();
      this.replaceSel(''); return true;
    }
    if (mod && (k === 'v' || k === 'V')) {
      // El pegado llega por el evento 'paste'; si el navegador no lo envía, se lee el portapapeles
      this._pasted = false;
      setTimeout(() => { if (this._pasted || !this._msel || !navigator.clipboard || !navigator.clipboard.readText) return; navigator.clipboard.readText().then(t => { if (this._msel) this.replaceSel(t || ''); }, () => {}); }, 60);
      return true;
    }
    if (mod || e.altKey) return false;
    if (k === 'Escape') { e.preventDefault(); this._msel = null; const sel = window.getSelection(); if (sel) sel.removeAllRanges(); return true; }
    if (k === 'ArrowLeft' || k === 'ArrowRight' || k === 'ArrowUp' || k === 'ArrowDown') {
      e.preventDefault();
      if (e.shiftKey) { const sel = window.getSelection(); if (sel && sel.modify) { sel.modify('extend', k === 'ArrowLeft' || k === 'ArrowUp' ? 'backward' : 'forward', k === 'ArrowUp' || k === 'ArrowDown' ? 'line' : 'character'); this.readSel(); } }
      else { const r = this.selRange(); if (!r) return true; const p = k === 'ArrowLeft' || k === 'ArrowUp' ? r.s : r.e; this._msel = null; const sel = window.getSelection(); if (sel) sel.removeAllRanges(); this.focusLine(r.lines[p.i].id, p.o); }
      return true;
    }
    if (k === 'Backspace' || k === 'Delete') { e.preventDefault(); this.replaceSel(''); return true; }
    if (k === 'Enter') { e.preventDefault(); this.replaceSel('\n'); return true; }
    if (k.length === 1) { e.preventDefault(); this.replaceSel(k); return true; }
    if (k === 'Dead' || k === 'Process') { this.replaceSel(''); return true; }
    return false;
  }
  offsetFromPoint(lineEl, x, y, fallback) {
    let node, off;
    if (document.caretRangeFromPoint) { const r = document.caretRangeFromPoint(x, y); if (r) { node = r.startContainer; off = r.startOffset; } }
    else if (document.caretPositionFromPoint) { const p = document.caretPositionFromPoint(x, y); if (p) { node = p.offsetNode; off = p.offset; } }
    if (!node || !lineEl.contains(node)) return fallback;
    const el = node.nodeType === 3 ? node.parentElement : node;
    const span = el && el.closest('[data-off]');
    if (!span || !lineEl.contains(span)) return fallback;
    return +span.getAttribute('data-off') + (node.nodeType === 3 ? off : 0);
  }
});
