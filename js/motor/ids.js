// Identificadores (IDs), largo máximo de los nombres y creación de hojas nuevas.
// Largo máximo: nombre de entidad, descripción y nombres de notas/hojas.
const ENT_MAX = 60, DESC_MAX = 120, TAB_MAX = 22;
const W0 = 577;
let _uid = 1000;
const uid = p => p + (++_uid);
const mkLines = arr => arr.map(text => ({ id: uid('l'), text }));
const mkSheet = (name, lines, entities) => ({ id: uid('s'), name, lines: mkLines(lines || ['']), width: W0, entities: entities || [] });
