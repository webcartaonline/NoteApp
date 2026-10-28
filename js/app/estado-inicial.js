// Estado inicial de la app: notas y agenda de ejemplo (solo se usan si no hay datos guardados).
// Si hay datos guardados en el navegador, naLoad() los carga en su lugar.
function naEstadoInicial() {
  const mkTable = (name, cols, rows) => {
    const t = newEnt('table', name);
    t.cols = cols.map(([title, op]) => ({ id: uid('c'), title, op: op || null }));
    t.rows = rows.map(r => { const cells = {}; t.cols.forEach((c, i) => { cells[c.id] = r[i]; }); return { id: uid('r'), cells }; });
    return t;
  };
  const sep = title => ({ id: uid('e'), type: 'sep', title });
  const guiaEnt = [
    sep('Expresión'),
    newEnt('expr', 'Precio', { desc: 'Precio por unidad', expr: '12,5' }),
    newEnt('expr', 'Subtotal', { desc: 'Precio por unidades', expr: 'Precio * Unidades' }),
    sep('Interruptor'),
    newEnt('toggle', 'Envio', { desc: 'Envío a domicilio', on: true, expr: '4,95' }),
    sep('Lógica'),
    newEnt('logic', 'Descuento', { desc: '10 % si pasa de 50', a: 'Subtotal', cmp: '>=', b: '50', out: 'Subtotal * 0,1' }),
    newEnt('toggle', 'Plan_Estatico', { desc: 'Plan Estático', on: false }),
    newEnt('toggle', 'Plan_Basico', { desc: 'Plan Básico', on: true }),
    newEnt('toggle', 'Plan_Completo', { desc: 'Plan Completo', on: false }),
    newEnt('logic', 'Plan', { desc: 'Plan en uso', a: 'Plan_Estatico', cmp: '=', b: 'True', out: 'Estático', alts: [{ id: uid('b'), a: 'Plan_Basico', cmp: '=', b: 'True', out: 'Básico' }, { id: uid('b'), a: 'Plan_Completo', cmp: '=', b: 'True', out: 'Completo' }], els: 'Ninguno' }),
    sep('Deslizador'),
    newEnt('slider', 'Unidades', { desc: 'Unidades compradas', value: 4, min: '1', max: '10', decimals: false }),
    sep('Porcentaje'),
    newEnt('pct', 'IVA', { desc: 'IVA del subtotal', mode: 'part', pct: '21', total: 'Subtotal' }),
    sep('Tabla'),
    mkTable('Compra', [['Hecho'], ['Producto'], ['Importe', 'sum']], [['[True]', 'Pedido', '=Subtotal'], ['[True]', 'Envío', '=Envio'], ['[False]', 'Envoltorio', '3'], ['[True]', 'IVA', '=IVA']])
  ];
  const viaje = [
    sep('Gastos'),
    mkTable('Gastos', [['Pagado'], ['Concepto'], ['Importe', 'sum']], [['[True]', 'Vuelos', '180'], ['[True]', 'Hotel', '240'], ['[False]', 'Cena de despedida', '60'], ['[True]', 'Transporte', '=Taxi']]),
    newEnt('expr', 'Taxi', { desc: 'Taxis por trayecto', expr: '12 * 3' }),
    newEnt('toggle', 'Seguro', { desc: 'Seguro de viaje', on: true, expr: '25' }),
    sep('Reparto'),
    newEnt('slider', 'Personas', { desc: 'Personas que pagan', value: 3, min: '1', max: '8', decimals: false }),
    newEnt('expr', 'Por_Persona', { desc: 'Cada uno paga', expr: '(Gastos + Seguro) / Personas' }),
    newEnt('logic', 'En_Presupuesto', { desc: 'Máximo 200 por persona', a: 'Por_Persona', cmp: '<=', b: '200', out: '' }),
    sep('Extras'),
    newEnt('pct', 'Propina', { desc: 'Propina de la cena', mode: 'part', pct: '10', total: '60', part: '' }),
    newEnt('pct', 'Peso_Hotel', { desc: 'Peso del hotel en el total', mode: 'pct', part: '240', total: 'Gastos', pct: '', decimals: false })
  ];
  const sheets = [mkSheet('Guía de formato MKD', [
    "# Título de nivel 1",
    "## Título de nivel 2",
    "### Título de nivel 3",
    "#### Título de nivel 4",
    "##### Título de nivel 5",
    "###### Título de nivel 6",
    "Texto normal con **negrita**, *cursiva*, ***negrita en cursiva*** y ~~tachado~~.",
    "Con tres guiones o tres asteriscos solos en una línea se crea una línea separadora:",
    "---",
    "## Anotaciones",
    "> Esto es una anotación.",
    "> Varias líneas seguidas forman un solo bloque.",
    ">> Con dos símbolos, una anotación dentro de otra.",
    "> ### Dentro de una anotación también puedes poner títulos",
    "> - listas con **negrita**, *cursiva* o `código`",
    ">   - y subelementos",
    "> 1. listas numeradas",
    "> ---",
    "> y líneas separadoras.",
    "## Listas",
    "- Elemento de lista con guion",
    "* Elemento de lista con asterisco",
    "+ Elemento de lista con el símbolo más",
    "  - Subelemento con **negrita** (dos espacios por nivel)",
    "  - Otro subelemento",
    "- De vuelta al primer nivel",
    "3. La numeración empieza en el primer número",
    "1. y sigue sola aunque escribas otro",
    "1. tercer paso",
    "## Casillas",
    "[True] Casilla marcada",
    "[False] Casilla sin marcar",
    "[x] También marcada, al estilo Markdown",
    "[ ] También sin marcar",
    "- [x] Con guion delante, la casilla va dentro de una lista",
    "([True] Casilla con texto agrupado)",
    "([False] Mi_activador) Si el texto es un nombre sin espacios, la casilla se convierte en una entidad True/False con ese nombre: en la vista limpia se marca con un clic y ahora vale =Mi_activador.",
    "## Enlaces e imágenes",
    "Un enlace: [qué es Markdown](https://es.wikipedia.org/wiki/Markdown)",
    "![Logo de NoteApp](icons/icon-192.png)",
    "## Tablas",
    "| Producto | Precio |",
    "| --- | --- |",
    "| Pan | 1,20 |",
    "| Leche | 0,95 |",
    "## Código",
    "Código dentro de una frase: `=Subtotal` se ve tal cual, sin calcular.",
    "``",
    "Bloque de código.",
    "Aquí todo se ve tal cual: **sin negrita** y =Subtotal sin calcular.",
    "``",
    "## Cuadros copiables",
    "'Una línea lista para copiar'",
    "''",
    "Bloque de varias líneas.",
    "Las menciones se copian con su valor: =/Conoce NoteApp/Guía de entidades/Subtotal",
    "''",
    "## Menciones",
    "Escribe un igual pegado al nombre de una entidad de la misma hoja. Para una entidad de otra hoja o de otra nota, escribe su ruta: el subtotal vale =/Conoce NoteApp/Guía de entidades/Subtotal.",
    "Delante del igual no puede haber nada pegado, salvo \\* o \\~: **=/Conoce NoteApp/Guía de entidades/Subtotal** funciona, pero en 2+2=4 o en web.com/?id=5 no se crea ninguna mención.",
    "Mientras escribes el nombre de una entidad tras el igual, cada espacio se convierte en guion bajo. Pulsa Esc (o dos espacios seguidos) para terminar el nombre y seguir escribiendo con espacios normales.",
    "## Escapar",
    "Pon una barra \\\\ delante de un símbolo para que se vea tal cual: \\*sin cursiva\\*, \\=Subtotal, \\[True].",
    "\\# Esto no es un título",
    "\\'Casa' y 'Coche' no es una línea copiable"
  ]), mkSheet('Guía de entidades', [
    '# Guía de entidades',
    "Las entidades viven en el panel derecho y se añaden desde la barra lateral. Cada una tiene un **nombre único dentro de su hoja** y produce un valor que puedes citar en esa misma hoja escribiendo un igual delante de su nombre: por ejemplo, el subtotal vale *=Subtotal*. Desde otra hoja u otra nota se cita con su ruta (mira el final de esta guía).",
    '> Activa la vista sucia con el interruptor superior para editar nombres, descripciones y fórmulas. El botón de función alterna entre ver las entradas o la salida. El botón de al lado del interruptor oculta las entidades de la hoja para que el texto ocupe todo el ancho; vuelve a pulsarlo para verlas.',
    '## Expresión',
    'Calcula operaciones con suma, resta, multiplicación, división y paréntesis. Admite números y otras entidades por su nombre. Aquí, Precio por Unidades da **=Subtotal**. Los números van al estilo europeo: la coma separa los decimales y el punto, si quieres, los miles (10.000.000,5). Los resultados también se muestran así.',
    'El icono de comillas, junto al nombre, activa o quita los decimales. Está en todas las entidades que pueden dar números (expresión, tabla, interruptor con fórmula, lógica, deslizador y porcentaje): si lo apagas, el resultado se redondea, por ejemplo 5,3 clientes pasa a 5.',
    '## Interruptor',
    'Una casilla que vale True o False. Si le das una fórmula, devuelve ese valor cuando está activa y 0 cuando no. El envío suma ahora **=Envio**.',
    '## Lógica',
    'Compara dos datos (igual, distinto, menor, mayor, menor o igual, mayor o igual). Sin salida devuelve True o False; con salida, devuelve ese valor si se cumple y, si no, el de la fila «si no» (0 por defecto). El descuento es **=Descuento**.',
    'Con el botón + añades casos «si no, si»: gana el primero que se cumple. Haz clic en un caso para cambiar su comparación. Las salidas admiten texto, números, fórmulas u otras entidades; usa comillas si un texto coincide con un nombre. Marca otro plan y el texto cambia solo.',
    'Plan en uso: **=Plan**',
    '## Deslizador',
    'Elige un valor arrastrando entre un mínimo y un máximo, que también pueden ser fórmulas. El icono de comillas activa o quita los decimales. Ahora hay **=Unidades** unidades: muévelo y mira cómo cambia todo.',
    '## Porcentaje',
    'Resuelve el hueco que elijas en la frase «El A% de B es X»: la parte, el porcentaje o el total. El IVA del subtotal es **=IVA**.',
    '## Tabla',
    'Filas y columnas con texto, números, casillas o menciones. Una columna puede sumar, restar, multiplicar o dividir, y su resultado es el valor de la tabla. Las filas con una casilla en False se tachan y no cuentan. La compra suma **=Compra**.',
    '## Separador',
    'Un título entre líneas que ordena el panel en secciones. El botón de la T grande, a la izquierda del menú, destaca el título más grande y en verde. Si dejas el título vacío, el separador se convierte en un espacio en blanco. No produce ningún valor.',
    "## Rutas: entidades de otras hojas y notas",
    "Para citar una entidad de otra hoja o de otra nota, escribe un igual seguido de su ruta: \\=/Nota/Hoja/Entidad. Cada barra va pegada al nombre que la sigue. La nota y la hoja se escriben con su nombre original, con espacios si los tienen; la entidad no lleva espacios, así que la ruta termina en el primer espacio tras su nombre. El precio de esta guía vale =/Conoce NoteApp/Guía de entidades/Precio.",
    "Funciona igual con la Agenda: el vuelo sale el **=/Viajes/Lisboa/Vuelo_Lisboa**. Si en Notas y en Agenda hay notas con el mismo nombre, se usa la de la ventana en la que escribes la ruta."
  ], guiaEnt), mkSheet('Demostración', [
    '# Viaje a Lisboa',
    'Llevamos gastados =Gastos euros entre **=Personas personas**, así que cada uno pone *=Por_Persona* euros.',
    '¿Seguimos dentro del presupuesto? **=En_Presupuesto**',
    '## Pendientes',
    '([True] Reservar vuelos)',
    '([True] Pagar el hotel)',
    '([False] Reservar la cena de despedida)',
    'Seguro contratado: [True]',
    '---',
    '## Resumen para el grupo',
    '> El hotel supone el =Peso_Hotel % del gasto total.',
    '> Si añadimos la cena, la propina sería de =Propina euros.',
    'Faltan =/Viajes/Lisboa/Faltan_Vuelo días para el vuelo: **=/Viajes/Lisboa/Aviso_Maleta**',
    "''",
    'Total del viaje: =Gastos euros',
    'Seguro: =Seguro euros',
    'Por persona: =Por_Persona euros',
    "''"
  ], viaje)];
  const notes = [{ id: uid('n'), name: 'Conoce NoteApp', sheets, activeSheet: sheets[0].id }];
  const inDays = k => { const d = new Date(); d.setDate(d.getDate() + k); return ymd(d); };
  const lis = mkSheet('Lisboa', [''], [
    sep('Vuelo'),
    newEnt('date', 'Vuelo_Lisboa', { desc: 'Salida del vuelo', date: inDays(12), time: '07:45' }),
    newEnt('count', 'Faltan_Vuelo', { desc: 'Cuenta atrás del vuelo', target: 'Vuelo_Lisboa', unit: 'd' }),
    newEnt('notif', 'Aviso_Checkin', { desc: 'Check-in online', target: 'Vuelo_Lisboa', d: '1', msg: 'Haz el check-in y descarga la tarjeta de embarque.' }),
    sep('Equipaje'),
    { id: uid('e'), type: 'text', lines: mkLines(['## Antes de salir', '- Pasaporte y DNI', '- Cargador y adaptador', 'Faltan **=Faltan_Vuelo días**: =Aviso_Maleta']) },
    newEnt('toggle', 'Maleta_Hecha', { desc: 'Maleta preparada', on: false }),
    newEnt('logic', 'Aviso_Maleta', { desc: 'Recordatorio', a: 'Maleta_Hecha', cmp: '=', b: 'True', out: 'Todo listo', alts: [{ id: uid('b'), a: 'Faltan_Vuelo', cmp: '<=', b: '2', out: '¡Haz la maleta!' }], els: 'Hay tiempo' }),
    newEnt('logic', 'Presupuesto', { desc: 'Estado del presupuesto', a: '=/Conoce NoteApp/Demostración/En_Presupuesto', cmp: '=', b: 'True', out: 'Dentro del presupuesto', els: 'Revisar gastos' })
  ]), pag = mkSheet('Pagos', [''], [
    newEnt('date', 'Pago_Hotel', { desc: 'Límite para pagar el hotel', date: inDays(4), time: '23:59' }),
    newEnt('count', 'Plazo_Hotel', { desc: 'Tiempo para pagar el hotel', target: 'Pago_Hotel', unit: 'txt' }),
    newEnt('notif', 'Aviso_Pago', { desc: 'Pagar el hotel', target: 'Pago_Hotel', d: '', h: '12' })
  ]);
  const anotes = [{ id: uid('n'), name: 'Viajes', sheets: [lis, pag], activeSheet: lis.id }];
  return naLoad({ wins: { agenda: { notes: anotes, activeNote: anotes[0].id }, diagrama: naEjemplo('diagrama') }, calView: {}, now: Date.now(), lsel: {}, copied: null, search: null, exported: null, entMenu: null, field: null, colMenu: null, menu: false, mode: 'notas', notes, activeNote: notes[0].id, editing: null, draft: '', dragging: false, clean: true, focusId: null, config: { mkdV2: true }, fs: 'off', fsName: '' });
}

