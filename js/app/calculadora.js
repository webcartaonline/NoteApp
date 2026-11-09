// Calculadora rápida con historial (componente componentes/calculadora/). Se abre con el botón de la calculadora de la
// barra lateral, encima de cualquier ventana (Notas, Agenda o Diagrama). Los cálculos (qué datos piden, la fórmula y
// los pasos) están en js/motor/calculos.js.
//
// Estado temporal (no se guarda con las notas): state.calc = null (cerrada) o
//   { id (cálculo elegido), vals: { [idCálculo]: { campo: texto escrito } }, q (buscador de cálculos),
//     vista ('lista' | 'calc' | 'hist': qué parte se ve en pantallas estrechas), borrar (preguntando «¿Borrar todo?») }
// Lo escrito en cada cálculo se recuerda mientras la página esté abierta (this._calcVals), también al cerrar la ventana.
// El historial y el último cálculo usado se guardan aparte, en este navegador (localStorage, CALC_KEY): no van a la
// carpeta y no cambian al cambiar de espacio de trabajo. state.calcHist es una copia para dibujarlo.
const CALC_KEY = 'noteapp:calculadora:v1';
const CALC_MAX = 200; // como mucho se guardan los 200 cálculos más recientes
function calcLeer() {
  try { const d = JSON.parse(localStorage.getItem(CALC_KEY) || '{}') || {}; return { last: typeof d.last === 'string' ? d.last : null, hist: Array.isArray(d.hist) ? d.hist.filter(e => e && calcDef(e.c)) : [] }; }
  catch (_) { return { last: null, hist: [] }; }
}
function calcEscribir(d) { try { localStorage.setItem(CALC_KEY, JSON.stringify(d)); } catch (_) {} }
// Lo escrito en un cálculo, en una sola cadena (para saber si ya está guardado en el historial)
function calcClave(def, raw) {
  raw = raw || {};
  const o = calcOpts(def, raw);
  return def.id + '|' + JSON.stringify(def.f.map(f => (f.tipo === 'opt' ? o[f.k] : String(raw[f.k] == null ? '' : raw[f.k]).trim())));
}
// «Hoy, 16:53», «Ayer, 10:02» o «3 nov, 09:15»
function calcCuando(t) {
  const d = new Date(t), h = new Date(), hm = pad2(d.getHours()) + ':' + pad2(d.getMinutes());
  const dia = x => x.getFullYear() + '-' + x.getMonth() + '-' + x.getDate(), ay = new Date(h.getFullYear(), h.getMonth(), h.getDate() - 1);
  if (dia(d) === dia(h)) return 'Hoy, ' + hm;
  if (dia(d) === dia(ay)) return 'Ayer, ' + hm;
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }).replace('.', '') + (d.getFullYear() !== h.getFullYear() ? ' ' + d.getFullYear() : '') + ', ' + hm;
}

