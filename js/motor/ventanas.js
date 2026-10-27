// Ventanas de NoteApp: Notas, Agenda y Diagrama.
// La ventana visible (state.mode) tiene sus notas en state.notes / state.activeNote (así todo el código de
// pestañas, hojas, renombrar y borrar funciona igual en las tres). Las ventanas ocultas se guardan en
// state.wins = { notas: { notes, activeNote }, agenda: {...}, diagrama: {...} } (la de la ventana visible no se usa).
const WINS = ['notas', 'agenda', 'diagrama'];
const WIN_TITLE = { notas: 'Notas', agenda: 'Agenda', diagrama: 'Diagrama' };
const WIN_EMPTY = () => ({ notes: [], activeNote: null });
// Las tres ventanas completas: { notas, agenda, diagrama }, cada una { notes, activeNote }.
function winsOf(s) {
  const out = {};
  WINS.forEach(k => { out[k] = k === s.mode ? { notes: s.notes, activeNote: s.activeNote } : (s.wins && s.wins[k]) || WIN_EMPTY(); });
  return out;
}
// Cambios de estado para dejar las ventanas "all" con "mode" como ventana visible.
function winPatch(all, mode) {
  const wins = {};
  WINS.forEach(k => { if (k !== mode) wins[k] = all[k] || WIN_EMPTY(); });
  const cur = all[mode] || WIN_EMPTY();
  return { mode, notes: cur.notes, activeNote: cur.activeNote, wins };
}
// Notas de cada ventana como lista [[ventana, notas], ...] (siempre en el orden Notas, Agenda, Diagrama).
const winLists = s => { const w = winsOf(s); return WINS.map(k => [k, w[k].notes || []]); };
