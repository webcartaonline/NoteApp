// Menú de copiar de lo copiable (componente componentes/menu-copiar/): al pulsar el botón de copiar de una línea o
// bloque copiable, de un copiable en una frase o de una celda copiable se despliega, junto al botón, un menú flotante
// sencillo (como el del círculo de la barra de hojas) con «Copiar Markdown» y «Copiado literal».
// Mientras está abierto: state.cmenu = { md, lit, key, what, top, left, tf } (no se guarda).
//   md: el contenido en Markdown (como al exportar) · lit: tal cual está escrito · key: para poner verde el botón ·
//   what: qué es (línea, bloque, frase o celda) · top/left/tf: dónde se dibuja (posición fija en la pantalla).
// Se cierra al elegir, con Esc, con un clic fuera (base.js) o al desplazar o cambiar el tamaño de la ventana.
NoteApp.partes.push(Base => class extends Base {
  // c = { md, lit, key, what }; e = el clic en el botón de copiar (para colocar el menú debajo, alineado por la derecha).
  askCopy(c, e) {
    // Volver a pulsar el mismo botón con el menú abierto lo cierra (el clic fuera ya lo cerró justo antes).
    const last = this._cmLast, btn = e && e.currentTarget; this._cmLast = null;
    if (last && btn && btn.contains && btn.contains(last.el) && Date.now() - last.t < 1000) return;
    const a = document.activeElement; if (a && (a.tagName === 'TEXTAREA' || a.tagName === 'INPUT')) a.blur();
    const r = btn && btn.getBoundingClientRect ? btn.getBoundingClientRect() : { top: 100, bottom: 100, left: 100, right: 100 };
    const W = 170, H = 84, gap = 6, up = r.bottom + gap + H > window.innerHeight && r.top - gap - H > 0, right = r.right - W >= 8;
    const pos = { top: Math.round(up ? r.top - gap : r.bottom + gap) + 'px', left: Math.round(right ? r.right : Math.max(8, r.left)) + 'px', tf: 'translate(' + (right ? '-100%' : '0') + ', ' + (up ? '-100%' : '0') + ')' };
    if (!this._cmClose) { this._cmClose = () => { if (this.state.cmenu) this.closeCMenu(); }; window.addEventListener('scroll', this._cmClose, true); window.addEventListener('resize', this._cmClose); }
    this.setState({ menu: false, copyMenu: false, entMenu: null, cmenu: { ...c, ...pos } });
  }
  // el: dónde se pulsó, si lo cierra un clic fuera (base.js); se apunta para que ese mismo clic, si era en su botón de
  // copiar, no lo vuelva a abrir.
  closeCMenu(el) {
    const c = this.state.cmenu; if (!c) return;
    this._cmLast = el ? { el, t: Date.now() } : null;
    this.setState({ cmenu: null });
  }
  // Copia la opción elegida (lit: copiado literal) y el botón de copiar se pone verde un momento.
  doCopy(lit) { const c = this.state.cmenu; if (!c) return; this.setState({ cmenu: null }); this.copyText(lit ? c.lit : c.md, c.key); }
  // Valores para la plantilla (se añaden en renderVals)
  cmenuVals(s) {
    const c = s.cmenu;
    if (!c) return { cmOpen: false };
    return { cmOpen: true, cmTop: c.top, cmLeft: c.left, cmTf: c.tf, cmLabel: 'Copiar · ' + (c.what || 'copiable'),
      cmMd: e => { e.stopPropagation(); this.doCopy(false); }, cmLit: e => { e.stopPropagation(); this.doCopy(true); } };
  }
});
