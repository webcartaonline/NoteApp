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
    version: '3.5.1.0',
    fecha: '11 de noviembre de 2026',
    cambios: [
      { titulo: 'Pega imágenes en tus notas', texto: 'Copia una imagen (una captura de pantalla, una foto, una imagen de una web…) y pégala con Ctrl+V mientras escribes: aparece en su propia línea. Funciona en el texto de las hojas, en las entidades de texto y en las formas del Diagrama.', tipos: ['visual'] },
      { titulo: 'Tus imágenes, bien guardadas', texto: 'Las imágenes se guardan aparte para que las notas no pesen. Si tienes una carpeta conectada, también se guardan en ella, dentro de una carpeta «Imágenes», así las ves desde otro ordenador que abra esa misma carpeta.', tipos: ['estructural'] },
      { titulo: 'Cambia el tamaño y recorta tus imágenes', texto: 'En la vista para editar, cada imagen se ve debajo de su línea. Haz clic en ella y salen unos puntos: los de las esquinas la hacen más grande o más pequeña sin deformarla, y los de los lados la recortan. Con doble clic vuelve a su tamaño original, sin recorte.', tipos: ['visual'] },
      { titulo: 'Ordena tus notas', texto: 'Igual que con las hojas, al elegir una nota salen dos flechas pequeñas a los lados de su nombre, arriba. Púlsalas para moverla a la izquierda o a la derecha y dejar tus notas en el orden que quieras.', tipos: ['visual'] },
      { titulo: 'Novedades por colores', texto: 'En Ajustes › Actualizaciones, cada novedad lleva a su izquierda una raya de color según su tipo: verde para las mejoras visuales (lo que ves), azul para las estructurales (cambios por dentro) y naranja para las correcciones (arreglos). A la derecha tienes la leyenda de los colores. Si una novedad es de varios tipos a la vez, sale una sola vez, con una raya por cada tipo.', tipos: ['visual'] }
    ]
  },
  {
    version: '3.0.0.0',
    fecha: '9 de noviembre de 2026',
    cambios: [
      { titulo: 'Página de Ajustes', texto: 'El botón del engranaje, abajo a la izquierda, abre los Ajustes. De momento tienen dos apartados, Ayuda y Actualizaciones; los demás llegarán poco a poco.' },
      { titulo: 'Ayuda siempre a mano', texto: 'En Ajustes › Ayuda tienes guías con ejemplos de todo: el formato del texto, las entidades, la Agenda, el Diagrama, las herramientas y cómo se guarda todo. Puedes copiar cada ejemplo y pegarlo en una nota para probarlo.' },
      { titulo: 'Tu versión y su historial', texto: 'En Ajustes › Actualizaciones ves qué versión usas, puedes comprobar si ha salido una más nueva y repasar las novedades de las últimas versiones.' }
    ]
  },
  {
    version: '2.0',
    fecha: '9 de noviembre de 2026',
    cambios: [
      { titulo: 'Calculadora rápida', texto: 'Nuevo botón con forma de calculadora en la barra de la izquierda. Elige qué quieres saber (un porcentaje, cuántos clientes necesitas, cuánto te falta para una meta, el IVA, despejar la x…), rellena los datos y verás el resultado, la fórmula y cada paso de la cuenta explicado.' },
      { titulo: 'Historial de cálculos', texto: 'Guarda un cálculo con el botón «Guardar en el historial» o con la tecla Intro. Después puedes volver a abrirlo con sus números, por ejemplo para cambiar solo un dato.' },
      { titulo: 'Texto de color', texto: 'Escribe un texto entre guiones bajos, por ejemplo _importante_, y se verá en verde.' },
      { titulo: 'Elige cómo copiar', texto: 'El botón de copiar de un recuadro copiable te deja elegir: copiarlo en Markdown o tal cual está escrito.' }
    ]
  },
  {
    version: '1.1',
    fecha: '5 de noviembre de 2026',
    cambios: [
      { titulo: 'El cursor, en su sitio', texto: 'Al escribir dentro de una forma del diagrama, la barra que marca dónde escribes salía en otro lugar (por ejemplo, a la izquierda de la palabra en vez de al final). Ahora aparece justo detrás de la última letra que escribes.' },
      { titulo: 'Un cursor que se ve mejor', texto: 'La barra de escritura es más gruesa y de un verde más claro, en las notas, en los textos y en el diagrama, para que no la pierdas de vista.' }
    ]
  },
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
