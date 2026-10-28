// Búsqueda dentro del texto de la hoja (barra superior del panel de texto, Notas).
// Las coincidencias se calculan en mkdLines (js/app/lineas.js) y se guardan en this._matches.
NoteApp.partes.push(Base => class extends Base {
  searchStep(dir) {
    const total = (this._matches || []).length;
    if (!total) return;
    this.setState(st => {
      const cur = st.search ? st.search.active : 0;
      const next = ((cur % total) + total + dir) % total;
      return { search: { ...(st.search || { q: '' }), active: next } };
    }, () => {
      const t = (this._matches || []).length; if (!t) return;
      const i = ((this.state.search.active % t) + t) % t, m = this._matches[i];
      if (m) { const el = document.querySelector('[data-lid="' + m.lineId + '"]'); if (el && el.scrollIntoView) el.scrollIntoView({ block: 'nearest' }); }
    });
  }
});
