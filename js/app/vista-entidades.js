// entView(): prepara los valores que usa cada componente de entidad (componentes/entidad-*).
NoteApp.partes.push(Base => class extends Base {
  entView(e, idx, list, get, dirty) {
    const s = this.state, t = e.type;
    if (t === 'sep') return {
      id: e.id, isSep: true, entDirty: false, title: e.title || '', titleSizer: e.title || 'Título',
      sepStatic: !dirty && !!e.title, sepMl: '0',
      sepBlank: !dirty && !e.title, sepLine: dirty || !!e.title,
      big: !!e.big, sepH: e.big ? '44px' : '30px', sepFs: e.big ? '20px' : '14px',
      sepColor: e.big ? '#008000' : '#8a8a8a', sepInColor: e.big ? '#008000' : '#a6a6a6',
      upTop: e.big ? '6px' : '-1px', downTop: e.big ? '22px' : '15px',
      bigColor: e.big ? '#008000' : '#5a5a5a', bigTitle: e.big ? 'Título destacado' : 'Título normal',
      toggleBig: () => this.updEnt(e.id, x => ({ ...x, big: !x.big })),
      onTitle: ev => { const d = ev.target.value.slice(0, 40); this.updEnt(e.id, x => ({ ...x, title: d })); },
      up: () => this.moveEnt(e.id, -1), down: () => this.moveEnt(e.id, 1),
      upColor: idx > 0 ? '#7a7a7a' : '#3a3a3a', downColor: idx < list.length - 1 ? '#7a7a7a' : '#3a3a3a',
      menuOpen: s.entMenu === e.id, menuDot: s.entMenu === e.id ? '#a6a6a6' : '#7a7a7a',
      toggleMenu: () => this.setState(st => ({ entMenu: st.entMenu === e.id ? null : e.id })),
      duplicate: () => this.duplicateEnt(e.id), remove: () => this.removeEnt(e.id)
    };
    if (t === 'text') {
      const src = e.lines && e.lines.length ? e.lines : [{ id: e.id + 'l', text: '' }];
      return {
        id: e.id, isSep: false, isText: true, entDirty: false, lines: this.mkdLines(src, e.id, dirty && e.fx === false), boxCursor: dirty && e.fx !== false ? 'text' : 'default',
        fxColor: e.fx !== false ? '#008000' : '#5a5a5a', fxOn: e.fx !== false, fxTitle: e.fx !== false ? 'Mostrando texto sucio' : 'Mostrando salida en texto limpio',
        toggleFx: () => { this.setState({ focusId: null }); this.updEnt(e.id, x => ({ ...x, fx: x.fx === false })); },
        boxDown: ev => { if (!dirty || e.fx === false || (ev.target.closest && ev.target.closest('[data-line]'))) return; ev.preventDefault(); const l = src[src.length - 1]; this.focusLine(l.id, l.text.length); },
        up: () => this.moveEnt(e.id, -1), down: () => this.moveEnt(e.id, 1),
        upColor: idx > 0 ? '#7a7a7a' : '#3a3a3a', downColor: idx < list.length - 1 ? '#7a7a7a' : '#3a3a3a',
        menuOpen: s.entMenu === e.id, menuDot: s.entMenu === e.id ? '#a6a6a6' : '#7a7a7a',
        toggleMenu: () => this.setState(st => ({ entMenu: st.entMenu === e.id ? null : e.id })),
        duplicate: () => this.duplicateEnt(e.id), remove: () => this.removeEnt(e.id)
      };
    }
    const v = {
      isSep: false, entDirty: dirty,
      id: e.id, icon: ENT_ICON[t], desc: e.desc, descSizer: e.desc || '\u00a0',
      isSlider: t === 'slider', isTable: t === 'table',
      hasDec: t === 'slider' || t === 'pct' || t === 'expr' || t === 'table' || (t === 'toggle' && !!(e.expr || '').trim()) || (t === 'logic' && (!!(e.els || '').trim() || logicBranches(e).some(b => (b.out || '').trim()))),
      decimals: e.decimals !== false, decIcon: e.decimals !== false ? 'assets/cita-cuadrada.svg' : 'assets/cita-cuadrada-off.svg', decColor: e.decimals !== false ? '#008000' : '#5a5a5a',
      toggleDec: () => this.updEnt(e.id, x => ({ ...x, decimals: x.decimals === false })),
      exprClean: !dirty && t === 'expr', isLogic: t === 'logic', logicHeadClean: !dirty && t === 'logic', exprDirty: dirty && t === 'expr',
      toggleClean: !dirty && t === 'toggle', toggleDirty: dirty && t === 'toggle',
      sliderClean: !dirty && t === 'slider', sliderDirty: dirty && t === 'slider',
      pctClean: !dirty && t === 'pct', pctDirty: dirty && t === 'pct',
      nm: this.makeTab('ent', e.id, e.name, false, false),
      isDate: t === 'date', isCount: t === 'count', isNotif: t === 'notif', isText: false, headClean: !dirty, hasFx: t !== 'date' && t !== 'count' && t !== 'notif',
      up: () => this.moveEnt(e.id, -1), down: () => this.moveEnt(e.id, 1),
      upColor: idx > 0 ? '#7a7a7a' : '#3a3a3a', downColor: idx < list.length - 1 ? '#7a7a7a' : '#3a3a3a',
      showIn: e.fx !== false, showOut: e.fx === false,
      fxColor: e.fx !== false ? '#008000' : '#5a5a5a',
      fxTitle: e.fx !== false ? 'Mostrando datos de entrada' : 'Mostrando salida',
      toggleFx: () => this.updEnt(e.id, x => ({ ...x, fx: x.fx === false })),
      menuOpen: s.entMenu === e.id, menuDot: s.entMenu === e.id ? '#a6a6a6' : '#7a7a7a',
      toggleMenu: () => this.setState(st => ({ entMenu: st.entMenu === e.id ? null : e.id })),
      duplicate: () => this.duplicateEnt(e.id), remove: () => this.removeEnt(e.id),
      onDesc: ev => { const d = ev.target.value.slice(0, DESC_MAX); this.updEnt(e.id, x => ({ ...x, desc: d })); }
    };
    const setExpr = val => this.updEnt(e.id, x => ({ ...x, expr: val }));
    if (t === 'expr') {
      v.out = fmt(entOut(e, get));
      { const sb = substSegs(e.expr, get); v.subst = sb.segs; v.hasSubst = sb.show; }
      v.fx = this.field(e.id + ':expr', e.expr, hlExpr(e.expr), setExpr, { ph: 'Expresión' });
    } else if (t === 'toggle') {
      v.out = fmt(toggleShown(e, get)); v.on = e.on;
      { const sb = substSegs(e.expr, get); v.subst = sb.segs; v.hasSubst = sb.show; }
      v.boxBg = e.on ? '#2b3c2b' : '#2a2a2a'; v.rowBg = v.boxBg; v.valBg = e.on ? '#1d2a1d' : '#1c1c1c';
      v.chkBg = e.on ? '#008000' : 'transparent';
      v.onToggle = () => this.updEnt(e.id, x => ({ ...x, on: !x.on }));
      v.fx = this.field(e.id + ':expr', e.expr, hlExpr(e.expr), setExpr, { ph: e.on ? 'True' : 'False' });
    } else if (t === 'logic') {
      const showIn = dirty && e.fx !== false, brs = logicBranches(e), multi = brs.length > 1, ev = logicEval(e, get);
      const anyOut = brs.some(b => (b.out || '').trim()), hasEls = !!(e.els || '').trim(), elsDef = anyOut ? '0' : 'False';
      const selId = (s.lsel || {})[e.id], sel = brs.find(b => b.id === selId) || brs[0], cmp = sel.cmp || '=';
      v.out = fmt(roundOut(e, ev.val)); v.outTxt = v.out;
      v.cmpLabel = multi ? 'Comparación del caso ' + (brs.indexOf(sel) + 1) : 'Comparación';
      v.cmps = CMPS.map(c => ({ label: c[1], title: c[2], on: cmp === c[0], bg: cmp === c[0] ? '#008000' : 'transparent', color: cmp === c[0] ? '#fff' : '#a6a6a6', fw: cmp === c[0] ? 600 : 400, onClick: () => this.updBr(e.id, sel.id, { cmp: c[0] }) }));
      const P = p => ({ isLead: false, isWord: false, isField: false, isVal: false, isDel: false, isAdd: false, col: 'auto', ...p });
      const w = t2 => P({ isWord: true, text: t2 });
      const lead = (text, on) => P({ isLead: true, text, color: on ? (dirty ? '#008000' : '#fff') : '#a6a6a6', fw: on ? 600 : 400 });
      const valSegs = (src, dflt) => {
        if (!(src || '').trim()) return [{ text: dflt, color: '#008000' }];
        const ov = outVal(src, get), val = fmt(ov), sb = substSegs(src, get);
        return dirty && sb.show && !(ov && ov.t === 'text') ? sb.segs.concat({ text: ' = ', color: '#fff' }, { text: val, color: '#008000' }) : [{ text: val, color: '#008000' }];
      };
      const slot = (key, src, set, dflt, ph, label, col) => showIn
        ? P({ isField: true, col: col || 'auto', label, f: this.field(key, src || '', hlOut(src || '', get), set, { align: 'right', ph }) })
        : P({ isVal: true, col: col || 'auto', label, segs: valSegs(src, dflt) });
      const rows = brs.map((br, i) => {
        const sym = (CMPS.find(c => c[0] === (br.cmp || '=')) || CMPS[0])[1], on = multi && (dirty ? br.id === sel.id : ev.hit === br.id);
        const sl = (k, dflt, ph) => slot(e.id + ':' + br.id + ':' + k, br[k], val => this.updBr(e.id, br.id, { [k]: val }), dflt, ph, LOGIC_SLOTS[k]);
        const parts = [lead(i ? 'si no, si' : 'Si', on), sl('a', 'ND', 'Dato A'), w(sym), sl('b', 'ND', 'Dato B'), w('entonces'), sl('out', 'True', 'True')];
        if (showIn && i) parts.push(P({ isDel: true, onClick: () => this.rmBr(e.id, br.id) }));
        return { parts, onDown: () => { if (dirty && (this.state.lsel || {})[e.id] !== br.id) this.setState(st => ({ lsel: { ...(st.lsel || {}), [e.id]: br.id } })); } };
      });
      const els = col => slot(e.id + ':els', e.els, val => this.updEnt(e.id, x => ({ ...x, els: val })), elsDef, elsDef, LOGIC_SLOTS.els, col);
      if (showIn) rows.push({ parts: [lead('si no,', false), els('2 / 7'), P({ isAdd: true, onClick: () => this.addBr(e.id) })], onDown: null });
      else if (multi) rows.push({ parts: [lead('si no,', !dirty && ev.hit === 'else'), els('2 / -1')], onDown: null });
      else if (anyOut || hasEls) rows[0].parts.push(w('si no,'), els());
      const n = Math.max.apply(null, rows.map(r => r.parts.length)), compact = !showIn && rows.length > 1;
      v.lgrid = showIn ? 'auto minmax(56px,1fr) auto minmax(56px,1fr) auto minmax(56px,1fr) 22px' : Array(n).fill('auto').join(' ');
      v.lrowH = compact ? '28px' : '41px'; v.lpad = compact ? '6px 6px 11px 10px' : '0 6px 5px 10px';
      v.lrows = rows;
    } else if (t === 'date') {
      v.outTxt = fmt(entOut(e, get)); v.isRange = !!e.range; v.tRange = !!e.trange;
      const seg = (cur, opts, key) => opts.map(k => ({ label: k[1], title: k[2], on: cur === k[0], bg: cur === k[0] ? '#008000' : 'transparent', color: cur === k[0] ? '#fff' : '#a6a6a6', fw: cur === k[0] ? 600 : 400,
        onClick: () => { this.clearCal(e.id); this.updEnt(e.id, x => ({ ...x, [key]: k[0], date2: x.date2 && x.date2 >= x.date ? x.date2 : x.date, timeEnd: x.timeEnd || x.time })); } }));
      v.kinds = seg(!!e.range, [[false, 'Fecha', 'Una fecha'], [true, 'Desde – hasta', 'Un periodo con fecha de inicio y de fin']], 'range');
      v.tkinds = seg(!!e.trange, [[false, 'Hora', 'Una hora de inicio'], [true, 'Desde – hasta', 'Un horario con hora de inicio y de fin']], 'trange');
      v.wdays = ['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(x => ({ t: x }));
      const today = ymd(new Date(NOW)), d0 = e.date || today, d1 = e.range ? (e.date2 && e.date2 >= d0 ? e.date2 : d0) : d0;
      const two = d0.slice(0, 7) !== d1.slice(0, 7), pickEnd = !!e.range && !!(s.rangePick || {})[e.id];
      const pv = pickEnd ? (s.calPrev || {})[e.id] : null, vEnd = pv && pv >= d0 ? pv : null, rp = s.ripple && s.ripple.id === e.id ? s.ripple : null;
      const ripple = k => { const n = (this._rn = (this._rn || 0) + 1); this.setState({ ripple: { id: e.id, k, n } }); clearTimeout(this._rt); this._rt = setTimeout(() => this.setState(st => st.ripple && st.ripple.n === n ? { ripple: null } : null), 750); };
      const setPrev = k => this.setState(st => ({ calPrev: { ...(st.calPrev || {}), [e.id]: k } }));
      const click = k => { if (!e.range) this.updEnt(e.id, x => ({ ...x, date: k })); else if (pickEnd) setPrev(k); };
      const dbl = k => {
        if (!e.range) return;
        if (!pickEnd || k < d0) { this.updEnt(e.id, x => ({ ...x, date: k, date2: k })); setPrev(null); this.setState(st => ({ rangePick: { ...(st.rangePick || {}), [e.id]: true } })); }
        else { this.updEnt(e.id, x => ({ ...x, date2: k })); setPrev(null); this.clearCal(e.id); }
        ripple(k);
      };
      v.calLeave = () => { if (pv) setPrev(null); };
      v.hasHint = !!e.range; v.hint = pickEnd ? (vEnd ? 'Vista previa · doble clic para fijar la fecha de fin' : 'Doble clic en la fecha de fin · un clic para previsualizar') : 'Doble clic en una fecha para marcar el inicio';
      const longOf = k => { const p = k.split('-').map(Number); return new Date(p[0], p[1] - 1, p[2]).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }); };
      const T = { time: e.time || '00:00', onTime: ev => { const val = ev.target.value; if (val) this.updEnt(e.id, x => ({ ...x, time: val })); },
        timeEnd: e.timeEnd || e.time || '00:00', onTimeEnd: ev => { const val = ev.target.value; if (val) this.updEnt(e.id, x => ({ ...x, timeEnd: val })); },
        goToday: () => { const k = ymd(new Date()); this.clearCal(e.id); this.updEnt(e.id, x => ({ ...x, date: k, date2: x.date2 && x.date2 >= k ? x.date2 : k })); } };
      const cal = (idx, base, extra) => {
        const vkey = e.id + ':' + idx, vm = (s.calView || {})[vkey] || base.slice(0, 7), Y = +vm.slice(0, 4), M = +vm.slice(5, 7);
        const shift = k => () => this.setState(st => ({ calView: { ...(st.calView || {}), [vkey]: ymd(new Date(Y, M - 1 + k, 1)).slice(0, 7) } }));
        const off = (new Date(Y, M - 1, 1).getDay() + 6) % 7;
        let days = Array.from({ length: 42 }, (_, i) => {
          const dd = new Date(Y, M - 1, 1 - off + i), k = ymd(dd), inM = dd.getMonth() === M - 1, isT = k === today;
          const end = vEnd || d1, edge = k === d0 || (e.range && !vEnd && k === d1), pEdge = !!vEnd && k === vEnd && k !== d0, mid = e.range && k > d0 && k < end;
          const rip = rp && rp.k === k ? React.createElement('span', { key: 'r' + rp.n, 'aria-hidden': true, style: { position: 'absolute', inset: 0, borderRadius: 6, boxShadow: '0 0 0 1.5px #008000', animation: 'dcRipple .65s cubic-bezier(.2,.6,.3,1) forwards', pointerEvents: 'none' } }) : null;
          return { n: dd.getDate(), sel: edge, inM, rippleEl: rip, tip: e.range ? (pickEnd ? 'Doble clic: fecha de fin' : 'Doble clic: fecha de inicio') : '',
            bg: edge ? '#008000' : 'transparent', color: edge ? '#fff' : pEdge || mid ? '#008000' : inM ? '#fff' : '#555', fw: edge || pEdge || mid || isT ? 700 : 400,
            ring: pEdge ? 'inset 0 0 0 1.5px #008000' : isT && !edge ? 'inset 0 0 0 1.5px #4a4a4a' : 'none', onClick: () => click(k), onDbl: () => dbl(k) };
        });
        if (!days[35].inM) days = days.slice(0, 35);
        return { ...T, days, prevMonth: shift(-1), nextMonth: shift(1), hasLabel: false, label: '', hasTimes: true, hasStart: true, hasEnd: false, hasBoth: false, hasToday: true, timeLbl: 'Hora',
          monthTxt: cap(new Date(Y, M - 1, 1).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })), ...extra };
      };
      const tr = !!e.trange, sameDay = d0 === d1;
      if (!two) {
        const long = !e.range || sameDay ? cap(longOf(d0)) : 'Del ' + longOf(d0).replace(/ de \d{4}$/, '') + ' al ' + longOf(d1);
        v.cals = [cal(0, d0, { longDate: long, hasEnd: tr, hasBoth: tr, timeLbl: tr ? 'Horario' : 'Hora' })];
      } else {
        v.cals = [cal(0, d0, { hasLabel: true, label: 'Inicio', longDate: cap(longOf(d0)), timeLbl: 'Hora de inicio' }),
          cal(1, d1, { hasLabel: true, label: 'Fin', longDate: cap(longOf(d1)), hasTimes: tr, hasStart: false, hasEnd: tr, hasToday: false, timeLbl: 'Hora de fin' })];
      }
    } else if (t === 'count') {
      const c = countInfo(e, get), unit = e.unit || 'd', o = entOut(e, get), ref = e.ref || 'start';
      v.outTxt = o ? fmt(o) + (o.unit ? UNIT_SFX[o.unit] : '') : 'ND';
      v.refs = [['start', 'Hoy → inicio', 'Desde hoy hasta el inicio del evento'], ['end', 'Hoy → fin', 'Desde hoy hasta el final del evento'], ['span', 'Inicio → fin', 'Desde el inicio hasta el final del evento']].map(r => ({ label: r[1], title: r[2], on: ref === r[0],
        bg: ref === r[0] ? '#008000' : 'transparent', color: ref === r[0] ? '#fff' : '#a6a6a6', fw: ref === r[0] ? 600 : 400, onClick: () => this.updEnt(e.id, x => ({ ...x, ref: r[0] })) }));
      v.units = [['d', 'Días', 'Salida en días; si no quedan, pasa a horas, minutos y segundos'], ['h', 'Horas', 'Salida en horas; si no quedan, pasa a minutos y segundos'], ['m', 'Min', 'Salida en minutos; si no quedan, pasa a segundos'], ['txt', 'Texto', 'Salida como texto completo']].map(u => ({ label: u[1], title: u[2], on: unit === u[0],
        bg: unit === u[0] ? '#008000' : 'transparent', color: unit === u[0] ? '#fff' : '#a6a6a6', fw: unit === u[0] ? 600 : 400, onClick: () => this.updEnt(e.id, x => ({ ...x, unit: u[0] })) }));
      const leadDef = !c ? 'Hasta' : c.span ? 'Duración del evento' : ref === 'end' ? (c.past ? 'Terminó el' : 'Termina el') : c.past ? 'Han pasado desde' : 'Faltan para';
      v.leadDef = leadDef; v.leadTxt = e.lead || ''; v.lead = e.lead || leadDef; v.leadSizer = e.lead || leadDef;
      v.onLead = ev => { const d = ev.target.value.slice(0, 40); this.updEnt(e.id, x => ({ ...x, lead: d })); };
      const src = e.target || '';
      v.ft = this.field(e.id + ':target', src, hlExpr(src), val => this.updEnt(e.id, x => ({ ...x, target: val })), { align: 'left', ph: 'Fecha: Vuelo_Lisboa, Ahora + 3 o una ruta' });
      v.tSegs = c ? [{ text: fmt(c.shown), color: '#008000', fw: 600 }] : [{ text: 'Sin fecha', color: DIM, fw: 400 }];
      const a = c ? Math.abs(c.diff) : 0, col = !c ? DIM : c.past ? '#8a8a8a' : '#008000';
      v.tiles = [[Math.floor(a / 864e5), 'días'], [pad2(Math.floor(a / 36e5) % 24), 'horas'], [pad2(Math.floor(a / 6e4) % 60), 'minutos'], [pad2(Math.floor(a / 1e3) % 60), 'segundos']].map(x => ({ v: c ? String(x[0]) : '–', l: x[1], color: col }));
    } else if (t === 'notif') {
      const i = notifInfo(e, get), mode = e.mode === 'manual' ? 'manual' : 'ent';
      const sg = (cur, opts, key) => opts.map(k => ({ label: k[1], title: k[2], on: cur === k[0], bg: cur === k[0] ? '#008000' : 'transparent', color: cur === k[0] ? '#fff' : '#a6a6a6', fw: cur === k[0] ? 600 : 400, onClick: () => this.updEnt(e.id, x => ({ ...x, [key]: k[0] })) }));
      v.nkinds = sg(mode, [['ent', 'Entidad', 'Fecha tomada de una entidad, una ruta o una fórmula'], ['manual', 'Manual', 'Fecha y hora escritas a mano']], 'mode');
      v.hasRefSeg = mode === 'ent' && !!i && i.range;
      v.nrefs = sg(i ? i.ref : 'start', [['start', 'Desde', 'Avisar respecto al inicio del periodo'], ['end', 'Hasta', 'Avisar respecto al final del periodo']], 'ref');
      v.outTxt = !i ? 'ND' : NOW < i.fire ? 'en ' + durTxt(i.fire - NOW) : NOW < i.tgt ? 'Avisado' : 'Pasado';
      v.outColor = i && NOW < i.fire ? '#008000' : '#8a8a8a';
      v.offs = [['d', 'días', 'Días'], ['h', 'h', 'Horas'], ['m', 'min', 'Minutos']].map(k => ({ value: e[k[0]] || '', unit: k[1], label: k[2], onChange: ev => { const d = ev.target.value.replace(/\D/g, '').slice(0, 3); this.updEnt(e.id, x => ({ ...x, [k[0]]: d })); } }));
      v.isManual = dirty && mode === 'manual'; v.isEntField = dirty && mode === 'ent';
      v.ndate = e.date || ''; v.ntime = e.time || '09:00';
      v.onDate = ev => { const d = ev.target.value; if (d) this.updEnt(e.id, x => ({ ...x, date: d })); };
      v.onTime = ev => { const d = ev.target.value; if (d) this.updEnt(e.id, x => ({ ...x, time: d })); };
      const src = e.target || '';
      v.ft = this.field(e.id + ':target', src, hlExpr(src), val => this.updEnt(e.id, x => ({ ...x, target: val })), { align: 'left', ph: 'Fecha: Vuelo_Lisboa o una ruta' });
      v.tgtTxt = i ? '= ' + fmt(dt(i.tgt)) : 'Sin fecha'; v.tgtColor = i ? '#008000' : DIM;
      v.msg = e.msg || ''; v.hasMsgClean = !dirty && !!(e.msg || '').trim();
      v.onMsg = ev => { const d = ev.target.value.slice(0, 120); this.updEnt(e.id, x => ({ ...x, msg: d })); };
      v.test = () => { this.askPerm(); this.fireNotif(e, i); };
      const G = (text, fw) => ({ text, color: '#008000', fw: fw || 600 }), Gr = text => ({ text, color: '#a6a6a6', fw: 400 }), ot = offTxt(e);
      v.cparts = !i ? [Gr('Avisar'), ot ? G(ot) : null, Gr(ot ? 'antes de' : 'el'), { text: 'Sin fecha', color: DIM, fw: 400 }].filter(Boolean)
        : [Gr('Avisar'), ot ? G(ot) : null, Gr(ot ? 'antes de' : 'el'), G(fmt(dt(i.tgt))), i.range ? Gr(i.ref === 'end' ? '(fin del periodo)' : '(inicio del periodo)') : null].filter(Boolean);
    } else if (t === 'pct') {
      const mode = e.mode || 'part', o = pctOut(e, get), showIn = dirty && e.fx !== false;
      v.out = fmt(o); v.outTxt = o ? v.out + (mode === 'pct' ? ' %' : '') : 'ND';
      v.decimals = e.decimals !== false;
      v.decIcon = v.decimals ? 'assets/cita-cuadrada.svg' : 'assets/cita-cuadrada-off.svg';
      v.decColor = v.decimals ? '#008000' : '#5a5a5a';
      v.toggleDec = () => this.updEnt(e.id, x => ({ ...x, decimals: x.decimals === false }));
      v.modes = PCT_MODES.map(m => ({ label: m[1], title: 'Calcular ' + PCT_SLOTS[m[0]].toLowerCase() + ': ' + m[2], on: mode === m[0],
        bg: mode === m[0] ? '#008000' : 'transparent', color: mode === m[0] ? '#fff' : '#a6a6a6', fw: mode === m[0] ? 600 : 400,
        onClick: () => this.updEnt(e.id, x => ({ ...x, mode: m[0] })) }));
      const slot = k => {
        if (k === mode) return { isOut: true, text: v.out, flex: showIn ? '1 1 0' : 'none', h: showIn ? '34px' : '28px', justify: showIn ? 'flex-end' : 'center' };
        const src = e[k] || '';
        if (showIn) return { isField: true, label: PCT_SLOTS[k], f: this.field(e.id + ':' + k, src, hlExpr(src), val => this.updEnt(e.id, x => ({ ...x, [k]: val })), { align: 'right', ph: PCT_SLOTS[k] }) };
        if (dirty) { const sb = substSegs(src, get); return { isVal: true, label: PCT_SLOTS[k], segs: sb.show ? sb.segs.concat({ text: ' = ', color: '#fff' }, { text: fmt(evalExpr(src, get)), color: '#008000' }) : [{ text: fmt(evalExpr(src, get)), color: '#008000' }] }; }
        return { isVal: true, label: PCT_SLOTS[k], segs: [{ text: fmt(evalExpr(src, get)), color: '#008000' }] };
      };
      const w = t2 => ({ isWord: true, text: t2 });
      v.sent = [w('El'), slot('pct'), w('% de'), slot('total'), w('es'), slot('part')].map(p => ({ isWord: false, isField: false, isVal: false, isOut: false, ...p }));
    } else if (t === 'slider') {
      const r = sliderRange(e, get), lo = r[0], hi = r[1], val = sliderVal(e, get), f = (val - lo) / (hi - lo);
      v.out = fmt(num(val)); v.decimals = e.decimals;
      v.minTxt = fmt(num(e.decimals ? lo : Math.round(lo))); v.maxTxt = fmt(num(e.decimals ? hi : Math.round(hi)));
      v.fillW = 'calc(' + (f * 100).toFixed(2) + '% - ' + (f * 4).toFixed(1) + 'px)';
      v.decIcon = e.decimals ? 'assets/cita-cuadrada.svg' : 'assets/cita-cuadrada-off.svg';
      v.decColor = e.decimals ? '#008000' : '#5a5a5a';
      v.toggleDec = () => this.updEnt(e.id, x => ({ ...x, decimals: !x.decimals }));
      v.fMin = this.field(e.id + ':min', e.min, hlExpr(e.min), val2 => this.updEnt(e.id, x => ({ ...x, min: val2 })), { align: 'left', ph: '0' });
      v.fMax = this.field(e.id + ':max', e.max, hlExpr(e.max), val2 => this.updEnt(e.id, x => ({ ...x, max: val2 })), { align: 'right', ph: '100' });
      v.slDown = ev => { ev.preventDefault(); ev.currentTarget.setPointerCapture(ev.pointerId); this._sl = { id: e.id, rect: ev.currentTarget.getBoundingClientRect(), lo, hi, dec: e.decimals }; this.slideTo(ev.clientX); };
      v.slMove = ev => { if (this._sl) this.slideTo(ev.clientX); };
      v.slUp = () => { this._sl = null; };
    } else if (t === 'table') {
      const ed = dirty && e.fx !== false;
      v.tblEdit = ed;
      const autoAligns = e.cols.map(c => colAlign(c, e.rows));
      const hasLeft = autoAligns.includes('left');
      const aligns = e.cols.map((c, ci) => c.align || autoAligns[ci]);
      const just = a => a === 'right' ? 'flex-end' : a === 'center' ? 'center' : 'flex-start';
      v.grid = autoAligns.map((a, ai) => a === 'center' ? Math.max(84, Math.ceil(textW(ed ? (e.cols[ai].op ? e.name : 'No Entidad') : e.cols[ai].title) + 34)) + 'px' : a === 'right' ? (hasLeft ? 'minmax(90px,0.5fr)' : 'minmax(90px,1fr)') : 'minmax(80px,1fr)').join(' ');
      const cm = s.colMenu;
      v.cols = e.cols.map((c, ci) => {
        const open = !!cm && cm.ent === e.id && cm.col === c.id, last = ci === e.cols.length - 1;
        return {
          label: ed ? (c.op ? e.name : 'No Entidad') : c.title, justify: just(aligns[ci]), bar: c.op ? '#008000' : 'transparent',
          isLast: last, addLeft: () => this.addCol(e.id, ci), addRight: () => this.addCol(e.id, ci + 1),
          openMenu: () => this.setState(st => ({ colMenu: open ? null : { ent: e.id, col: c.id } })),
          dotColor: open ? '#a6a6a6' : '#7a7a7a', menuOpen: open,
          mLeft: last && e.cols.length > 1 ? 'auto' : ci === 0 ? '0' : '50%', mRight: last && e.cols.length > 1 ? '-10px' : 'auto', mTf: (last && e.cols.length > 1) || ci === 0 ? 'none' : 'translateX(-50%)',
          menu: open ? {
            title: this.makeTab('col', c.id, c.title, false, false),
            remove: () => this.removeCol(e.id, c.id), noRemove: e.cols.length < 2, rmOp: e.cols.length < 2 ? 0.35 : 1, rmCursor: e.cols.length < 2 ? 'default' : 'pointer',
            ops: OPS.map(op => ({ label: op[1], bg: c.op === op[0] ? '#1d2b1d' : 'transparent', fw: c.op === op[0] ? 700 : 400, onClick: () => this.setOp(e.id, c.id, op[0]) })),
            pills: [['left', 'Izquierda'], ['center', 'Centro'], ['right', 'Derecha']].map(p => ({ bg: aligns[ci] === p[0] ? '#008000' : '#444', title: 'Alinear: ' + p[1], onClick: () => this.setAlign(e.id, c.id, p[0]) }))
          } : { title: {}, ops: [], pills: [] }
        };
      });
      v.rows = e.rows.map((r, ri) => {
        const act = rowActive(r, e.cols);
        return {
          border: ed || ri < e.rows.length - 1 ? '1px solid #555' : '0',
          cells: e.cols.map((c, ci) => {
            const raw = r.cells[c.id] || '', info = cellInfo(raw, get);
            const deco = !act && info.kind !== 'box' ? 'line-through' : 'none';
            const base = { justify: just(aligns[ci]), bl: ci ? '1px solid #555' : '0', pad: ed ? '0 4px' : '0 14px', isBox: false, isText: false, isField: false };
            if (ed) return { ...base, isField: true, f: this.field(e.id + ':' + r.id + ':' + c.id, raw, hlCell(raw), val => this.setCell(e.id, r.id, c.id, val), { align: aligns[ci], deco }) };
            if (info.kind === 'box') return { ...base, isBox: true, chkBg: info.on ? '#008000' : 'transparent', onToggle: () => this.toggleCell(e.id, r.id, c.id) };
            const green = info.kind === 'num' || info.kind === 'ref';
            return { ...base, isText: true, text: info.kind === 'text' ? info.text : info.kind === 'empty' ? '' : fmt(info.val), color: green ? '#008000' : '#fff', fw: green ? 500 : 400, deco };
          })
        };
      });
      v.showTotal = dirty && !ed;
      { const outV = fmt(entOut(e, get)), opName = { sum: 'Suma', sub: 'Resta', mul: 'Multiplicación', div: 'División' };
        v.totals = e.cols.map((c, ci) => ({ justify: just(aligns[ci]), label: c.op ? opName[c.op] + '  =  ' : '', text: c.op ? outV : '' })); }
      v.rowAdders = ed ? Array.from({ length: e.rows.length + 1 }, (_, i) => ({ top: (40 + i * 51) + 'px', onClick: () => this.addRow(e.id, i) })) : [];
    }
    return v;
  }
});
