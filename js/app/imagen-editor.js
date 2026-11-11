// Imágenes del texto MKD: cómo se dibujan (tamaño y recorte) y el editor de la vista sucia.
// - imgView(dirección): valores para la plantilla (marco, recorte e imagen). Ver imgParams en js/motor/imagenes.js.
// - Vista sucia: debajo de cada línea con imágenes se dibuja cada imagen (imgEditors, desde mkdLines en lineas.js).
//   Un clic la selecciona y salen los puntos: las esquinas cambian el tamaño sin deformarla ni recortarla; los
//   puntos de los lados (izquierda, derecha, arriba, abajo) la recortan. Doble clic: vuelve al tamaño original sin recorte.
//   Al soltar se reescribe la dirección de la imagen en el texto (#w=…&c=…).
NoteApp.partes.push(Base => class extends Base {
  // ov = { w, c } mientras se arrastra un punto (se ve en directo antes de guardarlo en el texto).
  imgView(url, ov) {
    const p = imgParams(url), src = imgSrc(p.base), d = IMG_DIMS[src];
    const o = { src, onLoad: e => imgDimsFrom(src, e.target), ol: 'none' };
    // Aún sin medidas (cargando): se dibuja la imagen sin recorte, con su ancho si lo tiene.
    if (!d) return { ...o, loaded: false, fd: 'inline', rd: 'inline', rpos: 'static', mw: 'auto', ar: 'auto', ipos: 'static', iw: p.w ? p.w + 'px' : 'auto', ih: 'auto', il: 'auto', it: 'auto', imw: '100%', imh: p.w ? 'none' : '420px' };
    const q = ov || p, [l, t, r, b] = q.c, vw = d[0] * (1 - l - r), vh = d[1] * (1 - t - b);
    // Sin ancho guardado: como antes (como mucho 420 px de alto y el ancho del texto).
    const W = q.w || vw * Math.min(1, 420 / vh);
    return { ...o, loaded: true, fd: 'inline-block', rd: 'block', rpos: 'absolute', mw: W.toFixed(1) + 'px', ar: vw.toFixed(2) + ' / ' + vh.toFixed(2),
      ipos: 'absolute', iw: (100 / (1 - l - r)).toFixed(4) + '%', ih: (100 / (1 - t - b)).toFixed(4) + '%', il: (-100 * l / (1 - l - r)).toFixed(4) + '%', it: (-100 * t / (1 - t - b)).toFixed(4) + '%', imw: 'none', imh: 'none' };
  }
  // Imágenes de una línea para el editor de la vista sucia.
  imgEditors(ln, entId) {
    const s = this.state, t = ln.text, out = [];
    mdScan(t, 0, t.length).atoms.forEach(at => {
      if (at.kind !== 'img') return;
      const key = ln.id + ':' + at.s, us = at.le + 2, ue = at.e - 1, raw = t.slice(us, ue);
      const g = s.imgDrag && s.imgDrag.key === key ? s.imgDrag : null, v = this.imgView(at.url, g), sel = s.imgSel === key && v.loaded;
      const info = { key, lineId: ln.id, entId, us, ue, raw, s: at.s, p: g ? { w: g.w, c: g.c } : imgParams(at.url), loaded: v.loaded };
      out.push({ ...v, key, alt: t.slice(at.ls, at.le), sel, ol: sel ? '2px solid #008000' : 'none', cur: sel ? 'default' : 'pointer',
        title: sel ? 'Esquinas: cambiar el tamaño · lados: recortar · doble clic: tamaño original' : 'Haz clic para cambiar el tamaño o recortar',
        onDown: e => this.imgDown(e, info),
        onStop: e => { e.stopPropagation(); if (e.target.tagName === 'IMG' || (e.target.dataset && e.target.dataset.h)) e.preventDefault(); },
        onReset: e => { e.stopPropagation(); this.imgCommit(info, 0, [0, 0, 0, 0]); } });
    });
    return out;
  }
  imgLinesOf(entId) {
    const x = this.curSheet(this.state); if (!x) return null;
    if (!entId) return x.lines;
    const e = (x.entities || []).find(e => e.id === entId); return e ? e.lines : null;
  }
  imgDown(e, info) {
    e.stopPropagation(); if (e.button !== 0) return;
    const h = e.target && e.target.dataset ? e.target.dataset.h : null;
    if (!h || !info.loaded) { if (this.state.imgSel !== info.key) this.setState({ imgSel: info.key }); return; }
    e.preventDefault();
    const fr = e.currentTarget, rect = fr.getBoundingClientRect(), W = fr.offsetWidth, H = fr.offsetHeight, k = W ? rect.width / W : 1; // k: zoom del diagrama
    const [l, t, r, b] = info.p.c, list = fr.closest('.lineas-img-lista');
    this._imgDrag = { ...info, h, x0: e.clientX, y0: e.clientY, k, W, H, F: W / (1 - l - r), G: H / (1 - t - b), c: [l, t, r, b], maxW: list ? list.clientWidth : 4000 };
    try { e.target.setPointerCapture(e.pointerId); } catch (_) {}
    this._imgMv = ev => this.imgMove(ev); this._imgUpH = () => this.imgUp();
    window.addEventListener('pointermove', this._imgMv); window.addEventListener('pointerup', this._imgUpH); window.addEventListener('pointercancel', this._imgUpH);
    this.setState({ imgSel: info.key, imgDrag: { key: info.key, w: W, c: [l, t, r, b] } });
  }
  imgMove(e) {
    const d = this._imgDrag; if (!d) return;
    const dx = (e.clientX - d.x0) / d.k, dy = (e.clientY - d.y0) / d.k, MIN = 0.05, h = d.h;
    const lim = (x, a, b) => Math.max(a, Math.min(b, x));
    let [l, t, r, b] = d.c, w = d.W;
    if (h.length === 2) {
      // Esquina: cambia el tamaño de forma uniforme (no deforma ni recorta).
      const sx = h.includes('e') ? 1 : -1, sy = h.includes('s') ? 1 : -1;
      let dw = sx * dx; const dwy = sy * dy * (d.W / d.H); if (Math.abs(dwy) > Math.abs(dw)) dw = dwy;
      w = lim(d.W + dw, 40, Math.max(40, d.maxW));
    } else if (h === 'e') { r = lim(r - dx / d.F, 0, 1 - l - MIN); w = d.F * (1 - l - r); }
    else if (h === 'w') { l = lim(l + dx / d.F, 0, 1 - r - MIN); w = d.F * (1 - l - r); }
    else if (h === 's') b = lim(b - dy / d.G, 0, 1 - t - MIN);
    else if (h === 'n') t = lim(t + dy / d.G, 0, 1 - b - MIN);
    this.setState({ imgDrag: { key: d.key, w: Math.min(w, Math.max(40, d.maxW)), c: [l, t, r, b] } });
  }
  imgUp() {
    window.removeEventListener('pointermove', this._imgMv); window.removeEventListener('pointerup', this._imgUpH); window.removeEventListener('pointercancel', this._imgUpH);
    const d = this._imgDrag, g = this.state.imgDrag; this._imgDrag = null;
    if (!d || !g || g.key !== d.key) { this.setState({ imgDrag: null }); return; }
    this.imgCommit(d, g.w, g.c);
  }
  // Escribe en el texto la dirección de la imagen con su tamaño y recorte (w = 0 y sin recorte = original).
  imgCommit(info, w, c) {
    const lines = this.imgLinesOf(info.entId), ln = lines && lines.find(l => l.id === info.lineId);
    if (!ln || ln.text.slice(info.us, info.ue) !== info.raw) { this.setState({ imgDrag: null }); return; }
    const text = ln.text.slice(0, info.us) + imgUrlWith(imgParams(info.raw).base, w, c) + ln.text.slice(info.ue);
    if (text !== ln.text) this.setLines(lines.map(l => l.id === ln.id ? { ...l, text } : l), undefined, undefined, info.entId);
    this.setState({ imgDrag: null, imgSel: info.lineId + ':' + info.s });
  }
});
