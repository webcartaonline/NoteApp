// Calculadora (motor, sin interfaz): la lista de cálculos guiados (CALCS), cómo se leen y se escriben los números,
// la operación libre paso a paso y despejar la x. La ventana está en js/app/calculadora.js y componentes/calculadora/.
//
// Cada cálculo de CALCS:
//   { id, g (grupo, uno de CALC_GRUPOS), n (nombre corto en la lista), q (pregunta: título), d (descripción),
//     kw (palabras extra para el buscador), f (campos), run(v) }
// Cada campo de f:
//   { k (clave), l (etiqueta), u (unidad que se ve dentro del campo: '€', '%', 'h'…), ej (ejemplo: se ve en gris
//     y se usa para el ejemplo), def (valor si se deja vacío), opc (opcional), ay (ayuda debajo del campo),
//     hm (admite horas con minutos: 1:30), tipo: 'num' (por defecto) | 'opt' (botones para elegir) |
//     'expr' (una cuenta o ecuación escrita) | 'lista' (varios números), ops (para 'opt': [{ v, l }]),
//     chips (para 'expr': ejemplos para pulsar), teclas (para 'expr': botones de símbolos) }
//   l, ej y ay pueden ser funciones (opciones elegidas) => texto, para cambiar según el botón elegido.
// run(v) recibe los números ya leídos (null si un campo opcional está vacío; el texto en 'expr'; una lista en 'lista';
// la opción elegida en 'opt') y devuelve
//   { val (resultado grande), uni (unidad), etq (título del resultado), frase (explicación con palabras),
//     extra: [{ l, v }] (otros resultados), formula (en palabras), con (la fórmula con los números),
//     pasos: [{ t (qué se hace), op (la cuenta), op2 (otra línea), queda (lo que queda) }], truco,
//     res (una línea para el historial), copia (número que copia el botón de copiar) }
//   o lanza calcErr('mensaje') si los datos no sirven.

const CALC_GRUPOS = ['Porcentajes', 'Dinero y negocio', 'Cantidades y repartos', 'Trabajo y tiempo', 'Ecuaciones y cuentas'];

// ===== Números =====
// Se escriben al estilo español: coma para los decimales y punto (opcional) para los miles: 1.500,25.
// Para no fallar con el teclado del móvil, un punto que no separa miles (1.5, 12.75) se toma como coma decimal.
function calcNum(s) {
  s = String(s == null ? '' : s).replace(/[\s€%]/g, '').replace(/[−–—]/g, '-').replace(/^\+/, '');
  if (!s) return null;
  if (/^-?[1-9]\d{0,2}(\.\d{3})+(,\d+)?$/.test(s)) return parseFloat(s.replace(/\./g, '').replace(',', '.'));
  if (/^-?\d*,\d+$/.test(s) || /^-?\d+,?$/.test(s)) return parseFloat(s.replace(',', '.'));
  if (/^-?\d*\.\d+$/.test(s)) return parseFloat(s);
  return NaN;
}
// Horas con minutos: «1:30» = 1,5 h. Si no es así, como un número normal.
function calcHoras(s) {
  const m = /^\s*(\d+)\s*[:h]\s*([0-5]?\d)\s*(min)?\s*$/i.exec(String(s || ''));
  return m ? +m[1] + +m[2] / 60 : calcNum(s);
}
// Redondea a d decimales sin los fallos típicos de los decimales en el ordenador (1,005 → 1,01).
function calcRound(x, d) {
  if (!isFinite(x) || x === 0) return x;
  const a = Math.abs(x);
  if (a >= 1e15 || a < 1e-6) return Number(x.toFixed(Math.min(d, 20)));
  return Math.sign(x) * Number(Math.round(Number(a + 'e' + d)) + 'e-' + d);
}
// ¿Se puede escribir x con d decimales sin perder nada?
const calcExact = (x, d) => { d = d == null ? 2 : d; return !isFinite(x) || Math.abs(x - calcRound(x, d)) <= Math.min(1e-9 * Math.max(1, Math.abs(x)), Math.pow(10, -d - 2)); };
// Escribe un número al estilo español: 1.500,25. d = decimales como mucho (2 si no se dice).
// money = dinero: si tiene decimales, siempre dos (31,50). Los números muy pequeños usan más decimales para no salir 0.
function calcFmt(x, d, money) {
  if (x == null || !isFinite(x)) return '—';
  d = d == null ? 2 : d;
  let r = calcRound(x, d);
  if (r === 0 && x !== 0 && Math.abs(x) >= 1e-10) { while (d < 10 && calcRound(x, d) === 0) d++; r = calcRound(x, d); }
  if (r === 0) r = 0; // sin «-0»
  let s = Math.abs(r).toFixed(d);
  if (money && d <= 2 && Math.abs(r) !== Math.trunc(Math.abs(r))) s = Math.abs(r).toFixed(2);
  else if (s.indexOf('.') >= 0) s = s.replace(/0+$/, '').replace(/\.$/, '');
  const p = s.split('.');
  return (r < 0 ? '-' : '') + p[0].replace(/\B(?=(\d{3})+$)/g, '.') + (p[1] ? ',' + p[1] : '');
}
// Error con un mensaje para la persona (se enseña en el recuadro del resultado)
function calcErr(m) { const e = new Error(m); e.calc = true; return e; }
// Texto sin tildes y en minúsculas (para el buscador)
const calcNorm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const calcVal = (x, opt) => (typeof x === 'function' ? x(opt || {}) : x);

