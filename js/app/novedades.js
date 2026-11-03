// Ventana de novedades (componente componentes/novedades/). Al abrir la app después de una actualización,
// cuenta qué hay de nuevo. Sale una sola vez por versión en cada navegador (se recuerda en localStorage).
//
// CÓMO AÑADIR UNA VERSIÓN NUEVA:
//   1. Añade un bloque AL PRINCIPIO de NA_NOVEDADES con un número de versión nuevo (que no se repita),
//      la fecha y la lista de cambios (titulo + texto), escritos para cualquier persona, sin tecnicismos.
//   2. Sube VERSION en sw.js.
//   Quien abra la app y no haya visto esa versión verá la ventana. Si se ha saltado varias, las ve todas juntas.
const NA_NOVEDADES = [
  {
    version: '1.0',
    fecha: '3 de noviembre de 2026',
    cambios: [
      { titulo: 'Cada carpeta, su propio espacio', texto: 'Si conectas otra carpeta, se abre con sus propias notas, agenda y diagramas, como cajones separados. Nada se mezcla ni se copia de una a otra.' },
      { titulo: 'Te preguntamos antes de guardar', texto: 'La primera vez que conectas una carpeta vacía, puedes elegir si guardar ahí lo que tienes abierto o empezar de cero.' },
      { titulo: 'Copiar un trozo dentro de una frase', texto: "Escribe algo entre comillas simples en medio de una línea, por ejemplo Clave: 'abc123', y saldrá en un recuadro con su botón de copiar." },
      { titulo: 'Combinar formatos en una línea', texto: 'Ahora puedes hacer, por ejemplo, un título numerado (1. ## Título) o una anotación dentro de un punto de lista (- > nota).' },
      { titulo: 'Más formato en lo copiable', texto: 'Los recuadros copiables admiten títulos, listas y anotaciones. Al copiar, se copia tal como se ve.' },
      { titulo: 'Dos formas de copiar la hoja', texto: 'El botón de copiar, encima del texto, copia la hoja en Markdown o tal cual, con todos sus símbolos.' },
      { titulo: 'Esta ventana', texto: 'Cada vez que NoteApp se actualice, al abrirla verás aquí lo que ha cambiado.' }
    ]
  }
];
const NOV_KEY = 'noteapp:novedades:vista'; // última versión cuyas novedades ya se vieron en este navegador
const NOV_MAX = 5;                          // como mucho se enseñan las 5 versiones más recientes
// ¿Es la primera vez que se abre la app en este navegador (todavía no hay datos guardados)? Se mira al cargar
// este archivo, antes de que la app guarde nada. A quien empieza no se le enseñan novedades: para él todo es nuevo.
const NOV_NUEVO = (() => { try { return !localStorage.getItem(NA_KEY); } catch (_) { return false; } })();

function novMarcar() { try { if (NA_NOVEDADES[0]) localStorage.setItem(NOV_KEY, NA_NOVEDADES[0].version); } catch (_) {} }
// Versiones que este navegador todavía no ha visto (la más reciente primero)
function novPendientes() {
  const ult = NA_NOVEDADES[0]; if (!ult) return [];
  let vista = null; try { vista = localStorage.getItem(NOV_KEY); } catch (_) { return []; }
  if (vista === ult.version) return [];
  if (vista == null && NOV_NUEVO) { novMarcar(); return []; }
  const k = NA_NOVEDADES.findIndex(n => n.version === vista);
  return (k > 0 ? NA_NOVEDADES.slice(0, k) : [ult]).slice(0, NOV_MAX);
}

// Mientras está abierta: state.novedades = lista de versiones que se enseñan (no se guarda: no está en NA_KEEP)
NoteApp.partes.push(Base => class extends Base {
  componentDidMount() {
    super.componentDidMount();
    const p = novPendientes();
    if (p.length) this.setState({ novedades: p.map(n => n.version) }, () => { const b = document.querySelector('[data-novedades="cerrar"]'); if (b) b.focus(); });
  }
  closeNovedades() { novMarcar(); this.setState({ novedades: null }); }
  // Valores para la plantilla (se añaden en renderVals)
  novVals(s) {
    const vs = s.novedades, v = { novOpen: !!(vs && vs.length) };
    if (!v.novOpen) return v;
    const list = NA_NOVEDADES.filter(n => vs.includes(n.version)), varias = list.length > 1;
    v.novTitle = 'NoteApp se ha actualizado';
    v.novSub = varias ? 'Esto es lo nuevo desde la última vez que entraste' : 'Versión ' + list[0].version + ' · ' + list[0].fecha;
    v.novRows = [];
    list.forEach(n => {
      if (varias) v.novRows.push({ head: true, label: 'Versión ' + n.version + ' · ' + n.fecha });
      n.cambios.forEach(c => v.novRows.push({ item: true, titulo: c.titulo, texto: c.texto }));
    });
    v.novClose = () => this.closeNovedades();
    v.novBack = e => { if (e.target === e.currentTarget) this.closeNovedades(); };
    return v;
  }
});
