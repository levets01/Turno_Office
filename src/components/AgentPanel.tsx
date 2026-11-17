import { useEffect, useRef, type CSSProperties } from 'react';
import { STATIONS, type Demo, type StationId } from '../demo';
import { voiceConnection } from '../integrations/elevenlabs';
import { youtubeConnection } from '../integrations/youtube';
import ShortPreview from './ShortPreview';

type Props = { station: StationId | null; demo: Demo; onClose: () => void };

export default function AgentPanel({ station, demo, onClose }: Props) {
  const closeButton = useRef<HTMLButtonElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    if (!station) return;
    const previous = document.activeElement as HTMLElement | null;
    closeButton.current?.focus({ preventScroll: true });
    const handleKey = (event: KeyboardEvent) => { if (event.key === 'Escape') close.current(); };
    document.addEventListener('keydown', handleKey);
    return () => { document.removeEventListener('keydown', handleKey); previous?.focus({ preventScroll: true }); };
  }, [station]);
  if (!station) return null;
  const agent = STATIONS.find(item => item.id === station)!;
  const status = demo.getStatus(station);
  const ready = demo.results.length > 0;

  function downloadDraft() {
    const restored = demo.stage === 'idle' ? demo.savedDraft : null;
    const blob = new Blob([JSON.stringify({ episode: restored?.episode ?? demo.episode, status: 'draft', tests: restored?.results ?? demo.results, savedAt: restored?.savedAt ?? demo.savedDraft?.savedAt, integrations: { voice: voiceConnection, publishing: youtubeConnection } }, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = 'turno-borrador.json';
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <aside className="agent-panel" role="dialog" aria-modal="false" aria-labelledby="panel-title" style={{ '--agent-accent': agent.accent } as CSSProperties}>
      <div className="panel-handle" />
      <header className="panel-header">
        <div className="panel-agent-number">{agent.initial}</div>
        <div><p className="panel-eyebrow">FICHA DEL AGENTE</p><h2 id="panel-title">{agent.name}</h2></div>
        <button ref={closeButton} className="panel-close" onClick={onClose} aria-label="Cerrar panel del agente"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="m6 6 12 12M18 6 6 18" /></svg></button>
      </header>
      <div className="panel-scroll">
        <p className="panel-role">{agent.role}</p>
        <span className={`panel-status panel-status-${status.kind}`} role="status"><i />{status.label}</span>
        <section className="panel-section"><h3>TAREA ACTUAL</h3><p>{status.task}</p></section>
        <section className="panel-section"><h3>{station === 'retencion' ? 'ESTADÍSTICAS' : 'RESULTADO'}</h3><p className="panel-result-text" aria-live="polite">{status.result}</p></section>

        {station === 'guion' && demo.stage !== 'idle' && <div className="panel-script"><span className="panel-eyebrow">APERTURA</span><h3>{demo.episode.title}</h3><p>{demo.episode.hook}</p>{demo.elapsed >= 3 && <><span className="panel-eyebrow">EXPLICACIÓN</span><p>{demo.episode.explanation}</p></>}</div>}

        {station === 'pruebas' && <div className="panel-tests">
          <div className="panel-code-label"><span>javascript</span><span>{ready ? '3 / 3 verificadas' : '3 expresiones fijas'}</span></div>
          {['"5" + 2', '"5" - 2', 'Number("5") + 2'].map((expression, index) => {
            const result = demo.results[index];
            return <div className="result-row" key={expression}><code>{expression}</code><span className="result-arrow">→</span>{result ? <div className={`result-value result-${result.type}`}><strong>{JSON.stringify(result.value)}</strong><small>{result.type}</small></div> : <span className="result-waiting">{demo.stage === 'testing' ? '⋯' : '—'}</span>}</div>;
          })}
          <p className="panel-caption">Calculado en este navegador · operaciones fijas</p>
        </div>}

        {station === 'portada' && ready && <div className="panel-cover"><span>JAVASCRIPT / 001</span><h3><em>¿7</em> o <b>52?</b></h3><code>"5" + 2</code><p>TEXTO, NÚMEROS Y UN OPERADOR.</p><span className="panel-cover-logo">TURNO</span></div>}
        {station === 'edicion' && ready && <ShortPreview key={demo.stage === 'idle' ? 'idle' : demo.episode.id} />}
        {station === 'voz' && <div className="panel-connection"><div className="panel-wave" aria-hidden="true">{[15, 28, 42, 24, 50, 36, 18, 44, 26, 38, 18, 30].map((height, i) => <span key={i} style={{ height }} />)}</div><strong>{voiceConnection.message}</strong><p>La narración se añadirá al conectar ElevenLabs desde un backend. Vista previa disponible sin audio.</p></div>}
        {station === 'publicacion' && (demo.stage !== 'idle' || demo.savedDraft) && <div className="panel-draft"><span className="panel-eyebrow">BORRADOR · SIN PUBLICAR</span><h3>{demo.episode.title}</h3><p>{youtubeConnection.message}</p><button className="panel-action" onClick={downloadDraft}>↓ Descargar borrador</button><p className="panel-caption">JSON con el guion y las pruebas disponibles. El episodio sigue sin publicar.</p></div>}
        {station === 'retencion' && <div className="panel-empty"><svg width="42" height="42" viewBox="0 0 42 42" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M7 7v28h28M12 26l7-7 7 3 8-12" strokeDasharray="4 4" /></svg><strong>Sin datos</strong><p>Las estadísticas aparecerán al conectar un episodio publicado.</p></div>}
        {station === 'tendencias' && <div className="panel-ideas"><span className="panel-example">DATOS DE EJEMPLO</span><div><strong>01</strong><p>¿Por qué "5" + 2 da "52"?<span>JavaScript · tipos y coerción</span></p></div><div><strong>02</strong><p>¿Por qué [] es truthy?<span>Propuesta editorial de ejemplo</span></p></div><p className="panel-caption">Selección predefinida para esta demo.</p></div>}
      </div>
      <footer className="panel-footer"><i />Episodio compartido · Estado local</footer>
    </aside>
  );
}
