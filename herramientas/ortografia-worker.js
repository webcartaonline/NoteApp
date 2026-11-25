// FUENTE del corrector ortográfico. No la carga la app: se empaqueta con esbuild en js/ortografia-worker.js
// (ver AGENTS.md → «Corrector ortográfico» para volver a generarlo). Usa hunspell-asm (Hunspell en WebAssembly).
import { loadModule } from 'hunspell-asm';
let h = null;
const base = new URL('../diccionario/', self.location.href);
const listo = (async () => {
  const [factory, aff, dic] = await Promise.all([
    loadModule(),
    fetch(new URL('es.aff', base)).then(r => { if (!r.ok) throw new Error('es.aff ' + r.status); return r.arrayBuffer(); }),
    fetch(new URL('es.dic', base)).then(r => { if (!r.ok) throw new Error('es.dic ' + r.status); return r.arrayBuffer(); })
  ]);
  h = factory.create(factory.mountBuffer(new Uint8Array(aff), 'es.aff'), factory.mountBuffer(new Uint8Array(dic), 'es.dic'));
  self.postMessage({ tipo: 'listo' });
})().catch(err => { self.postMessage({ tipo: 'error', texto: String(err && err.message || err) }); throw err; });
self.onmessage = async e => {
  const m = e.data || {};
  try { await listo; } catch (_) { return; }
  if (m.tipo === 'revisar') {
    const mal = [];
    for (const w of m.palabras) if (!h.spell(w)) mal.push(w);
    self.postMessage({ tipo: 'revisadas', palabras: m.palabras, mal });
  } else if (m.tipo === 'sugerir') {
    let lista = [];
    try { lista = h.suggest(m.palabra); } catch (_) {}
    self.postMessage({ tipo: 'sugerencias', palabra: m.palabra, lista });
  }
};
