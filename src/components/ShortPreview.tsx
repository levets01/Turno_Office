import { useEffect, useState } from 'react';

export default function ShortPreview() {
  const [playing, setPlaying] = useState(false);
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    if (!playing) return;
    const initialSeconds = seconds;
    const startedAt = performance.now();
    const timer = window.setInterval(() => {
      const next = Math.min(12, initialSeconds + (performance.now() - startedAt) / 1000);
      setSeconds(next);
      if (next >= 12) setPlaying(false);
    }, 100);
    return () => window.clearInterval(timer);
  }, [playing]);
  const shot = seconds < 4 ? 0 : seconds < 8 ? 1 : 2;
  return (
    <div className="short-preview">
      <div className="short-screen" aria-label="Previsualización vertical del Short" data-shot={shot}>
        <div className="short-brand"><span>T.</span> TURNO <span>JS / 001</span></div>
        <div className="short-content" aria-live="polite">
          <span className="short-eyebrow">{['01 / PREGUNTA', '02 / CONCATENACIÓN', '03 / CONVERSIÓN'][shot]}</span>
          {shot === 0 ? <><h3>¿7 <span>o</span> 52?</h3><code>"5" + 2</code><p>¿Qué devuelve JavaScript?</p></>
            : shot === 1 ? <><h3 className="result-string">"52"</h3><code>typeof → "string"</code><p>Con texto, <b>+</b> concatena.</p></>
              : <><h3 className="result-number">7</h3><code>Number("5") + 2</code><p>Convierte primero. Suma después.</p></>}
        </div>
        <div className="short-footer"><span>JAVASCRIPT / COERCIÓN</span><span>{shot + 1} / 3</span></div>
        <div className="short-progress"><span style={{ width: `${seconds / 12 * 100}%` }} /></div>
      </div>
      <div className="short-controls">
        <button className="panel-action" onClick={() => { if (seconds >= 12) setSeconds(0); setPlaying(value => !value); }} aria-label={playing ? 'Pausar Short' : 'Reproducir Short'}>{playing ? 'Ⅱ Pausar' : '▷ Reproducir'}</button>
        <button className="panel-icon-button" onClick={() => { setSeconds(0); setPlaying(false); }} aria-label="Reiniciar Short">↺</button>
        <span className="short-time">0:{String(Math.floor(seconds)).padStart(2, '0')} / 0:12</span>
      </div>
      <p className="panel-caption">Vista previa local · 9:16 · sin audio</p>
    </div>
  );
}
