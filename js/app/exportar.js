// Exportar el texto de la hoja activa a un archivo .md (Markdown estándar) o copiarlo al portapapeles.
// Solo en Notas (botones de la barra superior del panel de texto). La conversión vive en js/motor/mkd.js
// (mdExportText): copiar y exportar dan exactamente el mismo texto.
NoteApp.partes.push(Base => class extends Base {
  // Copia todo el texto de la hoja activa en Markdown estándar (lo propio de MKD convertido, p. ej.
  // [True] → [x], y las menciones con su valor, igual que al exportar). Usa copyText (pestanas.js), que
  // pone state.copied = 'md:<idHoja>' un momento para que el icono se vea en verde.
  copySheetMd() {
    const s = this.state, sheet = this.curSheet(s);
    if (!sheet) return;
    RESOLVE = makeWorld(s).at(sheet.id); // para que las menciones se resuelvan con el valor de esta hoja
    this.copyText(mdExportText(sheet.lines || []), 'md:' + sheet.id);
  }
  exportSheetMd() {
    const s = this.state, sheet = this.curSheet(s), note = this.curNote(s);
    if (!sheet) return;
    RESOLVE = makeWorld(s).at(sheet.id); // para que las menciones se resuelvan con el valor de esta hoja
    const md = mdExportText(sheet.lines || []);
    const base = ((note ? note.name + ' - ' : '') + (sheet.name || 'Hoja')).replace(/[\\/:*?"<>|]/g, '-').trim() || 'nota';
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = base + '.md';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    const sid = sheet.id;
    this.setState({ exported: sid });
    clearTimeout(this._expT);
    this._expT = setTimeout(() => this.setState(st => st.exported === sid ? { exported: null } : null), 1400);
  }
});
