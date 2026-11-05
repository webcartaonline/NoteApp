// Cursor de escritura de las líneas de texto (hoja, entidades de texto y formas del diagrama).
// El cursor del navegador mide 1 px y no se puede ensanchar con CSS, así que el cuadro de edición
// (textarea .lineas-area) lo lleva transparente (lineas.css) y aquí se dibuja una barra más gruesa y
// más clara (.cursor-escritura, en lineas.css) justo donde está el cursor sobre el texto que se ve.
// La posición se saca del texto visible (los <span data-off> de la línea), no del textarea: así la barra
// siempre cae sobre la letra real, también con zoom en el diagrama o con el texto centrado.
// Solo trabaja mientras hay una línea con el foco (se vuelve a mirar en cada fotograma).
(function () {
  const ANCHO = 2.5;   // grosor de la barra en px de pantalla
  let barra = null, activo = false, antes = '';

  function crear() {
    if (!barra) { barra = document.createElement('div'); barra.className = 'cursor-escritura'; document.body.appendChild(barra); }
    return barra;
  }
  function ocultar() { if (barra) barra.style.display = 'none'; antes = ''; }
  function cuadro() { const a = document.activeElement; return a && a.classList && a.classList.contains('lineas-area') ? a : null; }

  // Rectángulo (en pantalla) del cursor en la posición o del texto de la línea.
  function rectEn(linea, o) {
    const nodos = [], w = document.createTreeWalker(linea, NodeFilter.SHOW_TEXT); let t;
    while ((t = w.nextNode())) {
      const sp = t.parentElement && t.parentElement.closest('[data-off]');
      if (sp && linea.contains(sp)) nodos.push({ t, d: +sp.getAttribute('data-off') });
    }
    let x = nodos.find(n => o >= n.d && o < n.d + n.t.length) || nodos.filter(n => o === n.d + n.t.length).pop();
    const r = document.createRange();
    const borde = (nodo, a, b, der) => { r.setStart(nodo, a); r.setEnd(nodo, b); const rs = r.getClientRects(); const q = der ? rs[rs.length - 1] : rs[0]; return q ? { x: der ? q.right : q.left, top: q.top, h: q.height } : null; };
    if (x) {
      const k = o - x.d, L = x.t.length;
      if (k < L) return borde(x.t, k, k + 1, false);
      if (k > 0) return borde(x.t, k - 1, k, true);
    }
    // Línea vacía (o posición sin texto): se usa el carácter invisible del final de la línea
    const caja = linea.querySelector('.lineas-caja-4'); if (!caja) return null;
    const w2 = document.createTreeWalker(caja, NodeFilter.SHOW_TEXT); let ult = null; while ((t = w2.nextNode())) ult = t;
    if (!ult || !ult.length) return null;
    return borde(ult, ult.length - 1, ult.length, false);
  }

  function dibujar() {
    if (!activo) return;
    requestAnimationFrame(dibujar);
    const ta = cuadro();
    if (!ta) { activo = false; ocultar(); return; }
    if (ta.selectionStart !== ta.selectionEnd) return ocultar(); // con texto seleccionado no se ve el cursor
    const linea = ta.closest('[data-lid]'); if (!linea) return ocultar();
    const p = rectEn(linea, ta.selectionStart); if (!p || !p.h) return ocultar();
    // Si en ese punto hay algo encima (un menú) o el texto está recortado (fuera de la forma o del panel), no se dibuja
    const lr = linea.getBoundingClientRect();
    const cx = Math.min(Math.max(p.x, lr.left + 1), lr.right - 1), cy = p.top + p.h / 2;
    const hit = document.elementFromPoint(cx, cy);
    if (!hit || !linea.contains(hit)) return ocultar();
    const b = crear(), clave = [p.x, p.top, p.h].map(n => Math.round(n * 2)).join(',');
    if (clave === antes && b.style.display === 'block') return;
    antes = clave;
    Object.assign(b.style, { display: 'block', left: (p.x - ANCHO / 2) + 'px', top: p.top + 'px', width: ANCHO + 'px', height: p.h + 'px' });
    // Al moverse el cursor, el parpadeo vuelve a empezar (se ve fijo mientras se escribe)
    b.style.animation = 'none'; void b.offsetWidth; b.style.animation = '';
  }
  function empezar() { if (activo) return; activo = true; requestAnimationFrame(dibujar); }
  document.addEventListener('focusin', e => { if (e.target && e.target.classList && e.target.classList.contains('lineas-area')) empezar(); });
  if (cuadro()) empezar();
})();
