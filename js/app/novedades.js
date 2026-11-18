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
    version: '4.5.4.0',
    fecha: '18 de noviembre de 2026',
    cambios: [
      { titulo: 'Escribe junto a tus diagramas', texto: 'Cada hoja de Diagrama tiene ahora su propio texto, igual que una hoja de Notas. Ábrelo con el botón nuevo que hay a la derecha del interruptor de vista limpia/sucia: aparece flotando encima del lienzo, a la izquierda, y lo puedes hacer más ancho o más estrecho arrastrando su borde. Sirve para explicar el diagrama, por ejemplo qué hace cada tabla. Tiene todo lo del texto de Notas: formato, menciones, casillas, buscar, copiar y exportar.', tipos: ['visual', 'estructural'] },
      { titulo: 'La lista de entidades, en las tres ventanas', texto: 'El botón de la lista de entidades se ha mudado: ahora está arriba, a la derecha del interruptor de vista limpia/sucia, y funciona en Notas, en la Agenda y en Diagrama. En Diagrama la lista también flota encima del lienzo, al lado del texto.', tipos: ['visual'] }
    ]
  },
  {
    version: '4.4.3.2',
    fecha: '18 de noviembre de 2026',
    cambios: [
      { titulo: 'Elige varias claves para un campo', texto: 'En las tablas de los diagramas, el botón de la clave de cada campo abre ahora un pequeño menú con PK, FK y UQ. Marca las que quieras: una, varias o ninguna. Así puedes tener combinaciones que antes no existían, como FK UQ (apunta a otra tabla y no se puede repetir) o las tres a la vez. Esc o un clic fuera cierran el menú.', tipos: ['visual', 'estructural'] },
      { titulo: 'Escribe todo lo que quieras en los diagramas', texto: 'En Diagrama ya no hay límite de letras en ningún texto: el nombre y la descripción de las tablas, sus campos, los valores de cada campo, las etiquetas de las líneas y el nombre del diagrama y de sus hojas. Por ejemplo, puedes apuntar todos los estados de una reserva aunque sean muchos. Lo que no cabe a lo ancho sigue en la línea de abajo, nunca se corta, y la tabla se hace más alta sola (y más baja si borras texto).', tipos: ['visual', 'estructural'] }
    ]
  },
  {
    version: '4.2.1.2',
    fecha: '16 de noviembre de 2026',
    cambios: [
      { titulo: 'Las claves de las tablas, bien alineadas', texto: 'En las tablas de los diagramas entidad-relación, las claves de los campos (PK, FK, PK FK y UQ) empiezan ahora todas en el mismo sitio, pegadas a la izquierda de su columna, y se ven todas igual. Antes cada una caía en un sitio distinto según la clave que tuviera.', tipos: ['correccion'] }
    ]
  },
  {
    version: '4.2.1.1',
    fecha: '15 de noviembre de 2026',
    cambios: [
      { titulo: 'Diagramas entidad-relación', texto: 'En Diagrama hay una forma nueva, la Tabla, para planear bases de datos. Cada tabla tiene su nombre, una descripción y sus campos, y cada campo puede llevar su clave (PK, FK, PK FK o UQ) y los valores que admite. Haz doble clic en una tabla para editarla: Intro añade un campo y el botón de la izquierda de cada campo cambia su clave. El color elige la cabecera, y hay un color nuevo, el blanco.', tipos: ['visual', 'estructural'] },
      { titulo: 'Resalta en verde lo que quieras', texto: 'En el nombre de un campo de una tabla, y en sus valores, lo que pongas entre asteriscos se ve en verde, sin los asteriscos. Por ejemplo, escribe *role*_id y se verá role_id con «role» en verde, para ver de un vistazo a qué tabla apunta esa clave. Los asteriscos solo se ven mientras editas la tabla.', tipos: ['visual'] },
      { titulo: 'Relaciones con 1 y N', texto: 'Al unir dos tablas, la línea sale en ángulo recto y con un 1 en un extremo y una N en el otro, para ver de un vistazo que, por ejemplo, un restaurante tiene muchas mesas. Si varias líneas salen del mismo lado de una tabla, se reparten solas para no montarse. Al seleccionar una línea puedes cambiar el 1 y la N, darles la vuelta o ponerla recta. También vale para las demás formas.', tipos: ['visual'] }
    ]
  },
  {
    version: '4.0.0.0',
    fecha: '15 de noviembre de 2026',
    cambios: [
      { titulo: 'Sincronización: cambia, copia o muda tu espacio de trabajo', texto: 'El menú Sincronización de Ajustes ya funciona. En «Espacios de trabajo» puedes cambiar a otra carpeta (como con el botón de la carpeta), copiar todo a otra carpeta para tener dos espacios con el mismo contenido sin empezar de cero, o mudarlo: es como cortar y pegar, se lleva todo a la carpeta nueva y se borran de la anterior los archivos de NoteApp.', tipos: ['visual', 'estructural'] },
      { titulo: 'Exportar e importar en un solo archivo', texto: 'En Ajustes › Sincronización › Exportar eliges qué guardar: una nota, una agenda, un diagrama, todas las de una ventana o todo. Sale un único archivo, con sus imágenes dentro, para tener una copia o enviarlo de una vez por mensajería. Al lado está Importar: si lo que traes se llama igual que algo tuyo, NoteApp te pregunta si guardas las dos (la importada con un número al final, como «Viajes (2)») o si sustituye a la tuya.', tipos: ['visual', 'estructural'] },
      { titulo: 'Historial de espacios de trabajo', texto: 'En Ajustes › Sincronización › Historial aparecen las carpetas que has ido abriendo. A cada una le puedes poner un título y apuntar su ruta para reconocerla, y con «Abrir» cambias a ella al momento.', tipos: ['visual'] },
      { titulo: 'Lista de entidades', texto: 'En Notas, a la izquierda del buscador del texto, hay un botón nuevo que abre una lista con las entidades: su nombre, su descripción, su valor y un botón para copiar su ruta o solo su nombre. Con los botones Agenda, Notas y Diagramas eliges dónde buscar (puedes activar varios) y, sin ninguno, ves las de la nota abierta. En su buscador, escribe un nombre o empieza con una barra (/) para elegir primero el título y después la hoja.', tipos: ['visual'] }
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
