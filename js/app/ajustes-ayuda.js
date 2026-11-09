// Menú Ayuda de la página de Ajustes (componente componentes/ajustes-ayuda/). Las guías van en el código (no en
// las notas guardadas), así que cualquiera las ve desde cualquier dispositivo, tenga las notas que tenga.
//
// CÓMO ESTÁ ORGANIZADO: AYUDA es la lista de secciones (salen arriba a la derecha, en este orden). Cada sección:
//   { id, nombre (pestaña), titulo, intro (texto normal), temas: [...] }
// y cada tema:
//   { t: título, ic: icono de assets/ (sin .svg, opcional),
//     p: líneas de texto en formato MKD,
//     ficha: [[dato, valor], ...] (opcional, p. ej. nombre / fórmula / resultado de una entidad),
//     ej: líneas MKD de ejemplo (opcional): se enseñan tal cual («Escribes») y dibujadas («Se ve así»),
//     nota: líneas de un truco (opcional; se dibujan como anotación > ) }
// Todo el texto se dibuja con el motor MKD de las notas, así que ojo con los símbolos en el texto normal:
// un igual pegado a un nombre es una mención, '…' es un copiable, _…_ es color, [x] es una casilla…
// Para enseñar un símbolo tal cual, ponlo entre comillas invertidas (`=Precio`) o con \ delante.
// Las menciones de los ejemplos usan las entidades de AY_ENTS (hoja «Compra» de la nota «Mi nota»).
const AYUDA = [
  {
    id: 'inicio', nombre: 'Primeros pasos', titulo: 'Primeros pasos',
    intro: 'NoteApp sirve para tomar notas que hacen cuentas solas, organizar fechas y avisos y dibujar esquemas. Empieza por aquí y ve pasando de sección en sección, a tu ritmo.',
    temas: [
      { t: 'Las tres ventanas', p: [
        'Arriba a la izquierda hay un selector con tres posiciones. Cada una es una ventana con sus propias notas:',
        '- **Agenda**: fechas, cuentas atrás y avisos.',
        '- **Notas**: texto con formato y entidades que hacen cálculos.',
        '- **Diagrama**: esquemas con formas unidas por flechas.',
        'Lo que haces en una ventana no cambia las otras, aunque puedes usar los datos de una en otra.'
      ] },
      { t: 'Notas y hojas', p: [
        'Una **nota** es como un cuaderno y sus **hojas** son las páginas. Las notas son las pestañas de arriba y las hojas, las de la barra gris.',
        '- El **+** de arriba crea una nota nueva y el de la barra gris, una hoja nueva.',
        '- **Doble clic** en una pestaña para cambiarle el nombre. Intro para terminar, Esc para cancelar.',
        '- Al elegir una hoja salen dos flechas pequeñas a sus lados para moverla a la izquierda o a la derecha.',
        '- El **punto gris** a la derecha de las hojas abre las opciones para eliminar la hoja o la nota. Antes te pide confirmación, porque no se puede deshacer.'
      ] },
      { t: 'Vista limpia y vista sucia', p: [
        'El interruptor de la barra gris cambia la forma de ver la hoja:',
        '- **Vista limpia**, para leer: ves el resultado, con los títulos, las negritas y los valores ya calculados. Las casillas se marcan con un clic.',
        '- **Vista sucia**, para editar: ves el texto tal cual lo escribes, con sus símbolos, y puedes cambiar los nombres, descripciones y fórmulas de las entidades.'
      ], ej: [
        '## Lista de la compra',
        '- **Pan** y leche',
        '[x] Pagado',
        'Total: =Subtotal €'
      ], nota: ['**Truco:** en la vista sucia ves lo de la izquierda; en la limpia, lo de la derecha.'] },
      { t: 'Texto y entidades', p: [
        'En Notas, cada hoja tiene dos partes: a la izquierda el **texto** y a la derecha el panel de **entidades**. Una entidad es una pieza que guarda o calcula un dato: un precio, un total, un sí o no…',
        'Las entidades se añaden con los botones de la barra lateral y se citan en el texto con un igual pegado a su nombre. Si el dato cambia, el texto se actualiza solo.'
      ], ej: [
        'Precio: =Precio €',
        'Unidades: =Unidades',
        '**Total: =Subtotal €**'
      ], nota: ['Arrastra el borde entre el texto y las entidades para cambiar el ancho. Con doble clic vuelve a su tamaño.'] },
      { t: 'La barra lateral', p: [
        'Los botones de la izquierda cambian según la ventana: en Notas añaden entidades, en la Agenda entidades de fechas y en Diagrama formas. Pasa el ratón por encima de un botón para ver su nombre.',
        'Abajo están siempre estos tres:'
      ], ficha: [
        ['Calculadora', 'Cuentas paso a paso, con historial'],
        ['Carpeta', 'Dónde se guarda todo en tu ordenador'],
        ['Ajustes', 'Esta página: ayuda y versión de la app']
      ] },
      { t: 'Todo se guarda solo', p: [
        'No hay botón de guardar: cada cambio se guarda al momento en este navegador.',
        'Para tener tus notas también en tu ordenador (y no perderlas si se borran los datos del navegador), conecta una carpeta con el botón de la carpeta. Lo tienes explicado en la sección **Guardado**.'
      ] }
    ]
  },
  {
    id: 'mkd', nombre: 'Campo MKD', titulo: 'Campo de texto MKD',
    intro: 'El texto de las hojas usa MKD, un formato inspirado en Markdown: unos pocos símbolos dan forma al texto. Los símbolos se escriben en la vista sucia y en la vista limpia ves el resultado. Puedes copiar cada ejemplo y pegarlo en una nota para probarlo.',
    temas: [
      { t: 'Títulos', ic: 'texto-grande', p: [
        'Empieza la línea con una almohadilla `#` y un espacio. Cuantas más almohadillas, más pequeño es el título (hasta seis).'
      ], ej: ['# Título grande', '## Título mediano', '### Título pequeño', 'Texto normal'] },
      { t: 'Negrita, cursiva, tachado y color', ic: 'texto', p: [
        'Rodea el texto con estos símbolos, sin espacios por dentro:',
        '- `**texto**` para la **negrita** y `*texto*` para la *cursiva*.',
        '- `~~texto~~` para el ~~tachado~~.',
        '- `_texto_` para el _color_.'
      ], ej: [
        '**Negrita**, *cursiva* y ***las dos***',
        '~~Tachado~~ y _en color_',
        'Se combinan: **_negrita en color_**'
      ], nota: ['Los nombres con guion bajo en medio, como `Por_Persona`, nunca se colorean.'] },
      { t: 'Listas', p: [
        'Empieza la línea con un guion `-` y un espacio (también valen `*` y `+`). Para una lista numerada, escribe un número y un punto: `1.`',
        'Pon dos espacios delante para hacer un subnivel.'
      ], ej: ['- Pan', '- Leche', '  - Desnatada', '1. Primer paso', '1. Segundo paso'],
        nota: ['La numeración sigue sola: aunque escribas siempre `1.`, verás 1, 2, 3…'] },
      { t: 'Casillas', ic: 'boton-de-radio', p: [
        '`[x]` o `[True]` es una casilla marcada; `[ ]` o `[False]`, una sin marcar. Puedes ponerlas al principio de una línea o dentro de una lista.',
        'En la vista limpia se marcan y desmarcan con un clic. Prueba con las del ejemplo.'
      ], ej: ['[x] Comprar pan', '[ ] Llamar al banco', '- [ ] Dentro de una lista'] },
      { t: 'Casillas con nombre', ic: 'boton-de-radio', p: [
        'Si escribes una casilla y un nombre sin espacios entre paréntesis, la casilla se convierte en una **entidad True/False** con ese nombre.',
        'Puedes citarla con un igual delante, como cualquier entidad, y usarla en fórmulas (marcada vale 1 y sin marcar, 0). En la vista limpia solo se ve la casilla; el nombre sale al pasar el ratón.'
      ], ej: ['([True] Con_envio) Añadir gastos de envío', '¿Con envío? **=Con_envio**'],
        nota: ['Marca y desmarca la casilla del ejemplo: el valor de abajo cambia solo.'] },
      { t: 'Anotaciones', ic: 'cita-cuadrada', p: [
        'Una línea que empieza por `>` es una anotación: un recuadro con una raya verde, ideal para avisos o resúmenes. Varias líneas seguidas forman un solo bloque.',
        'Con `>>` haces una anotación dentro de otra. Dentro también funcionan los títulos, las listas y la línea separadora.'
      ], ej: ['> **Recuerda:** pagar el alquiler', '> - Antes del día 5', '>> Una nota dentro de la nota'] },
      { t: 'Línea separadora', p: [
        'Tres guiones `---` solos en una línea dibujan una línea que separa partes del texto. También vale `***`.'
      ], ej: ['Arriba', '---', 'Abajo'] },
      { t: 'Enlaces e imágenes', p: [
        'Para un enlace, escribe el texto entre corchetes y, pegada, la dirección entre paréntesis. Para una imagen, lo mismo con una exclamación delante.'
      ], ej: ['[Abrir Wikipedia](https://es.wikipedia.org)', '![Logo de NoteApp](icons/icon-192.png)'] },
      { t: 'Tablas', ic: 'lista-de-tablas', p: [
        'Separa las columnas con barras verticales `|`. La segunda fila, hecha de guiones, separa los títulos del resto.',
        'Dentro de una celda funcionan la negrita, las menciones, las casillas, los copiables…'
      ], ej: ['| Producto | Precio |', '| --- | ---: |', '| Pan | 1,20 |', '| Leche | 0,95 |', '| Precio del día | **=Precio** |'],
        nota: ['Con dos puntos en la fila de guiones eliges la alineación: `:---` a la izquierda, `:---:` al centro y `---:` a la derecha.'] },
      { t: 'Código', p: [
        'Entre comillas invertidas el texto se ve tal cual: sin formato y sin calcular las menciones. Va bien para fórmulas, comandos o símbolos.',
        'Para varias líneas, abre y cierra el bloque con dos comillas invertidas solas en su línea.'
      ], ej: ['La fórmula es `Precio * Unidades`', '``', 'Bloque de código:', '**sin negrita** y =Precio sin calcular', '``'] },
      { t: 'Copiables', ic: 'clon', p: [
        'Entre comillas simples, el texto sale en un recuadro con un botón para copiarlo de un clic: perfecto para claves, números de cuenta o direcciones.',
        'Si toda la línea va entre comillas, el recuadro ocupa la línea. Para un bloque de varias líneas, ábrelo y ciérralo con dos comillas simples solas en su línea.',
        'Al pulsar copiar eliges: **Copiar Markdown** (como se ve) o **Copiado literal** (tal cual está escrito).'
      ], ej: ["'ES12 3456 7890 1234'", "La clave del wifi es 'casa-2026' y no caduca.", "''", '**Datos de envío**', 'Calle Mayor 1, Murcia', "''"],
        nota: ["Un apóstrofo, como en don't o en l'aigua, nunca crea un copiable."] },
      { t: 'Menciones', ic: 'funcion', p: [
        'Escribe un igual pegado al nombre de una entidad y verás su valor, que se actualiza solo cuando cambia. Por ejemplo, `=Precio`.',
        'Para una entidad de otra hoja o de otra nota, escribe su ruta: `=/Nota/Hoja/Entidad`. Así puedes usar también datos de la Agenda en Notas, y al revés.',
        'Delante del igual no puede haber nada pegado: en `2+2=4` o en una dirección web no se crea ninguna mención.'
      ], ej: ['Precio: =Precio €', 'Total: **=Subtotal €**', 'Desde otra hoja: =/Mi nota/Compra/Subtotal €'],
        nota: ['Mientras escribes el nombre tras el igual, cada espacio se convierte en guion bajo. Pulsa Esc, o dos espacios seguidos, para terminar el nombre.'] },
      { t: 'Combinar formatos', p: [
        'Los formatos de línea se pueden juntar: un título numerado, una anotación dentro de un punto de lista o un punto de lista dentro de una anotación.'
      ], ej: ['1. ## Un título numerado', '- > Una anotación dentro de un punto', '> - Un punto dentro de una anotación'] },
      { t: 'Escribir los símbolos tal cual', p: [
        'Si quieres ver un símbolo sin que haga nada, pon una barra invertida delante. La barra no se ve.'
      ], ej: ['\\*sin cursiva\\*', '\\# No es un título', '\\=Precio no es una mención', '\\[x] no es una casilla'] }
    ]
  },
  {
    id: 'entidades', nombre: 'Entidades', titulo: 'Entidades',
    intro: 'Las entidades son piezas que guardan o calculan un dato. Viven en el panel de la derecha de cada hoja de Notas y se añaden con los botones de la barra lateral. Cada una tiene un nombre, único en su hoja: con él la citas en el texto o la usas en las fórmulas de otras entidades.',
    temas: [
      { t: 'Cómo se usan', p: [
        '1. Pulsa el botón de la entidad en la barra lateral: aparece en el panel de la derecha.',
        '1. En la **vista sucia**, haz doble clic en su nombre para cambiarlo y rellena su descripción y su fórmula.',
        '1. Cítala en el texto con un igual pegado a su nombre.',
        'El punto de cada entidad abre sus opciones: duplicarla o borrarla. Si le cambias el nombre, todo lo que la cita se actualiza solo, también en otras hojas y notas.'
      ], ej: ['El subtotal es **=Subtotal €**'],
        nota: ['El botón **fx** de cada entidad, en la vista sucia, cambia entre ver sus datos o solo su resultado.'] },
      { t: 'Expresión', ic: 'entrada-numerica', p: [
        'Hace una cuenta con `+` (sumar), `-` (restar), `*` (multiplicar), `/` (dividir) y paréntesis. Puede usar números y otras entidades por su nombre.',
        'Como en una calculadora, primero se multiplica y divide, y después se suma y resta: `2 + 3 * 4` da 14.'
      ], ficha: [['Nombre', 'Subtotal'], ['Fórmula', 'Precio * Unidades'], ['Resultado', '50 (12,5 × 4)']],
        nota: ['Los números van al estilo español: coma para los decimales y, si quieres, punto para los miles (`10.000,5`).'] },
      { t: 'Interruptor', ic: 'boton-de-radio', p: [
        'Una casilla que vale **True** (activada) o **False** (apagada). Sirve para decir sí o no: ¿lleva envío?, ¿está pagado?',
        'Si le escribes una fórmula, activado vale el resultado de la fórmula y apagado vale 0.'
      ], ficha: [['Nombre', 'Envio'], ['Fórmula', '4,95'], ['Activado', '4,95'], ['Apagado', '0']] },
      { t: 'Lógica', ic: 'rama-de-codigo', p: [
        'Compara dos datos: igual, distinto, mayor, menor, mayor o igual, menor o igual.',
        '- Sin salida, dice **True** si se cumple y **False** si no.',
        '- Con salida, da ese valor si se cumple y, si no, el de la fila «si no» (0 si la dejas vacía).',
        'Con el botón **+** añades más casos «si no, si»: gana el primero que se cumple. Las salidas pueden ser números, fórmulas, otras entidades o texto.'
      ], ficha: [['Si', 'Subtotal >= 50'], ['Entonces', 'Subtotal * 0,1'], ['Si no', '0'], ['Resultado', '5 (un 10 % de descuento)']] },
      { t: 'Deslizador', ic: 'agregar-barra', p: [
        'Eliges un valor arrastrando entre un mínimo y un máximo (que también pueden ser fórmulas). Muy útil para probar «¿y si…?»: muévelo y mira cómo cambia todo lo que depende de él.'
      ], ficha: [['Mínimo', '1'], ['Máximo', '10'], ['Valor', '4']] },
      { t: 'Porcentaje', ic: 'porcentaje', p: [
        'Resuelve la frase «El A % de B es X». Eliges qué hueco quieres calcular: la parte, el porcentaje o el total.'
      ], ficha: [['El', '21 %'], ['de', 'Subtotal (50)'], ['es', '10,5']] },
      { t: 'Tabla', ic: 'lista-de-tablas', p: [
        'Filas y columnas con texto, números, casillas o menciones. Los **+** para añadir filas y columnas aparecen al acercar el ratón al borde de la tabla.',
        'En las opciones de una columna eliges si suma, resta, multiplica o divide; ese resultado es el valor de la tabla. Las filas con una casilla en False se tachan y no cuentan.',
        'Dentro de cada celda funciona el formato MKD.'
      ], ficha: [['Hecho', '[True] · [True] · [False]'], ['Importe (suma)', '10 · 5 · 3'], ['Resultado', '15 (la fila sin marcar no cuenta)']] },
      { t: 'Separador', ic: 'texto-grande', p: [
        'Un título entre líneas que ordena el panel en partes. No da ningún valor.',
        '- El botón de la **T grande**, a la izquierda de su menú, hace el título más grande y verde.',
        '- Si dejas el título vacío, se convierte en un espacio en blanco.'
      ] },
      { t: 'Decimales', ic: 'cita-cuadrada', p: [
        'El botón de comillas, junto al nombre (en la vista sucia), activa o quita los decimales. Si lo apagas, el resultado se redondea: 5,3 clientes pasa a 5.',
        'Está en todas las entidades que dan números: expresión, tabla, interruptor con fórmula, lógica, deslizador y porcentaje.'
      ] },
      { t: 'Entidades de otras hojas', ic: 'funcion', p: [
        'Una mención normal solo busca en la misma hoja. Para una entidad de otra hoja o de otra nota, escribe su **ruta**: un igual y, después, la nota, la hoja y la entidad, cada una con una barra delante.',
        'La nota y la hoja se escriben con su nombre tal cual, con espacios si los tienen. Las rutas funcionan en el texto y en las fórmulas, y sirven también para usar datos de la Agenda.'
      ], ej: ['Total de la compra: =/Mi nota/Compra/Subtotal €'] }
    ]
  },
  {
    id: 'agenda', nombre: 'Agenda', titulo: 'Agenda',
    intro: 'La Agenda funciona como Notas (notas, hojas, vista limpia y sucia), pero sus entidades son para el tiempo: cuándo es algo, cuánto falta y cuándo avisarte. Se añaden con los botones de la barra lateral.',
    temas: [
      { t: 'Calendario', ic: 'lineas-de-calendario', p: [
        'Guarda una fecha y una hora. Elige el día con un clic en el calendario y cambia de mes con las flechas. El botón **Hoy** vuelve al día de hoy.',
        'Con **Desde – hasta** guardas un periodo: doble clic en el día de inicio y doble clic en el de fin. También puedes poner un horario, con hora de inicio y de fin.'
      ], ficha: [['Nombre', 'Vuelo_Lisboa'], ['Fecha', '21 de noviembre, 07:45']] },
      { t: 'Contador', ic: 'reloj', p: [
        'Una cuenta atrás: escribe el nombre de un calendario (o su ruta) y verás los días, horas, minutos y segundos que faltan. Cuando la fecha pasa, cuenta el tiempo que ha pasado.',
        '- **Salida**: en días, horas, minutos o como texto.',
        '- **Referencia**: de hoy al inicio, de hoy al fin o, en un periodo, cuánto dura.'
      ], ficha: [['Fecha', 'Vuelo_Lisboa'], ['Se ve', '12 días · 05 horas · 30 minutos · 10 segundos'], ['Vale', '12 (en días)']] },
      { t: 'Notificación', ic: 'campana', p: [
        'Te avisa antes de una fecha, por ejemplo un día antes del vuelo.',
        '- **Entidad**: toma la fecha de un calendario o de una ruta. **Manual**: la escribes tú.',
        '- Pon cuántos días, horas o minutos antes quieres el aviso y, si quieres, un mensaje.',
        '- **Probar aviso** lo lanza al momento para ver cómo queda.'
      ], nota: ['La primera vez, el navegador te pedirá permiso para mostrar avisos. Los avisos saltan mientras NoteApp está abierta.'] },
      { t: 'Casilla True/False', ic: 'boton-de-radio', p: [
        'Es el mismo interruptor de Notas: un sí o no que puedes usar en otras entidades, como «Maleta hecha» o «Pagado».'
      ] },
      { t: 'Lógica', ic: 'rama-de-codigo', p: [
        'Igual que en Notas. En la Agenda va muy bien para mensajes que cambian solos con el tiempo.'
      ], ficha: [['Si', 'Maleta_Hecha = True'], ['Entonces', 'Todo listo'], ['Si no, si', 'Faltan_Vuelo <= 2  →  ¡Haz la maleta!'], ['Si no', 'Hay tiempo']] },
      { t: 'Texto', ic: 'texto', p: [
        'Un bloque de texto con formato MKD dentro del panel, para tener notas junto a tus fechas. Puede citar entidades, igual que el texto de una hoja.'
      ] },
      { t: 'Separador', ic: 'texto-grande', p: [
        'Igual que en Notas: un título que ordena el panel en partes, o un espacio en blanco si lo dejas sin título.'
      ] },
      { t: 'Fechas en Notas y Diagrama', ic: 'funcion', p: [
        'Las entidades de la Agenda se pueden citar desde Notas o Diagrama con su ruta, por ejemplo `=/Viajes/Lisboa/Faltan_Vuelo`. Así una nota puede decir cuántos días faltan para algo.'
      ] }
    ]
  },
  {
    id: 'diagrama', nombre: 'Diagrama', titulo: 'Diagrama',
    intro: 'En Diagrama dibujas esquemas: formas con texto unidas por flechas. Sirve para estudiar, planificar un proceso o decidir qué hacer en cada caso. Para editar usa la vista sucia; la vista limpia es solo para mirar.',
    temas: [
      { t: 'Formas', ic: 'forma-proceso', p: [
        'Añádelas con los botones de la barra lateral o con doble clic en el fondo:',
        '- **Proceso**: un paso o una acción.',
        '- **Decisión** (rombo): una pregunta con varias salidas, como Sí o No.',
        '- **Inicio / fin**: dónde empieza y dónde acaba.',
        '- **Dato**: algo que entra o sale, como un documento o un número.',
        '- **Nota**: un comentario al margen.',
        '- **Texto libre**: texto sin borde.',
        '- **Zona**: un recuadro que agrupa formas; al moverla, se mueven las de dentro.'
      ] },
      { t: 'Conectar formas', ic: 'diagrama', p: [
        'Selecciona una forma y arrastra desde uno de sus **puntos verdes** hasta otra forma. Si lo sueltas en un hueco, se crea una forma nueva ya conectada.',
        'Al seleccionar una flecha puedes ponerle una etiqueta (como Sí o No), hacerla discontinua, cambiar sus puntas o darle la vuelta.'
      ] },
      { t: 'Escribir y cambiar formas', ic: 'forma-texto', p: [
        '**Doble clic** en una forma para escribir en ella: admite el formato MKD y las menciones.',
        'Con una forma seleccionada aparece su barra: colores, cambiar de forma, editar el texto, buscar menciones (botón **=**), duplicar y borrar.',
        'El **cuadrado verde** de la esquina cambia su tamaño. Si el texto no cabe, la forma crece sola.'
      ] },
      { t: 'Moverse por el lienzo', p: [
        '- Arrastra el fondo, o usa la rueda del ratón, para desplazarte.',
        '- **Ctrl + rueda** acerca o aleja.',
        '- **Ajustar**, abajo a la derecha, encuadra todo el diagrama.',
        '- **Mayús + clic** elige varias formas y **Mayús + arrastrar** el fondo las elige con un recuadro.'
      ] },
      { t: 'Atajos de teclado', ficha: [
        ['Supr', 'Borrar lo elegido'],
        ['Ctrl + Z / Ctrl + Y', 'Deshacer / rehacer'],
        ['Ctrl + D', 'Duplicar'],
        ['Ctrl + A', 'Elegir todo'],
        ['Intro o F2', 'Escribir en la forma'],
        ['Flechas', 'Mover (con Mayús, más deprisa)'],
        ['Esc', 'Salir o quitar la selección']
      ] },
      { t: 'Datos de Notas y Agenda', ic: 'funcion', p: [
        'Las formas pueden mostrar valores de Notas y Agenda, que se actualizan solos. Selecciona una forma y pulsa el botón **=** para buscar la entidad: se escribe su ruta.'
      ], ej: ['**Gasto previsto**', '=/Mi nota/Compra/Subtotal €'] }
    ]
  },
  {
    id: 'herramientas', nombre: 'Herramientas', titulo: 'Herramientas',
    intro: 'Botones que te ahorran trabajo. La mayoría están en la barra fina de encima del texto de cada hoja de Notas.',
    temas: [
      { t: 'Buscar en la hoja', ic: 'buscar', p: [
        'Escribe en el buscador de encima del texto: las coincidencias se resaltan en verde y ves cuántas hay.',
        '- **Intro**: la siguiente. **Mayús + Intro**: la anterior.',
        '- **Esc**: cerrar la búsqueda.'
      ] },
      { t: 'Copiar la hoja entera', ic: 'clon', p: [
        'El botón de copiar, encima del texto, copia toda la hoja de dos formas:',
        '- **Copiar Markdown**: en formato estándar y con las menciones convertidas en su valor. Ideal para pegarlo en otras aplicaciones.',
        '- **Copiado literal**: tal cual está escrito, con todos los símbolos.'
      ] },
      { t: 'Exportar a Markdown', ic: 'exportar', p: [
        'Descarga la hoja como un archivo .md, que se abre con muchos programas de notas. Las menciones se guardan con su valor.'
      ] },
      { t: 'Ocultar las entidades', ic: 'ancho-completo', p: [
        'Oculta el panel de entidades para que el texto ocupe todo el ancho. Cada hoja lo recuerda. Al añadir una entidad, el panel vuelve a aparecer.'
      ] },
      { t: 'Calculadora', ic: 'calculadora', p: [
        'El botón de la calculadora, abajo a la izquierda, abre cuentas pensadas para el día a día: porcentajes, IVA, factura con IRPF, cuántos clientes necesitas, cuánto te falta para una meta, despejar la x…',
        'Rellenas los datos con palabras y te enseña el resultado, la fórmula y cada paso. Con **Intro** guardas el cálculo en su historial para volver a él.'
      ] },
      { t: 'Seleccionar varias líneas', p: [
        'En la vista sucia puedes seleccionar texto de varias líneas a la vez: arrastra con el ratón o usa **Mayús + clic**, **Mayús + flechas** o **Ctrl + A**. Después cópialo, córtalo, pégalo o bórralo como en cualquier editor.'
      ] },
      { t: 'Novedades', ic: 'novedades', p: [
        'Cuando NoteApp se actualiza, al abrirla te cuenta qué hay de nuevo. Puedes repasarlo cuando quieras en **Ajustes › Actualizaciones**.'
      ] }
    ]
  },
  {
    id: 'guardado', nombre: 'Guardado', titulo: 'Guardado',
    intro: 'Tus notas se guardan solas, sin botón de guardar. Aquí tienes dónde se guardan y cómo no perderlas.',
    temas: [
      { t: 'En el navegador', p: [
        'Cada cambio se guarda al momento en el navegador que estás usando. Es cómodo, pero si borras los datos del navegador o cambias de ordenador, no estarán ahí. Por eso conviene conectar una carpeta.'
      ] },
      { t: 'En una carpeta de tu ordenador', ic: 'carpeta', p: [
        'Pulsa el botón de la carpeta, abajo a la izquierda, y elige una carpeta. Desde entonces todo se guarda también ahí: un archivo por nota, separados en Notas, Agenda y Diagramas.',
        'Si eliges una carpeta de OneDrive (o parecida), tendrás copia en la nube y podrás seguir en otro ordenador conectando la misma carpeta.'
      ], ficha: [['Punto verde', 'Se está guardando en la carpeta'], ['Punto naranja', 'Falta permiso: pulsa la carpeta para darlo'], ['Sin punto', 'No hay ninguna carpeta conectada']],
        nota: ['Solo funciona en Chrome o Edge de ordenador. En el móvil, las notas se guardan en el navegador.'] },
      { t: 'Espacios de trabajo', p: [
        'Cada carpeta es un **espacio de trabajo** con sus propias notas, agenda y diagramas, como cajones separados (por ejemplo, una carpeta para tus cosas y otra para las clases).',
        'Al abrir otra carpeta no se copia nada: si está vacía, empiezas de cero; si ya tiene datos, se cargan los suyos. La primera vez que conectas una carpeta vacía, te pregunta si quieres guardar ahí lo que tienes abierto.'
      ] },
      { t: 'Instalar NoteApp', p: [
        'Puedes instalar NoteApp como una aplicación: en el ordenador, con el icono de instalar de la barra de direcciones; en el móvil, con «Añadir a la pantalla de inicio».',
        'Después de abrirla una vez con internet, funciona también sin conexión.'
      ] },
      { t: 'Varios ordenadores', p: [
        'Si usas la misma carpeta en dos ordenadores a la vez, se queda el último cambio que se guardó: no se mezclan. Lo más seguro es trabajar en uno cada vez.'
      ] }
    ]
  }
];

