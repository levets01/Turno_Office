import { useEffect, useState } from 'react';

/** Secuencia local de doce segundos: pregunta, concatenación y conversión explícita. */
export default function ShortPreview() {
  // El tiempo queda guardado al pausar para reanudar desde ese punto.
  const [playing, setPlaying] = useState(false);
  const [seconds, setSeconds] = useState(0);
  // Se crea un solo reloj al reproducir; el efecto lo limpia al pausar, terminar o cerrar la vista previa.
  useEffect(() => {
    if (!playing) return;
    // performance.now mide el tiempo transcurrido: los retrasos del intervalo no acumulan desfase.
    const initialSeconds = seconds;
    const startedAt = performance.now();
    // Cada 100 ms actualiza la interfaz y limita la duración a doce segundos.
    const timer = window.setInterval(() => {
      const next = Math.min(12, initialSeconds + (performance.now() - startedAt) / 1000);
      setSeconds(next);
      if (next >= 12) setPlaying(false);
    }, 100);
    return () => window.clearInterval(timer);
  }, [playing]);
  // Cada toma ocupa cuatro segundos. El índice elige tanto el texto principal como el rótulo superior.
  const shot = seconds < 4 ? 0 : seconds < 8 ? 1 : 2;
  return (
    <div className="short-preview">
      {/* CSS mantiene la pantalla en proporción 9:16; esto es una vista HTML, no un archivo de vídeo. */}
      <div className="short-screen" aria-label="Previsualización vertical del Short" data-shot={shot}>
        <div className="short-brand"><span>T.</span> TURNO <span>JS / 001</span></div>
        <div className="short-content" aria-live="polite">
          <span className="short-eyebrow">{['01 / PREGUNTA', '02 / CONCATENACIÓN', '03 / CONVERSIÓN'][shot]}</span>
          {/* Primero se plantea la pregunta; después aparecen el texto "52" y la suma convertida a número. */}
          {shot === 0 ? <><h3>¿7 <span>o</span> 52?</h3><code>"5" + 2</code><p>¿Qué devuelve JavaScript?</p></>
            : shot === 1 ? <><h3 className="result-string">"52"</h3><code>typeof → "string"</code><p>Con texto, <b>+</b> concatena.</p></>
              : <><h3 className="result-number">7</h3><code>Number("5") + 2</code><p>Convierte primero. Suma después.</p></>}
        </div>
        <div className="short-footer"><span>JAVASCRIPT / COERCIÓN</span><span>{shot + 1} / 3</span></div>
        {/* El ancho de la barra representa la fracción reproducida de los doce segundos. */}
        <div className="short-progress"><span style={{ width: `${seconds / 12 * 100}%` }} /></div>
      </div>
      {/* Reproducir vuelve al inicio al terminar; reiniciar detiene el reloj y restaura la pregunta. */}
      <div className="short-controls">
        <button className="panel-action" onClick={() => { if (seconds >= 12) setSeconds(0); setPlaying(value => !value); }} aria-label={playing ? 'Pausar Short' : 'Reproducir Short'}>{playing ? 'Ⅱ Pausar' : '▷ Reproducir'}</button>
        <button className="panel-icon-button" onClick={() => { setSeconds(0); setPlaying(false); }} aria-label="Reiniciar Short">↺</button>
        <span className="short-time">0:{String(Math.floor(seconds)).padStart(2, '0')} / 0:12</span>
      </div>
      <p className="panel-caption">Vista previa local · 9:16 · sin audio</p>
    </div>
  );
}
