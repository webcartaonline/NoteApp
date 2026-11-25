// Menú Ortografía de la página de Ajustes (componente componentes/ajustes-orto/). Ver AGENTS.md → «Corrector ortográfico».
// · Corrector: encender o apagar el subrayado de las faltas (state.config.orto = false → apagado) y cómo funciona.
// · Mi diccionario: las palabras añadidas (state.config.ortoDicc), para quitarlas o añadir otras a mano.
// Estado temporal (no se guarda): state.ortoNueva = lo escrito en el campo «Añadir una palabra».
const AJ_ORTO_SECS = [['corrector', 'Corrector'], ['diccionario', 'Mi diccionario']];
NoteApp.partes.push(Base => class extends Base {
  ortoAjAnadir() {
    const w = String(this.state.ortoNueva || '').trim();
    if (!w) return;
    if (/\s/.test(w)) { this.fsToast('Solo una palabra', 'Escribe una sola palabra, sin espacios. Por ejemplo: Espinardo.'); return; }
    this.ortoAnadir(w);
    this.setState({ ortoNueva: '' });
  }
  // Valores para la plantilla (se añaden en ajVals, js/app/ajustes.js)
  ortoAjVals(s, sec) {
    const on = !((s.config || {}).orto === false), est = s.ortoEst, lista = (s.config || {}).ortoDicc || [];
    const puede = typeof Worker !== 'undefined';
    const estado = !puede ? 'Este navegador no puede usar el corrector.'
      : !on ? 'Apagado: no se subraya nada.'
      : est === 'error' ? 'No se ha podido cargar el diccionario. Recarga la página para volver a intentarlo.'
      : est === 'listo' ? 'Encendido · diccionario de español listo.'
      : 'Encendido · el diccionario se carga al escribir o abrir una hoja.';
    return {
      ortoEsCorrector: sec !== 'diccionario', ortoEsDicc: sec === 'diccionario',
      ortoOnSw: on && puede, ortoSwCls: on && puede ? 'ajustes-orto-sw-on' : '',
      ortoSwTitulo: on ? 'Apagar el corrector' : 'Encender el corrector',
      ortoSw: () => { if (puede) this.ortoActivar(!on); },
      ortoEstado: estado, ortoEstadoCls: !puede || est === 'error' ? 'ajustes-sinc-punto-aviso' : on ? 'ajustes-sinc-punto-ok' : '',
      ortoCuenta: lista.length === 1 ? '1 palabra en tu diccionario' : lista.length + ' palabras en tu diccionario',
      ortoVerDicc: () => this.ajSec('diccionario'),
      // Mi diccionario
      ortoNueva: s.ortoNueva || '',
      ortoNuevaCambia: e => this.setState({ ortoNueva: e.target.value }),
      ortoNuevaTecla: e => { if (e.key === 'Enter') { e.preventDefault(); this.ortoAjAnadir(); } },
      ortoNuevaAnadir: () => this.ortoAjAnadir(),
      ortoNuevaVacia: !String(s.ortoNueva || '').trim(),
      ortoHayPalabras: lista.length > 0, ortoSinPalabras: !lista.length,
      ortoPalabras: lista.map(w => ({ w, quitar: () => this.ortoQuitar(w), titulo: 'Quitar «' + w + '» de tu diccionario: se volverá a marcar como falta' }))
    };
  }
});
