// Exportar el texto de un campo MKD de la hoja activa a un archivo .md (Markdown estándar) o copiarlo al portapapeles.
// Botones de la barra superior de cada campo (Notas, y el campo flotante de Diagrama). El botón de copiar abre un menú
// con «Copiar Markdown» (copySheetMd) y «Copiado literal» (copySheetRaw). La conversión a Markdown vive en
// js/motor/mkd.js (mdExportText): «Copiar Markdown» y exportar dan exactamente el mismo texto.
// k = clave del campo: 'sheet' (el principal) o el id de un campo añadido ('f…', js/motor/campos.js). Cada campo copia
// y exporta solo lo suyo; la copia limpia, el texto de su fuente.
NoteApp.partes.push(Base => class extends Base {
  // Clave para «Copiado» / «Exportado» de cada campo (el principal sigue usando el id de la hoja, como antes).
  campoMarca(sheet, k) { return !k || k === CAMPO_MAIN ? sheet.id : k; }
  // Copia todo el texto del campo en Markdown estándar (lo propio de MKD convertido, p. ej. [True] → [x], y las
  // menciones con su valor, igual que al exportar). Usa copyText (pestanas.js), que pone state.copied = 'md:<clave>'
  // un momento para que el icono se vea en verde.
  copySheetMd(k) {
    const s = this.state, sheet = this.curSheet(s);
    if (!sheet) return;
    RESOLVE = makeWorld(s).at(sheet.id); // para que las menciones se resuelvan con el valor de esta hoja
    this.setState({ copyMenu: false });
    this.copyText(mdExportText(campoLineas(sheet, k) || []), 'md:' + this.campoMarca(sheet, k));
  }
  // Copiado literal: el texto del campo exactamente como está guardado (lo que se ve en la vista sucia),
  // con cada carácter tal cual: menciones con su ruta (=Nombre, =/Nota/Hoja/Nombre), [True], '', `` …
  // Da igual que esté activa la vista limpia o la sucia. Una línea del campo = una línea del texto copiado.
  copySheetRaw(k) {
    const sheet = this.curSheet(this.state);
    if (!sheet) return;
    this.setState({ copyMenu: false });
    this.copyText((campoLineas(sheet, k) || []).map(l => String(l.text == null ? '' : l.text)).join('\n'), 'lit:' + this.campoMarca(sheet, k));
  }
  // Nombre del archivo: «Nota - Hoja.md» para el campo principal y «Nota - Hoja (2).md», «(3)»… para los añadidos.
  exportSheetMd(k) {
    const s = this.state, sheet = this.curSheet(s), note = this.curNote(s);
    if (!sheet) return;
    RESOLVE = makeWorld(s).at(sheet.id); // para que las menciones se resuelvan con el valor de esta hoja
    const md = mdExportText(campoLineas(sheet, k) || []), num = campoNum(sheet, k);
    const base = ((note ? note.name + ' - ' : '') + (sheet.name || 'Hoja') + (num > 1 ? ' (' + num + ')' : '')).replace(/[\\/:*?"<>|]/g, '-').trim() || 'nota';
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = base + '.md';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    const mk = this.campoMarca(sheet, k);
    this.setState({ exported: mk });
    clearTimeout(this._expT);
    this._expT = setTimeout(() => this.setState(st => st.exported === mk ? { exported: null } : null), 1400);
  }
});