NoteApp.partes.push(Base => class extends Base {
  calcAbrir() {
    const a = document.activeElement; if (a && (a.tagName === 'TEXTAREA' || a.tagName === 'INPUT')) a.blur();
    const d = calcLeer(), id = calcDef(d.last) ? d.last : CALCS[0].id;
    this.setState({ menu: false, copyMenu: false, entMenu: null, colMenu: null, calc: { id, vals: this._calcVals || {}, q: '', vista: 'calc', borrar: false }, calcHist: d.hist }, () => this.calcFoco());
  }
  calcCerrar() { const c = this.state.calc; if (c) this._calcVals = c.vals; this.setState({ calc: null }); }
  // Esc: primero cierra la pregunta de borrar o vacía el buscador; si no, cierra la calculadora
  calcEsc() {
    const c = this.state.calc; if (!c) return;
    if (c.borrar) this.calcPon({ borrar: false });
    else if (c.q) this.calcPon({ q: '' });
    else this.calcCerrar();
  }
  calcPon(cambio, despues) { this.setState(st => (st.calc ? { calc: { ...st.calc, ...cambio } } : null), despues); }
  // Pone el cursor en el primer dato (solo en pantallas grandes: en el móvil abriría el teclado sin pedirlo)
  calcFoco(k) {
    if (window.innerWidth < 700) return;
    requestAnimationFrame(() => { const el = document.querySelector(k ? '[data-calc-campo="' + k + '"]' : '[data-calc-campo]'); if (el) { el.focus(); const n = el.value.length; try { el.setSelectionRange(n, n); } catch (_) {} } });
  }
  calcElegir(id) {
    if (!calcDef(id)) return;
    const d = calcLeer(); d.last = id; calcEscribir(d);
    this.calcPon({ id, vista: 'calc', borrar: false }, () => this.calcFoco());
  }
  calcSet(k, val, despues) {
    this.setState(st => {
      const c = st.calc; if (!c) return null;
      return { calc: { ...c, vals: { ...c.vals, [c.id]: { ...(c.vals[c.id] || {}), [k]: val } } } };
    }, despues);
  }
  // Rellena los datos con el ejemplo (para poder cambiarlo a partir de ahí)
  calcEjemplo() {
    const c = this.state.calc, def = c && calcDef(c.id); if (!def) return;
    const raw = c.vals[c.id] || {}, opt = calcOpts(def, raw), nuevo = { ...opt };
    def.f.forEach(f => { if (f.tipo !== 'opt') nuevo[f.k] = String(calcVal(f.ej, opt) || ''); });
    this.calcPon({ vals: { ...c.vals, [c.id]: nuevo } }, () => this.calcFoco());
  }
  // Borra lo escrito (se quedan los botones elegidos)
  calcVaciar() {
    const c = this.state.calc, def = c && calcDef(c.id); if (!def) return;
    this.calcPon({ vals: { ...c.vals, [c.id]: calcOpts(def, c.vals[c.id]) } }, () => this.calcFoco());
  }
  // Mete un símbolo (teclas debajo de una cuenta o ecuación) donde está el cursor
  calcMeter(k, txt) {
    const c = this.state.calc; if (!c) return;
    const cur = String((c.vals[c.id] || {})[k] || ''), el = document.querySelector('[data-calc-campo="' + k + '"]');
    let a = cur.length, b = a;
    if (el && document.activeElement === el) { a = el.selectionStart; b = el.selectionEnd; }
    if (/^\s/.test(txt) && /\s$/.test(cur.slice(0, a))) txt = txt.replace(/^\s+/, '');
    const val = cur.slice(0, a) + txt + cur.slice(b), pos = a + txt.length;
    // El cursor se coloca justo después de dibujar (antes de la siguiente tecla), detrás de lo que se ha metido
    this.calcSet(k, val, () => { const e2 = document.querySelector('[data-calc-campo="' + k + '"]'); if (e2) { e2.focus(); try { e2.setSelectionRange(pos, pos); } catch (_) {} } });
  }
  // Guarda el cálculo actual en el historial (botón o Intro). Si ya está guardado tal cual, no lo repite.
  calcGuardar() {
    const c = this.state.calc, def = c && calcDef(c.id); if (!def) return;
    const raw = c.vals[c.id] || {}, r = calcRun(def, raw);
    if (r.estado !== 'ok') return;
    const d = calcLeer(), clave = calcClave(def, raw);
    if (d.hist.some(e => calcClave(calcDef(e.c), e.v) === clave)) return;
    const v = {}; def.f.forEach(f => { v[f.k] = f.tipo === 'opt' ? calcOpts(def, raw)[f.k] : String(raw[f.k] == null ? '' : raw[f.k]).trim(); });
    d.hist.unshift({ id: 'h' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), c: def.id, v, r: r.res, t: Date.now() });
    d.hist = d.hist.slice(0, CALC_MAX); d.last = def.id;
    calcEscribir(d);
    this.setState({ calcHist: d.hist });
  }
  // Vuelve a abrir un cálculo del historial con sus datos
  calcVolver(e) {
    const c = this.state.calc; if (!c || !calcDef(e.c)) return;
    const d = calcLeer(); d.last = e.c; calcEscribir(d);
    this.calcPon({ id: e.c, vals: { ...c.vals, [e.c]: { ...e.v } }, vista: 'calc', borrar: false });
  }
  calcQuitar(id) { const d = calcLeer(); d.hist = d.hist.filter(e => e.id !== id); calcEscribir(d); this.setState({ calcHist: d.hist }); }
  calcBorrarTodo() { const d = calcLeer(); d.hist = []; calcEscribir(d); this.setState(st => ({ calcHist: [], calc: st.calc ? { ...st.calc, borrar: false } : null })); }

  // Valores para la plantilla (se añaden en renderVals)
  calcVals(s) {
    const c = s.calc, v = { calcAbrir: () => this.calcAbrir(), calcOn: !!c };
    if (!c) return v;
    const def = calcDef(c.id) || CALCS[0], raw = c.vals[def.id] || {}, opt = calcOpts(def, raw), r = calcRun(def, raw), hist = s.calcHist || [];
    const clave = calcClave(def, raw), ancho = window.innerWidth;
    // Ventana y pestañas (las pestañas solo se ven en pantallas estrechas)
    v.calcCerrar = () => this.calcCerrar();
    v.calcFondo = e => { if (e.target === e.currentTarget) this.calcCerrar(); };
    v.calcVista = 'calculadora-v-' + c.vista;
    const on = k => k === c.vista || (k === 'calc' && c.vista === 'lista' && ancho >= 700);
    v.calcTabs = [
      { txt: 'Cálculos', cls: 'calculadora-pestana-lista' + (on('lista') ? ' calculadora-pestana-on' : ''), pick: () => this.calcPon({ vista: 'lista' }) },
      { txt: 'Calcular', cls: on('calc') ? 'calculadora-pestana-on' : '', pick: () => this.calcPon({ vista: 'calc' }) },
      { txt: 'Historial' + (hist.length ? ' (' + hist.length + ')' : ''), cls: on('hist') ? 'calculadora-pestana-on' : '', pick: () => this.calcPon({ vista: 'hist' }) }
    ];
    // Lista de cálculos, con buscador (todas las palabras tienen que aparecer, sin importar tildes ni mayúsculas)
    const palabras = calcNorm(c.q).split(/\s+/).filter(Boolean);
    const vale = d => { const t = calcNorm([d.n, d.q, d.d, d.g, d.kw].join(' ')); return palabras.every(p => t.includes(p)); };
    const visibles = CALCS.filter(vale);
    v.calcGrupos = CALC_GRUPOS.map(g => ({
      nombre: g,
      items: visibles.filter(d => d.g === g).map(d => ({ nombre: d.n, on: d.id === def.id, cls: d.id === def.id ? 'calculadora-item-on' : '', pick: () => this.calcElegir(d.id) }))
    })).filter(g => g.items.length);
    v.calcSinRes = !visibles.length;
    v.calcQ = c.q || '';
    v.calcOnQ = e => this.calcPon({ q: e.target.value });
    // Intro elige el primero, mejor si las palabras están en su nombre (p. ej. «factura» → «Factura con IVA e IRPF»)
    const enNombre = d => palabras.every(p => calcNorm(d.n + ' ' + d.q).includes(p));
    v.calcQKey = e => { if (e.key === 'Enter' && visibles.length) { e.preventDefault(); this.calcElegir((visibles.find(enNombre) || visibles[0]).id); } };
    // El cálculo elegido: pregunta, botones para elegir y datos
    v.calcTitulo = def.q;
    v.calcDesc = def.d;
    v.calcOpts = def.f.filter(f => f.tipo === 'opt').map(f => ({
      label: calcVal(f.l, opt) || '', hasLabel: !!f.l,
      ops: f.ops.map(o => ({ txt: o.l, on: o.v === opt[f.k], cls: o.v === opt[f.k] ? 'calculadora-opcion-on' : '', pick: () => this.calcSet(f.k, o.v) }))
    }));
    const enter = e => { if (e.key === 'Enter') { e.preventDefault(); this.calcGuardar(); } };
    const campo = f => {
      const ay = calcVal(f.ay, opt) || '';
      return {
        k: f.k, label: calcVal(f.l, opt), opc: !!f.opc, value: raw[f.k] == null ? '' : String(raw[f.k]),
        ph: String(calcVal(f.def != null ? f.def : f.ej, opt) || ''), u: f.u || '', hasU: !!f.u, ayuda: ay, hasAyuda: !!ay,
        im: f.tipo === 'lista' || f.hm ? 'text' : 'decimal', cls: f.tipo === 'lista' ? 'calculadora-campo-ancho' : '',
        onChange: e => this.calcSet(f.k, e.target.value), onKey: enter
      };
    };
    v.calcCampos = def.f.filter(f => f.tipo !== 'opt' && f.tipo !== 'expr').map(campo);
    v.calcHayCampos = !!v.calcCampos.length;
    v.calcExprs = def.f.filter(f => f.tipo === 'expr').map(f => Object.assign(campo(f), {
      teclas: (f.teclas || []).map(t => ({ txt: t.l, title: t.title || 'Escribir ' + t.l, cls: t.cls ? 'calculadora-tecla-' + t.cls : '', down: e => e.preventDefault(), click: () => this.calcMeter(f.k, t.ins) })),
      chips: (f.chips || []).map(ch => ({ txt: ch, click: () => { this.calcSet(f.k, ch); this.calcFoco(f.k); } }))
    }));
    const vacio = calcVacio(def, raw);
    v.calcPuedeEjemplo = vacio;
    v.calcPuedeVaciar = !vacio;
    v.calcVerEjemplo = () => this.calcEjemplo();
    v.calcVaciar = () => this.calcVaciar();
    // Resultado
    const ok = r.estado === 'ok', ej = r.estado === 'ejemplo';
    v.calcHayRes = ok || ej;
    v.calcOk = ok;
    v.calcEsEjemplo = ej;
    v.calcFalta = r.estado === 'falta';
    v.calcError = r.estado === 'error';
    v.calcResCls = ej ? 'calculadora-resultado-ejemplo' : r.estado === 'error' ? 'calculadora-resultado-error' : r.estado === 'falta' ? 'calculadora-resultado-falta' : '';
    v.calcFaltaTxt = v.calcFalta ? 'Rellena ' + (r.falta.length > 1 ? r.falta.slice(0, -1).map(x => '«' + x + '»').join(', ') + ' y «' + r.falta[r.falta.length - 1] + '»' : '«' + r.falta[0] + '»') + ' para ver el resultado.' : '';
    v.calcErrorTxt = r.msg || '';
    v.calcResEtq = ej ? 'Ejemplo · ' + (r.etq || 'Resultado') : (r.etq || 'Resultado');
    v.calcValor = r.val || '';
    v.calcUni = r.uni || '';
    v.calcHayUni = !!r.uni;
    v.calcFrase = r.frase || '';
    v.calcExtra = (r.extra || []).map(x => ({ l: x.l, v: x.v }));
    v.calcHayExtra = !!v.calcExtra.length;
    v.calcNotaEjemplo = 'Es un ejemplo con los números en gris. Escribe los tuyos arriba y el resultado cambiará solo.';
    // Copiar el resultado (como número: 1.234,5) y guardarlo en el historial
    const copia = r.copia != null && isFinite(r.copia) ? calcFmt(r.copia, 4) : null;
    v.calcPuedeCopiar = v.calcHayRes && copia != null;
    v.calcCopiar = () => { if (copia != null) this.copyText(copia, 'calc'); };
    v.calcCopiarColor = s.copied === 'calc' ? '#3fa63f' : '#8a8a8a';
    v.calcCopiarTitle = s.copied === 'calc' ? 'Copiado' : 'Copiar el resultado (' + (copia || '') + ')';
    const guardado = ok && hist.some(e => calcClave(calcDef(e.c), e.v) === clave);
    v.calcGuardar = () => this.calcGuardar();
    v.calcGuardarTxt = guardado ? 'Guardado en el historial' : 'Guardar en el historial';
    v.calcGuardarCls = guardado ? 'calculadora-guardar-hecho' : '';
    v.calcGuardarTitle = guardado ? 'Este cálculo ya está en el historial' : 'Guardar este cálculo en el historial (también con la tecla Intro)';
    // Cómo se calcula
    v.calcFormula = r.formula || '';
    v.calcHayFormula = !!r.formula;
    v.calcCon = r.con || '';
    v.calcHayCon = !!r.con;
    v.calcConEtq = r.conEtq || (ej ? 'Con el ejemplo' : 'Con tus números');
    v.calcPasos = (r.pasos || []).map((p, i) => ({
      n: String(i + 1), t: p.t, op: p.op || '', hasOp: !!(p.op || p.op2 || p.queda), op2: p.op2 || '', hasOp2: !!p.op2, queda: p.queda || '', hasQueda: !!p.queda,
      opCls: p.op ? '' : 'calculadora-oculto'
    }));
    v.calcHayPasos = !!v.calcPasos.length;
    v.calcTruco = r.truco || '';
    v.calcHayTruco = !!r.truco;
    const todo = [r.val, r.con].concat((r.pasos || []).map(p => [p.op, p.op2, p.queda].join(' '))).join(' ');
    v.calcAprox = v.calcHayRes && todo.indexOf('≈') >= 0;
    // Historial
    v.calcHist = hist.map(e => {
      const d = calcDef(e.c), igual = d && calcClave(d, e.v) === clave;
      return {
        nombre: d ? d.n : '', res: e.r, hora: calcCuando(e.t), cls: igual ? 'calculadora-hist-item-on' : '',
        open: () => this.calcVolver(e), del: ev => { ev.stopPropagation(); this.calcQuitar(e.id); }
      };
    });
    v.calcHistHay = !!hist.length;
    v.calcHistVacio = !hist.length;
    v.calcHistN = hist.length ? String(hist.length) : '';
    v.calcPregunta = !!c.borrar && !!hist.length;
    v.calcNoPregunta = !c.borrar && !!hist.length;
    v.calcPreguntarBorrar = () => this.calcPon({ borrar: true });
    v.calcBorrarSi = () => this.calcBorrarTodo();
    v.calcBorrarNo = () => this.calcPon({ borrar: false });
    return v;
  }
});
