// Líneas de texto: teclado y edición de cada línea (lineHandlers) y cómo se dibuja cada una (mkdLines).
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
  mkdLines(src, entId, out) {
    const s = this.state, cleanV = s.clean || !!out;
    const blocks = cleanV ? blockInfo(src) : null;
    const isList = b => !!b && (b.kind === 'ul' || b.kind === 'ol');
    const isFence = b => !!b && (b.kind === 'code' || b.kind === 'copy');
    const isTab = b => !!b && (b.kind === 'trow' || b.kind === 'tsep');
    const segV = (sg, focused, ln) => {
      const v = { isText: false, isLink: false, isCode: false, isImg: false, isBox: false, isEnt: false, off: sg.off };
      const fw = sg.b ? 700 : 'inherit', fst = sg.i ? 'italic' : 'normal', td = sg.s ? 'line-through' : 'none';
      if (sg.t === 'text') return sg.href
        ? { ...v, isLink: true, text: sg.text, href: sg.href, fw, fst, td: sg.s ? 'underline line-through' : 'underline' }
        : { ...v, isText: true, text: sg.text, color: sg.color || 'inherit', fw, fst, td };
      if (sg.t === 'code') return { ...v, isCode: true, text: sg.text, fw, fst, td };
      if (sg.t === 'img') return { ...v, isImg: true, src: sg.src, alt: sg.alt };
      if (sg.t === 'ent') return { ...v, isEnt: true, off2: sg.off + 1, eq: sg.raw ? '=' : '', label: sg.raw ? (isPath(sg.name) ? sg.name.slice(1) : sg.name) : resolveEntity(sg.name), fw: focused ? 'inherit' : sg.b ? 800 : 600, fst, td, pad: sg.raw ? '4px 0' : '4px 4px', title: sg.raw ? '' : isPath(sg.name) ? sg.name : '=' + sg.name };
      const can = !!blocks && !!ln;
      return { ...v, isBox: true, on: sg.on, mr: sg.mr, bg: sg.on ? '#008000' : 'transparent', cur: can ? 'pointer' : 'default', title: sg.name || '', onToggle: e => { e.preventDefault(); e.stopPropagation(); if (can && e.button === 0) this.toggleBox(ln.id, sg.off, src, entId); } };
    };
    let prevHead = false, prevB = null;
    const lines = src.map((ln, idx) => {
      const focused = !s.clean && s.focusId === ln.id;
      const b = blocks ? blocks[idx] : { kind: 'p' };
      const p = b.kind === 'p' ? parseLine(ln.text) : { level: 0, start: 0 }, head = p.level > 0;
      let [fs, lh] = head ? (HEAD[p.level] || ['16px', '25px']) : ['16px', '25px'];
      const cont = !!prevB && ((isFence(b) && isFence(prevB) && prevB.from === b.from) || (b.kind === 'quote' && prevB.kind === 'quote') || (isTab(b) && isTab(prevB) && prevB.from === b.from));
      const mt = idx === 0 || cont ? '0px' : (blocks && isList(b) && isList(prevB)) ? '6px' : (head || prevHead) ? '25px' : '13px';
      prevHead = head; prevB = b;
      const v = { pad: '0px', bg: 'transparent', rad: '0px', bar: 'none', color: head && p.level === 6 ? '#a6a6a6' : '#fff', ff: 'inherit', isHr: false, isRow: false, cells: [], cols: 'none', hasMarker: false, marker: '', mkLeft: '0px', mkTop: '0px', hasCopy: false, showText: true, onCopy: null, copyTitle: '', copyColor: '#8a8a8a' };
      let segs;
      if (!blocks) segs = rawSegs(ln.text);
      else if (b.kind === 'hr') { segs = []; v.isHr = true; v.showText = false; }
      else if (b.kind === 'tsep') { segs = []; v.showText = false; Object.assign(v, { bg: '#008000', pad: '1px 0' }); }
      else if (b.kind === 'trow') {
        segs = []; v.showText = false;
        const cells = [];
        for (let k = 0; k < b.ncol; k++) { const c = b.cells[k]; cells.push({ segs: c ? cleanSegs(ln.text, c.s, c.e).map(x => segV(x, false, ln)) : [], align: b.aligns[k] || 'left', fw: b.head ? 700 : 400 }); }
        Object.assign(v, { isRow: true, cells, cols: 'repeat(' + b.ncol + ', minmax(0, 1fr))', bg: b.head ? '#2a2a2a' : '#222222', rad: b.head ? (b.last ? '7px' : '7px 7px 0 0') : b.last ? '0 0 7px 7px' : '0', bar: !b.head && !b.last ? 'inset 0 -1px 0 #2f2f2f' : 'none' });
      }
      else if (isFence(b)) {
        const code = b.kind === 'code', top = b.pos === 'single' || b.pos === 'first', bot = b.pos === 'single' || b.pos === 'last';
        segs = code ? (b.end > b.start ? [{ t: 'text', text: ln.text.slice(b.start, b.end), off: b.start }] : []) : cleanSegs(ln.text, b.start, b.end);
        Object.assign(v, { bg: code ? '#141414' : '#2a2a2a', pad: (top ? '9px' : '0px') + ' 44px ' + (bot ? '9px' : '0px') + ' 14px', rad: (top ? '7px 7px ' : '0 0 ') + (bot ? '7px 7px' : '0 0') });
        if (code) { Object.assign(v, { ff: MONO, color: '#d6d6d6' }); fs = '14px'; lh = '22px'; }
        if (!segs.length && b.pos !== 'single' && b.pos !== 'mid') lh = '0px';
        if (top) {
          const key = ln.id, copied = s.copied === key;
          Object.assign(v, { hasCopy: true, copyTitle: copied ? 'Copiado' : 'Copiar', copyColor: copied ? '#008000' : '#8a8a8a',
            onCopy: e => { e.stopPropagation(); const txt = []; for (let k = b.from; k <= b.to; k++) { const bk = blocks[k], t = src[k].text; txt.push(code ? t.slice(bk.start, Math.max(bk.start, bk.end)) : plainOf(cleanSegs(t, bk.start, bk.end))); } while (txt.length > 1 && !txt[0]) txt.shift(); while (txt.length > 1 && !txt[txt.length - 1]) txt.pop(); this.copyText(txt.join('\n'), key); } });
        }
      } else {
        segs = cleanSegs(ln.text, b.kind === 'p' ? p.start : b.start, b.end);
        if (b.kind === 'quote') {
          const L = b.lvl || 1, bars = [];
          for (let k = 0; k < L; k++) { if (k) bars.push('inset ' + (k * 14) + 'px 0 0 #242424'); bars.push('inset ' + (k * 14 + 3) + 'px 0 0 #008000'); }
          const PL = 17 + (L - 1) * 14, top = b.first ? '8px' : b.h ? '8px' : '0px';
          let left = PL;
          if (b.hr) { segs = []; v.isHr = true; v.showText = false; }
          else if (b.h) { [fs, lh] = HEAD[b.h] || ['16px', '25px']; v.fw = 700; }
          else if (b.li) { const ind = b.ilvl * 24; left = PL + ind + 28; Object.assign(v, { hasMarker: true, mkLeft: (PL + ind) + 'px', mkTop: top, marker: b.li === 'ul' ? '•' : b.num + '.' }); }
          Object.assign(v, { bg: '#242424', bar: bars.join(', '), color: b.h === 6 ? '#a6a6a6' : '#cfcfcf', pad: top + ' 14px ' + (b.last ? '8px' : '0px') + ' ' + left + 'px', rad: '0 ' + (b.first ? '6px' : '0') + ' ' + (b.last ? '6px' : '0') + ' 0' });
        } else if (isList(b)) {
          const ind = b.lvl * 24;
          Object.assign(v, { pad: '0 0 0 ' + (ind + 28) + 'px', hasMarker: true, mkLeft: ind + 'px', marker: b.kind === 'ul' ? '•' : b.num + '.' });
        }
      }
      if (!ln.text && !focused && src.length === 1) segs = [{ t: 'text', text: 'Escribe aquí…', off: 0, color: DIM }];
      segs = segs.map(sg => segV(sg, focused, ln));
      return { id: ln.id, text: ln.text, focused, segs, fs, lh, mt, fw: head ? 700 : 400, ...v, ...this.lineHandlers(ln, idx, src, entId), ...(out ? { onDown: null } : null) };
    });
    return lines;
  }
});
