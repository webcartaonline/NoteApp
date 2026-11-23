// Ventana de novedades (componente componentes/novedades/). Al abrir la app después de una actualización,
// cuenta qué hay de nuevo. Sale una sola vez por versión en cada navegador (se recuerda en localStorage).
//
// Los textos de cada versión (titulo y texto de cada punto) se pueden cambiar aquí mismo antes de publicar.
//
// NÚMERO DE VERSIÓN (forma de numerar de Camilo): cuatro cifras, Global.Visual.Estructural.Correcciones (p. ej. 6.12.3.2).
//   · Global: cambio grande, que afecta mucho al aspecto y al funcionamiento (p. ej. añadir la Personalización).
//     Sube la global y las otras tres vuelven a 0: 6.12.3.2 → 7.0.0.0.
//   · Visual: cada mejora que se ve (p. ej. otro color para una entidad, si el código apenas cambia): 6.12.3.2 → 6.13.3.0.
//   · Estructural: cada mejora interna que no se ve (p. ej. otra forma de guardar los resultados): 6.12.3.2 → 6.12.4.0.
//     Si una mejora visual también cambia bastante el funcionamiento, suben las dos: 6.12.3.2 → 6.13.4.0.
//   · Correcciones: arreglar algo que no funcionaba, sin cambiar la idea: 6.13.4.0 → 6.13.4.1.
//     Vuelve a 0 cada vez que sube la global, la visual o la estructural.
//
// CÓMO CAMBIAR LA VERSIÓN (Camilo publica él los cambios):
//   1. Mira si la versión de arriba de NA_NOVEDADES ya está publicada: git show origin/main:js/app/novedades.js
//      (la primera versión de ahí es la que tienen los usuarios).
//   2. Si NO está publicada, no se crea otro bloque: se sube su número según el cambio nuevo y se añaden sus puntos a su
//      lista. Así, de una publicada 6.12.3.2, una mejora da 6.13.4.0 y una corrección después, 6.13.4.1: al publicar,
//      llega la 6.13.4.1 con todos sus puntos.
//   3. Si YA está publicada, añade un bloque AL PRINCIPIO con el número nuevo, la fecha y los cambios (titulo + texto),
//      escritos para cualquier persona, sin tecnicismos. Sube también VERSION en sw.js.
//   4. Cada punto lleva su tipo en «tipos»: 'visual', 'estructural' y/o 'correccion' (los mismos de las cifras del
//      número de versión). Si es de varios tipos a la vez, se ponen todos: tipos: ['visual', 'estructural'].
//      En Ajustes › Actualizaciones las novedades se agrupan por tipo; las de varios tipos salen una sola vez, juntas.
//   5. Solo se guardan 5 versiones (la actual y 4 más): borra la más antigua. Si se olvida, se recorta sola (NOV_GUARDAR).
//   Quien abra la app y no haya visto esa versión verá la ventana. Si se ha saltado varias, las ve todas juntas.
const NA_NOVEDADES = [
  {
    version: '4.9.5.1',
    fecha: '23 de noviembre de 2026',
    cambios: [
      { titulo: 'La carpeta ya no se desconecta por un fallo suelto', texto: 'Si al guardar faltaba un archivo por un momento (por ejemplo, porque OneDrive lo estaba sincronizando), NoteApp creía que la carpeta se había borrado y la desconectaba: el icono de la carpeta se quedaba apagado. Ahora comprueba primero si la carpeta sigue ahí y, si está, vuelve a intentar guardar a los pocos segundos.', tipos: ['correccion'] },
      { titulo: 'Avisos en vez de silencio al cambiar de carpeta', texto: 'A veces, al pulsar el botón de la carpeta o al cambiar de espacio de trabajo, no pasaba nada y no sabías por qué. Ahora NoteApp te avisa si todavía está cambiando de carpeta, si la carpeta anterior tarda demasiado en guardar o si no se ha podido abrir la ventana para elegir carpeta. Y si un cambio de carpeta se queda atascado, al rato deja volver a intentarlo.', tipos: ['correccion'] }
    ]
  },
  {
    version: '4.9.5.0',
    fecha: '20 de noviembre de 2026',
    cambios: [
      { titulo: 'Cambios al copiar un texto copiable', texto: 'Al pulsar el botón de copiar de un texto copiable (el que va entre comillas simples) ya no se abre una ventana en medio de la pantalla: se despliega un menú pequeño junto al botón, con «Copiar Markdown» y «Copiado literal». Se cierra al elegir, con Esc o pulsando fuera.', tipos: ['visual'] },
      { titulo: 'El historial, dentro de Espacios de trabajo', texto: 'En Ajustes › Sincronización, el Historial ya no es una sección aparte: ahora está en «Espacios de trabajo», debajo de los botones Cambiar, Copiar y Mudar. Así ves en un solo sitio el espacio que tienes abierto y puedes pasar a otro sin cambiar de sección.', tipos: ['visual'] }
    ]
  },
  {
    version: '4.7.5.1',
    fecha: '18 de noviembre de 2026',
    cambios: [
      { titulo: 'La tecla N ya elige «N» en los extremos de una relación', texto: 'Con el menú de Origen o de Destino abierto, la tecla 1 ponía «1», pero la tecla N no ponía «N». Ahora las dos funcionan igual, sin tener que hacer clic.', tipos: ['correccion'] },
      { titulo: 'Ya puedes escribir un 1 o una N en «Otro»', texto: 'Al escribir un 1 en el campo «Otro» de un extremo, el campo se quedaba vacío y se marcaba la opción «1». Ahora, mientras escribes en «Otro», las teclas 1 y N solo escriben: lo que pongas se queda en el campo.', tipos: ['correccion'] }
    ]
  },
  {
    version: '4.7.5.0',
    fecha: '18 de noviembre de 2026',
    cambios: [
      { titulo: 'Escribe lo que quieras en los extremos de una relación', texto: 'En Diagrama, al seleccionar una línea, los botones Origen y Destino abren ahora un pequeño menú: elige nada, 1 o N como antes, o escribe en «Otro» el texto que quieras, por ejemplo 0..1, 1..N o muchos. El texto se coloca junto a la tabla sin tapar la línea, y si es largo sigue en la línea de abajo.', tipos: ['visual', 'estructural'] }
    ]
  },
  {
    version: '4.6.4.0',
    fecha: '18 de noviembre de 2026',
    cambios: [
      { titulo: 'El buscador se ve mucho mejor', tipos: ['visual', 'correccion'], texto: 'Al buscar en el texto de una hoja, ahora se marcan en verde todas las coincidencias, tengan el formato que tengan: código, enlaces, menciones, celdas de tabla, títulos, listas… Antes algunas no se marcaban. Además, mientras buscas, el resto del texto se oscurece para que lo encontrado destaque, y la hoja salta sola a la primera coincidencia. Por ejemplo, si buscas «casa», cada «casa» queda en verde y todo lo demás pasa a un segundo plano.' }
    ]
  }
];
// Solo se guardan las 5 últimas versiones: la actual y 4 más (son las que salen en Ajustes › Actualizaciones › Historial).
// Si la lista tiene más, las más antiguas se quitan aquí.
const NOV_GUARDAR = 5;
NA_NOVEDADES.splice(NOV_GUARDAR);
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