// Ejemplo de la ventana Diagrama (también se crea si los datos guardados son de antes de esta ventana).
// Devuelve { notes, activeNote } de la ventana pedida (solo hay ejemplo para 'diagrama').
function naEjemplo(win) {
  if (win !== 'diagrama') return { notes: [], activeNote: null };
  const N = (shape, x, y, w, h, text, color) => dgNode(shape, x, y, text, Object.assign({ w, h }, color ? { color } : {}));
  const E = (a, b, label, extra) => dgEdge(a.id, b.id, Object.assign({ label: label || '' }, extra || {}));
  // Hoja 1: guía (un pequeño diagrama de flujo que explica cómo se usa)
  const g1 = N('inicio', 60, 40, 220, 56, '**Empieza aquí**');
  const g2 = N('proceso', 40, 150, 260, 90, 'Añade formas con los botones de la **barra lateral**');
  const g3 = N('proceso', 40, 300, 260, 100, 'Arrastra desde un **punto verde** de una forma hasta otra para conectarlas');
  const g4 = N('decision', 30, 450, 280, 150, '¿La sueltas en un hueco?');
  const g5 = N('proceso', 400, 480, 240, 90, 'Se crea una forma nueva **ya conectada**', 'verde');
  const g6 = N('proceso', 40, 680, 260, 90, 'Se conecta con la forma donde la sueltes');
  const g7 = N('nota', 720, 40, 340, 310, ['### Editar', '- **Vista sucia**: editar · **vista limpia**: solo mirar', '- **Doble clic**: escribir en una forma (formato MKD)', '- **Arrastrar**: mover · **Mayús + clic**: elegir varias', '- **Supr**: borrar · **Ctrl+D**: duplicar', '- **Ctrl+Z / Ctrl+Y**: deshacer / rehacer']);
  const g8 = N('nota', 720, 390, 340, 190, ['### Moverse por el lienzo', '- Arrastra el fondo para desplazarte', '- **Ctrl + rueda**: zoom', '- **Ajustar** (abajo a la derecha): verlo todo'], 'azul');
  const g9 = N('nota', 720, 620, 340, 230, ['### Menciones', 'Las formas pueden mostrar entidades de Notas y Agenda: cada persona paga **=/Conoce NoteApp/Demostración/Por_Persona** €.', 'Selecciona una forma y pulsa **=** para buscarlas.'], 'verde');
  const guia = mkDiagSheet('Guía', [g1, g2, g3, g4, g5, g6, g7, g8, g9], [E(g1, g2), E(g2, g3), E(g3, g4), E(g4, g5, 'Sí'), E(g4, g6, 'No')]);
  // Hoja 2: ejemplo con menciones a la nota «Conoce NoteApp» y a la agenda «Viajes»
  const z = N('zona', 20, 20, 700, 770, '#### Viaje a Lisboa');
  const v1 = N('inicio', 60, 80, 220, 56, 'Preparar el viaje');
  const v2 = N('proceso', 40, 190, 260, 90, 'Gasto por persona: **=/Conoce NoteApp/Demostración/Por_Persona €**');
  const v3 = N('decision', 30, 340, 280, 150, ['¿Cabe en el presupuesto?', '=/Conoce NoteApp/Demostración/En_Presupuesto']);
  const v4 = N('proceso', 400, 375, 260, 80, 'Revisar los gastos', 'rojo');
  const v5 = N('proceso', 40, 560, 260, 80, 'Reservar vuelo y hotel', 'verde');
  const v6 = N('inicio', 60, 700, 220, 56, 'Listo para viajar');
  const v7 = N('dato', 770, 560, 300, 80, 'Faltan **=/Viajes/Lisboa/Faltan_Vuelo** días para el vuelo');
  const v8 = N('nota', 770, 330, 300, 130, ['La agenda dice:', '**=/Viajes/Lisboa/Presupuesto**']);
  const ej = mkDiagSheet('Ejemplo: viaje', [z, v1, v2, v3, v4, v5, v6, v7, v8], [E(v1, v2), E(v2, v3), E(v3, v4, 'No'), E(v4, v2, 'Ajustar', { dash: true }), E(v3, v5, 'Sí'), E(v5, v6), E(v5, v7, 'Cuenta atrás', { dash: true, head: 'none' })]);
  guia.view = { x: 30, y: 20, z: 0.8 }; ej.view = { x: 30, y: 20, z: 0.8 };
  const notes = [{ id: uid('n'), name: 'Conoce Diagrama', sheets: [guia, ej], activeSheet: guia.id }];
  return { notes, activeNote: notes[0].id };
}