// ===== Cuentas escritas (operación libre y despejar la x) =====
// Admite: números al estilo español, + − × ÷ (también * / : · y la x entre números si no hay ecuación),
// paréntesis, % («150 + 21 %» suma el 21 % de 150, como en una calculadora; «21 % de 150» saca el porcentaje)
// y, en las ecuaciones, la x y un signo =. «3x» y «2(x + 1)» se entienden como multiplicaciones.
const CALC_SYM = { '+': '+', '-': '−', '*': '×', '/': '÷' };
const CALC_PREC = { '+': 1, '-': 1, '*': 2, '/': 2 };
function calcTokens(src, conX) {
  const s = String(src || '').replace(/[−–—]/g, '-').replace(/[×·]/g, '*').replace(/[÷:]/g, '/');
  const numRx = /^(?:[1-9]\d{0,2}(?:\.\d{3})+(?![\d.])(?:,\d+)?|\d+(?:[.,]\d+)?|[.,]\d+)/;
  const out = [];
  let i = 0;
  while (i < s.length) {
    const ch = s[i], rest = s.slice(i);
    if (/\s/.test(ch)) { i++; continue; }
    const m = numRx.exec(rest);
    if (m) {
      const t = m[0], grupos = /^[1-9]\d{0,2}(\.\d{3})+/.test(t);
      out.push({ t: 'n', v: parseFloat(grupos ? t.replace(/\./g, '').replace(',', '.') : t.replace(',', '.')) });
      i += t.length; continue;
    }
    if (/^de(?![a-záéíóúñ])/i.test(rest)) { out.push({ t: 'op', v: '*', de: true }); i += 2; continue; }
    if (ch === 'x' || ch === 'X') { out.push(conX ? { t: 'x' } : { t: 'op', v: '*' }); i++; continue; }
    if (ch === '+' || ch === '-' || ch === '*' || ch === '/') { out.push({ t: 'op', v: ch }); i++; continue; }
    if (ch === '(' || ch === ')' || ch === '%' || ch === '=') { out.push({ t: ch }); i++; continue; }
    if (ch === '[' || ch === '{') { out.push({ t: '(' }); i++; continue; }
    if (ch === ']' || ch === '}') { out.push({ t: ')' }); i++; continue; }
    throw calcErr('No entiendo «' + ch + '». Usa números, + − × ÷, paréntesis' + (conX ? ', la letra x' : '') + ' y %.');
  }
  return out;
}
// Convierte las piezas en un árbol con el orden de las operaciones de siempre: primero paréntesis,
// después × y ÷, y por último + y −.
// Nodos: n (número), x, par (paréntesis), neg (signo menos), pct (porcentaje), pctop (a ± b %), bin (a op b).
function calcParse(toks) {
  let i = 0;
  const peek = () => toks[i], next = () => toks[i++];
  const fail = m => { throw calcErr(m); };
  const isOp = (k, ops) => k && k.t === 'op' && ops.includes(k.v);
  function expr() {
    let a = term();
    while (isOp(peek(), '+-')) {
      const op = next().v, b = term();
      a = b.t === 'pct' ? { t: 'pctop', op, a, p: b.a } : { t: 'bin', op, a, b };
    }
    return a;
  }
  function term() {
    let a = unary();
    for (;;) {
      const k = peek();
      if (isOp(k, '*/')) {
        next();
        if (k.de && a.t !== 'pct') fail('«de» solo se usa con porcentajes, por ejemplo 21 % de 150.');
        a = { t: 'bin', op: k.v, a, b: unary(), de: !!k.de }; continue;
      }
      if (k && (k.t === 'x' || k.t === '(')) { a = { t: 'bin', op: '*', a, b: unary(), imp: true }; continue; }
      return a;
    }
  }
  function unary() {
    const k = peek();
    if (isOp(k, '+-')) { next(); const a = unary(); return k.v === '-' ? { t: 'neg', a } : a; }
    let a = prim();
    while (peek() && peek().t === '%') { next(); a = { t: 'pct', a }; }
    return a;
  }
  function prim() {
    const k = next();
    if (!k) fail(i <= 1 ? 'Escribe una cuenta.' : 'Falta un número al final.');
    if (k.t === 'n') return { t: 'n', v: k.v };
    if (k.t === 'x') return { t: 'x' };
    if (k.t === '(') {
      if (peek() && peek().t === ')') fail('Hay un paréntesis vacío «()».');
      const a = expr(), c = next();
      if (!c || c.t !== ')') fail('Falta cerrar un paréntesis: pon «)» donde termina.');
      return { t: 'par', a };
    }
    if (k.t === ')') fail('Sobra un paréntesis «)», o falta algo antes de él.');
    if (k.t === '%') fail('El % tiene que ir detrás de un número (por ejemplo 21 %).');
    if (k.t === '=') fail('Falta algo a un lado del signo =.');
    fail(k.de ? 'Falta el porcentaje antes de «de» (por ejemplo 21 % de 150).' : 'Falta un número antes de «' + CALC_SYM[k.v] + '».');
  }
  if (!toks.length) fail('Escribe una cuenta.');
  const a = expr();
  if (i < toks.length) {
    const k = toks[i];
    fail(k.t === ')' ? 'Sobra un paréntesis «)».' : k.t === 'n' ? 'Entre dos números falta un signo (+ − × ÷).' : k.t === '=' ? 'Solo puede haber un signo =.' : 'Hay algo que sobra o está mal colocado.');
  }
  return a;
}
const calcHasX = n => n.t === 'x' || ['a', 'b', 'p'].some(k => n[k] && calcHasX(n[k]));
// Valor de un árbol (con x = el número que se diga)
function calcEval(n, x) {
  switch (n.t) {
    case 'n': return n.v;
    case 'x': return x;
    case 'par': return calcEval(n.a, x);
    case 'neg': return -calcEval(n.a, x);
    case 'pct': return calcEval(n.a, x) / 100;
    case 'pctop': { const a = calcEval(n.a, x), p = calcEval(n.p, x); return n.op === '+' ? a + a * p / 100 : a - a * p / 100; }
    case 'bin': {
      const a = calcEval(n.a, x), b = calcEval(n.b, x);
      if (n.op === '/' && b === 0) throw calcErr('Hay una división entre 0, y eso no se puede hacer.');
      return n.op === '+' ? a + b : n.op === '-' ? a - b : n.op === '*' ? a * b : a / b;
    }
  }
  return NaN;
}
// Número dentro de una cuenta escrita: hasta 4 decimales, con «−» y entre paréntesis si es negativo
const calcNumTxt = (v, paren) => (v < 0 ? (paren === false ? '−' : '(−') + calcFmt(-v, 4) + (paren === false ? '' : ')') : calcFmt(v, 4));
// Escribe el árbol como texto. sub = número que se pone en lugar de la x (para comprobar).
function calcPrint(n, sub) {
  const wrap = (s, p, ctx) => (p < ctx ? '(' + s + ')' : s);
  function pr(n, ctx, first) {
    switch (n.t) {
      case 'n': return calcNumTxt(n.v, first ? false : true);
      case 'x': return sub == null ? 'x' : calcNumTxt(sub, first ? false : true);
      case 'par': return '(' + pr(n.a, 0, true) + ')';
      case 'neg': return '−' + pr(n.a, 3);
      case 'pct': return pr(n.a, 3, first) + ' %';
      case 'pctop': return wrap(pr(n.a, 1, first) + ' ' + CALC_SYM[n.op] + ' ' + pr(n.p, 3) + ' %', 1, ctx);
      case 'bin': {
        const p = CALC_PREC[n.op];
        if (n.imp && sub == null && n.b.t === 'x' && n.a.t === 'n') return wrap(calcNumTxt(n.a.v, false) + 'x', p, ctx);
        if (n.imp && sub == null && n.b.t === 'par') return wrap(pr(n.a, p, first) + pr(n.b, 3), p, ctx);
        return wrap(pr(n.a, p, first) + ' ' + (n.de ? 'de' : CALC_SYM[n.op]) + ' ' + pr(n.b, p + (n.op === '-' || n.op === '/' ? 0.5 : 0)), p, ctx);
      }
    }
    return '';
  }
  return pr(n, 0, true);
}
// Resuelve una cuenta paso a paso, en el mismo orden en que se haría a mano. Devuelve { pasos, valor }.
function calcPasos(root) {
  const num = v => ({ t: 'n', v });
  const isN = k => k.t === 'n';
  const F4 = v => calcNumTxt(v), F1 = v => calcNumTxt(v, false);
  const ex = (...vs) => (vs.every(v => calcExact(v, 4)) ? '=' : '≈');
  // Sumas y restas fuera de los paréntesis (para explicar el orden: × y ÷ antes que + y −)
  const masMenos = n => (n.t === 'par' ? 0 : (n.t === 'bin' && (n.op === '+' || n.op === '-')) || n.t === 'pctop' ? 1 : 0) + (n.t === 'par' ? 0 : ['a', 'b', 'p'].reduce((s, k) => s + (n[k] ? masMenos(n[k]) : 0), 0));
  // Quita paréntesis alrededor de un número y junta el signo menos con el número
  const strip = n => {
    if (n.t === 'n' || n.t === 'x') return n;
    const m = { ...n };
    ['a', 'b', 'p'].forEach(k => { if (m[k]) m[k] = strip(m[k]); });
    if (m.t === 'par' && isN(m.a)) return m.a;
    if (m.t === 'neg' && isN(m.a)) return num(-m.a.v);
    return m;
  };
  function reduce(n, enPar, mix) {
    if (n.t === 'n') return null;
    if (n.t === 'par') { const r = reduce(n.a, true, mix); return r && { ...r, node: { t: 'par', a: r.node } }; }
    if (n.t === 'neg') { const r = reduce(n.a, enPar, mix); return r && { ...r, node: { t: 'neg', a: r.node } }; }
    const pre = enPar ? 'Primero, lo que está dentro del paréntesis. ' : '';
    // 21 % de 150
    if (n.t === 'bin' && n.de && n.a.t === 'pct' && isN(n.a.a) && isN(n.b)) {
      const p = n.a.a.v, b = n.b.v, v = b * p / 100;
      return { node: num(v), t: pre + 'Saca el porcentaje: el número × el porcentaje ÷ 100.', op: calcFmt(p, 4) + ' % de ' + F4(b) + ' = ' + F1(b) + ' × ' + F4(p) + ' ÷ 100 ' + ex(v) + ' ' + F1(v) };
    }
    // 150 + 21 %: el 21 % se calcula sobre lo que va delante
    if (n.t === 'pctop' && isN(n.a) && isN(n.p)) {
      const a = n.a.v, p = n.p.v, part = a * p / 100;
      return { node: { t: 'bin', op: n.op, a: n.a, b: num(part) }, t: pre + 'Calcula el porcentaje. Cuando sumas o restas un %, es el % del número que va delante.', op: calcFmt(p, 4) + ' % de ' + F4(a) + ' = ' + F1(a) + ' × ' + F4(p) + ' ÷ 100 ' + ex(part) + ' ' + F1(part) };
    }
    const hijos = n.t === 'bin' ? ['a', 'b'] : n.t === 'pctop' ? ['a', 'p'] : ['a'];
    for (const k of hijos) {
      if (n.t === 'bin' && n.de && k === 'a' && n.a.t === 'pct') { // en «x % de y» se calcula todo junto
        const r = reduce(n.a.a, enPar, mix);
        if (r) return { ...r, node: { ...n, a: { t: 'pct', a: r.node } } };
        continue;
      }
      const r = reduce(n[k], enPar, mix);
      if (r) return { ...r, node: { ...n, [k]: r.node } };
    }
    if (n.t === 'pct') { const v = n.a.v / 100; return { node: num(v), t: pre + 'Un porcentaje es dividir entre 100.', op: calcFmt(n.a.v, 4) + ' % = ' + F1(n.a.v) + ' ÷ 100 ' + ex(v) + ' ' + F1(v) }; }
    if (n.t === 'bin') {
      const a = n.a.v, b = n.b.v;
      if (n.op === '/' && b === 0) throw calcErr('Hay una división entre 0, y eso no se puede hacer.');
      const v = n.op === '+' ? a + b : n.op === '-' ? a - b : n.op === '*' ? a * b : a / b;
      const que = { '+': 'Suma.', '-': 'Resta.', '*': 'Multiplica.', '/': 'Divide.' }[n.op];
      const por = enPar ? '' : (n.op === '*' || n.op === '/') && mix ? ' Multiplicar y dividir va antes que sumar y restar.' : (n.op === '+' || n.op === '-') && mix === 2 ? ' Las sumas y restas, de izquierda a derecha.' : '';
      return { node: num(v), t: pre + que + por, op: F1(a) + ' ' + CALC_SYM[n.op] + ' ' + F4(b) + ' ' + ex(a, b, v) + ' ' + F1(v) };
    }
    return null;
  }
  const pasos = [];
  let node = strip(root), vueltas = 0;
  while (node.t !== 'n' && vueltas++ < 80) {
    const mix = Math.min(2, masMenos(node));
    const r = reduce(node, false, mix);
    if (!r) break;
    node = strip(r.node);
    pasos.push({ t: r.t, op: r.op, queda: node.t === 'n' ? '' : 'Queda: ' + calcPrint(node) });
  }
  return { pasos, valor: node.t === 'n' ? node.v : calcEval(root) };
}
// Forma «a·x + b» de un lado de la ecuación (para juntar las x con las x y los números con los números)
const calcZ = v => (Math.abs(v) < 1e-12 ? 0 : v);
function calcLin(n) {
  const mul = (A, B) => {
    if (calcZ(A[0]) && calcZ(B[0])) throw calcErr('Hay una x multiplicada por otra x (x²). Esta calculadora resuelve ecuaciones de primer grado, con la x sin elevar.');
    return [A[0] * B[1] + B[0] * A[1], A[1] * B[1]];
  };
  switch (n.t) {
    case 'n': return [0, n.v];
    case 'x': return [1, 0];
    case 'par': return calcLin(n.a);
    case 'neg': { const A = calcLin(n.a); return [-A[0], -A[1]]; }
    case 'pct': { const A = calcLin(n.a); return [A[0] / 100, A[1] / 100]; }
    case 'pctop': { const A = calcLin(n.a), m = mul(A, calcLin(n.p)), s = n.op === '+' ? 1 : -1; return [A[0] + s * m[0] / 100, A[1] + s * m[1] / 100]; }
    case 'bin': {
      const A = calcLin(n.a), B = calcLin(n.b);
      if (n.op === '+') return [A[0] + B[0], A[1] + B[1]];
      if (n.op === '-') return [A[0] - B[0], A[1] - B[1]];
      if (n.op === '*') return mul(A, B);
      if (calcZ(B[0])) throw calcErr('La x está debajo de una división junto con otras cosas. Esta calculadora no sabe resolver ese caso: prueba a pasar lo de abajo multiplicando al otro lado y escríbela de nuevo.');
      if (!calcZ(B[1])) throw calcErr('Hay una división entre 0, y eso no se puede hacer.');
      return [A[0] / B[1], A[1] / B[1]];
    }
  }
  return [0, 0];
}
const calcXTxt = a => (!calcZ(a - 1) ? 'x' : !calcZ(a + 1) ? '−x' : calcNumTxt(a, false) + 'x');
const calcLinTxt = (a, b) => {
  a = calcZ(a); b = calcZ(b);
  if (!a) return calcNumTxt(b, false);
  return calcXTxt(a) + (b > 0 ? ' + ' + calcNumTxt(b) : b < 0 ? ' − ' + calcFmt(-b, 4) : '');
};
const calcLinNode = (a, b) => {
  a = calcZ(a); b = calcZ(b);
  const xn = !calcZ(a - 1) ? { t: 'x' } : !calcZ(a + 1) ? { t: 'neg', a: { t: 'x' } } : { t: 'bin', op: '*', a: { t: 'n', v: a }, b: { t: 'x' }, imp: true };
  if (!a) return { t: 'n', v: b };
  return b ? { t: 'bin', op: b > 0 ? '+' : '-', a: xn, b: { t: 'n', v: Math.abs(b) } } : xn;
};
// Despeja la x de una ecuación de primer grado, explicando cada paso. Devuelve { x, todos, ninguno, pasos, L, R }.
function calcDespejar(src) {
  const toks = calcTokens(src, true);
  const iguales = toks.filter(t => t.t === '=').length;
  if (!toks.length) throw calcErr('Escribe una ecuación, por ejemplo 3x + 5 = 20.');
  if (!iguales) throw calcErr('Falta el signo = (por ejemplo 3x + 5 = 20).');
  if (iguales > 1) throw calcErr('Solo puede haber un signo =.');
  if (!toks.some(t => t.t === 'x')) throw calcErr('Falta la x: escríbela donde va el número que buscas.');
  const at = toks.findIndex(t => t.t === '=');
  if (at === 0) throw calcErr('Falta lo que va a la izquierda del signo =.');
  if (at === toks.length - 1) throw calcErr('Falta lo que va a la derecha del signo =.');
  const L0 = calcParse(toks.slice(0, at)), R0 = calcParse(toks.slice(at + 1));
  const T = calcPrint, N4 = v => calcNumTxt(v, false), Np = v => calcNumTxt(v);
  const ex = (...vs) => (vs.every(v => calcExact(v, 4)) ? '=' : '≈');
  const pasos = [];
  let L = L0, R = R0;
  const fin = (a, b, c) => { // queda a·x + b = c sin x: o vale cualquier número o ninguno
    const igual = !calcZ(b - c);
    return { todos: igual, ninguno: !igual, pasos, L: L0, R: R0, queda: N4(b) + ' = ' + N4(c) };
  };
  // x a los dos lados: se juntan las x a la izquierda y los números a la derecha
  if (calcHasX(L) && calcHasX(R)) {
    let [a1, b1] = calcLin(L), [a2, b2] = calcLin(R);
    const ori = T(L) + ' = ' + T(R), simp = calcLinTxt(a1, b1) + ' = ' + calcLinTxt(a2, b2);
    if (ori !== simp) pasos.push({ t: 'Simplifica cada lado: haz las cuentas que puedas, quita los paréntesis y junta las x con las x y los números con los números.', op: ori, queda: '→ ' + simp });
    const mov = a2 > 0 ? 'La ' + calcXTxt(a2) + ' de la derecha está sumando: pásala a la izquierda restando.' : 'La ' + calcXTxt(-a2) + ' de la derecha está restando: pásala a la izquierda sumando.';
    const izq = calcXTxt(a1) + (a2 > 0 ? ' − ' : ' + ') + calcXTxt(Math.abs(a2)) + (calcZ(b1) > 0 ? ' + ' + Np(b1) : calcZ(b1) < 0 ? ' − ' + calcFmt(-b1, 4) : '');
    const a = calcZ(a1 - a2);
    pasos.push({ t: mov, op: izq + ' = ' + calcLinTxt(0, b2), queda: '→ ' + calcLinTxt(a, b1) + ' = ' + calcLinTxt(0, b2) });
    if (!a) return fin(0, b1, b2);
    L = calcLinNode(a, b1); R = { t: 'n', v: b2 };
  } else if (calcHasX(R)) {
    pasos.push({ t: 'Da la vuelta a la ecuación para tener la x a la izquierda. Es lo mismo leído al revés.', op: T(R) + ' = ' + T(L) });
    [L, R] = [R, L];
  }
  // Lo de la derecha, un solo número
  let r = calcEval(R);
  if (R.t !== 'n') pasos.push({ t: 'Haz la cuenta del lado derecho.', op: T(R) + ' ' + ex(r) + ' ' + N4(r), queda: '→ ' + T(L) + ' = ' + N4(r) });
  // Se va quitando lo que rodea a la x, de fuera hacia dentro
  const cte = n => { const v = calcEval(n); return { v, txt: n.t === 'n' ? 'El ' + N4(v) : n.t === 'pct' && n.a.t === 'n' ? 'El ' + T(n) + ' (que es ' + N4(n.a.v) + ' ÷ 100 = ' + N4(v) + ')' : 'Lo de «' + T(n) + '» (que da ' + N4(v) + ')' }; };
  let vueltas = 0;
  while (L.t !== 'x' && vueltas++ < 40) {
    if (L.t === 'par') { L = L.a; continue; }
    if (L.t === 'neg') {
      pasos.push({ t: 'Delante hay un signo menos: cámbiale el signo a los dos lados.', op: T(L) + ' = ' + N4(r), queda: '→ ' + T(L.a) + ' = ' + N4(-r) });
      L = L.a; r = -r; continue;
    }
    if (L.t === 'bin' && calcHasX(L.a) !== calcHasX(L.b)) {
      const xa = calcHasX(L.a), c = cte(xa ? L.b : L.a);
      let xn = xa ? L.a : L.b;
      while (xn.t === 'par') xn = xn.a;
      const X = T(xn);
      let t, op, nr, sig = xn;
      if (L.op === '+') { t = c.txt + ' está sumando: pásalo al otro lado restando.'; nr = r - c.v; op = X + ' = ' + N4(r) + ' − ' + Np(c.v); }
      else if (L.op === '-' && xa) { t = c.txt + ' está restando: pásalo al otro lado sumando.'; nr = r + c.v; op = X + ' = ' + N4(r) + ' + ' + Np(c.v); }
      else if (L.op === '-') { t = c.txt + ' está sumando: pásalo al otro lado restando (la x se queda con el signo menos).'; nr = r - c.v; sig = { t: 'neg', a: xn }; op = T(sig) + ' = ' + N4(r) + ' − ' + Np(c.v); }
      else if (L.op === '*') {
        if (!calcZ(c.v)) { const f = fin(0, 0, r); f.porCero = true; return f; }
        t = c.txt + ' está multiplicando' + (xn.t === 'x' ? ' a la x' : '') + ': pásalo al otro lado dividiendo.'; nr = r / c.v; op = X + ' = ' + N4(r) + ' ÷ ' + Np(c.v);
      } else if (xa) {
        if (!calcZ(c.v)) throw calcErr('Hay una división entre 0, y eso no se puede hacer.');
        t = c.txt + ' está dividiendo: pásalo al otro lado multiplicando.'; nr = r * c.v; op = X + ' = ' + N4(r) + ' × ' + Np(c.v);
      } else {
        if (!calcZ(r)) return { todos: false, ninguno: true, pasos, L: L0, R: R0, queda: 'una división que da 0' };
        t = 'La x está abajo, dividiendo: cambia los papeles. Lo de abajo es lo de arriba entre el resultado.'; nr = c.v / r; op = X + ' = ' + N4(c.v) + ' ÷ ' + Np(r);
      }
      pasos.push({ t, op, queda: '→ ' + T(sig) + ' ' + ex(nr, c.v, r) + ' ' + N4(nr) });
      L = sig; r = nr; continue;
    }
    if (L.t === 'pct') {
      pasos.push({ t: 'El % es dividir entre 100: pásalo al otro lado multiplicando por 100.', op: T(L.a) + ' = ' + N4(r) + ' × 100', queda: '→ ' + T(L.a) + ' = ' + N4(r * 100) });
      L = L.a; r *= 100; continue;
    }
    if (L.t === 'pctop' && calcHasX(L.a) && !calcHasX(L.p)) {
      const p = calcEval(L.p), k = L.op === '+' ? 1 + p / 100 : 1 - p / 100;
      if (!calcZ(k)) return fin(0, 0, r);
      pasos.push({ t: (L.op === '+' ? 'Sumar' : 'Restar') + ' un ' + calcFmt(p, 4) + ' % es lo mismo que multiplicar por ' + N4(k) + ' (1 ' + (L.op === '+' ? '+' : '−') + ' ' + calcFmt(p, 4) + ' ÷ 100): pásalo al otro lado dividiendo.', op: T(L.a) + ' = ' + N4(r) + ' ÷ ' + Np(k), queda: '→ ' + T(L.a) + ' ' + ex(r / k) + ' ' + N4(r / k) });
      L = L.a; r /= k; continue;
    }
    // Hay x en las dos partes de la operación (3x + 2x, 2(x + 1) + x…): se junta todo
    const [a, b] = calcLin(L), nuevo = calcLinNode(a, b);
    pasos.push({ t: 'Junta las x con las x y los números con los números.', op: T(L) + ' = ' + N4(r), queda: '→ ' + T(nuevo) + ' = ' + N4(r) });
    if (!calcZ(a)) return fin(0, b, r);
    if (T(nuevo) === T(L)) break;
    L = nuevo;
  }
  if (L.t !== 'x') throw calcErr('No he sabido despejar la x en esta ecuación.');
  return { x: r, pasos, L: L0, R: R0 };
}

