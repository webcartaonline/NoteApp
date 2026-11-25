// Corrector ortográfico (no corrige solo: subraya en rojo las palabras que no están en el diccionario).
// Ver AGENTS.md → «Corrector ortográfico». Qué palabras se revisan: js/motor/ortografia.js.
//
// · El diccionario de español (Hunspell) trabaja aparte, en un Web Worker (js/ortografia-worker.js), para no frenar la
//   app: se le mandan las palabras nuevas y contesta cuáles están mal. Las respuestas se recuerdan en this._ortoRes
//   (palabra → true = bien, false = mal); mientras llega la respuesta, la palabra se ve sin subrayar.
// · Clic derecho en una palabra subrayada: menú (componente menu-ortografia) con «Quisiste decir…» (sugerencias del
//   diccionario; al elegir una, se cambia en el texto) y «Añadir al diccionario».
// · Se guarda en state.config (va al navegador y a la carpeta, NoteApp.json):
//     orto: false = corrector apagado (si falta, encendido) · ortoDicc: [palabras añadidas por el usuario]
// · Estado temporal (no se guarda): state.ortoTick (para volver a dibujar al llegar respuestas), state.ortoEst
//   ('listo' | 'error', para Ajustes; sin él, todavía no se ha cargado) y state.ortoMenu = { x, y, w, lineId, s, e, ent, lista } (menú abierto).
const ORTO_MAX_SUG = 6;
NoteApp.partes.push(Base => class extends Base {
  // ¿Está encendido? (Ajustes › Ortografía; si el navegador no puede con el diccionario, no se usa)
  ortoOn(s) { s = s || this.state; return !(s.config && s.config.orto === false) && typeof Worker !== 'undefined' && !this._ortoMuerto; }
  // Palabras del diccionario propio, en un Set (se vuelve a crear solo si cambia la lista)
  ortoDicc(s) {
    const l = ((s || this.state).config || {}).ortoDicc || [];
    if (this._ortoDiccL !== l) { this._ortoDiccL = l; this._ortoDiccS = new Set(l.map(ortoClave)); }
    return this._ortoDiccS;
  }
  // Pone en marcha el diccionario (la primera vez que hace falta). Se llama mientras se dibuja (mkdLines), así que
  // aquí no se toca el estado: los cambios llegan después, con las respuestas del Worker.
  ortoWorker() {
    if (this._ortoW || this._ortoMuerto) return this._ortoW;
    try { this._ortoW = new Worker('js/ortografia-worker.js'); }
    catch (_) { setTimeout(() => this.ortoFallo(), 0); return null; }
    this._ortoRes = this._ortoRes || new Map(); this._ortoPend = new Set(); this._ortoSug = new Map();
    this._ortoW.onmessage = e => this.ortoRespuesta(e.data || {});
    this._ortoW.onerror = () => this.ortoFallo();
    return this._ortoW;
  }
  ortoFallo() {
    if (this._ortoMuerto) return;
    this._ortoMuerto = true;
    try { this._ortoW && this._ortoW.terminate(); } catch (_) {}
    this._ortoW = null;
    this.setState({ ortoEst: 'error', ortoTick: Date.now() });
  }
  ortoRespuesta(m) {
    if (m.tipo === 'listo') this.setState({ ortoEst: 'listo' });
    else if (m.tipo === 'error') this.ortoFallo();
    else if (m.tipo === 'revisadas') {
      const mal = new Set(m.mal || []);
      (m.palabras || []).forEach(w => { this._ortoRes.set(w, !mal.has(w)); this._ortoPend.delete(w); });
      if (this._ortoRes.size > 60000) this._ortoRes.clear();
      if (mal.size) this.setState({ ortoTick: Date.now() }); // solo hace falta volver a dibujar si hay algo que subrayar
    } else if (m.tipo === 'sugerencias') {
      const lista = (m.lista || []).filter(x => x && x !== m.palabra && (m.palabra.includes('-') || !x.includes('-'))).slice(0, ORTO_MAX_SUG);
      this._ortoSug.set(m.palabra, lista);
      const om = this.state.ortoMenu;
      if (om && om.w === m.palabra) this.setState({ ortoMenu: { ...om, lista } });
    }
  }
  // Manda al diccionario las palabras pendientes (todas juntas, un momento después de dibujar)
  ortoPide(w) {
    this._ortoQ = this._ortoQ || new Set();
    this._ortoQ.add(w); this._ortoPend.add(w);
    if (this._ortoQT) return;
    this._ortoQT = setTimeout(() => {
      this._ortoQT = null;
      const ws = Array.from(this._ortoQ || []); this._ortoQ = new Set();
      const wk = this.ortoWorker(); if (wk && ws.length) wk.postMessage({ tipo: 'revisar', palabras: ws });
    }, 30);
  }
  // Palabras mal escritas de una línea: [{ s, e, w }] (posiciones en ln.text). bk = bloque de la línea (blockInfo).
  // caret = dónde está el cursor si es la línea que se está escribiendo: la palabra pegada al cursor no se marca
  // hasta que se termina (espacio, signo o cambiar de sitio), para que no salga en rojo a medio escribir.
  ortoMal(text, bk, caret) {
    // Bloques de código y copiables ('' o una línea entera 'x'), separadores: no se revisan.
    if (!text || (bk && (bk.kind === 'code' || bk.kind === 'copy' || bk.kind === 'hr' || bk.kind === 'tsep'))) return [];
    if (!this.ortoWorker()) return [];
    const dicc = this.ortoDicc(), out = [];
    for (const p of ortoPalabrasDe(text, bk)) {
      if (caret != null && caret >= p.s && caret <= p.e) continue;
      if (dicc.has(ortoClave(p.w))) continue;
      const r = this._ortoRes.get(p.w);
      if (r === undefined) { if (!this._ortoPend.has(p.w)) this.ortoPide(p.w); continue; }
      if (!r) out.push(p);
    }
    return out;
  }
  // Pasa las palabras mal escritas de la línea a cada trozo de texto (sg._mal: { a, b } dentro de sg.text).
  // Solo en texto normal y celdas (no en código, enlaces ni menciones).
  ortoTrozos(segs, mal) {
    if (!mal.length) return;
    segs.forEach(sg => {
      if (!sg.isText || sg.off == null || !sg.text) return;
      const a0 = sg.off, b0 = sg.off + sg.text.length;
      mal.forEach(p => { const a = Math.max(p.s, a0), b = Math.min(p.e, b0); if (a < b) (sg._mal = sg._mal || []).push({ a: a - a0, b: b - a0 }); });
    });
  }
  // Clic derecho en una línea: si es sobre una palabra subrayada, abre el menú de ortografía; si no, sale el menú
  // normal del navegador. mal = palabras mal escritas de la línea; entId = dónde se guardan los cambios (setLines).
  ortoMenuAbrir(e, ln, mal, entId) {
    if (!mal || !mal.length) return;
    const o = this.ortoPosicion(e.clientX, e.clientY);
    if (o == null) return;
    const p = mal.find(x => o >= x.s && o <= x.e); if (!p) return;
    e.preventDefault(); e.stopPropagation();
    const W = 240, H = 280, x = Math.min(e.clientX, window.innerWidth - W - 8), up = e.clientY + H > window.innerHeight && e.clientY - H > 0;
    if (!this._ortoClose) { this._ortoClose = () => { if (this.state.ortoMenu) this.setState({ ortoMenu: null }); }; window.addEventListener('scroll', this._ortoClose, true); window.addEventListener('resize', this._ortoClose); }
    const lista = this._ortoSug && this._ortoSug.has(p.w) ? this._ortoSug.get(p.w) : null;
    this.setState({ menu: false, copyMenu: false, entMenu: null, campoMenu: null, cmenu: null,
      ortoMenu: { x: Math.max(8, x), y: up ? e.clientY : e.clientY + 2, up, w: p.w, lineId: ln.id, s: p.s, e: p.e, ent: entId || null, lista } });
    if (!lista && this._ortoW) this._ortoW.postMessage({ tipo: 'sugerir', palabra: p.w });
  }
  // Posición en el texto de la línea del punto (x, y) de la pantalla: <span data-off> + desplazamiento dentro de él.
  // El cuadro de escribir (textarea) tapa el texto de la línea enfocada: se oculta un instante para medir debajo.
  ortoPosicion(x, y) {
    const ta = this.taRef.current, vis = ta ? ta.style.visibility : '';
    if (ta) ta.style.visibility = 'hidden';
    let node = null, off = 0;
    try {
      if (document.caretRangeFromPoint) { const r = document.caretRangeFromPoint(x, y); if (r) { node = r.startContainer; off = r.startOffset; } }
      else if (document.caretPositionFromPoint) { const p = document.caretPositionFromPoint(x, y); if (p) { node = p.offsetNode; off = p.offset; } }
    } finally { if (ta) ta.style.visibility = vis; }
    if (!node || node.nodeType !== 3) return null;
    const sp = node.parentElement && node.parentElement.closest('[data-off]');
    if (!sp) return null;
    return +sp.getAttribute('data-off') + off;
  }
  ortoCerrar() { if (this.state.ortoMenu) this.setState({ ortoMenu: null }); }
  // Cambia la palabra subrayada por la sugerencia elegida (si el texto sigue igual en ese sitio)
  ortoElegir(sug) {
    const om = this.state.ortoMenu; if (!om) return;
    this.setState({ ortoMenu: null });
    const lines = this.linesOf(om.ent); if (!lines) return;
    const ln = lines.find(l => l.id === om.lineId);
    if (!ln || ln.text.slice(om.s, om.e).normalize('NFC') !== om.w) return;
    const text = ln.text.slice(0, om.s) + sug + ln.text.slice(om.e);
    const nuevas = lines.map(l => l.id === ln.id ? { ...l, text } : l);
    if (this.state.focusId === ln.id) this.setLines(nuevas, ln.id, om.s + sug.length, om.ent || undefined);
    else this.setLines(nuevas, undefined, undefined, om.ent || undefined);
  }
  // Diccionario propio: añadir / quitar palabras (se guardan en state.config.ortoDicc)
  ortoAnadir(w) {
    const om = this.state.ortoMenu;
    w = String(w == null ? (om ? om.w : '') : w).trim().normalize('NFC');
    if (om) this.setState({ ortoMenu: null });
    if (!w || /\s/.test(w)) return false;
    this.setState(s => {
      const l = (s.config || {}).ortoDicc || [];
      if (l.some(x => ortoClave(x) === ortoClave(w))) return null;
      return { config: { ...(s.config || {}), ortoDicc: l.concat(w).sort((a, b) => a.localeCompare(b, 'es')) } };
    });
    return true;
  }
  ortoQuitar(w) {
    this.setState(s => ({ config: { ...(s.config || {}), ortoDicc: ((s.config || {}).ortoDicc || []).filter(x => ortoClave(x) !== ortoClave(w)) } }));
  }
  ortoActivar(on) { this.setState(s => ({ config: { ...(s.config || {}), orto: on ? undefined : false }, ortoMenu: null })); }
  // Valores del menú de clic derecho (componente menu-ortografia; se añaden en renderVals)
  ortoMenuVals(s) {
    const om = s.ortoMenu;
    if (!om) return { omOn: false };
    const lista = om.lista;
    return { omOn: true, omTop: om.y + 'px', omLeft: om.x + 'px', omTf: om.up ? 'translateY(-100%)' : 'none',
      omPalabra: om.w, omCargando: !lista, omSinSug: !!lista && !lista.length, omHaySug: !!lista && lista.length > 0,
      omSugs: (lista || []).map(t => ({ t, pick: ev => { ev.stopPropagation(); this.ortoElegir(t); } })),
      omAnadir: ev => { ev.stopPropagation(); const w = om.w; if (this.ortoAnadir(w)) this.fsToast('Añadida a tu diccionario', '«' + w + '» ya no se marcará como falta. Puedes quitarla en Ajustes › Ortografía.'); },
      omCerrar: () => this.ortoCerrar() };
  }
});