// Entidades de ejemplo para las menciones de la Ayuda (hoja «Compra» de la nota «Mi nota»): =Precio vale 12,5,
// =Unidades 4 y =Subtotal 50. Tienen ids fijos para no gastar números de uid().
const AY_ENTS = [
  { id: 'ay-e1', type: 'expr', name: 'Precio', desc: 'Precio por unidad', expr: '12,5' },
  { id: 'ay-e2', type: 'expr', name: 'Unidades', desc: 'Unidades compradas', expr: '4' },
  { id: 'ay-e3', type: 'expr', name: 'Subtotal', desc: 'Precio por unidades', expr: 'Precio * Unidades' }
];

NoteApp.partes.push(Base => class extends Base {
  // Dibuja líneas MKD de la Ayuda con el mismo motor que las notas (mkdLines, siempre en vista limpia).
  // tipo 'texto': letra algo más pequeña y gris (la negrita, en blanco); 'nota': anotación con fondo más claro.
  // Las casillas se pueden marcar, pero solo cambian el ejemplo (state.ajustes.ej), nunca las notas.
  ayLineas(lines, tipo) {
    const out = this.mkdLines(lines, 'ayuda', true);
    out.forEach(l => {
      l.onDown = null;
      const box = sg => { if (!sg.isBox) return; sg.cur = 'pointer'; sg.onToggle = e => { e.preventDefault(); e.stopPropagation(); if (e.button === 0) this.ayMarcar(l.id, l.text, sg.off); }; };
      (l.segs || []).forEach(box);
      (l.cells || []).forEach(c => (c.segs || []).forEach(box));
      if (tipo === 'texto' || tipo === 'nota') {
        if (l.fs === '16px') { l.fs = '15px'; l.lh = '23px'; }
        if (l.mt === '13px') l.mt = '9px';
      }
      if (tipo === 'texto') {
        if (l.color === '#fff') l.color = '#c4c4c4';
        (l.segs || []).forEach(sg => { if (sg.isText && sg.fw === 700 && sg.color === 'inherit') sg.color = '#fff'; });
      }
      if (tipo === 'nota' && l.bg === '#242424') l.bg = '#2e2e2e';
    });
    return out;
  }
  // Marca o desmarca una casilla de un ejemplo de la Ayuda (como toggleBox, pero solo en el ejemplo)
  ayMarcar(id, text, off) {
    const m = /^\[(True|False|x|X| )\]/.exec(text.slice(off)); if (!m) return;
    const nv = { True: 'False', False: 'True', x: ' ', X: ' ', ' ': 'x' }[m[1]];
    const t2 = text.slice(0, off) + '[' + nv + ']' + text.slice(off + m[0].length);
    this.setState(s => s.ajustes ? { ajustes: { ...s.ajustes, ej: { ...(s.ajustes.ej || {}), [id]: t2 } } } : null);
  }
  // Lleva el panel hasta un tema (índice de la sección)
  ayIr(anchor) {
    const el = document.getElementById(anchor);
    if (el) try { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (_) { el.scrollIntoView(); }
  }
  // Valores para la plantilla del componente ajustes-ayuda (se añaden en ajVals, js/app/ajustes.js)
  ayudaVals(s, secId) {
    const k = Math.max(0, AYUDA.findIndex(x => x.id === secId)), sec = AYUDA[k], ej = (s.ajustes && s.ajustes.ej) || {};
    const lid = (ti, tipo, i) => 'ay|' + sec.id + '|' + ti + '|' + tipo + i;
    const mk = (arr, ti, tipo) => (arr || []).map((text, i) => { const id = lid(ti, tipo, i); return { id, text: ej[id] != null ? ej[id] : text }; });
    const temas = sec.temas.map((t, ti) => ({ t, ti, p: mk(t.p, ti, 'p'), ej: mk(t.ej, ti, 'e'), nota: mk((t.nota || []).map(x => '> ' + x), ti, 'n') }));
    // Las menciones de los ejemplos se resuelven con una nota de ejemplo (no con las notas de quien la usa).
    // Se incluyen las líneas de la sección para que funcionen las casillas con nombre ([True] Nombre).
    const lineas = []; temas.forEach(x => lineas.push(...x.p, ...x.ej, ...x.nota));
    const prev = RESOLVE;
    RESOLVE = makeWorld({ mode: 'notas', wins: {}, activeNote: 'ay-n',
      notes: [{ id: 'ay-n', name: 'Mi nota', activeSheet: 'ay-s', sheets: [{ id: 'ay-s', name: 'Compra', lines: lineas, entities: AY_ENTS }] }] }).at('ay-s');
    const v = {};
    try {
      v.ayTemas = temas.map(({ t, ti, p, ej: e, nota }) => {
        const key = 'ay:' + sec.id + ':' + ti, copied = s.copied === key;
        return {
          titulo: t.t, anchor: 'ay-' + sec.id + '-' + ti,
          hasIc: !!t.ic, ic: t.ic ? ajMask(t.ic) : 'none',
          hasP: p.length > 0, p: p.length ? this.ayLineas(p, 'texto') : [],
          hasFicha: !!(t.ficha && t.ficha.length), ficha: (t.ficha || []).map(f => ({ k: f[0], v: f[1] })),
          hasEj: e.length > 0, crudo: e.map(l => ({ t: l.text || ' ' })), vista: e.length ? this.ayLineas(e) : [],
          copiar: () => this.copyText(e.map(l => l.text).join('\n'), key),
          copyTitle: copied ? 'Copiado' : 'Copiar el ejemplo para pegarlo en una nota', copyColor: copied ? '#008000' : '#8a8a8a',
          hasNota: nota.length > 0, nota: nota.length ? this.ayLineas(nota, 'nota') : []
        };
      });
    } finally { RESOLVE = prev; }
    v.ayTitulo = sec.titulo;
    v.ayIntro = sec.intro;
    v.ayIndice = sec.temas.map((t, ti) => ({ t: t.t, ir: () => this.ayIr('ay-' + sec.id + '-' + ti) }));
    // Pie: ir a la siguiente sección (en la última, volver a la primera)
    const sig = AYUDA[k + 1];
    v.ayPieTxt = 'Sección ' + (k + 1) + ' de ' + AYUDA.length + (sig ? '' : ' · ¡Has llegado al final de la ayuda!');
    v.ayHaySig = true;
    v.aySigTxt = sig ? 'Siguiente: ' + sig.nombre : 'Volver a ' + AYUDA[0].nombre;
    v.aySig = () => this.ajSec((sig || AYUDA[0]).id);
    return v;
  }
});
