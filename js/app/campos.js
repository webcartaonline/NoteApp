// Varios campos de texto MKD en una misma hoja (versión 5.0.0.0, 24/11/2026; solo en la ventana Notas).
// Datos y funciones generales: js/motor/campos.js. Plantilla: componentes/panel-texto/ (un panel por campo) y index.html
// (.app-campos: la fila de campos, con barra de desplazamiento abajo si no caben).
//
// - Botón del círculo (a la derecha del de exportar) → menú pequeño (state.campoMenu = clave del campo, no se guarda):
//   «Crear copia limpia», «Crear nuevo campo» y, en los campos añadidos, «Eliminar campo» (pide confirmación).
//   Lo nuevo sale siempre a la derecha del campo donde se pulsó (detrás de su copia limpia, si la tiene).
// - Copia limpia: pegada a su fuente (esquinas rectas donde se unen y una línea verde en medio), siempre en vista
//   limpia, sin escribir (las casillas y los copiables sí funcionan). Las dos se desplazan a la vez (campoScroll) y
//   miden lo mismo: el ancho se cambia desde el borde de fuera (el derecho de la copia), nunca desde la unión.
// - Cada campo tiene su buscador, su copiar y su exportar, que solo tocan su texto.
NoteApp.partes.push(Base => class extends Base {
  // Dónde se guardan los cambios del texto del campo k (para setLines / mkdLines): null = campo principal.
  campoEnt(sheet, k) { const f = campoFuente(sheet, k); return f === CAMPO_MAIN ? null : f; }
  campoMenuToggle(k) { this.setState(st => ({ campoMenu: st.campoMenu === k ? null : k, copyMenu: false, menu: false })); }
  // Crea un campo nuevo (tipo 'nuevo') o la copia limpia ('limpia') a la derecha del campo k.
  campoCrear(k, tipo) {
    const sheet = this.curSheet(this.state); if (!sheet) return;
    const f = campoFuente(sheet, k);
    if (tipo === 'limpia' && (f !== k || campoCopia(sheet, k))) return this.setState({ campoMenu: null }); // una copia por campo
    const nuevo = tipo === 'limpia' ? { id: uid('f'), limpia: k } : { id: uid('f'), lines: mkLines(['']), width: W0 };
    const id = nuevo.id;
    this.setState(st => ({ campoMenu: null, notes: this.mapSheet(st, x => {
      const list = camposDe(x).slice();
      if (tipo === 'limpia') list.push(nuevo);
      else { const i = f === CAMPO_MAIN ? -1 : list.findIndex(c => c.id === f); list.splice(i + 1, 0, nuevo); }
      const nx = { ...x, campos: campoOrdena(list) };
      // Con un campo a todo el ancho, el campo nuevo no se vería: se vuelven a enseñar todos (la copia limpia sí se ve).
      if (tipo !== 'limpia') delete nx.full;
      return nx;
    }) }), () => {
      requestAnimationFrame(() => { const box = this.boxOf(id), sec = box && box.closest('.panel-texto-seccion'); if (sec && sec.scrollIntoView) sec.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' }); });
      if (tipo !== 'limpia' && !this.state.clean) this.focusLine(nuevo.lines[0].id, 0);
    });
  }
  // Pide confirmación antes de eliminar un campo añadido (ventana confirmar, kind 'campo'; ver js/app/confirmar.js).
  campoAskDelete(k) {
    const a = document.activeElement; if (a && (a.tagName === 'TEXTAREA' || a.tagName === 'INPUT')) a.blur();
    this.setState(st => { const n = this.curNote(st); if (!n || !n.activeSheet || !campoEsId(k)) return { campoMenu: null }; return { campoMenu: null, focusId: null, confirm: { kind: 'campo', noteId: n.id, sheetId: n.activeSheet, campoId: k } }; },
      () => { const b = document.querySelector('[data-confirmar="cancelar"]'); if (b) b.focus(); });
  }
  // Quita el campo k de la hoja (y su copia limpia, si la tiene). Lo llama confirmDelete.
  campoQuitar(x, k) {
    const nx = { ...x, campos: camposDe(x).filter(c => c.id !== k && c.limpia !== k) };
    if (!nx.campos.length) delete nx.campos;
    if (x.full === k) delete nx.full;
    return nx;
  }
  setCampoWidth(k, w) {
    const sheet = this.curSheet(this.state); if (!sheet) return;
    const f = campoFuente(sheet, k);
    if (f === CAMPO_MAIN) return this.setWidth(w);
    this.setState(st => ({ notes: this.mapSheet(st, x => ({ ...x, campos: camposDe(x).map(c => c.id === f ? { ...c, width: w } : c) })) }));
  }
  // Asa del ancho (borde derecho de cada campo; en un campo con copia limpia, solo el de fuera, el de la copia).
  campoResizeDown(e, k) {
    e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId);
    const sec = e.currentTarget.closest('.panel-texto-seccion'), sheet = this.curSheet(this.state);
    this._rs = { x: e.clientX, w: sec.getBoundingClientRect().width, k, par: !!(sheet && campoFuente(sheet, k) !== k), sinEnts: !!(sheet && !(sheet.entities || []).length) };
    this.setState({ dragging: k }); document.body.style.cursor = 'col-resize';
  }
  // En Diagrama el panel flota sobre el lienzo: el máximo sale del ancho del lienzo y deja 120 px a la vista.
  // Con copia limpia, las dos crecen por igual: cada una, la mitad de lo que se mueve el ratón.
  campoResizeMove(e) {
    const r = this._rs; if (!r) return;
    const el = e.currentTarget.closest('.panel-texto-seccion'), dgBox = el.closest('.app-diagrama');
    const p = (dgBox || el.closest('.app-caja-2') || el.parentElement).getBoundingClientRect().width;
    const le = this.state.elist && this.state.elist.on ? LE_ANCHO : 0, dx = e.clientX - r.x;
    // Sin entidades (5.1.0.0) no hace falta dejarles sitio: el máximo es todo el ancho menos la lista de entidades.
    const w = Math.round(Math.max(dgBox ? 260 : 200, Math.min(p - (dgBox ? 120 : r.sinEnts ? 0 : 440) - le, r.w + (r.par ? dx / 2 : dx))));
    const cur = this.curSheet(this.state); if (cur && w !== campoAncho(cur, r.k)) this.setCampoWidth(r.k, w);
  }
  campoResizeUp() { if (!this._rs) return; this._rs = null; this.setState({ dragging: false }); document.body.style.cursor = ''; }
  // Desplazamiento a la par del campo y su copia limpia: se busca la primera línea que se ve en uno y se coloca igual
  // en el otro (aunque una línea mida distinto en la vista sucia y en la limpia). Al llegar arriba o abajo, los dos llegan.
  campoScroll(e, k, otro) {
    const a = e.currentTarget, now = Date.now();
    if (this._syncFrom && this._syncFrom !== k && now - this._syncT < 120) return; // es el eco del que se movió
    const b = this.boxOf(otro); if (!b) return;
    this._syncFrom = k; this._syncT = now;
    let top;
    if (a.scrollTop <= 0) top = 0;
    else if (a.scrollTop + a.clientHeight >= a.scrollHeight - 1) top = b.scrollHeight;
    else {
      const ra = a.getBoundingClientRect(), lines = a.querySelectorAll('[data-lid]'); let hit = null;
      for (const el of lines) { const r = el.getBoundingClientRect(); if (r.bottom > ra.top + 8) { hit = { el, r }; break; } }
      if (!hit) return;
      const frac = hit.r.height ? Math.max(0, Math.min(1, (ra.top + 8 - hit.r.top) / hit.r.height)) : 0;
      const twin = this.lineEl(b, hit.el.getAttribute('data-lid')); if (!twin) return;
      const rb = b.getBoundingClientRect(), rt = twin.getBoundingClientRect();
      top = b.scrollTop + (rt.top - rb.top) + frac * rt.height - 8;
    }
    if (Math.abs(b.scrollTop - top) >= 1) b.scrollTop = top;
  }
  // Valores de un campo para la plantilla panel-texto (se le pasa como "c").
  // o = { diag: campo flotante del Diagrama, par: fuente con copia limpia, copia: es la copia limpia, full, solo,
  //       llena: es el último grupo de una hoja sin entidades (crece hasta el borde derecho; ver camposVals) }
  campoVals(s, sheet, k, o) {
    o = o || {};
    const ent = this.campoEnt(sheet, k), copia = !!o.copia, otro = copia ? campoFuente(sheet, k) : o.par ? (campoCopia(sheet, k) || {}).id : null;
    const src = campoLineas(sheet, k) || [], w = campoAncho(sheet, k), mk = this.campoMarca(sheet, k), sq = this.searchOf(k, s);
    const lines = this.mkdLines(src, ent, copia, k), list = (this._matchesBy || {})[k] || [];
    const fullOn = !!o.full, copiado = s.copied === 'md:' + mk || s.copied === 'lit:' + mk, num = campoNum(sheet, k);
    const nt = !o.diag;
    return {
      key: k,
      ref: k === CAMPO_MAIN ? this.panelRef : null,
      lines,
      isCopia: copia,
      panelFlex: fullOn ? '1 1 0%' : o.llena ? (o.solo ? '1 1 ' : '1 0 ') + w + 'px' : o.diag || o.solo ? '0 1 ' + w + 'px' : '0 0 ' + w + 'px',
      // El que se estira (llena): su ancho mínimo es el suyo y «contain: inline-size» hace que el navegador no mida su texto
      // para calcular el ancho de la fila (si no, la fila mediría lo que mide la línea más larga y el campo crecería de más).
      minW: o.llena && !o.solo ? w + 'px' : 'min(200px,100%)',
      contain: o.llena && !o.solo ? 'inline-size' : 'none',
      panelCursor: s.clean || copia ? 'default' : 'text',
      // Esquinas: la fuente y su copia limpia se unen con esquinas rectas; el campo flotante del Diagrama tiene radio 10.
      radius: o.diag ? '10px' : copia ? '0 7px 7px 0' : o.par ? '7px 0 0 7px' : '7px',
      panelDown: e => {
        if (copia || s.clean) return;
        if (e.target.dataset && e.target.dataset.handle) return;
        if (e.target.closest && e.target.closest('[data-line]')) return;
        if (e.nativeEvent.offsetX >= e.target.clientWidth) return;
        // Clic en un hueco (debajo del texto, entre dos líneas o en los márgenes): no se hace nada.
        // Antes llevaba el cursor al final de la hoja y estorbaba al seleccionar texto (Camilo, 18/11/2026).
        // preventDefault: no quita el foco de la línea que se esté editando ni empieza una selección suelta.
        e.preventDefault();
        if (!src.length) { const ln = mkLines([''])[0]; this.setLines([ln], ln.id, 0, ent); } // campo sin líneas (p. ej. un diagrama antiguo)
      },
      onScroll: otro ? e => this.campoScroll(e, k, otro) : null,
      // Buscador del campo: solo busca en su texto.
      searchQuery: (sq && sq.q) || '',
      hasSearch: !!(sq && sq.q),
      searching: sq && sq.q && sq.q.trim() ? '1' : '0', // oscurece lo que no coincide (panel-texto.css)
      searchCountTxt: (() => { const t = list.length; if (!sq || !sq.q) return ''; if (!t) return 'Sin resultados'; const i = ((sq.active % t) + t) % t; return (i + 1) + ' / ' + t; })(),
      searchPlaceholder: copia ? 'Buscar en la copia limpia…' : 'Buscar en el texto…',
      onSearchChange: e => this.searchSet(k, { q: e.target.value, active: 0 }, () => this.searchShow(k)),
      onSearchKey: e => { if (e.key === 'Enter') { e.preventDefault(); this.searchStep(k, e.shiftKey ? -1 : 1); } else if (e.key === 'Escape') { e.preventDefault(); e.target.blur(); this.searchSet(k, null); } },
      searchPrev: () => this.searchStep(k, -1),
      searchNext: () => this.searchStep(k, 1),
      searchClear: () => this.searchSet(k, null),
      // Ocultar entidades (solo Notas): este campo (y su copia limpia) a todo el ancho.
      canFull: nt,
      full: fullOn,
      fullColor: fullOn ? '#008000' : '#8a8a8a',
      fullTitle: fullOn ? 'Mostrar las entidades y los demás campos' : 'Ocultar entidades (este campo ocupa todo el ancho)',
      toggleFull: () => this.toggleFull(k),
      // Copiar todo el texto del campo: menú «Copiar Markdown» / «Copiado literal».
      copyMenuOpen: s.copyMenu === k,
      toggleCopyMenu: () => this.setState(st => ({ copyMenu: st.copyMenu === k ? false : k, campoMenu: null })),
      copyMd: () => this.copySheetMd(k),
      copyRaw: () => this.copySheetRaw(k),
      copyMdColor: copiado ? '#008000' : s.copyMenu === k ? '#fff' : '#8a8a8a',
      copyMdTitle: copiado ? 'Copiado' : copia ? 'Copiar todo el texto de la copia limpia' : nt && (camposDe(sheet).length || num > 1) ? 'Copiar todo el texto de este campo' : 'Copiar todo el texto de la hoja',
      exportMd: () => this.exportSheetMd(k),
      exportColor: s.exported === mk ? '#008000' : '#8a8a8a',
      exportTitle: s.exported === mk ? 'Exportado' : nt && camposDe(sheet).length ? 'Exportar este campo a un archivo Markdown (.md)' : 'Exportar esta hoja a un archivo Markdown (.md)',
      // Botón del círculo y su menú (solo Notas).
      hasCircle: nt,
      circleOpen: s.campoMenu === k,
      circleColor: s.campoMenu === k ? '#a6a6a6' : '#7a7a7a',
      circleToggle: () => this.campoMenuToggle(k),
      showLimpia: !copia,
      limpiaOff: !!o.par,
      limpiaOpacity: o.par ? 0.4 : 1,
      limpiaTitle: o.par ? 'Este campo ya tiene su copia limpia' : 'A la derecha, unida a este campo: su texto siempre en vista limpia y al momento',
      crearLimpia: () => this.campoCrear(k, 'limpia'),
      crearNuevo: () => this.campoCrear(k, 'nuevo'),
      canBorrar: campoEsId(k),
      borrar: () => this.campoAskDelete(k),
      // Asa del ancho: no en la fuente de una copia limpia (se cambia desde el borde de fuera, el de la copia).
      // Un solo campo en una hoja sin entidades llega hasta el borde: no hay ancho que cambiar.
      showHandle: !fullOn && !o.par && !(o.llena && o.solo),
      handleColor: s.dragging === k ? '#008000' : 'transparent',
      resizeDown: e => this.campoResizeDown(e, k),
      resizeMove: e => this.campoResizeMove(e),
      resizeUp: () => this.campoResizeUp(),
      resizeReset: () => this.setCampoWidth(k, W0)
    };
  }
  // Fila de campos de la hoja (Notas): grupos de un campo suelto o de un campo con su copia limpia.
  // Hoja sin entidades (5.1.0.0, Camilo): no se dibuja la columna de entidades (showEnts en render.js) y la fila ocupa todo
  // el ancho. Los campos mantienen su ancho y el último (con su copia limpia, si la tiene, las dos por igual) se estira hasta
  // el borde derecho; si no caben, la fila se desplaza como siempre. Un solo campo ocupa todo el ancho.
  camposVals(s, sheet) {
    const full = campoFull(sheet), grupos = campoGrupos(sheet).filter(g => !full || g.src === full);
    const solo = !full && grupos.length === 1 && !grupos[0].copia;
    const libre = !full && !(sheet.entities || []).length;
    return {
      campos: grupos.map((g, i) => {
        const llena = libre && i === grupos.length - 1;
        const items = [this.campoVals(s, sheet, g.src, { par: !!g.copia, full: !!full, solo, llena })];
        if (g.copia) items.push(this.campoVals(s, sheet, g.copia, { copia: true, full: !!full, llena }));
        return { key: g.src, items, flex: full ? '1 1 0%' : llena ? (solo ? '1 1 auto' : '1 0 auto') : solo ? '0 1 auto' : '0 0 auto' };
      }),
      camposFlex: full || libre ? '1 1 0%' : '0 1 auto',
      // Fila de dentro (.app-campos-fila): con varios campos mide lo que miden todos juntos (y se desplaza; sin entidades,
      // además crece hasta el borde); con uno solo se puede encoger como antes; a todo el ancho, llena el hueco.
      camposFila: full ? '1 1 0%' : solo ? '1 1 auto' : libre ? '1 0 auto' : '0 0 auto'
    };
  }
});
