import { lazy, Suspense, useEffect, useState } from 'react'
import { Box, ArrowUpRight, Play, RotateCcw, ZoomIn, ZoomOut, Maximize2, MousePointer2, ChevronRight, X, Code2, Mic, Clapperboard, Image, Upload, ChartNoAxesCombined, TrendingUp, FileText, CircleHelp, Focus } from 'lucide-react'
import { STATIONS, DEMO_TIMING, useDemo, type StationId } from './demo'
import AgentPanel from './components/AgentPanel'
const OfficeScene = lazy(() => import('./components/OfficeScene'))
const icons = { tendencias: TrendingUp, guion: FileText, pruebas: Code2, voz: Mic, edicion: Clapperboard, portada: Image, publicacion: Upload, retencion: ChartNoAxesCombined }
const stageMessages = {
  idle: '¿Por qué "5" + 2 da "52"?',
  writing: 'Guion está preparando la historia…',
  pickup: 'El mensajero recoge el episodio.',
  walking: 'El episodio va camino de Pruebas.',
  testing: 'Pruebas está ejecutando JavaScript…',
  producing: 'Resultados listos. Montando tu Short…',
  complete: 'Episodio preparado. Sigue en borrador.',
}

export default function App() {
  const demo = useDemo()
  const [selected, setSelected] = useState<StationId | null>(null)
  const [zoom, setZoom] = useState(1)
  const [reset, setReset] = useState(0)
  const [focus, setFocus] = useState(false)
  const [help, setHelp] = useState(false)
  const [tab, setTab] = useState<'office' | 'episode'>('office')
  useEffect(() => {
    function escape(e: KeyboardEvent) { if (e.key === 'Escape') setHelp(false) }
    window.addEventListener('keydown', escape)
    return () => window.removeEventListener('keydown', escape)
  }, [])
  function selectStation(id: StationId) { setSelected(id); setTab('office'); if (window.matchMedia('(max-width: 760px)').matches) setFocus(true) }
  function overview() { setZoom(1); setReset(n => n + 1); setFocus(false) }
  return <div className={`studio ${selected ? 'has-panel' : ''}`}>
    <header className="app-header">
      <a className="brand" href="/" aria-label="Turno, inicio"><span className="brand-icon"><svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true"><path d="M4 5h20v6h-7v13h-6V11H4z" fill="currentColor"/><path d="M21 18h4v6h-4z" fill="#ed936d"/></svg></span><span>turno<span className="brand-period">.</span><small>ESTUDIO DE PROGRAMACIÓN</small></span></a>
      <nav className="view-tabs" aria-label="Vista del estudio">
        <button className={tab === 'office' ? 'active' : ''} onClick={() => { setTab('office'); setSelected(null); setFocus(false) }}><Box size={15} />La oficina</button>
        <button className={tab === 'episode' ? 'active' : ''} onClick={() => { setTab('episode'); setSelected(demo.results.length ? 'edicion' : 'guion'); if (window.matchMedia('(max-width: 760px)').matches) setFocus(true) }}><Clapperboard size={15} />El episodio{demo.completed && <span className="new-dot" />}</button>
      </nav>
      <div className="header-actions"><span className="local-badge"><i />Sesión local</span><button className={`help-button ${help ? 'active' : ''}`} aria-label="Cómo funciona" aria-expanded={help} onClick={() => setHelp(v => !v)}><CircleHelp size={19} /></button></div>
    </header>

    <main className="studio-main">
      <div className="scene-intro"><div className="eyebrow"><span />ESTUDIO INTERACTIVO / 01</div><h1>Un Short.<br /><span>Ocho oficios.</span></h1><p>Guion, código y un turno de noche.<br />Entra en cualquier escritorio.</p><span className="intro-rule" /><span className="intro-note">Todo empieza con una pregunta.</span></div>
      <div className="scene-meta"><span className="live-pill"><i /> OFICINA ABIERTA</span><span>8 puestos · 1 episodio</span><span className="time-note">Sin publicar <span>↗</span></span></div>
      <div className="canvas-wrap" aria-label="Oficina virtual 3D interactiva con ocho robots. Selecciona un escritorio o un agente.">
        <Suspense fallback={<div className="loading-office"><Box size={32} /><span>Encendiendo el estudio…</span></div>}><OfficeScene demo={demo} selected={selected} onSelect={selectStation} zoom={zoom} reset={reset} focus={focus} /></Suspense>
      </div>
      <div className="scene-bottom-line"><div className="interaction-hint"><MousePointer2 size={14} /><span>Selecciona un escritorio para ver su trabajo</span></div><div className="camera-controls" aria-label="Controles de cámara">
        {selected && <button aria-label="Acercar al agente seleccionado" title="Ver al agente" className={focus ? 'active' : ''} onClick={() => setFocus(v => !v)}><Focus size={17} /></button>}
        <button onClick={() => setZoom(v => Math.max(0.75, v - 0.2))} disabled={zoom <= 0.75} aria-label="Alejar cámara" title="Alejar"><ZoomOut size={17} /></button>
        <button onClick={() => setZoom(v => Math.min(2.1, v + 0.2))} disabled={zoom >= 2.1} aria-label="Acercar cámara" title="Acercar"><ZoomIn size={17} /></button><span />
        <button onClick={overview} aria-label="Volver a la vista general" title="Vista general"><Maximize2 size={16} /></button>
      </div></div>
      {help && <div className="help-popover" role="dialog" aria-label="Cómo funciona Turno"><button className="help-close" onClick={() => setHelp(false)} aria-label="Cerrar ayuda"><X size={17} /></button><span className="eyebrow">CÓMO RECORRER EL ESTUDIO</span><h2>El recorrido, en tres pasos.</h2><p>Toca un robot, una pantalla o un puesto para conocer su tarea. Arrastra la oficina para cambiar el ángulo y usa los controles para acercarte.</p><div><span>01</span><p>Pulsa <b>Probar un Short</b>. Guion prepara el episodio.</p></div><div><span>02</span><p>Sigue al mensajero por el pasillo hasta Pruebas.</p></div><div><span>03</span><p>Explora los resultados y abre <b>Edición</b> para reproducir el Short.</p></div><small>Demo local de 22 segundos · Sin cuentas ni claves</small></div>}
    </main>

    <section className="team-dock" aria-label="Los ocho agentes">
      <div className="dock-heading"><span>LOS PUESTOS</span><small>01 — 08</small></div>
      <div className="station-tabs">{STATIONS.map(station => {
        const Icon = icons[station.id]; const status = demo.getStatus(station.id)
        return <button key={station.id} className={`station-tab ${selected === station.id ? 'active' : ''}`} aria-label={station.name} aria-pressed={selected === station.id} onClick={() => selectStation(station.id)} style={{ '--accent': station.accent } as React.CSSProperties}><span className="tab-icon"><Icon size={17} strokeWidth={1.5} /><i className={status.kind === 'working' ? 'working' : ''} /></span><span>{station.name}<small>{status.label}</small></span><ArrowUpRight size={12} className="tab-arrow" /></button>
      })}</div>
    </section>

    <section className={`demo-bar ${demo.running ? 'is-running' : ''}`} aria-label="Demostración de un Short">
      <div className="demo-symbol"><span>JS</span><small>001</small></div>
      <div className="demo-copy"><div><span className="eyebrow">{demo.stage === 'idle' ? 'EL EJERCICIO DE HOY' : demo.completed ? 'EPISODIO 001 · BORRADOR' : 'EPISODIO 001 · EN PRODUCCIÓN'}</span>{demo.stage !== 'idle' && <span className="demo-counter">{Math.floor(demo.elapsed)} / 22 s</span>}</div><h2 data-testid="stage" data-stage={demo.stage}>{stageMessages[demo.stage]}</h2><p>{demo.stage === 'idle' ? 'Concatenación, coerción y una respuesta que no siempre es 7. Demo de 22 s.' : demo.episode.title}</p></div>
      <div className="demo-actions">{demo.completed && <button className="review-button" onClick={() => selectStation('edicion')}>Ver el Short <ArrowUpRight size={15} /></button>}<button className="try-button" data-testid="demo-start" disabled={demo.running} onClick={demo.start}>{demo.running ? <span className="button-spinner" /> : demo.completed ? <RotateCcw size={15} /> : <Play size={15} fill="currentColor" />}<span>{demo.running ? 'El equipo está trabajando' : demo.completed ? 'Repetir demo' : 'Probar un Short'}</span>{!demo.running && !demo.completed && <ChevronRight size={16} />}</button></div>
      {demo.stage !== 'idle' && <div className="demo-progress"><span style={{ width: `${demo.elapsed / DEMO_TIMING.total * 100}%` }} /></div>}
    </section>
    <footer className="app-footer"><span><i /> TURNO · UN ESTUDIO HECHO DE CÓDIGO.</span><span>TURNO <span className="footer-sep">/</span> V.01 <span className="footer-sep">·</span> DEMO LOCAL</span></footer>
    {['pickup', 'walking', 'testing'].includes(demo.stage) && <span className="sr-only" data-testid="courier">Mensajero único: {demo.stage === 'testing' ? 'llegó a Pruebas' : 'transportando episodio'}</span>}
    <AgentPanel station={selected} demo={demo} onClose={() => { setSelected(null); setFocus(false); setTab('office') }} />
  </div>
}
