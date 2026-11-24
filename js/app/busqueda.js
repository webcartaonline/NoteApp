// Búsqueda dentro del texto de un campo MKD (barra superior de cada campo: Notas y el campo flotante de Diagrama).
// Cada campo tiene su propio buscador y solo busca en su texto: state.search = { [clave]: { q, active } }, con
// clave = 'sheet' (campo principal) o el id del campo añadido ('f…', ver js/app/campos.js).
// Las coincidencias se calculan en mkdLines (js/app/lineas.js) y se guardan en this._matchesBy[clave].
NoteApp.partes.push(Base => class extends Base {
  searchOf(k, s) { s = s || this.state; return s.search && s.search[k] ? s.search[k] : null; }
  searchSet(k, v, cb) { this.setState(st => { const o = { ...(st.search || {}) }; if (v) o[k] = v; else delete o[k]; return { search: Object.keys(o).length ? o : null }; }, cb); }
  searchStep(k, dir) {
    const total = ((this._matchesBy || {})[k] || []).length;
    if (!total) return;
    this.setState(st => {
      const cur = st.search && st.search[k] ? st.search[k].active : 0;
      const next = ((cur % total) + total + dir) % total;
      return { search: { ...(st.search || {}), [k]: { ...((st.search || {})[k] || { q: '' }), active: next } } };
    }, () => this.searchShow(k));
  }
  // Lleva a la vista la coincidencia actual (al pulsar Intro / flechas y también al escribir en el buscador).
  // Se busca la línea dentro de su campo: la copia limpia tiene las mismas líneas que su fuente.
  searchShow(k) {
    const list = (this._matchesBy || {})[k] || [], t = list.length, q = this.searchOf(k); if (!t || !q) return;
    const i = ((q.active % t) + t) % t, m = list[i], box = this.boxOf(k);
    if (m && box) { const el = this.lineEl(box, m.lineId); if (el && el.scrollIntoView) el.scrollIntoView({ block: 'nearest' }); }
  }
});
