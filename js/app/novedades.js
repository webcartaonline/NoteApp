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
    version: '5.2.1.1',
    fecha: '27 de noviembre de 2026',
    cambios: [
      { titulo: 'Barra de abajo de los campos, bien centrada', tipos: ['correccion'], texto: 'La barra para moverte a los lados entre varios campos de texto estaba casi pegada a los campos. Ahora queda justo en medio, con el mismo espacio por encima (hasta los campos) que por debajo (hasta el borde del recuadro gris).' }
    ]
  },
  {
    version: '5.2.1.0',
    fecha: '25 de noviembre de 2026',
    cambios: [
      { titulo: 'Corrector ortográfico', tipos: ['visual', 'estructural'], texto: 'NoteApp ahora subraya en rojo las palabras mal escritas del texto de tus hojas, con el diccionario de español. No corrige nada solo: haz clic derecho sobre una palabra subrayada y elige la buena en «Quisiste decir…» (por ejemplo, «ecsamen» → «examen»). Si la palabra está bien (un nombre, un pueblo…), pulsa «Añadir al diccionario» y no se volverá a marcar. Funciona sin internet, y en Ajustes › Ortografía puedes apagarlo y ver tus palabras.' }
    ]
  },
  {
    version: '5.1.0.0',
    fecha: '24 de noviembre de 2026',
    cambios: [
      { titulo: 'Más espacio para el texto en las hojas sin entidades', texto: 'Si una hoja de Notas no tiene ninguna entidad, ya no se guarda el hueco vacío de la derecha: los campos de texto ocupan todo el ancho. El último campo (con su copia limpia, si la tiene) se estira hasta el borde, y si solo hay uno, ocupa toda la hoja. Por ejemplo, una hoja solo con apuntes se lee a lo ancho. En cuanto añades una entidad, su columna vuelve a aparecer.', tipos: ['visual'] }
    ]
  },
  {
    version: '5.0.0.1',
    fecha: '24 de noviembre de 2026',
    cambios: [
      { titulo: 'Varios campos de texto en una misma hoja', texto: 'Encima del texto de cada hoja de Notas hay un circulito nuevo, a la derecha del botón de exportar. Al pulsarlo eliges «Crear nuevo campo» y aparece a la derecha otro campo de texto vacío, separado del primero, para organizar tus ideas desde cero sin crear otra hoja. Por ejemplo: escribes deprisa unas ideas en el primero y las pasas a limpio en el segundo. Puedes añadir todos los que quieras; si no caben, aparece una barra abajo para moverte a los lados.', tipos: ['visual', 'estructural'] },
      { titulo: 'Copia limpia: ve el resultado mientras escribes', texto: 'En el mismo menú, «Crear copia limpia» pone a la derecha de un campo otro pegado a él, unidos por una línea verde, que enseña siempre ese texto en vista limpia y al momento. Así escribes en la vista sucia y a la vez ves cómo queda. Los dos bajan y suben juntos y miden lo mismo (se ensanchan desde el borde de la copia). En la copia puedes marcar casillas y copiar.', tipos: ['visual', 'estructural'] },
      { titulo: 'Cada campo va por su cuenta', texto: 'Cada campo tiene su buscador, su botón de copiar y su botón de exportar, que solo tocan su texto (el archivo de un segundo campo se llama, por ejemplo, «Nota - Hoja (2).md»). El botón de ocultar las entidades deja a todo el ancho solo el campo donde lo pulsas y su copia limpia. Para quitar un campo añadido, usa «Eliminar campo» en su circulito.', tipos: ['visual', 'estructural'] },
      { titulo: 'Los campos cortados siguen redondeados', texto: 'Cuando te desplazas a los lados y un campo queda cortado por el borde, ese borde se ve con las esquinas redondeadas, igual que las suyas, en vez de un corte recto. Y la barra de desplazamiento de abajo es ahora igual de fina que las demás.', tipos: ['correccion'] }
    ]
  },
  {
    version: '4.9.5.3',
    fecha: '23 de noviembre de 2026',
    cambios: [
      { titulo: 'Ves en todo momento cómo va el cambio de carpeta', texto: 'En Ajustes › Sincronización, mientras cambias de espacio de trabajo, el recuadro de estado dice qué está haciendo NoteApp (guardar la carpeta anterior, leer la nueva o abrirla) y cuántos segundos lleva. Y cuando termina, el resultado se queda escrito ahí, para que lo leas con calma: antes solo salía unos segundos en un aviso de la esquina.', tipos: ['correccion'] }
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
