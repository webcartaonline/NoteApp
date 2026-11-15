// Menciones (=Nombre y rutas =/Nota/Hoja/Entidad) y conversión de rutas antiguas.
// Funciones generales: se cargan antes que la app (ver index.html).
const PINK = '#cc55cc', TOKEN = '#1a9a1a', DIM = '#5f5f5f';
const HEAD = { 1: ['24px', '30px'], 2: ['20px', '27px'], 3: ['18px', '24px'], 4: ['17px', '24px'], 5: ['16px', '24px'], 6: ['15px', '22px'] };

function parseLine(text) {
  const h = /^(#{1,6}) (.*)$/.exec(text);
  return h ? { level: h[1].length, start: h[1].length + 1 } : { level: 0, start: 0 };
}
let RESOLVE = () => null;
const resolveEntity = name => { try { return fmt(RESOLVE(name)); } catch (_) { return 'ND'; } };
const ID_CH = 'A-Za-zÀ-ÖØ-öø-ÿ0-9_', NAME_START = 'A-Za-zÀ-ÖØ-öø-ÿ_';
// Ruta a una entidad de otra hoja o nota (12/11/2026). Sin nada delante, =/Nota/Hoja/Entidad busca en la MISMA ventana
// en la que se escribe (desde Notas en Notas, desde la Agenda en la Agenda, desde el Diagrama en el Diagrama). Con el
// nombre de una ventana delante busca solo en esa: =/Notas/…, =/Agenda/Nota/Hoja/Entidad, =/Diagrama/….
// Cada barra va pegada al nombre que la sigue; la nota y la hoja pueden llevar espacios, la entidad no (la ruta acaba
// donde acaba su nombre). La palabra de la ventana no distingue mayúsculas.
const PATH_WINS = { notas: 'Notas', agenda: 'Agenda', diagrama: 'Diagrama' }; // ventana → palabra que la elige en una ruta
const PATH_PRE = '(?:' + Object.values(PATH_WINS).map(w => w.split('').map(c => '[' + c.toUpperCase() + c.toLowerCase() + ']').join('')).join('|') + ')\\/';
const PATH_SEG = '(?! )[^\\/\\n=]+\\/';
const PATH_RX = '=\\/(?:' + PATH_PRE + ')?' + PATH_SEG + PATH_SEG + '[' + NAME_START + '][' + ID_CH + ']*';
const ENT = new RegExp('(' + PATH_RX + ')|=([' + ID_CH + ']+)', 'g');
const isPath = n => /^=\//.test(n);
// Partes de una ruta: w = ventana elegida ('notas', 'agenda' o 'diagrama'; null si no lleva palabra delante = la ventana
// de quien la escribe), p = [nota, hoja, entidad] tal cual están escritas y pre = la palabra con su barra ('' si no
// lleva). null si no es una ruta válida.
function pathInfo(ref) {
  const p = String(ref || '').slice(2).split('/');
  if (p.length === 4) { const w = Object.keys(PATH_WINS).find(k => k === p[0].trim().toLowerCase()); return w ? { w, p: p.slice(1), pre: p[0] + '/' } : null; }
  return p.length === 3 ? { w: null, p, pre: '' } : null;
}
// Vuelve a escribir una ruta con otras partes [nota, hoja, entidad], conservando su palabra de ventana.
const pathJoin = (pi, p) => '=/' + pi.pre + p.join('/');
// Al escribir una mención, el espacio se convierte en _ (para salir: Esc o dos espacios seguidos).
// Si la ruta empieza con Notas/, Agenda/ o Diagrama/, esa palabra es la ventana (no la nota): así los espacios del nombre
// de la hoja no se cambian por _ mientras se escribe =/Agenda/Nota/Hoja…
const MEN_END = new RegExp('(?:^|(?<=[\\s*~_]))=(?:\\/(?:' + PATH_PRE + '|(?!' + PATH_PRE + '))' + PATH_SEG + PATH_SEG + ')?[' + NAME_START + '][' + ID_CH + ']*$');
// Devuelve dónde empieza la mención que acaba justo antes del cursor (o -1 si no hay ninguna).
function menAt(lines, idx, before) {
  const m = MEN_END.exec(before); if (!m) return -1;
  if ((before.slice(0, m.index).match(/`/g) || []).length % 2) return -1;
  const b = blockInfo(lines)[idx]; if (b && b.kind === 'code') return -1;
  return m.index;
}
const pathSegs = raw => [{ text: '=', color: '#fff' }].concat(...raw.slice(2).split('/').map(p => [{ text: '/', color: '#fff' }, { text: p, color: '#008000' }]));
// Convierte las rutas antiguas =(Nota / Hoja / Entidad) y =(Agenda / Nota / Hoja / Entidad) al formato nuevo
// (=/Nota/Hoja/Entidad y =/Agenda/Nota/Hoja/Entidad).
const OLD_PATH = /=\(([^()=]*?\/[^()]*?)\)/g;
const refMigStr = t => typeof t !== 'string' || t.indexOf('=(') < 0 ? t : t.replace(OLD_PATH, (m, inner) => { let p = inner.split('/').map(x => x.trim().replace(/\s+/g, ' ')); const pre = p.length === 4 && p[0].toLowerCase() === 'agenda' ? 'Agenda/' : ''; if (pre) p = p.slice(1); return p.length === 3 && p.every(Boolean) ? '=/' + pre + p.join('/') : m; });
const GUIDE_FIX = new Map([["> Activa la vista sucia con el interruptor superior para editar nombres, descripciones y fórmulas. El botón de función alterna entre ver las entradas o la salida.", "> Activa la vista sucia con el interruptor superior para editar nombres, descripciones y fórmulas. El botón de función alterna entre ver las entradas o la salida. El botón de al lado del interruptor oculta las entidades de la hoja para que el texto ocupe todo el ancho; vuelve a pulsarlo para verlas."], ["Calcula operaciones con suma, resta, multiplicación, división y paréntesis. Admite números y otras entidades por su nombre. Aquí, Precio por Unidades da **=Subtotal**.", "Calcula operaciones con suma, resta, multiplicación, división y paréntesis. Admite números y otras entidades por su nombre. Aquí, Precio por Unidades da **=Subtotal**. Los números van al estilo europeo: la coma separa los decimales y el punto, si quieres, los miles (10.000.000,5). Los resultados también se muestran así."], ["Un título entre líneas que ordena el panel en secciones. No produce ningún valor.", "Un título entre líneas que ordena el panel en secciones. El botón de la T grande, a la izquierda del menú, destaca el título más grande y en verde. Si dejas el título vacío, el separador se convierte en un espacio en blanco. No produce ningún valor."], ["Las menciones se copian con su valor: =Subtotal", "Las menciones se copian con su valor: =/Conoce NoteApp/Guía de entidades/Subtotal"], ["Escribe un igual pegado al nombre de una entidad: el subtotal vale =Subtotal.", "Escribe un igual pegado al nombre de una entidad de la misma hoja. Para una entidad de otra hoja o de otra nota, escribe su ruta: el subtotal vale =/Conoce NoteApp/Guía de entidades/Subtotal."], ["Delante del igual no puede haber nada pegado, salvo \\* o \\~: **=Subtotal** funciona, pero en 2+2=4 o en web.com/?id=5 no se crea ninguna mención.", "Delante del igual no puede haber nada pegado, salvo \\* o \\~: **=/Conoce NoteApp/Guía de entidades/Subtotal** funciona, pero en 2+2=4 o en web.com/?id=5 no se crea ninguna mención."], ["Las entidades viven en el panel derecho y se añaden desde la barra lateral. Cada una tiene un **nombre único** y produce un valor que puedes citar en cualquier hoja escribiendo un igual delante de su nombre: por ejemplo, el subtotal vale *=Subtotal*.", "Las entidades viven en el panel derecho y se añaden desde la barra lateral. Cada una tiene un **nombre único dentro de su hoja** y produce un valor que puedes citar en esa misma hoja escribiendo un igual delante de su nombre: por ejemplo, el subtotal vale *=Subtotal*. Desde otra hoja u otra nota se cita con su ruta (mira el final de esta guía)."], ["## Referencias entre ventanas", "## Rutas: entidades de otras hojas y notas"], ["Para citar una entidad de otra nota, escribe su ruta entre paréntesis tras el igual. La nota y la hoja van con su nombre original, con espacios si los tienen; al final va el nombre de la entidad. El precio de esta guía vale =(Conoce NoteApp / Guía de entidades / Precio).", "Para citar una entidad de otra hoja o de otra nota, escribe un igual seguido de su ruta: \\=/Nota/Hoja/Entidad. Cada barra va pegada al nombre que la sigue. La nota y la hoja se escriben con su nombre original, con espacios si los tienen; la entidad no lleva espacios, así que la ruta termina en el primer espacio tras su nombre. El precio de esta guía vale =/Conoce NoteApp/Guía de entidades/Precio."], ["Para la Agenda, empieza la ruta con la palabra Agenda: el vuelo sale el **=(Agenda / Viajes / Lisboa / Vuelo_Lisboa)**.", "Sin nada delante, la ruta busca en la misma ventana en la que escribes (aquí, en Notas). Para otra ventana, empieza la ruta con su nombre (Notas, Agenda o Diagrama): el vuelo sale el **=/Agenda/Viajes/Lisboa/Vuelo_Lisboa**."], ["Funciona igual con la Agenda: el vuelo sale el **=/Viajes/Lisboa/Vuelo_Lisboa**. Si en Notas y en Agenda hay notas con el mismo nombre, se usa la de la ventana en la que escribes la ruta.", "Sin nada delante, la ruta busca en la misma ventana en la que escribes (aquí, en Notas). Para otra ventana, empieza la ruta con su nombre (Notas, Agenda o Diagrama): el vuelo sale el **=/Agenda/Viajes/Lisboa/Vuelo_Lisboa**."], ["Para una entidad de la Agenda, empieza la ruta con la palabra Agenda: el vuelo sale el **=/Agenda/Viajes/Lisboa/Vuelo_Lisboa**. Sin esa palabra, la ruta busca siempre en Notas.", "Sin nada delante, la ruta busca en la misma ventana en la que escribes (aquí, en Notas). Para otra ventana, empieza la ruta con su nombre (Notas, Agenda o Diagrama): el vuelo sale el **=/Agenda/Viajes/Lisboa/Vuelo_Lisboa**."]]);
const refMigDeep = v => { if (typeof v === 'string') return GUIDE_FIX.get(v) || refMigStr(v); if (Array.isArray(v)) { let ch = false; const o = v.map(x => { const y = refMigDeep(x); if (y !== x) ch = true; return y; }); return ch ? o : v; } if (v && typeof v === 'object') { let ch = false; const o = {}; for (const k in v) { const y = refMigDeep(v[k]); if (y !== v[k]) ch = true; o[k] = y; } return ch ? o : v; } return v; };
