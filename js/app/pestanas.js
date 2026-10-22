// Pestañas de notas y hojas: seleccionar, mover, renombrar y copiar al portapapeles.
NoteApp.partes.push(Base => class extends Base {
  select(kind, id) {
    if (kind === 'note') this.setState({ activeNote: id, focusId: null });
    else this.setState(s => ({ focusId: null, notes: s.notes.map(n => n.id !== s.activeNote ? n : { ...n, activeSheet: id }) }));
  }
  moveSheet(id, dir) {
    this.setState(s => ({ notes: s.notes.map(n => {
      if (n.id !== s.activeNote) return n;
      const k = n.sheets.findIndex(x => x.id === id), j = k + dir;
      if (k < 0 || j < 0 || j >= n.sheets.length) return n;
      const sh = n.sheets.slice(); [sh[k], sh[j]] = [sh[j], sh[k]];
      return { ...n, sheets: sh };
    }) }), () => { try { const el = document.querySelector('[data-sheet="' + id + '"]'); el && el.scrollIntoView({ block: 'nearest', inline: 'nearest' }); } catch (_) {} });
  }
  makeTab(kind, id, name, active, isSheet) {
    const s = this.state;
    const editing = !!s.editing && s.editing.kind === kind && s.editing.id === id;
    const val = editing ? s.draft : name;
    return {
      text: val,
      display: val || '\u00a0',
      readOnly: !editing,
      weight: active ? 600 : 400,
      color: active ? '#008000' : '#a6a6a6',
      bg: isSheet && active ? '#1c1c1c' : 'transparent',
      cursor: editing ? 'text' : 'pointer',
      underline: editing ? 'inset 0 -2px 0 #008000' : 'none',
      onDown: e => { if (!editing && e.detail < 2) e.preventDefault(); },
      onClick: () => { if (!editing && !active && (kind === 'note' || kind === 'sheet')) this.select(kind, id); },
      onDbl: e => {
        if (editing) return;
        const el = e.target;
        this.setState({ editing: { kind, id }, draft: name }, () => { el.focus(); el.select(); });
      },
      onChange: e => {
        if (!editing) return;
        const el = e.target, p = el.selectionStart, v = kind === 'ent' ? el.value.replace(/ /g, '_') : el.value;
        this.setState({ draft: v.slice(0, kind === 'ent' ? ENT_MAX : TAB_MAX) }, kind === 'ent' ? () => { try { el.setSelectionRange(p, p); } catch (_) {} } : undefined);
      },
      onKey: e => {
        if (!editing) return;
        if (e.key === 'Enter') e.target.blur();
        else if (e.key === 'Escape') { this.setState({ editing: null }); e.target.blur(); }
      },
      onBlur: e => { try { e.target.setSelectionRange(0, 0); } catch (_) {} window.getSelection && window.getSelection().removeAllRanges(); this.commit(kind, id); }
    };
  }
  copyText(t, key) {
    const done = () => { this.setState({ copied: key }); clearTimeout(this._ct); this._ct = setTimeout(() => this.setState({ copied: null }), 1400); };
    const fb = () => { const ta = document.createElement('textarea'); ta.value = t; ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0;'; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); } catch (_) {} ta.remove(); done(); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(done, fb); else fb();
  }
});
