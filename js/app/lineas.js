// Líneas de texto: teclado y edición de cada línea (lineHandlers) y cómo se dibuja cada una (mkdLines).
// Opacidad del texto que no coincide mientras se usa el buscador del panel de texto (se oscurece).
const DIM_BUSCAR = '0.35';
NoteApp.partes.push(Base => class extends Base {
  lineHandlers(ln, idx, lines, entId) {
    const s = this.state, setL = (l, f, c) => this.setLines(l, f, c, entId);
    return {
      onDown: e => {
        if (s.clean || e.button !== 0) return;
        const key = entId || 'sheet';
        if (s.focusId === ln.id && e.target.tagName === 'TEXTAREA') {
          if (e.shiftKey && this._msel) { e.preventDefault(); const p = this.pointFromXY(e.clientX, e.clientY, key); if (p) this.setMulti(key, entId || null, this._msel.a, p); return; }
          this._msel = null; this._drag = { key, ent: entId || null, ta: true, id: ln.id, multi: false };
          return;
        }
        e.preventDefault(); e.stopPropagation();
        const o = this.offsetFromPoint(e.currentTarget, e.clientX, e.clientY, ln.text.length);
        if (e.shiftKey) {
          const anc = this.anchorNow(key, entId || null);
          if (anc) { this._drag = { key, ent: entId || null, ta: false, id: anc.id, anchor: anc, multi: true }; if (anc.id === ln.id) { this._msel = null; this.focusLine(ln.id, { a: anc.o, b: o }); } else this.setMulti(key, entId || null, anc, { id: ln.id, o }); return; }
        }
        this._msel = null;
        this._drag = { key, ent: entId || null, ta: false, id: ln.id, anchor: { id: ln.id, o }, multi: false };
        this.focusLine(ln.id, o);
      },
      onChange: e => {
        const ta = e.target; let text = ta.value.replace(/\n/g, ' '), c = ta.selectionStart;
        if (c > 0 && text.length === ln.text.length + 1 && text[c - 1] === ' ' && text.slice(0, c - 1) + text.slice(c) === ln.text) {
          const pre = text.slice(0, c - 1), at = menAt(lines, idx, pre), off = this._menOff, au = this._menAuto;
          if (at >= 0 && !(off && off.id === ln.id && off.at === at)) {
            if (au && au.id === ln.id && au.pos === c - 2 && pre[c - 2] === '_') { text = pre.slice(0, -1) + ' ' + text.slice(c); c -= 1; this._menAuto = null; }
            else { text = pre + '_' + text.slice(c); this._menAuto = { id: ln.id, pos: c - 1 }; }
            return setL(lines.map(l => l.id === ln.id ? { ...l, text } : l), ln.id, c);
          }
        }
        setL(lines.map(l => l.id === ln.id ? { ...l, text } : l));
      },
      onBlur: () => this.setState(st => st.focusId === ln.id ? { focusId: null } : null),
      onPaste: e => {
        const t = (e.clipboardData || window.clipboardData).getData('text/plain');
        // Imagen en el portapapeles (y ningún texto): se guarda aparte y en el texto queda ![Imagen](Imágenes/…).
        const files = t ? [] : imgFiles(e);
        if (files.length) {
          e.preventDefault();
          const ta = e.target, a = ta.selectionStart, b = ta.selectionEnd, before = ln.text.slice(0, a), after = ln.text.slice(b);
          const refs = files.map(f => { const im = imgNew(f); im.ready.then(() => this.fsQueue()); return imgLine(im.name); });
          // En una fila de tabla la imagen va dentro de la celda; en el resto, cada imagen en su propia línea
          // (el texto de antes y el de después quedan en sus líneas) y el cursor pasa a la línea de debajo.
          if (/^\s*\|/.test(before)) { const ins = refs.join(' '); return setL(lines.map(l => l.id === ln.id ? { ...l, text: before + ins + after } : l), ln.id, (before + ins).length); }
          const parts = (before.trim() ? [before.replace(/\s+$/, '')] : []).concat(refs, [after.replace(/^\s+/, '')]);
          const made = parts.map((p, k) => ({ id: k === 0 ? ln.id : uid('l'), text: p }));
          return setL(lines.slice(0, idx).concat(made, lines.slice(idx + 1)), made[made.length - 1].id, 0);
        }
        if (!/\n/.test(t)) return;
        e.preventDefault();
        const ta = e.target, a = ta.selectionStart, b = ta.selectionEnd;
        const parts = t.replace(/\r/g, '').split('\n');
        const before = ln.text.slice(0, a), after = ln.text.slice(b);
        const made = parts.map((p, k) => ({ id: k === 0 ? ln.id : uid('l'), text: p }));
        made[0].text = before + made[0].text;
        const lastLen = made[made.length - 1].text.length;
        made[made.length - 1].text += after;
        setL(lines.slice(0, idx).concat(made, lines.slice(idx + 1)), made[made.length - 1].id, lastLen);
      },
      onKey: e => {
        const ta = e.target, a = ta.selectionStart, b = ta.selectionEnd, len = ln.text.length;
        const lh = parseFloat(getComputedStyle(ta).lineHeight) || 25;
        const oneRow = ta.offsetHeight < lh * 1.5;
        const key = entId || 'sheet', back = ta.selectionDirection === 'backward', fo = back ? a : b, an = back ? b : a;
        if ((e.ctrlKey || e.metaKey) && !e.altKey && (e.key === 'a' || e.key === 'A') && lines.length > 1) {
          e.preventDefault(); e.nativeEvent.naSel = true; this.selectAll(key, entId || null); return;
        }
        if (e.shiftKey && !e.ctrlKey && !e.metaKey && e.key === 'ArrowDown' && idx < lines.length - 1 && (oneRow || fo === len)) {
          e.preventDefault(); e.nativeEvent.naSel = true; const nx = lines[idx + 1]; this.setMulti(key, entId || null, { id: ln.id, o: an }, { id: nx.id, o: fo === len ? nx.text.length : Math.min(fo, nx.text.length) }); return;
        }
        if (e.shiftKey && !e.ctrlKey && !e.metaKey && e.key === 'ArrowUp' && idx > 0 && (oneRow || fo === 0)) {
          e.preventDefault(); e.nativeEvent.naSel = true; const pv = lines[idx - 1]; this.setMulti(key, entId || null, { id: ln.id, o: an }, { id: pv.id, o: fo === 0 ? 0 : Math.min(fo, pv.text.length) }); return;
        }
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          const nl = { id: uid('l'), text: ln.text.slice(b) };
          const next = lines.slice(); next.splice(idx, 1, { ...ln, text: ln.text.slice(0, a) }, nl);
          setL(next, nl.id, 0);
        } else if (e.key === 'Backspace' && a === 0 && b === 0 && idx > 0) {
          e.preventDefault();
          const prev = lines[idx - 1], next = lines.slice();
          next.splice(idx - 1, 2, { ...prev, text: prev.text + ln.text });
          setL(next, prev.id, prev.text.length);
        } else if (e.key === 'Delete' && a === len && b === len && idx < lines.length - 1) {
          e.preventDefault();
          const nx = lines[idx + 1], next = lines.slice();
          next.splice(idx, 2, { ...ln, text: ln.text + nx.text });
          setL(next, ln.id, len);
        } else if (e.key === 'ArrowUp' && idx > 0 && a === b && (oneRow || a === 0)) {
          e.preventDefault(); this.focusLine(lines[idx - 1].id, a);
        } else if (e.key === 'ArrowDown' && idx < lines.length - 1 && a === b && (oneRow || a === len)) {
          e.preventDefault(); this.focusLine(lines[idx + 1].id, a);
        } else if (e.key === 'Escape') {
          const at = a === b ? menAt(lines, idx, ln.text.slice(0, a)) : -1, off = this._menOff, au = this._menAuto;
          if (at >= 0 && !(off && off.id === ln.id && off.at === at)) {
            e.preventDefault();
            if (au && au.id === ln.id && au.pos === a - 1 && ln.text[a - 1] === '_') { this._menAuto = null; setL(lines.map(l => l.id === ln.id ? { ...l, text: ln.text.slice(0, a - 1) + ' ' + ln.text.slice(a) } : l), ln.id, a); }
            else this._menOff = { id: ln.id, at };
          } else ta.blur();
        }
      }
    };
  }
  // Marca o desmarca la casilla que empieza en la posición off de la línea: [True]↔[False], [x]/[X]↔[ ].
  toggleBox(lineId, off, src, entId) {
    const ln = src.find(l => l.id === lineId); if (!ln) return;
    const m = /^\[(True|False|x|X| )\]/.exec(ln.text.slice(off)); if (!m) return;
    const nv = { True: 'False', False: 'True', x: ' ', X: ' ', ' ': 'x' }[m[1]], text = ln.text.slice(0, off) + '[' + nv + ']' + ln.text.slice(off + m[0].length);
    this.setLines(src.map(l => l.id === lineId ? { ...l, text } : l), undefined, undefined, entId);
  }
  // Cómo se dibuja una celda de tabla (vista limpia). Además del formato de una frase, la celda entera puede
  // ser copiable ('x'), de código (``x``), título (# x), punto de lista (- x), anotación (> x) o separador (---).
  // Ver mdCellInfo en js/motor/mkd.js (no confundir con cellInfo de formulas.js, que es la de las entidades Tabla).
  cellView(ln, b, k, segV) {
    const c = b.cells[k], v = { segs: [], align: b.aligns[k] || 'left', fw: b.head ? 700 : 400, fs: 'inherit', ff: 'inherit', color: 'inherit', bar: 'none', pl: '12px',
      isHr: false, hasMarker: false, marker: '', hasCopy: false, onCopy: null, copyTitle: '', copyColor: '#8a8a8a', chipBg: 'transparent', chipPad: '0px', disp: 'inline' };
    if (!c) return v;
    const ci = mdCellInfo(ln.text, c);
    if (ci.kind === 'hr') { v.isHr = true; return v; }
    if (ci.kind === 'code') {
      const txt = cellCode(ln.text, ci);
      Object.assign(v, { segs: [segV({ t: 'text', text: txt, off: ci.s }, false, ln)], ff: MONO, fs: '14px', color: '#d6d6d6', chipBg: '#141414', chipPad: '3px 4px 3px 9px' });
      this.cellCopy(v, ln, k, () => txt);
      return v;
    }
    v.segs = cleanSegs(ln.text, ci.s, ci.e, ci.kind === 'copy').map(x => segV(x, false, ln));
    if (ci.kind === 'copy') { Object.assign(v, { chipBg: '#333', chipPad: '3px 4px 3px 9px' }); this.cellCopy(v, ln, k, null, () => ({ ...copyRangeTexts(ln.text, ci.s, ci.e), what: 'Celda copiable' })); }
    else if (ci.kind === 'h') Object.assign(v, { fw: 700, fs: ({ 1: '20px', 2: '18px', 3: '17px' })[ci.lvl] || '16px', color: ci.lvl === 6 ? '#a6a6a6' : 'inherit' });
    else if (ci.kind === 'li') Object.assign(v, { hasMarker: true, marker: ci.li === 'ul' ? '•' : ci.n + '.' });
    else if (ci.kind === 'quote') Object.assign(v, { bar: 'inset 3px 0 0 #008000', pl: '17px', color: '#cfcfcf' });
    return v;
  }
  // Botón de copiar de una celda: se pone verde un momento al copiar. get: copia directa (celda de código);
  // menu: celda copiable, abre el menú «Copiar Markdown» / «Copiado literal» (askCopy en js/app/menu-copiar.js).
  cellCopy(v, ln, k, get, menu) {
    const key = ln.id + '|' + k, copied = this.state.copied === key;
    Object.assign(v, { hasCopy: true, disp: 'inline-flex', copyTitle: copied ? 'Copiado' : 'Copiar', copyColor: copied ? '#008000' : '#8a8a8a',
      onCopy: e => { e.preventDefault(); e.stopPropagation(); if (menu) this.askCopy({ ...menu(), key }, e); else this.copyText(get(), key); } });
  }
  // Busca "query" en los trozos de una línea (concatenando su texto visible) y apunta en cada trozo qué partes hay
  // que resaltar (_hl: texto, código o enlace; _hlL: nombre o valor de una mención; _hlE: el "=" de la mención).
  // this._mt (= this._matchesBy[campo]) guarda el orden de las coincidencias de ese campo, para el contador y los
  // botones de anterior/siguiente; this._mtActive = número de la coincidencia actual (search[campo].active).
  searchLine(segs, query, lineId) {
    let plain = ''; const spans = [];
    const add = (sg, f, t) => { if (!t) return; spans.push({ sg, f, start: plain.length, end: plain.length + t.length }); plain += t; };
    segs.forEach(sg => {
      if (sg.isText || sg.isCode || sg.isLink) add(sg, '_hl', sg.text);
      else if (sg.isEnt) { add(sg, '_hlE', sg.eq || ''); add(sg, '_hlL', String(sg.label == null ? '' : sg.label)); }
    });
    const low = plain.toLowerCase(); let pos = 0, i;
    while ((i = low.indexOf(query, pos)) !== -1) {
      const me = i + query.length, gi = this._mt.length, active = this._mtActive === gi;
      this._mt.push({ lineId });
      spans.forEach(sp => { const a = Math.max(sp.start, i), b = Math.min(sp.end, me); if (a < b) (sp.sg[sp.f] = sp.sg[sp.f] || []).push({ a: a - sp.start, b: b - sp.start, active }); });
      pos = me > i ? me : i + 1;
    }
  }
  // Parte el texto de un trozo en "runs" (lo resaltado y lo que no) para dibujarlos en lineas.html.
  // bg = fondo verde de la coincidencia (más intenso la actual), col = color del texto, op = opacidad (se oscurece al buscar).
  searchRuns(sg, on) {
    const mk = (t, hl, off) => {
      t = t == null ? '' : String(t);
      const plain = (x, o) => ({ t: x, bg: 'transparent', col: 'inherit', op: on ? DIM_BUSCAR : '1', off: o });
      if (!hl || !hl.length) return [plain(t, off)];
      const rs = hl.slice().sort((x, y) => x.a - y.a), out = []; let p = 0;
      rs.forEach(r => { if (r.a > p) out.push(plain(t.slice(p, r.a), off + p)); out.push({ t: t.slice(r.a, r.b), bg: r.active ? '#008000' : 'rgba(0,128,0,.45)', col: '#fff', op: '1', off: off + r.a }); p = r.b; });
      if (p < t.length) out.push(plain(t.slice(p), off + p));
      return out;
    };
    if (sg.isText || sg.isCode || sg.isLink) sg.runs = mk(sg.text, sg._hl, sg.off);
    if (sg.isEnt) {
      sg.lruns = mk(sg.label, sg._hlL, sg.off2);
      const e = sg._hlE && sg._hlE.length ? sg._hlE[0] : null;
      Object.assign(sg, { eqBg: e ? (e.active ? '#008000' : 'rgba(0,128,0,.45)') : 'transparent', eqOp: on && !e ? DIM_BUSCAR : '1' });
    }
  }
  // src = líneas; entId = dónde se guardan los cambios (null = campo principal de la hoja, id de entidad de texto o de
  // campo añadido 'f…'); out = siempre vista limpia y sin editar (p. ej. la copia limpia de un campo);
  // sk = clave del buscador que se aplica ('sheet' o id del campo; sin él no se busca). Ver js/app/campos.js.
  mkdLines(src, entId, out, sk) {
    const s = this.state, cleanV = s.clean || !!out;
    const blocks = cleanV ? blockInfo(src) : null;
    // Vista sucia: las imágenes se dibujan debajo de su línea para poder cambiar su tamaño y recortarlas (no dentro del código).
    const dbi = !cleanV && src.some(l => l.text.includes('![')) ? blockInfo(src) : null;
    // Búsqueda en el texto (barra superior de cada campo MKD; no se aplica dentro de una entidad de texto).
    // state.search = { [clave del campo]: { q, active } }: cada campo tiene su buscador y solo busca en lo suyo.
    const sq = sk && s.search ? s.search[sk] : null;
    const query = sq ? (sq.q || '').trim().toLowerCase() : '';
    if (sk) { this._matchesBy = this._matchesBy || {}; this._matchesBy[sk] = []; }
    this._mt = sk ? this._matchesBy[sk] : []; this._mtActive = sq ? sq.active : -1;
    const isList = b => !!b && (b.kind === 'ul' || b.kind === 'ol');
    const isFence = b => !!b && (b.kind === 'code' || b.kind === 'copy');
    const isTab = b => !!b && (b.kind === 'trow' || b.kind === 'tsep');
    // Bloques copiables: formato de línea de cada línea de dentro (títulos, listas, anotaciones, separadores).
    const inner = new Map(), innerOf = b => { if (!inner.has(b.from)) inner.set(b.from, copyInner(src, blocks, b)); return inner.get(b.from); };
    // Rayas verdes de una anotación con un degradado (no depende del fondo): x0 = dónde va la primera raya,
    // L = cuántas, fill = fondo detrás del texto, pre = fondo antes de la primera raya.
    const qGrad = (x0, L, fill, pre) => {
      const st = [(pre || 'transparent') + ' 0px'];
      for (let k = 0; k < L; k++) { const x = x0 + k * 14; st.push((k ? fill : pre || 'transparent') + ' ' + x + 'px', '#008000 ' + x + 'px', '#008000 ' + (x + 3) + 'px', fill + ' ' + (x + 3) + 'px'); }
      return 'linear-gradient(to right, ' + st.concat(fill + ' 100%').join(', ') + ')';
    };
    const segV = (sg, focused, ln) => {
      const v = { isText: false, isLink: false, isCode: false, isImg: false, isBox: false, isEnt: false, isChipOpen: false, isChipBtn: false, off: sg.off,
        cbg: sg.chip ? '#333' : 'transparent', cpad: sg.chip ? '2px 0' : '0', crad: '0' };
      // Copiable en una frase ('x'): fondo gris en su contenido, borde redondeado a la izquierda y botón de copiar a la derecha.
      if (sg.t === 'chipopen') return { ...v, isChipOpen: true, cbg: '#333', cpad: '2px 0 2px 6px', crad: '4px 0 0 4px' };
      if (sg.t === 'chipbtn') {
        const key = ln.id + '@' + sg.cs, copied = s.copied === key;
        return { ...v, isChipBtn: true, cbg: '#333', cpad: '2px 4px 2px 5px', crad: '0 4px 4px 0', copyTitle: copied ? 'Copiado' : 'Copiar', copyColor: copied ? '#008000' : '#8a8a8a',
          onCopy: e => { e.preventDefault(); e.stopPropagation(); this.askCopy({ ...copyRangeTexts(ln.text, sg.cs, sg.ce), what: 'Copiable en una frase', key }, e); }, onStop: e => e.stopPropagation() };
      }
      const fw = sg.b ? 700 : 'inherit', fst = sg.i ? 'italic' : 'normal', td = sg.s ? 'line-through' : 'none';
      if (sg.t === 'text') return sg.href
        ? { ...v, isLink: true, text: sg.text, href: sg.href, fw, fst, td: sg.s ? 'underline line-through' : 'underline', lcol: sg.c ? '#008000' : '#fff' }
        : { ...v, isText: true, text: sg.text, color: sg.c ? '#008000' : sg.color || 'inherit', fw, fst, td };
      // _texto_: color principal (verde) también en el código de una frase y en los enlaces.
      if (sg.t === 'code') return { ...v, isCode: true, text: sg.text, fw, fst, td, ccol: sg.c ? '#008000' : '#e6e6e6' };
      if (sg.t === 'img') return { ...v, isImg: true, alt: sg.alt, cur: 'default', ...this.imgView(sg.src) }; // tamaño y recorte: js/app/imagen-editor.js
      if (sg.t === 'ent') return { ...v, isEnt: true, off2: sg.off + 1, eq: sg.raw ? '=' : '', label: sg.raw ? (isPath(sg.name) ? sg.name.slice(1) : sg.name) : resolveEntity(sg.name), fw: focused ? 'inherit' : sg.b ? 800 : 600, fst, td, pad: sg.raw ? '4px 0' : '4px 4px', title: sg.raw ? '' : isPath(sg.name) ? sg.name : '=' + sg.name };
      const can = !!blocks && !!ln;
      return { ...v, isBox: true, on: sg.on, mr: sg.mr, bg: sg.on ? '#008000' : 'transparent', cur: can ? 'pointer' : 'default', title: sg.name || '', onToggle: e => { e.preventDefault(); e.stopPropagation(); if (can && e.button === 0) this.toggleBox(ln.id, sg.off, src, entId); } };
    };
    let prevHead = false, prevB = null;
    const lines = src.map((ln, idx) => {
      const focused = !out && !s.clean && s.focusId === ln.id; // out: la copia limpia nunca tiene el cuadro de escribir
      const b = blocks ? blocks[idx] : { kind: 'p' };
      // hl: nivel de título de la línea (también un punto de lista con título: 1. ## x o ## 1. x).
      const p = b.kind === 'p' ? parseLine(ln.text) : { level: 0, start: 0 }, hl = p.level || (isList(b) && b.h) || 0, head = hl > 0;
      let [fs, lh] = head ? (HEAD[hl] || ['16px', '25px']) : ['16px', '25px'];
      const cont = !!prevB && ((isFence(b) && isFence(prevB) && prevB.from === b.from) || (b.kind === 'quote' && prevB.kind === 'quote') || (isTab(b) && isTab(prevB) && prevB.from === b.from) || (isList(b) && b.iq && isList(prevB) && prevB.iq));
      const mt = idx === 0 || cont ? '0px' : (blocks && isList(b) && isList(prevB) && !b.h && !prevB.h) ? '6px' : (head || prevHead) ? '25px' : '13px';
      prevHead = head; prevB = b;
      const v = { pad: '0px', bg: 'transparent', rad: '0px', bar: 'none', color: hl === 6 ? '#a6a6a6' : '#fff', ff: 'inherit', isHr: false, isRow: false, cells: [], cols: 'none', hasMarker: false, marker: '', mkLeft: '0px', mkTop: '0px', hasCopy: false, showText: true, onCopy: null, copyTitle: '', copyColor: '#8a8a8a' };
      let segs;
      if (!blocks) segs = rawSegs(ln.text);
      else if (b.kind === 'hr') { segs = []; v.isHr = true; v.showText = false; }
      else if (b.kind === 'tsep') { segs = []; v.showText = false; Object.assign(v, { bg: '#008000', pad: '1px 0' }); }
      else if (b.kind === 'trow') {
        segs = []; v.showText = false;
        const cells = [];
        for (let k = 0; k < b.ncol; k++) cells.push(this.cellView(ln, b, k, segV));
        Object.assign(v, { isRow: true, cells, cols: 'repeat(' + b.ncol + ', minmax(0, 1fr))', bg: b.head ? '#2a2a2a' : '#222222', rad: b.head ? (b.last ? '7px' : '7px 7px 0 0') : b.last ? '0 0 7px 7px' : '0', bar: !b.head && !b.last ? 'inset 0 -1px 0 #2f2f2f' : 'none' });
      }
      else if (isFence(b)) {
        const code = b.kind === 'code', top = b.pos === 'single' || b.pos === 'first', bot = b.pos === 'single' || b.pos === 'last';
        const padT = top ? '9px' : '0px', padB = bot ? '9px' : '0px';
        Object.assign(v, { bg: code ? '#141414' : '#2a2a2a', pad: padT + ' 44px ' + padB + ' 14px', rad: (top ? '7px 7px ' : '0 0 ') + (bot ? '7px 7px' : '0 0') });
        if (code) {
          segs = b.end > b.start ? [{ t: 'text', text: ln.text.slice(b.start, b.end), off: b.start }] : [];
          Object.assign(v, { ff: MONO, color: '#d6d6d6' }); fs = '14px'; lh = '22px';
        } else {
          // Copiable: además del formato de una frase, cada línea puede ser título, punto de lista,
          // anotación o línea separadora (ver copyInner en js/motor/mkd.js).
          const ib = innerOf(b)[idx - b.from], at = b.start + (ib.start || 0);
          segs = ib.kind === 'hr' || ib.hr ? [] : cleanSegs(ln.text, Math.min(at, Math.max(b.start, b.end)), b.end, true);
          let left = 14;
          const mark = (x, li, num) => Object.assign(v, { hasMarker: true, mkLeft: x + 'px', mkTop: padT, marker: li === 'ul' ? '•' : num + '.' });
          const hd = h => { if (!h) return; [fs, lh] = HEAD[h] || ['16px', '25px']; v.fw = 700; if (h === 6) v.color = '#a6a6a6'; };
          const bars = L => { v.bg = qGrad(left, L, '#2a2a2a', '#2a2a2a'); left += 17 + (L - 1) * 14; v.color = '#cfcfcf'; };
          if (ib.kind === 'hr') { v.isHr = true; v.showText = false; }
          else if (ib.kind === 'ul' || ib.kind === 'ol') { const ind = ib.lvl * 24; mark(14 + ind, ib.kind, ib.num); left = 14 + ind + 28; if (ib.iq) bars(ib.iq); hd(ib.h); }
          else if (ib.kind === 'quote') {
            bars(ib.lvl || 1);
            if (ib.hr) { v.isHr = true; v.showText = false; }
            else { if (ib.li) { const ind = ib.ilvl * 24; mark(left + ind, ib.li, ib.num); left += ind + 28; } hd(ib.h); }
          } else hd(ib.h);
          v.pad = padT + ' 44px ' + padB + ' ' + left + 'px';
        }
        if (!segs.length && b.pos !== 'single' && b.pos !== 'mid') lh = '0px';
        if (top) {
          const key = ln.id, copied = s.copied === key;
          Object.assign(v, { hasCopy: true, copyTitle: copied ? 'Copiado' : 'Copiar', copyColor: copied ? '#008000' : '#8a8a8a',
            onCopy: e => {
              e.stopPropagation();
              // Copiable: menú «Copiar Markdown» / «Copiado literal». Código: siempre tal cual, sin menú.
              if (!code) { const tx = copyBlockTexts(src, blocks, b); return this.askCopy({ ...tx, key, what: b.pos === 'single' ? 'Línea copiable' : 'Bloque copiable · ' + tx.lit.split('\n').length + (tx.lit.split('\n').length === 1 ? ' línea' : ' líneas') }, e); }
              const txt = []; for (let k = b.from; k <= b.to; k++) { const bk = blocks[k], t = src[k].text; txt.push(t.slice(bk.start, Math.max(bk.start, bk.end))); }
              while (txt.length > 1 && !txt[0]) txt.shift(); while (txt.length > 1 && !txt[txt.length - 1]) txt.pop(); this.copyText(txt.join('\n'), key);
            } });
        }
      } else {
        segs = cleanSegs(ln.text, b.kind === 'p' ? p.start : b.start, b.end);
        if (b.kind === 'quote') {
          const L = b.lvl || 1, bars = [];
          for (let k = 0; k < L; k++) { if (k) bars.push('inset ' + (k * 14) + 'px 0 0 #242424'); bars.push('inset ' + (k * 14 + 3) + 'px 0 0 #008000'); }
          const PL = 17 + (L - 1) * 14, top = b.first ? '8px' : b.h ? '8px' : '0px';
          let left = PL;
          if (b.hr) { segs = []; v.isHr = true; v.showText = false; }
          else {
            if (b.h) { [fs, lh] = HEAD[b.h] || ['16px', '25px']; v.fw = 700; }
            if (b.li) { const ind = b.ilvl * 24; left = PL + ind + 28; Object.assign(v, { hasMarker: true, mkLeft: (PL + ind) + 'px', mkTop: top, marker: b.li === 'ul' ? '•' : b.num + '.' }); }
          }
          Object.assign(v, { bg: '#242424', bar: bars.join(', '), color: b.h === 6 ? '#a6a6a6' : '#cfcfcf', pad: top + ' 14px ' + (b.last ? '8px' : '0px') + ' ' + left + 'px', rad: '0 ' + (b.first ? '6px' : '0') + ' ' + (b.last ? '6px' : '0') + ' 0' });
        } else if (isList(b)) {
          const ind = b.lvl * 24;
          Object.assign(v, { pad: '0 0 0 ' + (ind + 28) + 'px', hasMarker: true, mkLeft: ind + 'px', marker: b.kind === 'ul' ? '•' : b.num + '.' });
          if (b.iq) {
            // Anotación dentro de un punto de lista (- > x): rayas verdes y fondo a partir del texto del punto.
            const x0 = ind + 28, top = b.iqFirst ? '8px' : '0px';
            Object.assign(v, { bg: qGrad(x0, b.iq, '#242424'), color: b.h === 6 ? '#a6a6a6' : '#cfcfcf', mkTop: top,
              pad: top + ' 14px ' + (b.iqLast ? '8px' : '0px') + ' ' + (x0 + 17 + (b.iq - 1) * 14) + 'px' });
          }
        }
      }
      if (!ln.text && !focused && src.length === 1) segs = [{ t: 'text', text: 'Escribe aquí…', off: 0, color: DIM }];
      segs = segs.map(sg => segV(sg, focused, ln));
      // Búsqueda: se busca en todo el texto visible de la línea (texto normal, código, enlaces, menciones y
      // celdas de tabla) y se resalta en verde sea cual sea su formato. Mientras se busca, el resto del texto
      // se oscurece (runs con op = DIM_BUSCAR; los demás elementos, en panel-texto.css con [data-buscando="1"]).
      const cellSegs = v.isRow ? v.cells.reduce((a, c) => a.concat(c.segs), []) : [];
      if (query) this.searchLine(segs.concat(cellSegs), query, ln.id);
      segs.concat(cellSegs).forEach(sg => this.searchRuns(sg, !!query));
      const imgs = dbi && dbi[idx].kind !== 'code' && ln.text.includes('![') ? this.imgEditors(ln, entId) : [];
      return { id: ln.id, text: ln.text, focused, segs, fs, lh, mt, fw: head ? 700 : 400, hasImgs: imgs.length > 0, imgs, ...v, ...this.lineHandlers(ln, idx, src, entId), ...(out ? { onDown: null } : null) };
    });
    return lines;
  }
});