// ===== Los cálculos =====
const CALCS = (() => {
  const F = (x, d) => calcFmt(x, d == null ? 2 : d);
  const Mv = x => calcFmt(x, 2, true);
  const M = x => Mv(x) + ' €';
  const P = (x, d) => F(x, d) + ' %';
  const o = (x, d) => (x < 0 ? '(' + F(x, d) + ')' : F(x, d)); // dentro de una cuenta, el negativo entre paréntesis
  const om = x => (x < 0 ? '(' + Mv(x) + ')' : Mv(x));
  const eq = (x, d) => (calcExact(x, d == null ? 2 : d) ? '=' : '≈');
  const pl = (n, uno, varios) => (Math.abs(n) === 1 ? uno : varios);
  const no = m => { throw calcErr(m); };
  const arriba = q => Math.ceil(q - 1e-9);
  const hm = h => { const t = Math.round(h * 60), a = Math.floor(t / 60), b = t % 60; return b ? a + ' h ' + b + ' min' : a + ' h'; };
  const TECLAS = [{ l: '+', ins: ' + ' }, { l: '−', ins: ' − ' }, { l: '×', ins: ' × ' }, { l: '÷', ins: ' ÷ ' }, { l: '(', ins: '(' }, { l: ')', ins: ')' }, { l: '%', ins: ' %' }, { l: ',', ins: ',', title: 'Coma decimal' }];
  return [
    // ---------- Porcentajes ----------
    {
      id: 'pct-de', g: 'Porcentajes', n: 'El % de una cantidad', q: '¿Cuánto es un porcentaje de una cantidad?',
      d: 'Por ejemplo, cuánto es el 21 % de 150.', kw: 'tanto por ciento parte propina comision iva',
      f: [{ k: 'p', l: 'Porcentaje', u: '%', ej: '21' }, { k: 'n', l: 'Cantidad', ej: '150', ay: 'De qué cantidad quieres sacar el porcentaje.' }],
      run(v) {
        const m = v.n * v.p, r = m / 100;
        return {
          val: F(r), frase: 'El ' + P(v.p) + ' de ' + F(v.n) + ' es ' + F(r) + '.',
          formula: 'Cantidad × Porcentaje ÷ 100', con: o(v.n) + ' × ' + o(v.p) + ' ÷ 100 ' + eq(r) + ' ' + F(r),
          pasos: [
            { t: 'Multiplica la cantidad por el porcentaje.', op: o(v.n) + ' × ' + o(v.p) + ' ' + eq(m) + ' ' + F(m) },
            { t: 'Divide entre 100, porque «por ciento» quiere decir «de cada 100».', op: F(m) + ' ÷ 100 ' + eq(r) + ' ' + F(r) }
          ],
          truco: 'Atajos: el 10 % es dividir entre 10 · el 50 % es la mitad · el 25 % es la mitad de la mitad · el 1 % es dividir entre 100.',
          res: P(v.p) + ' de ' + F(v.n) + ' = ' + F(r), copia: r
        };
      }
    },
    {
      id: 'pct-que', g: 'Porcentajes', n: 'Qué % es una parte', q: '¿Qué porcentaje es una cantidad de otra?',
      d: 'Por ejemplo, qué % son 30 de 120.', kw: 'tanto por ciento proporcion parte total',
      f: [{ k: 'a', l: 'Parte', ej: '30', ay: 'Lo que quieres comparar.' }, { k: 't', l: 'Total', ej: '120', ay: 'El todo (lo que sería el 100 %).' }],
      run(v) {
        if (!v.t) no('El total no puede ser 0 (no se puede dividir entre 0).');
        const c = v.a / v.t, r = c * 100;
        return {
          val: F(r), uni: '%', frase: F(v.a) + ' es el ' + P(r) + ' de ' + F(v.t) + '.',
          formula: 'Parte ÷ Total × 100', con: o(v.a) + ' ÷ ' + o(v.t) + ' × 100 ' + eq(r) + ' ' + P(r),
          pasos: [
            { t: 'Divide la parte entre el total. Te dice qué trozo del total es.', op: o(v.a) + ' ÷ ' + o(v.t) + ' ' + eq(c, 4) + ' ' + F(c, 4) },
            { t: 'Multiplica por 100 para pasarlo a porcentaje.', op: F(c, 4) + ' × 100 ' + eq(r) + ' ' + P(r) }
          ],
          truco: 'Si la parte es más grande que el total, sale más del 100 %.',
          res: F(v.a) + ' de ' + F(v.t) + ' = ' + P(r), copia: r
        };
      }
    },
    {
      id: 'pct-sumar', g: 'Porcentajes', n: 'Sumar un %', q: '¿Cuánto es una cantidad más un porcentaje?',
      d: 'Para subidas de precio, propinas o recargos. Por ejemplo, 200 más un 10 %.', kw: 'subida aumento incremento recargo propina',
      f: [{ k: 'n', l: 'Cantidad', ej: '200' }, { k: 'p', l: 'Porcentaje que se suma', u: '%', ej: '10' }],
      run(v) {
        const add = v.n * v.p / 100, r = v.n + add, k = 1 + v.p / 100;
        return {
          val: F(r), frase: F(v.n) + ' más un ' + P(v.p) + ' es ' + F(r) + '. Se suman ' + F(add) + '.',
          extra: [{ l: 'Se suma', v: F(add) }, { l: 'Total', v: F(r) }],
          formula: 'Cantidad + Cantidad × Porcentaje ÷ 100', con: o(v.n) + ' + ' + o(v.n) + ' × ' + o(v.p) + ' ÷ 100 ' + eq(r) + ' ' + F(r),
          pasos: [
            { t: 'Calcula cuánto es ese porcentaje de la cantidad.', op: o(v.n) + ' × ' + o(v.p) + ' ÷ 100 ' + eq(add) + ' ' + F(add) },
            { t: 'Súmaselo a la cantidad.', op: o(v.n) + ' + ' + o(add) + ' ' + eq(r) + ' ' + F(r) }
          ],
          truco: 'Atajo en un solo paso: multiplica por ' + F(k, 4) + ' (1 + ' + F(v.p) + ' ÷ 100): ' + o(v.n) + ' × ' + F(k, 4) + ' ' + eq(r) + ' ' + F(r) + '.',
          res: F(v.n) + ' + ' + P(v.p) + ' = ' + F(r), copia: r
        };
      }
    },
    {
      id: 'pct-restar', g: 'Porcentajes', n: 'Restar un % (descuento)', q: '¿Cuánto queda al quitar un porcentaje?',
      d: 'Para descuentos y rebajas. Por ejemplo, 80 con un 15 % de descuento.', kw: 'descuento rebaja oferta bajada',
      f: [{ k: 'n', l: 'Cantidad o precio', ej: '80' }, { k: 'p', l: 'Descuento', u: '%', ej: '15' }],
      run(v) {
        const sub = v.n * v.p / 100, r = v.n - sub, k = 1 - v.p / 100;
        return {
          val: F(r), frase: F(v.n) + ' con un ' + P(v.p) + ' de descuento se queda en ' + F(r) + '. Te ahorras ' + F(sub) + '.',
          extra: [{ l: 'Se descuenta', v: F(sub) }, { l: 'Queda', v: F(r) }],
          formula: 'Cantidad − Cantidad × Porcentaje ÷ 100', con: o(v.n) + ' − ' + o(v.n) + ' × ' + o(v.p) + ' ÷ 100 ' + eq(r) + ' ' + F(r),
          pasos: [
            { t: 'Calcula cuánto es el descuento: el porcentaje de la cantidad.', op: o(v.n) + ' × ' + o(v.p) + ' ÷ 100 ' + eq(sub) + ' ' + F(sub) },
            { t: 'Réstaselo a la cantidad.', op: o(v.n) + ' − ' + o(sub) + ' ' + eq(r) + ' ' + F(r) }
          ],
          truco: 'Atajo en un solo paso: multiplica por ' + F(k, 4) + ' (1 − ' + F(v.p) + ' ÷ 100): ' + o(v.n) + ' × ' + o(k, 4) + ' ' + eq(r) + ' ' + F(r) + '.',
          res: F(v.n) + ' − ' + P(v.p) + ' = ' + F(r), copia: r
        };
      }
    },
    {
      id: 'pct-cambio', g: 'Porcentajes', n: 'Cuánto ha subido o bajado', q: '¿Cuánto ha subido o bajado algo, en porcentaje?',
      d: 'Compara lo de antes con lo de ahora. Por ejemplo, de 50 a 65.', kw: 'variacion diferencia crecimiento subida bajada antes ahora',
      f: [{ k: 'a', l: 'Antes', ej: '50' }, { k: 'b', l: 'Ahora', ej: '65' }],
      run(v) {
        if (!v.a) no('Lo de antes no puede ser 0: partiendo de 0 no se puede calcular el porcentaje.');
        const d = v.b - v.a, c = d / v.a, r = c * 100;
        return {
          val: (r > 0 ? '+' : '') + F(r), uni: '%', etq: r > 0 ? 'Ha subido' : r < 0 ? 'Ha bajado' : 'No ha cambiado',
          frase: !calcZ(d) ? 'No ha cambiado: sigue en ' + F(v.a) + '.' : 'De ' + F(v.a) + ' a ' + F(v.b) + ' ha ' + (r > 0 ? 'subido' : 'bajado') + ' un ' + P(Math.abs(r)) + ' (' + F(Math.abs(d)) + (r > 0 ? ' más' : ' menos') + ').',
          formula: '(Ahora − Antes) ÷ Antes × 100', con: '(' + F(v.b) + ' − ' + o(v.a) + ') ÷ ' + o(v.a) + ' × 100 ' + eq(r) + ' ' + P(r),
          pasos: [
            { t: 'Resta: lo de ahora menos lo de antes. Es lo que ha cambiado.', op: o(v.b) + ' − ' + o(v.a) + ' = ' + F(d) },
            { t: 'Divide ese cambio entre lo de antes.', op: o(d) + ' ÷ ' + o(v.a) + ' ' + eq(c, 4) + ' ' + F(c, 4) },
            { t: 'Multiplica por 100 para pasarlo a porcentaje.' + (r < 0 ? ' Sale negativo porque ha bajado.' : ''), op: o(c, 4) + ' × 100 ' + eq(r) + ' ' + P(r) }
          ],
          truco: 'Ojo: subir un 50 % y luego bajar un 50 % no te deja igual (100 → 150 → 75), porque el porcentaje siempre se calcula sobre lo de antes.',
          res: F(v.a) + ' → ' + F(v.b) + ': ' + (r > 0 ? '+' : '') + P(r), copia: r
        };
      }
    },
    {
      id: 'pct-quitar', g: 'Porcentajes', n: 'Lo que era antes de un %', q: '¿Cuánto era antes de sumarle o restarle un porcentaje?',
      d: 'Por ejemplo, el precio sin IVA o el precio antes de una rebaja.', kw: 'quitar porcentaje original sin iva antes del descuento inverso',
      f: [
        { k: 'modo', tipo: 'opt', l: 'Al precio de antes…', ops: [{ v: 'sumado', l: 'se le sumó un % (subida, IVA…)' }, { v: 'restado', l: 'se le restó un % (descuento…)' }] },
        { k: 'f', l: 'Cantidad final (la de ahora)', ej: o => (o.modo === 'restado' ? '68' : '121') },
        { k: 'p', l: 'Porcentaje', u: '%', ej: o => (o.modo === 'restado' ? '15' : '21') }
      ],
      run(v) {
        const s = v.modo !== 'restado', k = s ? 1 + v.p / 100 : 1 - v.p / 100;
        if (k <= 0) no('Con un descuento del 100 % o más no se puede saber lo que costaba antes.');
        const r = v.f / k, mal = s ? v.f - v.f * v.p / 100 : v.f + v.f * v.p / 100;
        return {
          val: F(r), etq: 'Antes era',
          frase: s ? 'Antes de sumarle el ' + P(v.p) + ', era ' + F(r) + '. El ' + P(v.p) + ' eran ' + F(v.f - r) + '.' : 'Antes del descuento del ' + P(v.p) + ', era ' + F(r) + '. Te descontaron ' + F(r - v.f) + '.',
          formula: s ? 'Cantidad final ÷ (1 + Porcentaje ÷ 100)' : 'Cantidad final ÷ (1 − Porcentaje ÷ 100)',
          con: o(v.f) + ' ÷ (1 ' + (s ? '+' : '−') + ' ' + o(v.p) + ' ÷ 100) ' + eq(r) + ' ' + F(r),
          pasos: [
            { t: 'Convierte el porcentaje en un número: 1 ' + (s ? '+' : '−') + ' porcentaje ÷ 100.', op: '1 ' + (s ? '+' : '−') + ' ' + o(v.p) + ' ÷ 100 ' + eq(k, 4) + ' ' + F(k, 4) },
            { t: 'Divide la cantidad final entre ese número.', op: o(v.f) + ' ÷ ' + F(k, 4) + ' ' + eq(r) + ' ' + F(r) },
            { t: 'Comprueba: ' + (s ? 'súmale' : 'réstale') + ' el ' + P(v.p) + ' a ' + F(r) + ' y te tiene que dar la cantidad final.', op: o(r) + (s ? ' + ' : ' − ') + o(r) + ' × ' + o(v.p) + ' ÷ 100 ' + eq(r * k) + ' ' + F(r * k) }
          ],
          truco: '¡Ojo! ' + (s ? 'Restarle' : 'Sumarle') + ' el ' + P(v.p) + ' a la cantidad final no sirve: daría ' + F(mal) + ', y no es lo correcto. El porcentaje se calculó sobre la cantidad de antes, no sobre la final.',
          res: s ? F(v.f) + ' sin su ' + P(v.p) + ' = ' + F(r) : F(v.f) + ' antes del −' + P(v.p) + ' = ' + F(r), copia: r
        };
      }
    },
    // ---------- Dinero y negocio ----------
    {
      id: 'clientes', g: 'Dinero y negocio', n: 'Cuántos clientes necesito', q: '¿Cuántos clientes (o ventas) necesito para llegar a una cantidad?',
      d: 'Por ejemplo, cuántos clientes de 40 € necesito para ganar 1.500 €.', kw: 'ventas objetivo meta ingresos cuantos necesito',
      f: [
        { k: 'o', l: 'Quiero conseguir', u: '€', ej: '1.500', ay: 'Si es al mes, pon también al mes lo que paga cada cliente.' },
        { k: 'c', l: 'Cada cliente me paga', u: '€', ej: '40' },
        { k: 't', l: 'Ya tengo', u: '€', opc: true, ay: 'Déjalo vacío si empiezas de cero.' }
      ],
      run(v) {
        if (v.c <= 0) no('Lo que paga cada cliente tiene que ser más que 0.');
        const t = v.t || 0, falta = v.o - t;
        const resta = t ? { t: 'Resta lo que ya tienes a lo que quieres conseguir: es lo que te falta.', op: om(v.o) + ' − ' + om(t) + ' = ' + M(falta) } : null;
        if (falta <= 0) return { val: '0', uni: 'clientes', etq: 'Necesitas', frase: '¡Ya lo tienes! Con ' + M(t) + ' ya llegas a ' + M(v.o) + (falta < 0 ? ' y te sobran ' + M(-falta) : '') + '.', formula: 'Lo que quiero − Lo que ya tengo', pasos: [resta], res: M(v.o) + ' (ya tengo ' + M(t) + ') → 0 clientes', copia: 0 };
        const q = falta / v.c, n = arriba(q), justo = Math.abs(q - Math.round(q)) < 1e-9;
        const llego = t + n * v.c, antes = t + (n - 1) * v.c;
        return {
          val: F(n), uni: pl(n, 'cliente', 'clientes'), etq: 'Necesitas',
          frase: 'Necesitas ' + F(n) + ' ' + pl(n, 'cliente', 'clientes') + '.' + (justo ? ' Con ' + F(n) + ' llegas justo a ' + M(v.o) + '.' : ' Con ' + F(n) + ' llegas a ' + M(llego) + ' (' + M(llego - v.o) + ' de más); con ' + F(n - 1) + ' te quedarías en ' + M(antes) + '.'),
          extra: [t ? { l: 'Te falta', v: M(falta) } : null, { l: 'Con ' + F(n) + ' ' + pl(n, 'cliente', 'clientes'), v: M(llego) }],
          formula: (t ? '(Lo que quiero − Lo que ya tengo)' : 'Lo que quiero') + ' ÷ Lo que paga cada cliente, y redondear hacia arriba',
          con: (t ? '(' + Mv(v.o) + ' − ' + om(t) + ')' : om(v.o)) + ' ÷ ' + om(v.c) + ' ' + eq(q) + ' ' + F(q) + (justo ? '' : ' → ' + F(n)),
          pasos: [
            resta,
            { t: 'Divide lo que te falta entre lo que paga cada cliente.', op: om(falta) + ' ÷ ' + om(v.c) + ' ' + eq(q) + ' ' + F(q) },
            justo ? { t: 'Sale un número exacto: no hace falta redondear.', op: F(n) + ' ' + pl(n, 'cliente', 'clientes') }
              : { t: 'Redondea hacia arriba: no existe medio cliente, y si redondeas hacia abajo no llegas.', op: F(q) + ' → ' + F(n) + ' ' + pl(n, 'cliente', 'clientes') },
            { t: 'Comprueba: multiplica los clientes por lo que paga cada uno.', op: F(n) + ' × ' + om(v.c) + ' = ' + M(n * v.c) + (t ? ' (+ ' + M(t) + ' que ya tienes = ' + M(llego) + ')' : '') }
          ],
          res: M(v.o) + ' con clientes de ' + M(v.c) + (t ? ' (ya tengo ' + M(t) + ')' : '') + ' → ' + F(n) + ' ' + pl(n, 'cliente', 'clientes'), copia: n
        };
      }
    },
    {
      id: 'falta', g: 'Dinero y negocio', n: 'Cuánto me falta', q: '¿Cuánto me falta para llegar a una meta?',
      d: 'Y, si quieres, en cuántos meses llegas añadiendo algo cada mes.', kw: 'meta objetivo restar diferencia ahorro progreso',
      f: [
        { k: 'o', l: 'Meta', ej: '3.000', ay: 'A dónde quieres llegar: dinero, kilómetros, páginas…' },
        { k: 't', l: 'Ya tengo', ej: '1.850' },
        { k: 'm', l: 'Añado cada mes', opc: true, ay: 'Si lo rellenas, te digo en cuántos meses llegas.' }
      ],
      run(v) {
        const f = v.o - v.t, pasos = [{ t: 'Resta: la meta menos lo que ya tienes.', op: o(v.o) + ' − ' + o(v.t) + ' = ' + F(f) }];
        if (f <= 0) return { val: '0', etq: 'Te falta', frase: '¡Ya has llegado a la meta!' + (f < 0 ? ' Te sobran ' + F(-f) + '.' : ''), formula: 'Meta − Lo que ya tengo', pasos, res: 'Meta ' + F(v.o) + ', tengo ' + F(v.t) + ' → ya está', copia: 0 };
        const pc = v.o ? v.t / v.o * 100 : null;
        if (pc != null) pasos.push({ t: 'Para saber qué parte llevas, en porcentaje: lo que tienes ÷ la meta × 100.', op: o(v.t) + ' ÷ ' + o(v.o) + ' × 100 ' + eq(pc) + ' ' + P(pc) });
        let meses = null;
        if (v.m != null) {
          if (v.m <= 0) no('Lo que añades cada mes tiene que ser más que 0.');
          const q = f / v.m; meses = arriba(q);
          pasos.push({ t: 'Divide lo que te falta entre lo que añades cada mes' + (calcExact(q, 0) ? '.' : ', y redondea hacia arriba (si no, te quedarías corto).'), op: o(f) + ' ÷ ' + o(v.m) + ' ' + eq(q) + ' ' + F(q) + (calcExact(q, 0) ? '' : ' → ' + F(meses)) + ' ' + pl(meses, 'mes', 'meses') });
        }
        return {
          val: F(f), etq: 'Te falta',
          frase: 'Te faltan ' + F(f) + '.' + (pc != null ? ' Ya llevas el ' + P(pc) + ' del camino.' : '') + (meses != null ? ' Añadiendo ' + F(v.m) + ' al mes, llegas en ' + F(meses) + ' ' + pl(meses, 'mes', 'meses') + '.' : ''),
          extra: [{ l: 'Te falta', v: F(f) }, pc != null ? { l: 'Llevas', v: P(pc) } : null, meses != null ? { l: 'Meses', v: F(meses) } : null],
          formula: 'Meta − Lo que ya tengo' + (meses != null ? '   ·   Meses: lo que falta ÷ lo que añado cada mes (hacia arriba)' : ''),
          con: o(v.o) + ' − ' + o(v.t) + ' = ' + F(f), pasos,
          res: 'Meta ' + F(v.o) + ', tengo ' + F(v.t) + ' → faltan ' + F(f) + (meses != null ? ' (' + F(meses) + ' ' + pl(meses, 'mes', 'meses') + ')' : ''), copia: f
        };
      }
    },
    {
      id: 'ahorro', g: 'Dinero y negocio', n: 'Cuánto apartar cada mes', q: '¿Cuánto tengo que ahorrar cada mes para llegar a una meta?',
      d: 'Por ejemplo, para juntar 2.400 € en 8 meses.', kw: 'ahorrar ahorro guardar meta objetivo mensual',
      f: [
        { k: 'o', l: 'Meta', u: '€', ej: '2.400' },
        { k: 'm', l: 'En cuántos meses', u: 'meses', ej: '8' },
        { k: 't', l: 'Ya tengo', u: '€', opc: true }
      ],
      run(v) {
        if (v.m <= 0) no('El número de meses tiene que ser más que 0.');
        const t = v.t || 0, f = v.o - t;
        const resta = t ? { t: 'Resta lo que ya tienes a la meta: es lo que te falta.', op: om(v.o) + ' − ' + om(t) + ' = ' + M(f) } : null;
        if (f <= 0) return { val: '0', uni: '€ al mes', frase: '¡Ya tienes la meta! No hace falta apartar nada.', formula: 'Meta − Lo que ya tengo', pasos: [resta], res: 'Meta ' + M(v.o) + ' → ya está', copia: 0 };
        const q = f / v.m, r = Math.ceil(q * 100 - 1e-6) / 100, justo = calcExact(q, 2);
        return {
          val: Mv(r), uni: '€ al mes', etq: 'Aparta cada mes',
          frase: 'Tienes que apartar ' + M(r) + ' cada mes durante ' + F(v.m) + ' ' + pl(v.m, 'mes', 'meses') + '.' + (justo ? '' : ' (Redondeado hacia arriba al céntimo: en total juntarás ' + M(t + r * v.m) + '.)'),
          formula: (t ? '(Meta − Lo que ya tengo)' : 'Meta') + ' ÷ Meses', con: (t ? '(' + Mv(v.o) + ' − ' + om(t) + ')' : om(v.o)) + ' ÷ ' + o(v.m) + ' ' + eq(q) + ' ' + M(q),
          pasos: [
            resta,
            { t: 'Divide lo que te falta entre los meses.', op: om(f) + ' ÷ ' + o(v.m) + ' ' + eq(q) + ' ' + M(q) },
            justo ? null : { t: 'Redondea los céntimos hacia arriba, para no quedarte corto.', op: F(q, 4) + ' → ' + M(r) },
            { t: 'Comprueba: lo de cada mes × los meses.', op: om(r) + ' × ' + o(v.m) + ' = ' + M(r * v.m) }
          ],
          res: M(v.o) + ' en ' + F(v.m) + ' ' + pl(v.m, 'mes', 'meses') + (t ? ' (ya tengo ' + M(t) + ')' : '') + ' → ' + M(r) + ' al mes', copia: r
        };
      }
    },
    {
      id: 'meses', g: 'Dinero y negocio', n: 'Cuántos meses cubre un pago', q: '¿Cuántos meses de suscripción cubre un pago?',
      d: 'Por ejemplo, cuántos meses de 15 € pagan 100 €. Sirve para cualquier cuota.', kw: 'suscripcion cuota mensualidad periodo pago cubre alcanza',
      f: [
        { k: 'p', l: 'Pago', u: '€', ej: '100' },
        { k: 'c', l: 'Precio de cada mes', u: '€', ej: '15', ay: 'Lo que cuesta un mes (o una semana, un año… y el resultado será en eso).' }
      ],
      run(v) {
        if (v.c <= 0) no('El precio de cada mes tiene que ser más que 0.');
        const q = v.p / v.c, n = Math.floor(q + 1e-9), sobra = calcZ(calcRound(v.p - n * v.c, 6)), justo = !sobra, falta = v.c - sobra, dias = Math.round(sobra / v.c * 30);
        return {
          val: F(n), uni: pl(n, 'mes', 'meses'), etq: 'Cubre',
          frase: justo ? M(v.p) + ' cubren justo ' + F(n) + ' ' + pl(n, 'mes', 'meses') + '. No sobra nada.' : M(v.p) + ' cubren ' + F(n) + ' ' + pl(n, 'mes completo', 'meses completos') + '. Sobran ' + M(sobra) + (dias > 0 ? ' (como unos ' + dias + ' días más)' : '') + '; para pagar otro mes entero faltarían ' + M(falta) + '.',
          extra: [{ l: pl(n, 'Mes completo', 'Meses completos'), v: F(n) }, { l: 'Sobra', v: M(sobra) }, justo ? null : { l: 'Falta para otro mes', v: M(falta) }],
          formula: 'Pago ÷ Precio de cada mes (sin decimales)   ·   Sobra: Pago − Meses × Precio', con: om(v.p) + ' ÷ ' + om(v.c) + ' ' + eq(q) + ' ' + F(q) + (justo ? '' : ' → ' + F(n)),
          pasos: [
            { t: 'Divide el pago entre lo que cuesta cada mes.', op: om(v.p) + ' ÷ ' + om(v.c) + ' ' + eq(q) + ' ' + F(q) },
            justo ? null : { t: 'Quédate con el número entero, sin los decimales: son los meses completos.', op: F(q) + ' → ' + F(n) + ' ' + pl(n, 'mes', 'meses') },
            { t: 'Lo que sobra: el pago menos lo que cuestan esos meses.', op: om(v.p) + ' − ' + F(n) + ' × ' + om(v.c) + ' = ' + M(sobra) }
          ],
          truco: 'Funciona igual con semanas, años o cualquier periodo: pon el precio de ese periodo.',
          res: M(v.p) + ' a ' + M(v.c) + ' al mes → ' + F(n) + ' ' + pl(n, 'mes', 'meses') + (justo ? '' : ' y sobran ' + M(sobra)), copia: n
        };
      }
    },
    {
      id: 'iva', g: 'Dinero y negocio', n: 'IVA: sumar o quitar', q: '¿Cuánto es con IVA o sin IVA?',
      d: 'Suma el IVA a un precio o quítaselo a uno que ya lo lleva.', kw: 'impuesto iva factura precio con sin',
      f: [
        { k: 'modo', tipo: 'opt', l: 'El precio que tengo…', ops: [{ v: 'sin', l: 'no lleva IVA: quiero sumárselo' }, { v: 'con', l: 'ya lleva IVA: quiero quitárselo' }] },
        { k: 'n', l: o => (o.modo === 'con' ? 'Precio con IVA' : 'Precio sin IVA'), u: '€', ej: o => (o.modo === 'con' ? '121' : '100') },
        { k: 'p', l: 'IVA', u: '%', def: '21', ay: 'General 21 % · reducido 10 % · superreducido 4 %. Vacío = 21 %.' }
      ],
      run(v) {
        if (v.modo === 'con') {
          const k = 1 + v.p / 100, b = v.n / k, iva = v.n - b;
          return {
            val: Mv(b), uni: '€ sin IVA', etq: 'Sin IVA',
            frase: M(v.n) + ' con IVA son ' + M(b) + ' sin IVA. El IVA eran ' + M(iva) + '.',
            extra: [{ l: 'Sin IVA', v: M(b) }, { l: 'IVA (' + P(v.p) + ')', v: M(iva) }, { l: 'Con IVA', v: M(v.n) }],
            formula: 'Precio con IVA ÷ (1 + IVA ÷ 100)', con: om(v.n) + ' ÷ (1 + ' + o(v.p) + ' ÷ 100) ' + eq(b) + ' ' + M(b),
            pasos: [
              { t: 'Convierte el IVA en un número: 1 + IVA ÷ 100.', op: '1 + ' + o(v.p) + ' ÷ 100 = ' + F(k, 4) },
              { t: 'Divide el precio con IVA entre ese número.', op: om(v.n) + ' ÷ ' + F(k, 4) + ' ' + eq(b) + ' ' + M(b) },
              { t: 'El IVA es la diferencia entre los dos precios.', op: om(v.n) + ' − ' + om(b) + ' ' + eq(iva) + ' ' + M(iva) }
            ],
            truco: '¡Ojo! Restarle el ' + P(v.p) + ' al precio con IVA no sirve: daría ' + M(v.n - v.n * v.p / 100) + ', y no es lo correcto, porque el IVA se calculó sobre el precio sin IVA.',
            res: M(v.n) + ' con IVA (' + P(v.p) + ') → ' + M(b) + ' sin IVA', copia: b
          };
        }
        const iva = v.n * v.p / 100, t = v.n + iva, k = 1 + v.p / 100;
        return {
          val: Mv(t), uni: '€ con IVA', etq: 'Con IVA',
          frase: M(v.n) + ' sin IVA son ' + M(t) + ' con IVA. El IVA son ' + M(iva) + '.',
          extra: [{ l: 'Sin IVA', v: M(v.n) }, { l: 'IVA (' + P(v.p) + ')', v: M(iva) }, { l: 'Con IVA', v: M(t) }],
          formula: 'Precio sin IVA + Precio sin IVA × IVA ÷ 100', con: om(v.n) + ' + ' + om(v.n) + ' × ' + o(v.p) + ' ÷ 100 ' + eq(t) + ' ' + M(t),
          pasos: [
            { t: 'Calcula el IVA: el precio sin IVA × el IVA ÷ 100.', op: om(v.n) + ' × ' + o(v.p) + ' ÷ 100 ' + eq(iva) + ' ' + M(iva) },
            { t: 'Súmaselo al precio sin IVA.', op: om(v.n) + ' + ' + om(iva) + ' ' + eq(t) + ' ' + M(t) }
          ],
          truco: 'Atajo en un solo paso: multiplica por ' + F(k, 4) + ': ' + om(v.n) + ' × ' + F(k, 4) + ' ' + eq(t) + ' ' + M(t) + '.',
          res: M(v.n) + ' + IVA ' + P(v.p) + ' → ' + M(t), copia: t
        };
      }
    },
    {
      id: 'factura', g: 'Dinero y negocio', n: 'Factura con IVA e IRPF', q: '¿Cuánto cobro en una factura con IVA y retención de IRPF?',
      d: 'Para facturas de autónomo: base, IVA, retención y total.', kw: 'autonomo factura irpf retencion iva base total cobrar',
      f: [
        { k: 'modo', tipo: 'opt', l: 'Lo que sé es…', ops: [{ v: 'base', l: 'el precio de mi trabajo' }, { v: 'total', l: 'el total que paga el cliente' }] },
        { k: 'n', l: o => (o.modo === 'total' ? 'Total que paga el cliente' : 'Precio del trabajo (base, sin impuestos)'), u: '€', ej: o => (o.modo === 'total' ? '530' : '500') },
        { k: 'iva', l: 'IVA', u: '%', def: '21', ay: 'Vacío = 21 %.' },
        { k: 'irpf', l: 'Retención de IRPF', u: '%', def: '15', ay: 'Vacío = 15 %. Suele ser 15 %, 7 % los primeros años como autónomo y 0 % si no te la aplican (por ejemplo, si el cliente es un particular).' }
      ],
      run(v) {
        const tot0 = v.modo === 'total', k = 1 + v.iva / 100 - v.irpf / 100;
        if (tot0 && k <= 0) no('Con esos porcentajes no sale una base válida.');
        const b = tot0 ? v.n / k : v.n, ivaA = b * v.iva / 100, ir = b * v.irpf / 100, tot = b + ivaA - ir, tuyo = b - ir;
        const pIva = { t: 'Calcula el IVA: base × IVA ÷ 100.', op: om(b) + ' × ' + o(v.iva) + ' ÷ 100 ' + eq(ivaA) + ' ' + M(ivaA) };
        const pIr = { t: 'Calcula la retención de IRPF: base × IRPF ÷ 100.', op: om(b) + ' × ' + o(v.irpf) + ' ÷ 100 ' + eq(ir) + ' ' + M(ir) };
        const pTot = { t: tot0 ? 'Comprueba el total: base + IVA − IRPF.' : 'Total de la factura: base + IVA − IRPF.', op: om(b) + ' + ' + om(ivaA) + ' − ' + om(ir) + ' ' + eq(tot) + ' ' + M(tot) };
        const pTuyo = { t: 'El IVA no es tuyo (se lo pagas a Hacienda). Lo que es para ti: base − IRPF.', op: om(b) + ' − ' + om(ir) + ' ' + eq(tuyo) + ' ' + M(tuyo) };
        return {
          val: Mv(tot0 ? b : tot), uni: '€', etq: tot0 ? 'Base de la factura' : 'El cliente te paga',
          frase: tot0 ? 'Si el cliente paga ' + M(v.n) + ' en total, la base de la factura es ' + M(b) + '. Para ti quedan ' + M(tuyo) + '.' : 'Por un trabajo de ' + M(b) + ', el cliente te paga ' + M(tot) + ' (' + M(b) + ' + ' + M(ivaA) + ' de IVA − ' + M(ir) + ' de IRPF). Para ti quedan ' + M(tuyo) + '.',
          extra: [{ l: 'Base', v: M(b) }, { l: '+ IVA (' + P(v.iva) + ')', v: M(ivaA) }, { l: '− IRPF (' + P(v.irpf) + ')', v: M(ir) }, { l: 'Total factura', v: M(tot) }, { l: 'Para ti (sin el IVA)', v: M(tuyo) }],
          formula: tot0 ? 'Base = Total ÷ (1 + IVA ÷ 100 − IRPF ÷ 100)' : 'Total = Base + Base × IVA ÷ 100 − Base × IRPF ÷ 100',
          con: tot0 ? om(v.n) + ' ÷ (1 + ' + o(v.iva) + ' ÷ 100 − ' + o(v.irpf) + ' ÷ 100) ' + eq(b) + ' ' + M(b) : om(b) + ' + ' + om(ivaA) + ' − ' + om(ir) + ' ' + eq(tot) + ' ' + M(tot),
          pasos: tot0 ? [
            { t: 'Junta los dos porcentajes en un solo número: 1 + IVA ÷ 100 − IRPF ÷ 100.', op: '1 + ' + o(v.iva) + ' ÷ 100 − ' + o(v.irpf) + ' ÷ 100 = ' + F(k, 4) },
            { t: 'Divide el total entre ese número: sale la base.', op: om(v.n) + ' ÷ ' + F(k, 4) + ' ' + eq(b) + ' ' + M(b) },
            pIva, pIr, pTot, pTuyo
          ] : [pIva, pIr, pTot, pTuyo],
          truco: 'El IVA lo cobras, pero no es tuyo: se lo pagas a Hacienda cada trimestre. La retención de IRPF la paga el cliente a Hacienda por ti, como un adelanto de tu declaración de la renta.',
          res: tot0 ? 'Total ' + M(v.n) + ' (IVA ' + P(v.iva) + ', IRPF ' + P(v.irpf) + ') → base ' + M(b) : 'Base ' + M(b) + ' (IVA ' + P(v.iva) + ', IRPF ' + P(v.irpf) + ') → total ' + M(tot), copia: tot0 ? b : tot
        };
      }
    },
    {
      id: 'ganancia', g: 'Dinero y negocio', n: 'Cuánto gano con cada venta', q: '¿Cuánto gano con cada venta?',
      d: 'La ganancia y el margen a partir del precio y de lo que te cuesta.', kw: 'beneficio margen coste precio venta ganar',
      f: [
        { k: 'pv', l: 'Precio de venta', u: '€', ej: '50' },
        { k: 'c', l: 'Lo que me cuesta', u: '€', ej: '35', ay: 'Todo lo que te cuesta cada venta: material, envío, comisiones…' }
      ],
      run(v) {
        if (!v.pv) no('El precio de venta no puede ser 0.');
        const g = v.pv - v.c, m = g / v.pv * 100, sc = v.c ? g / v.c * 100 : null;
        return {
          val: Mv(Math.abs(g)), uni: '€ por venta', etq: g < 0 ? 'Pierdes' : 'Ganas',
          frase: g > 0 ? 'Ganas ' + M(g) + ' con cada venta. De cada 100 € que cobras, ' + Mv(m) + ' € son ganancia (un margen del ' + P(m) + ').' : g < 0 ? 'Pierdes ' + M(-g) + ' con cada venta: te cuesta más de lo que cobras.' : 'Ni ganas ni pierdes: cobras lo mismo que te cuesta.',
          extra: [{ l: 'Ganancia', v: M(g) }, { l: 'Margen (sobre el precio)', v: P(m) }, sc != null ? { l: 'Sobre lo que te cuesta', v: P(sc) } : null],
          formula: 'Ganancia = Precio − Coste   ·   Margen = Ganancia ÷ Precio × 100', con: om(v.pv) + ' − ' + om(v.c) + ' = ' + M(g),
          pasos: [
            { t: 'Resta: precio de venta menos lo que te cuesta.', op: om(v.pv) + ' − ' + om(v.c) + ' = ' + M(g) },
            { t: 'Margen: la ganancia ÷ el precio de venta × 100.', op: om(g) + ' ÷ ' + om(v.pv) + ' × 100 ' + eq(m) + ' ' + P(m) },
            sc != null ? { t: 'Lo que le «subes» a lo que te cuesta: la ganancia ÷ el coste × 100.', op: om(g) + ' ÷ ' + om(v.c) + ' × 100 ' + eq(sc) + ' ' + P(sc) } : null
          ],
          truco: 'El margen y la subida sobre el coste no son lo mismo: si algo te cuesta 100 € y lo vendes a 150 €, le subes un 50 %, pero tu margen es del 33,33 %.',
          res: 'Vendo a ' + M(v.pv) + ', me cuesta ' + M(v.c) + ' → ' + (g < 0 ? 'pierdo ' + M(-g) : 'gano ' + M(g) + ' (' + P(m) + ')'), copia: g
        };
      }
    },
    // ---------- Cantidades y repartos ----------
    {
      id: 'regla3', g: 'Cantidades y repartos', n: 'Regla de tres', q: 'Si A son B, ¿cuánto es C?',
      d: 'Por ejemplo: si 3 kg cuestan 12 €, ¿cuánto cuestan 5 kg?', kw: 'proporcion regla de tres directa inversa equivale',
      f: [
        { k: 'modo', tipo: 'opt', l: 'Cómo van las dos cosas', ops: [{ v: 'directa', l: 'si una sube, la otra también' }, { v: 'inversa', l: 'si una sube, la otra baja' }] },
        { k: 'a', l: 'A · Si tengo…', ej: o => (o.modo === 'inversa' ? '4' : '3'), ay: o => (o.modo === 'inversa' ? 'Por ejemplo, 4 personas.' : 'Por ejemplo, 3 kg.') },
        { k: 'b', l: 'B · …eso es', ej: o => (o.modo === 'inversa' ? '6' : '12'), ay: o => (o.modo === 'inversa' ? 'Por ejemplo, tardan 6 días.' : 'Por ejemplo, cuestan 12 €.') },
        { k: 'c', l: 'C · ¿Y si tengo…?', ej: o => (o.modo === 'inversa' ? '3' : '5'), ay: o => (o.modo === 'inversa' ? 'Por ejemplo, 3 personas.' : 'Por ejemplo, 5 kg.') }
      ],
      run(v) {
        if (v.modo === 'inversa') {
          if (!v.c) no('C no puede ser 0 (no se puede dividir entre 0).');
          const tot = v.a * v.b, r = tot / v.c;
          return {
            val: F(r), frase: 'Si con ' + F(v.a) + ' son ' + F(v.b) + ', con ' + F(v.c) + ' son ' + F(r) + '.',
            formula: 'A × B ÷ C', con: o(v.a) + ' × ' + o(v.b) + ' ÷ ' + o(v.c) + ' ' + eq(r) + ' ' + F(r),
            pasos: [
              { t: 'Multiplica A por B: es el total (por ejemplo, el trabajo de todos juntos).', op: o(v.a) + ' × ' + o(v.b) + ' ' + eq(tot) + ' ' + F(tot) },
              { t: 'Divide ese total entre C.', op: F(tot) + ' ÷ ' + o(v.c) + ' ' + eq(r) + ' ' + F(r) }
            ],
            truco: 'Esta es para cuando una cosa sube y la otra baja: más personas, menos días; más velocidad, menos tiempo.',
            res: F(v.a) + ' → ' + F(v.b) + '; ' + F(v.c) + ' → ' + F(r) + ' (inversa)', copia: r
          };
        }
        if (!v.a) no('A no puede ser 0 (no se puede dividir entre 0).');
        const u = v.b / v.a, r = u * v.c;
        return {
          val: F(r), frase: 'Si ' + F(v.a) + ' son ' + F(v.b) + ', entonces ' + F(v.c) + ' son ' + F(r) + '.',
          formula: 'C × B ÷ A', con: o(v.c) + ' × ' + o(v.b) + ' ÷ ' + o(v.a) + ' ' + eq(r) + ' ' + F(r),
          pasos: [
            { t: 'Calcula cuánto es 1: divide B entre A.', op: o(v.b) + ' ÷ ' + o(v.a) + ' ' + eq(u, 4) + ' ' + F(u, 4) + ' por cada 1' },
            { t: 'Multiplica eso por C.', op: F(u, 4) + ' × ' + o(v.c) + ' ' + eq(r) + ' ' + F(r) }
          ],
          truco: 'Esta es para cuando las dos cosas crecen a la vez: más kilos, más precio; más horas, más dinero.',
          res: F(v.a) + ' → ' + F(v.b) + '; ' + F(v.c) + ' → ' + F(r), copia: r
        };
      }
    },
    {
      id: 'unidades', g: 'Cantidades y repartos', n: 'Cuántas unidades necesito', q: '¿Cuántas unidades (botes, cajas, paquetes…) necesito?',
      d: 'Por ejemplo, cuántos botes de pintura para 25 m² si cada uno pinta 4 m².', kw: 'cantidad necesaria paquetes cajas botes comprar cuantos',
      f: [
        { k: 't', l: 'Necesito en total', ej: '25', ay: 'Por ejemplo, 25 m² de pared o 300 invitados.' },
        { k: 'c', l: 'Cada unidad trae o cubre', ej: '4', ay: 'Por ejemplo, un bote pinta 4 m² o una caja trae 12.' },
        { k: 'p', l: 'Precio de cada unidad', u: '€', opc: true, ej: '10', ay: 'Si lo pones, te digo cuánto cuesta todo.' }
      ],
      run(v) {
        if (v.c <= 0) no('Lo que trae cada unidad tiene que ser más que 0.');
        const q = v.t / v.c, n = Math.max(0, arriba(q)), justo = Math.abs(q - Math.round(q)) < 1e-9, sobra = n * v.c - v.t, cost = v.p != null ? n * v.p : null;
        return {
          val: F(n), uni: pl(n, 'unidad', 'unidades'), etq: 'Necesitas',
          frase: 'Necesitas ' + F(n) + ' ' + pl(n, 'unidad', 'unidades') + '.' + (sobra > 1e-9 ? ' Entre todas cubren ' + F(n * v.c) + ', así que sobrará ' + F(sobra) + '.' : ' Te salen justas.') + (cost != null ? ' Te costarán ' + M(cost) + '.' : ''),
          extra: [{ l: 'Unidades', v: F(n) }, { l: 'Sobra', v: F(sobra) }, cost != null ? { l: 'Cuesta todo', v: M(cost) } : null],
          formula: 'Lo que necesito ÷ Lo que trae cada unidad, y redondear hacia arriba' + (cost != null ? '   ·   Precio: unidades × precio de cada una' : ''),
          con: o(v.t) + ' ÷ ' + o(v.c) + ' ' + eq(q) + ' ' + F(q) + (justo ? '' : ' → ' + F(n)),
          pasos: [
            { t: 'Divide lo que necesitas entre lo que trae cada unidad.', op: o(v.t) + ' ÷ ' + o(v.c) + ' ' + eq(q) + ' ' + F(q) },
            justo ? { t: 'Sale exacto: no hay que redondear.', op: F(n) + ' ' + pl(n, 'unidad', 'unidades') } : { t: 'Redondea hacia arriba: con una menos no te llega.', op: F(q) + ' → ' + F(n) + ' ' + pl(n, 'unidad', 'unidades') },
            cost != null ? { t: 'Multiplica las unidades por lo que cuesta cada una.', op: F(n) + ' × ' + om(v.p) + ' = ' + M(cost) } : null
          ],
          truco: 'Si se suele perder algo (cortes, roturas, alguien que repite…), compra una unidad de más.',
          res: F(v.t) + ' con unidades de ' + F(v.c) + ' → ' + F(n) + ' ' + pl(n, 'unidad', 'unidades') + (cost != null ? ' (' + M(cost) + ')' : ''), copia: n
        };
      }
    },
    {
      id: 'repartir', g: 'Cantidades y repartos', n: 'Repartir a partes iguales', q: '¿Cuánto le toca a cada uno?',
      d: 'Reparte una cantidad entre varias personas, partes o cuotas.', kw: 'dividir repartir partes iguales cuotas plazos cada uno',
      f: [{ k: 't', l: 'Cantidad a repartir', ej: '90' }, { k: 'n', l: 'Entre cuántos', ej: '4', ay: 'Personas, partes o cuotas.' }],
      run(v) {
        if (v.n <= 0) no('Tiene que haber al menos 1 parte.');
        const r = v.t / v.n, justo = calcExact(r, 2), r2 = Math.floor(r * 100 + 1e-9) / 100, resto = calcRound(v.t - r2 * v.n, 2);
        return {
          val: F(r), etq: 'A cada uno', frase: 'A cada uno le tocan ' + F(r) + '.',
          formula: 'Cantidad ÷ Entre cuántos', con: o(v.t) + ' ÷ ' + o(v.n) + ' ' + eq(r) + ' ' + F(r),
          pasos: [
            { t: 'Divide la cantidad entre el número de partes.', op: o(v.t) + ' ÷ ' + o(v.n) + ' ' + eq(r) + ' ' + F(r) },
            { t: 'Comprueba: lo de cada uno × el número de partes.', op: (justo ? F(r) : F(r2)) + ' × ' + o(v.n) + ' = ' + F((justo ? r : r2) * v.n) + (justo ? ' ✓' : '') }
          ],
          truco: justo ? 'Para pagar algo a plazos, pon el total y el número de cuotas.' : 'No sale exacto: ' + F(r2) + ' × ' + F(v.n) + ' = ' + F(r2 * v.n) + '. Faltan ' + F(resto) + ', que pueden poner algunos de más (si es dinero: ' + Math.round(resto * 100) + ' ' + pl(Math.round(resto * 100), 'céntimo', 'céntimos') + ').',
          res: F(v.t) + ' entre ' + F(v.n) + ' = ' + F(r) + ' cada uno', copia: r
        };
      }
    },
    {
      id: 'barato', g: 'Cantidades y repartos', n: 'Qué sale más barato', q: '¿Qué sale más barato?',
      d: 'Compara dos productos de distinto tamaño por su precio por unidad (kilo, litro…).', kw: 'comparar precio unidad kilo litro oferta compra',
      f: [
        { k: 'pa', l: 'Precio de A', u: '€', ej: '2,40' },
        { k: 'ca', l: 'Cantidad de A', ej: '500', ay: 'Gramos, mililitros, unidades… La misma medida en los dos.' },
        { k: 'pb', l: 'Precio de B', u: '€', ej: '3,90' },
        { k: 'cb', l: 'Cantidad de B', ej: '1.000' }
      ],
      run(v) {
        if (v.ca <= 0 || v.cb <= 0) no('Las cantidades tienen que ser más que 0.');
        const ua = v.pa / v.ca, ub = v.pb / v.cb, mn = Math.min(v.ca, v.cb), k = mn >= 1000 ? 1000 : mn >= 100 ? 100 : mn >= 10 ? 10 : 1;
        const ka = ua * k, kb = ub * k, cada = k === 1 ? 'cada unidad' : 'cada ' + F(k), igual = Math.abs(ka - kb) < 1e-9;
        const bar = ka < kb ? 'A' : 'B', otra = bar === 'A' ? 'B' : 'A', ahorro = igual ? 0 : (Math.max(ka, kb) - Math.min(ka, kb)) / Math.max(ka, kb) * 100;
        const paso = (x, p, c, kk) => ({ t: 'Precio de ' + x + ' por ' + cada + ': su precio ÷ su cantidad' + (k > 1 ? ' × ' + F(k) : '') + '.', op: om(p) + ' ÷ ' + o(c) + (k > 1 ? ' × ' + F(k) : '') + ' ' + eq(kk) + ' ' + M(kk) });
        return {
          val: igual ? 'Igual' : bar, uni: igual ? 'de precio' : 'sale más barato', etq: igual ? 'Los dos salen' : 'Más barato',
          frase: igual ? 'Salen igual: ' + M(ka) + ' por ' + cada + ' los dos.' : bar + ' sale más barato: ' + M(Math.min(ka, kb)) + ' por ' + cada + ', frente a ' + M(Math.max(ka, kb)) + ' de ' + otra + '. Es un ' + P(ahorro) + ' más barato.',
          extra: [{ l: 'A, por ' + cada, v: M(ka) }, { l: 'B, por ' + cada, v: M(kb) }],
          formula: 'Precio ÷ Cantidad en los dos (lo que cuesta cada unidad) y comparar',
          pasos: [paso('A', v.pa, v.ca, ka), paso('B', v.pb, v.cb, kb), { t: 'Compara: el número más pequeño es el más barato.', op: M(ka) + (igual ? ' = ' : ka < kb ? ' < ' : ' > ') + M(kb) }],
          truco: k > 1 ? 'Calculo el precio de cada ' + F(k) + ' porque con números tan pequeños se compara mejor. Fíjate en que las dos cantidades estén en la misma medida (no mezcles gramos con kilos).' : 'Fíjate en que las dos cantidades estén en la misma medida (no mezcles gramos con kilos).',
          res: 'A ' + M(v.pa) + ' / ' + F(v.ca) + ' · B ' + M(v.pb) + ' / ' + F(v.cb) + ' → ' + (igual ? 'iguales' : bar + ' más barato'), copia: igual ? ka : Math.min(ka, kb)
        };
      }
    },
    {
      id: 'media', g: 'Cantidades y repartos', n: 'Media y suma de una lista', q: '¿Cuál es la media de varios números?',
      d: 'También te da la suma, el mayor y el menor.', kw: 'promedio media sumar lista total varios numeros',
      f: [{ k: 'l', tipo: 'lista', l: 'Números', ej: '12; 15; 9; 20', ay: 'Sepáralos con punto y coma (;) o con espacios. Los decimales, con coma: 12,5.' }],
      run(v) {
        const l = v.l, c = l.length;
        if (!c) no('Escribe al menos un número.');
        const s = l.reduce((a, b) => a + b, 0), avg = s / c, mx = Math.max(...l), mn = Math.min(...l);
        const suma = (c <= 8 ? l.map((x, i) => (i ? o(x) : F(x))).join(' + ') : l.slice(0, 4).map((x, i) => (i ? o(x) : F(x))).join(' + ') + ' + … + ' + l.slice(-2).map(x => o(x)).join(' + '));
        return {
          val: F(avg), etq: 'Media', frase: 'La media de ' + c + ' ' + pl(c, 'número', 'números') + ' es ' + F(avg) + '. Entre todos suman ' + F(s) + '.',
          extra: [{ l: 'Suma', v: F(s) }, { l: 'Cuántos', v: String(c) }, { l: 'El mayor', v: F(mx) }, { l: 'El menor', v: F(mn) }],
          formula: 'Suma de todos ÷ Cuántos hay', con: F(s) + ' ÷ ' + c + ' ' + eq(avg) + ' ' + F(avg),
          pasos: [
            { t: 'Suma todos los números.', op: suma + ' ' + eq(s) + ' ' + F(s) },
            { t: 'Cuenta cuántos números hay.', op: c + ' ' + pl(c, 'número', 'números') },
            { t: 'Divide la suma entre cuántos hay.', op: F(s) + ' ÷ ' + c + ' ' + eq(avg) + ' ' + F(avg) }
          ],
          truco: 'La media sirve para saber lo «normal»: por ejemplo, cuánto ganas de media al mes.',
          res: 'Media de ' + c + ' ' + pl(c, 'número', 'números') + ' = ' + F(avg) + ' (suma ' + F(s) + ')', copia: avg
        };
      }
    },
    // ---------- Trabajo y tiempo ----------
    {
      id: 'periodo', g: 'Trabajo y tiempo', n: 'Pasar a día, semana, mes o año', q: '¿Cuánto es al día, a la semana, al mes y al año?',
      d: 'Por ejemplo, cuánto es al año una cuota de 15 € al mes.', kw: 'mensual anual semanal diario convertir periodo sueldo cuota',
      f: [
        { k: 'modo', tipo: 'opt', l: 'La cantidad que tengo es…', def: 'mes', ops: [{ v: 'dia', l: 'al día' }, { v: 'semana', l: 'a la semana' }, { v: 'mes', l: 'al mes' }, { v: 'ano', l: 'al año' }] },
        { k: 'n', l: 'Cantidad', ej: '15', ay: 'Un precio, un sueldo, un gasto…' }
      ],
      run(v) {
        const FX = { dia: 365, semana: 52, mes: 12, ano: 1 }, NM = { dia: 'al día', semana: 'a la semana', mes: 'al mes', ano: 'al año' }, UN = { dia: 'días', semana: 'semanas', mes: 'meses' };
        const m = FX[v.modo] ? v.modo : 'mes', y = v.n * FX[m], val = k => y / FX[k];
        const otros = ['ano', 'mes', 'semana', 'dia'].filter(k => k !== m);
        const pasos = [];
        if (m !== 'ano') pasos.push({ t: 'Pásalo a un año: multiplica por ' + FX[m] + ' (los ' + UN[m] + ' que tiene un año).', op: o(v.n) + ' × ' + FX[m] + ' ' + eq(y) + ' ' + F(y) + ' al año' });
        otros.filter(k => k !== 'ano').forEach(k => pasos.push({ t: (k === 'dia' ? 'Al día' : k === 'semana' ? 'A la semana' : 'Al mes') + ': divide lo del año entre ' + FX[k] + '.', op: F(y) + ' ÷ ' + FX[k] + ' ' + eq(val(k)) + ' ' + F(val(k)) }));
        const lista = otros.map(k => F(val(k)) + ' ' + NM[k]);
        return {
          val: F(m === 'ano' ? val('mes') : y), etq: m === 'ano' ? 'Al mes' : 'Al año',
          frase: F(v.n) + ' ' + NM[m] + ' son ' + lista.slice(0, -1).join(', ') + ' y ' + lista[lista.length - 1] + '.',
          extra: ['dia', 'semana', 'mes', 'ano'].map(k => ({ l: k === 'dia' ? 'Al día' : k === 'semana' ? 'A la semana' : k === 'mes' ? 'Al mes' : 'Al año', v: F(val(k)) })),
          formula: 'Primero se pasa a un año (× 365 días, × 52 semanas o × 12 meses) y luego se divide entre lo que toque.',
          pasos,
          truco: 'Un año tiene 365 días, 52 semanas y 12 meses. Un mes no son 4 semanas justas, sino unas 4,33.',
          res: F(v.n) + ' ' + NM[m] + ' = ' + (m === 'ano' ? F(val('mes')) + ' al mes' : F(y) + ' al año'), copia: m === 'ano' ? val('mes') : y
        };
      }
    },
    {
      id: 'hora', g: 'Trabajo y tiempo', n: 'Cuánto gano por hora', q: '¿Cuánto gano por cada hora de trabajo?',
      d: 'Divide lo que cobras entre las horas que te ha llevado.', kw: 'precio hora sueldo tarifa trabajo horas',
      f: [
        { k: 'c', l: 'Lo que cobro', u: '€', ej: '600' },
        { k: 'h', l: 'Horas que trabajo', u: 'h', hm: true, ej: '25', ay: 'Media hora = 0,5 · un cuarto de hora = 0,25. También vale 1:30 (hora y media).' }
      ],
      run(v) {
        if (v.h <= 0) no('Las horas tienen que ser más que 0.');
        const r = v.c / v.h;
        return {
          val: Mv(r), uni: '€ por hora', etq: 'Ganas', frase: 'Ganas ' + M(r) + ' por cada hora de trabajo' + (calcExact(v.h, 0) ? '' : ' (' + hm(v.h) + ' en total)') + '.',
          formula: 'Lo que cobro ÷ Horas', con: om(v.c) + ' ÷ ' + o(v.h) + ' ' + eq(r) + ' ' + M(r),
          pasos: [{ t: 'Divide lo que cobras entre las horas que trabajas.', op: om(v.c) + ' ÷ ' + o(v.h) + ' ' + eq(r) + ' ' + M(r) }],
          truco: 'Cuenta todas las horas: también las de hablar con el cliente, los cambios y los desplazamientos. Si no, parecerá que ganas más de lo que ganas.',
          res: M(v.c) + ' en ' + hm(v.h) + ' → ' + M(r) + ' por hora', copia: r
        };
      }
    },
    {
      id: 'trabajo', g: 'Trabajo y tiempo', n: 'Precio de un trabajo por horas', q: '¿Cuánto cobro por un trabajo de varias horas?',
      d: 'Multiplica las horas por tu precio por hora.', kw: 'presupuesto horas precio hora cobrar trabajo',
      f: [
        { k: 'h', l: 'Horas', u: 'h', hm: true, ej: '12,5', ay: 'Media hora = 0,5. También vale 12:30 (12 horas y media).' },
        { k: 'p', l: 'Precio por hora', u: '€', ej: '30' }
      ],
      run(v) {
        const r = v.h * v.p;
        return {
          val: Mv(r), uni: '€', etq: 'Cobras', frase: F(v.h) + ' ' + pl(v.h, 'hora', 'horas') + (calcExact(v.h, 0) ? '' : ' (' + hm(v.h) + ')') + ' a ' + M(v.p) + ' la hora son ' + M(r) + '.',
          formula: 'Horas × Precio por hora', con: o(v.h) + ' × ' + om(v.p) + ' ' + eq(r) + ' ' + M(r),
          pasos: [{ t: 'Multiplica las horas por el precio de cada hora.', op: o(v.h) + ' × ' + om(v.p) + ' ' + eq(r) + ' ' + M(r) }],
          truco: 'Para hacer la factura, usa luego «Factura con IVA e IRPF» con este precio como base.',
          res: hm(v.h) + ' a ' + M(v.p) + ' la hora → ' + M(r), copia: r
        };
      }
    },
    // ---------- Ecuaciones y cuentas ----------
    {
      id: 'ecuacion', g: 'Ecuaciones y cuentas', n: 'Despejar la x', q: '¿Cuánto vale la x?',
      d: 'Escribe una ecuación con una x y te enseño paso a paso cómo dejarla sola.', kw: 'ecuacion despejar incognita x algebra resolver',
      f: [{
        k: 'e', tipo: 'expr', l: 'Ecuación', ej: '3x + 5 = 20', ay: 'Escribe la x donde va el número que buscas. 3x quiere decir 3 × x.',
        teclas: [{ l: 'x', ins: 'x', title: 'La x: el número que buscas', cls: 'x' }, { l: '=', ins: ' = ' }].concat(TECLAS),
        chips: ['3x + 5 = 20', 'x ÷ 4 = 12', '2(x + 3) = 4x − 10', '20 % de x = 50']
      }],
      run(v) {
        const d = calcDespejar(v.e), ori = calcPrint(d.L) + ' = ' + calcPrint(d.R);
        const formula = 'Deja la x sola en un lado. Lo que suma pasa al otro lado restando, lo que resta pasa sumando, lo que multiplica pasa dividiendo y lo que divide pasa multiplicando.';
        if (d.todos || d.ninguno) {
          return {
            val: d.todos ? 'Cualquier número' : 'Sin solución', etq: 'La x',
            frase: d.porCero ? (d.todos ? 'La x está multiplicada por 0 y el otro lado también da 0: vale cualquier número.' : 'La x está multiplicada por 0, así que ese lado siempre da 0 y nunca puede ser igual al otro: no hay ningún número que sirva.')
              : d.todos ? 'Al juntarlo todo queda ' + d.queda + ', que siempre es cierto: la x puede valer cualquier número.' : 'Al juntarlo todo queda ' + d.queda + ', que es imposible: ningún número cumple la ecuación.',
            formula, con: ori, conEtq: 'Tu ecuación', pasos: d.pasos, res: ori + ' → ' + (d.todos ? 'cualquier número' : 'sin solución'), copia: null
          };
        }
        const x = d.x, lv = calcEval(d.L, x), rv = calcEval(d.R, x), e4 = v4 => (calcExact(v4, 4) ? '=' : '≈');
        const lado = (n, val) => (n.t === 'n' ? '' : calcPrint(n, x) + ' ' + e4(val) + ' ' + calcNumTxt(val, false));
        const lineas = [lado(d.L, lv), lado(d.R, rv)].filter(Boolean);
        const pasos = d.pasos.concat([{
          t: 'Comprueba: pon ' + calcNumTxt(x, false) + ' en lugar de la x. Los dos lados tienen que dar lo mismo.',
          op: lineas[0] || '', op2: lineas[1] || '',
          queda: Math.abs(lv - rv) <= 1e-6 * Math.max(1, Math.abs(lv)) ? '✓ Los dos lados dan ' + calcNumTxt(lv, false) : ''
        }]);
        return {
          val: 'x = ' + calcNumTxt(x, false), etq: 'La x vale', frase: 'La x vale ' + calcNumTxt(x, false) + '.' + (calcExact(x, 4) ? '' : ' (Tiene muchos decimales: está redondeado.)'),
          formula, con: ori, conEtq: 'Tu ecuación', pasos, res: ori + ' → x = ' + calcNumTxt(x, false), copia: x
        };
      }
    },
    {
      id: 'libre', g: 'Ecuaciones y cuentas', n: 'Cuenta libre, paso a paso', q: 'Escribe una cuenta y mira cómo se resuelve',
      d: 'Como una calculadora normal, pero te enseña el orden en que se hace cada parte.', kw: 'operacion calculadora libre cuenta sumar restar multiplicar dividir parentesis',
      f: [{
        k: 'e', tipo: 'expr', l: 'Cuenta', ej: '(1.200 − 300) ÷ 4 + 21 %', ay: '«150 + 21 %» suma el 21 % de 150, como en una calculadora. «21 % de 150» saca solo el porcentaje.',
        teclas: TECLAS.concat([{ l: 'de', ins: ' de ', title: 'Para porcentajes: 21 % de 150' }]),
        chips: ['2 + 3 × 4', '(1.200 − 300) ÷ 4', '150 + 21 %', '21 % de 150']
      }],
      run(v) {
        const toks = calcTokens(v.e, false);
        if (toks.length && toks[toks.length - 1].t === '=') toks.pop(); // «2 + 2 =»
        if (toks.some(t => t.t === '=')) no('Esta cuenta tiene un signo = en medio. Si es una ecuación con x, usa «Despejar la x».');
        const ast = calcParse(toks), r = calcPasos(ast), val = r.valor, txt = calcPrint(ast);
        const hayPct = JSON.stringify(ast).indexOf('"pct') >= 0;
        return {
          val: calcNumTxt(val, false), etq: 'Resultado',
          frase: r.pasos.length ? txt + ' ' + (calcExact(val, 4) ? '=' : '≈') + ' ' + calcNumTxt(val, false) : 'Es solo un número: no hay nada que calcular.',
          formula: 'El orden: 1.º lo de dentro de los paréntesis · 2.º multiplicar y dividir · 3.º sumar y restar, de izquierda a derecha.',
          pasos: r.pasos,
          truco: hayPct ? 'Al sumar o restar un %, se calcula sobre lo que va delante: 150 + 21 % es 150 + 31,5.' : 'También puedes usar %: «150 + 21 %» suma el 21 % de 150 y «21 % de 150» saca solo el porcentaje.',
          res: txt + ' = ' + calcFmt(val, 4), copia: val
        };
      }
    }
  ];
})();
const calcDef = id => CALCS.find(c => c.id === id) || null;
// Opciones elegidas (campos 'opt'), con su valor por defecto si no se ha elegido ninguna
function calcOpts(def, raw) {
  const o = {};
  def.f.forEach(f => { if (f.tipo === 'opt') o[f.k] = f.ops.some(p => p.v === (raw || {})[f.k]) ? raw[f.k] : (f.def || f.ops[0].v); });
  return o;
}
// ¿Están vacíos todos los campos que se escriben?
const calcVacio = (def, raw) => def.f.every(f => f.tipo === 'opt' || !String((raw || {})[f.k] == null ? '' : raw[f.k]).trim());
// Hace un cálculo con lo que hay escrito en sus campos (textos, tal cual). Si todo está vacío, hace el ejemplo.
// Devuelve { estado: 'ok' | 'ejemplo' | 'falta' | 'error', … } con lo que devuelve run() o { falta: [etiquetas] } / { msg }.
function calcRun(def, raw) {
  raw = raw || {};
  const opt = calcOpts(def, raw), vacio = calcVacio(def, raw), v = { ...opt }, falta = [], malos = [];
  def.f.forEach(f => {
    if (f.tipo === 'opt') return;
    const lab = calcVal(f.l, opt);
    const s = String(vacio ? (calcVal(f.ej, opt) || '') : (raw[f.k] == null ? '' : raw[f.k])).trim();
    if (f.tipo === 'expr') { if (!s) falta.push(lab); v[f.k] = s; return; }
    if (f.tipo === 'lista') {
      if (!s) { falta.push(lab); return; }
      const partes = s.replace(/,(?=\s)/g, ';').split(/[;\s]+/).filter(Boolean), nums = partes.map(calcNum);
      const mal = partes.find((p, i) => !isFinite(nums[i]));
      if (mal != null) malos.push('«' + mal + '»'); else v[f.k] = nums;
      return;
    }
    if (!s) { if (f.def != null) v[f.k] = calcNum(f.def); else if (f.opc) v[f.k] = null; else falta.push(lab); return; }
    const n = f.hm ? calcHoras(s) : calcNum(s);
    if (n == null || !isFinite(n)) malos.push('«' + lab + '»'); else v[f.k] = n;
  });
  if (malos.length) return { estado: 'error', msg: (malos.length > 1 ? 'Revisa ' + malos.slice(0, -1).join(', ') + ' y ' + malos[malos.length - 1] + ': no son números.' : 'Revisa ' + malos[0] + ': no es un número.') + ' Escribe solo cifras, con coma para los decimales (por ejemplo 12,5).' };
  if (falta.length) return { estado: 'falta', falta };
  try {
    const r = def.run(v);
    return { ...r, estado: vacio ? 'ejemplo' : 'ok', pasos: (r.pasos || []).filter(Boolean), extra: (r.extra || []).filter(Boolean) };
  } catch (e) {
    if (e && e.calc) return { estado: 'error', msg: e.message };
    console.error('[NoteApp] Calculadora:', e);
    return { estado: 'error', msg: 'No he podido hacer este cálculo. Revisa los datos.' };
  }
}
