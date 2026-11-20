/**
 * Composición principal de Turno: conecta la demo compartida con la escena 3D
 * y la interfaz HTML. Aquí se decide qué agente se abre y cómo se mueve la cámara.
 */
import { lazy, Suspense, useEffect, useState } from 'react'
import { Box, ArrowUpRight, Play, ZoomIn, ZoomOut, Maximize2, MousePointer2, ChevronRight, X, Mic, Clapperboard, Image, Upload, ChartNoAxesCombined, TrendingUp, CircleHelp, Focus } from 'lucide-react'
import { STATIONS, DEMO_TIMING, useDemo, type StationId } from './demo'
import { useCommerce } from './commerce'
import CommercePanel from './components/CommercePanel'
// Three.js se carga en un archivo separado; Suspense muestra un aviso mientras llega.
const OfficeScene = lazy(() => import('./components/OfficeScene'))
// Cada identificador de agente tiene el mismo icono en la lista de puestos.
const icons = { products: TrendingUp, suppliers: Upload, profitability: ChartNoAxesCombined, catalog: Image, advertising: Mic, orders: Box, support: CircleHelp, analytics: ChartNoAxesCombined }
// El mensaje inferior describe la etapa global, independientemente del panel abierto.
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
  // Una sola instancia mantiene sincronizados robots, monitores, progreso y paneles.
  const demo = useDemo()
  const commerce = useCommerce()
  // selected abre la ficha; interactionKey permite saludar de nuevo al tocar el mismo puesto.
  const [selected, setSelected] = useState<StationId | null>(null)
  const [interactionKey, setInteractionKey] = useState(0)
  // La cámara consume estos valores: escala, orden de reinicio y enfoque del agente.
  const [zoom, setZoom] = useState(1)
  const [reset, setReset] = useState(0)
  const [focus, setFocus] = useState(false)
  // Estado de la interfaz: desplegable de ayuda y pestaña resaltada.
  const [help, setHelp] = useState(false)
  const [tab, setTab] = useState<'office' | 'episode'>('office')
  // Escape cierra la ayuda. La limpieza evita acumular escuchas al desmontar App.
  useEffect(() => {
    function escape(e: KeyboardEvent) { if (e.key === 'Escape') setHelp(false) }
    window.addEventListener('keydown', escape)
    return () => window.removeEventListener('keydown', escape)
  }, [])
  // Todos los puntos de selección comparten esta acción. En móvil también se acerca al robot.
  function selectStation(id: StationId) { setSelected(id); setInteractionKey(key => key + 1); setTab('office'); if (window.matchMedia('(max-width: 760px)').matches) setFocus(true) }
  // Cambiar reset avisa a CameraRig incluso si zoom ya valía 1.
  function overview() { setZoom(1); setReset(n => n + 1); setFocus(false) }
  return <div className={`studio ${selected ? 'has-panel' : ''}`}>
    {/* Cabecera: identidad, navegación entre oficina/episodio y acceso a la ayuda. */}
    <header className="app-header">
      <a className="brand" href="/" aria-label="Turno, inicio"><span className="brand-icon"><svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true"><path d="M4 5h20v6h-7v13h-6V11H4z" fill="currentColor"/><path d="M21 18h4v6h-4z" fill="#ed936d"/></svg></span><span>turno<span className="brand-period">.</span><small>ESTUDIO DE PROGRAMACIÓN</small></span></a>
      {/* El episodio abre Guion mientras se prepara y Edición cuando ya hay resultados. */}
      <nav className="view-tabs" aria-label="Vista del estudio">
        <button className={tab === 'office' ? 'active' : ''} onClick={() => { setTab('office'); setSelected(null); setFocus(false) }}><Box size={15} />La oficina</button>
        <button className={tab === 'episode' ? 'active' : ''} onClick={() => { setTab('episode'); setSelected('catalog'); setInteractionKey(key => key + 1); if (window.matchMedia('(max-width: 760px)').matches) setFocus(true) }}><Clapperboard size={15} />Operaciones{commerce.store.tasks.length > 0 && <span className="new-dot" />}</button>
      </nav>
      <div className="header-actions"><span className="local-badge"><i />Sesión local</span><button className={`help-button ${help ? 'active' : ''}`} aria-label="Cómo funciona" aria-expanded={help} onClick={() => setHelp(v => !v)}><CircleHelp size={19} /></button></div>
    </header>

    {/* Zona principal: textos y controles HTML superpuestos sobre el lienzo WebGL. */}
    <main className="studio-main">
      <div className="scene-intro"><div className="eyebrow"><span />ESTUDIO INTERACTIVO / 01</div><h1>Un Short.<br /><span>Ocho oficios.</span></h1><p>Guion, código y un turno de noche.<br />Entra en cualquier escritorio.</p><span className="intro-rule" /><span className="intro-note">Todo empieza con una pregunta.</span></div>
      <div className="scene-meta"><span className="live-pill"><i /> OFICINA ABIERTA</span><span>8 puestos · 1 episodio</span><span className="time-note">Sin publicar <span>↗</span></span></div>
      {/* La escena recibe el mismo estado de la tarea y devuelve selecciones mediante onSelect. */}
      <div className="canvas-wrap" aria-label="Oficina virtual 3D interactiva con ocho robots. Selecciona un escritorio o un agente.">
        <Suspense fallback={<div className="loading-office"><Box size={32} /><span>Encendiendo el estudio…</span></div>}><OfficeScene demo={demo} selected={selected} interactionKey={interactionKey} onSelect={selectStation} zoom={zoom} reset={reset} focus={focus} /></Suspense>
      </div>
      {/* Límites de zoom para mantener una vista utilizable; el enfoque requiere un agente seleccionado. */}
      <div className="scene-bottom-line"><div className="interaction-hint"><MousePointer2 size={14} /><span>Selecciona un escritorio para ver su trabajo</span></div><div className="camera-controls" aria-label="Controles de cámara">
        {selected && <button aria-label="Acercar al agente seleccionado" title="Ver al agente" className={focus ? 'active' : ''} onClick={() => setFocus(v => !v)}><Focus size={17} /></button>}
        <button onClick={() => setZoom(v => Math.max(0.75, v - 0.2))} disabled={zoom <= 0.75} aria-label="Alejar cámara" title="Alejar"><ZoomOut size={17} /></button>
        <button onClick={() => setZoom(v => Math.min(2.1, v + 0.2))} disabled={zoom >= 2.1} aria-label="Acercar cámara" title="Acercar"><ZoomIn size={17} /></button><span />
        <button onClick={overview} aria-label="Volver a la vista general" title="Vista general"><Maximize2 size={16} /></button>
      </div></div>
      {/* La ayuda se monta solo al abrirla; no forma parte del espacio tridimensional. */}
      {help && <div className="help-popover" role="dialog" aria-label="Cómo funciona Turno"><button className="help-close" onClick={() => setHelp(false)} aria-label="Cerrar ayuda"><X size={17} /></button><span className="eyebrow">CÓMO RECORRER EL ESTUDIO</span><h2>El recorrido, en tres pasos.</h2><p>Toca un robot, una pantalla o un puesto para conocer su tarea. El agente te saludará. Arrastra la oficina para cambiar el ángulo y usa los controles para acercarte.</p><div><span>01</span><p>Pulsa <b>Probar un Short</b>. Guion prepara el episodio.</p></div><div><span>02</span><p>Sigue al mensajero por el pasillo hasta Pruebas.</p></div><div><span>03</span><p>Explora los resultados y abre <b>Edición</b> para reproducir el Short.</p></div><small>Demo local de 22 segundos · Sin cuentas ni claves</small></div>}
    </main>

    {/* Alternativa accesible al clic 3D: los ocho puestos se pueden elegir con teclado o toque. */}
    <section className="team-dock" aria-label="Los ocho agentes">
      <div className="dock-heading"><span>LOS PUESTOS</span><small>01 — 08</small></div>
      <div className="station-tabs">{STATIONS.map(station => {
        // El estado se consulta de nuevo al actualizarse la demo; no se guarda una copia por botón.
        const Icon = icons[station.id]; const status = demo.getStatus(station.id)
        return <button key={station.id} className={`station-tab ${selected === station.id ? 'active' : ''}`} aria-label={station.name} aria-pressed={selected === station.id} onClick={() => selectStation(station.id)} style={{ '--accent': station.accent } as React.CSSProperties}><span className="tab-icon"><Icon size={17} strokeWidth={1.5} /><i className={status.kind === 'working' ? 'working' : ''} /></span><span>{station.name}<small>{status.label}</small></span><ArrowUpRight size={12} className="tab-arrow" /></button>
      })}</div>
    </section>

    {/* Control de la demo: iniciar/repetir, abrir el resultado y mostrar el avance de los 22 segundos. */}
    <section className={`demo-bar ${demo.running ? 'is-running' : ''}`} aria-label="Demostración de un Short">
      <div className="demo-symbol"><span>JS</span><small>001</small></div>
      <div className="demo-copy"><div><span className="eyebrow">{demo.stage === 'idle' ? 'EL EJERCICIO DE HOY' : demo.completed ? 'EPISODIO 001 · BORRADOR' : 'EPISODIO 001 · EN PRODUCCIÓN'}</span>{demo.stage !== 'idle' && <span className="demo-counter">{Math.floor(demo.elapsed)} / 22 s</span>}</div><h2 data-testid="stage" data-stage={demo.stage}>{stageMessages[demo.stage]}</h2><p>{demo.stage === 'idle' ? 'Concatenación, coerción y una respuesta que no siempre es 7. Demo de 22 s.' : demo.episode.title}</p></div>
      <div className="demo-actions"><button className="try-button" data-testid="agents-run" disabled={commerce.running} onClick={commerce.runAll}>{commerce.running ? <span className="button-spinner" /> : <Play size={15} fill="currentColor" />}<span>{commerce.running ? 'Los agentes están trabajando' : 'Ejecutar los 8 agentes'}</span>{!commerce.running && <ChevronRight size={16} />}</button></div>
      {demo.stage !== 'idle' && <div className="demo-progress"><span style={{ width: `${demo.elapsed / DEMO_TIMING.total * 100}%` }} /></div>}
    </section>
    <footer className="app-footer"><span><i /> TURNO · UN ESTUDIO HECHO DE CÓDIGO.</span><span>TURNO <span className="footer-sep">/</span> V.01 <span className="footer-sep">·</span> DEMO LOCAL</span></footer>
    {/* Descripción accesible del único mensajero; las pruebas también usan este indicador. */}
    {['pickup', 'walking', 'testing'].includes(demo.stage) && <span className="sr-only" data-testid="courier">Mensajero único: {demo.stage === 'testing' ? 'llegó a Pruebas' : 'transportando episodio'}</span>}
    {/* Cerrar la ficha devuelve la interfaz a la oficina y desactiva el enfoque individual. */}
    {selected && <CommercePanel station={selected} demo={demo} commerce={commerce} onClose={() => { setSelected(null); setFocus(false); setTab('office') }} />}
  </div>
}
