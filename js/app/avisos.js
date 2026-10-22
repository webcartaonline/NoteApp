// Notificaciones de las entidades Aviso.
NoteApp.partes.push(Base => class extends Base {
  askPerm() { try { if (window.Notification && Notification.permission === 'default') Notification.requestPermission(); } catch (_) {} }
  fireNotif(e, i) {
    const ot = offTxt(e), title = (e.desc || '').trim() || e.name, body = (e.msg || '').trim() || (i ? (ot ? 'Quedan ' + ot : 'Ha llegado la fecha') : 'Sin fecha asignada'), when = i ? fmt(dt(i.tgt)) : '', id = uid('t');
    this.setState(st => ({ toasts: (st.toasts || []).concat({ id, title, body, when }).slice(-4) }));
    setTimeout(() => this.setState(st => ({ toasts: (st.toasts || []).filter(t => t.id !== id) })), 12000);
    try { if (window.Notification && Notification.permission === 'granted') new Notification(title, { body: body + (when ? ' · ' + when : '') }); } catch (_) {}
  }
  checkNotifs(s) {
    const now = Date.now(), last = this._last || now; this._last = now;
    const ns = []; (s.mode === 'agenda' ? s.notes : s.other.notes).forEach(n => n.sheets.forEach(x => (x.entities || []).forEach(e => { if (e.type === 'notif') ns.push({ e, sid: x.id }); })));
    if (!ns.length) return;
    NOW = now; const W = makeWorld(s);
    ns.forEach(({ e, sid }) => { const i = notifInfo(e, W.at(sid)); if (i && i.fire > last && i.fire <= now) this.fireNotif(e, i); });
  }
});
