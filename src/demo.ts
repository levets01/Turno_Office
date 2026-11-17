/**
 * Lógica del episodio de demostración. Este archivo no dibuja la oficina:
 * calcula resultados, avanza por etapas y ofrece un estado común para toda la interfaz.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

// Los identificadores unen el catálogo, las posiciones 3D y las fichas de los agentes.
export type StationId = 'tendencias' | 'guion' | 'pruebas' | 'voz' | 'edicion' | 'portada' | 'publicacion' | 'retencion';
export type DemoStage = 'idle' | 'writing' | 'pickup' | 'walking' | 'testing' | 'producing' | 'complete';
export type AgentStatus = { label: string; kind: 'idle' | 'working' | 'ready' | 'pending'; task: string; result: string };

// Catálogo editable: nombres, oficio, número del puesto y color de cada robot.
export const STATIONS: { id: StationId; name: string; role: string; initial: string; accent: string }[] = [
  { id: 'tendencias', name: 'Tendencias', role: 'Encuentra la próxima idea', initial: '01', accent: '#efbf70' },
  { id: 'guion', name: 'Guion', role: 'Convierte ideas en historias', initial: '02', accent: '#6de4d1' },
  { id: 'pruebas', name: 'Pruebas', role: 'Comprueba cada línea', initial: '03', accent: '#91b5ff' },
  { id: 'voz', name: 'Voz', role: 'Dale voz a la explicación', initial: '04', accent: '#c4a1f5' },
  { id: 'edicion', name: 'Edición', role: 'Ensambla el Short', initial: '05', accent: '#efbf70' },
  { id: 'portada', name: 'Portada', role: 'Diseña el primer vistazo', initial: '06', accent: '#f59cb8' },
  { id: 'publicacion', name: 'Publicación', role: 'Prepara el próximo estreno', initial: '07', accent: '#8ecfb2' },
  { id: 'retencion', name: 'Retención', role: 'Escucha a la audiencia', initial: '08', accent: '#8db9da' },
];

// Contenido predefinido del ejercicio; no se genera mediante una API de IA.
export const EPISODE = {
  id: 'js-coercion-001',
  title: '¿Por qué "5" + 2 da "52" en JavaScript?',
  hook: '¿Esperabas 7? JavaScript tiene otros planes.',
  explanation: 'Con +, si uno de los operandos es texto, JavaScript concatena. Por eso "5" + 2 produce el texto "52". El operador - convierte el texto numérico a número: "5" - 2 da 3. Para sumar de forma explícita, Number("5") + 2 da 7.',
  draft: true,
} as const;

// Segundos acumulados en los que TERMINA cada etapa (no duraciones individuales).
// Escritura 0–3, recogida 3–5, paseo 5–13, pruebas 13–17 y montaje 17–22.
export const DEMO_TIMING = { writing: 3, pickup: 5, walking: 13, testing: 17, producing: 22, total: 22 } as const;

// Conservamos el valor original para distinguir el texto "52" de los números 3 y 7.
export type TestResult = { expression: string; value: string | number; type: 'string' | 'number' };
export type SavedDraft = { version: 1; episode: typeof EPISODE; results: TestResult[]; savedAt: string };
// La clave conserva el nombre inicial del proyecto para recuperar borradores anteriores.
export const DRAFT_STORAGE_KEY = 'codex-studio:draft:v1';

/** Recupera un borrador compatible; si el almacenamiento falta o es inválido, empieza vacío. */
function readDraft(): { savedDraft: SavedDraft | null; draftPersisted: boolean } {
  try {
    const raw = window.localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!raw) return { savedDraft: null, draftPersisted: false };
    const data: unknown = JSON.parse(raw);
    if (!data || typeof data !== 'object') return { savedDraft: null, draftPersisted: false };
    const draft = data as Partial<SavedDraft>;
    // Valida versión, episodio, fecha y estructura de los tres resultados antes de usarlos.
    const expressions = ['"5" + 2', '"5" - 2', 'Number("5") + 2'];
    if (draft.version !== 1 || draft.episode?.id !== EPISODE.id || typeof draft.savedAt !== 'string'
      || Number.isNaN(Date.parse(draft.savedAt)) || !Array.isArray(draft.results) || draft.results.length !== 3
      || !draft.results.every((result, i) => result && result.expression === expressions[i]
        && (result.type === 'string' || result.type === 'number') && typeof result.value === result.type)) {
      return { savedDraft: null, draftPersisted: false };
    }
    return {
      savedDraft: { version: 1, episode: EPISODE, savedAt: draft.savedAt, results: draft.results },
      draftPersisted: true,
    };
  } catch {
    // El navegador puede bloquear localStorage o contener JSON dañado: la oficina sigue disponible.
    return { savedDraft: null, draftPersisted: false };
  }
}

/** Ejecuta tres operaciones fijas de JavaScript; no interpreta texto ni usa eval. */
export function computeResults(): TestResult[] {
  // + concatena si recibe texto; - convierte este texto numérico; Number permite sumar explícitamente.
  const concatenate = () => '5' + 2;
  const subtract = () => {
    // @ts-expect-error La resta prueba intencionalmente la conversión implícita de texto a número.
    return '5' - 2;
  };
  const convertAndAdd = () => Number('5') + 2;
  return [
    { expression: '"5" + 2', value: concatenate(), type: 'string' },
    { expression: '"5" - 2', value: subtract(), type: 'number' },
    { expression: 'Number("5") + 2', value: convertAndAdd(), type: 'number' },
  ].map((result) => ({ ...result, type: typeof result.value as 'string' | 'number' }));
}

/** Convierte el tiempo transcurrido en una etapa, también usado por las pruebas automáticas. */
export function stageAt(elapsed: number): Exclude<DemoStage, 'idle'> {
  if (elapsed < DEMO_TIMING.writing) return 'writing';
  if (elapsed < DEMO_TIMING.pickup) return 'pickup';
  if (elapsed < DEMO_TIMING.walking) return 'walking';
  if (elapsed < DEMO_TIMING.testing) return 'testing';
  if (elapsed < DEMO_TIMING.producing) return 'producing';
  return 'complete';
}

/** Hook que App instancia una vez y pasa a todos los consumidores de la tarea. */
export function useDemo() {
  // El estado provoca actualizaciones de la interfaz; las refs guardan datos entre renders.
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [{ savedDraft, draftPersisted }, setDraft] = useState(readDraft);
  const startTime = useRef(0);
  const runningRef = useRef(false);
  // Las etapas y resultados se derivan del reloj; no hay temporizadores separados por agente.
  const stage: DemoStage = hasStarted ? stageAt(elapsed) : 'idle';
  const completed = stage === 'complete';
  const hasResults = hasStarted && elapsed >= DEMO_TIMING.testing;
  const results = useMemo(() => hasResults ? computeResults() : [], [hasResults]);

  // runningRef bloquea clics duplicados inmediatamente, antes del siguiente render de React.
  // Al terminar vuelve a false y permite iniciar el mismo episodio desde cero.
  const start = useCallback(() => {
    if (runningRef.current) return;
    runningRef.current = true;
    startTime.current = performance.now();
    setElapsed(0);
    setHasStarted(true);
    setRunning(true);
  }, []);

  // Actualiza la interfaz cada 60 ms y mide tiempo real para evitar acumular retrasos del intervalo.
  // La función de limpieza detiene el reloj cuando se desmonta o finaliza la ejecución.
  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => {
      const next = Math.min(DEMO_TIMING.total, (performance.now() - startTime.current) / 1000);
      setElapsed(next);
      if (next >= DEMO_TIMING.total) {
        runningRef.current = false;
        setRunning(false);
      }
    }, 60);
    return () => window.clearInterval(timer);
  }, [running]);

  // Guarda el borrador solo al completar el episodio, con los resultados disponibles.
  useEffect(() => {
    if (!completed) return;
    const draft: SavedDraft = { version: 1, episode: EPISODE, results, savedAt: new Date().toISOString() };
    let persisted = false;
    try {
      window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
      persisted = true;
    } catch { /* Si falla el guardado, el estado de React conserva el borrador durante esta sesión. */ }
    setDraft({ savedDraft: draft, draftPersisted: persisted });
  }, [completed, results]);

  // La escena consulta tiempo continuo para animar con fluidez entre las actualizaciones de React.
  const getElapsed = useCallback(() => runningRef.current ? Math.min(DEMO_TIMING.total, (performance.now() - startTime.current) / 1000) : elapsed, [elapsed]);

  // Traduce el estado global a la tarea, etiqueta y resultado que consume cada puesto.
  // Paneles y monitores consultan esta misma función para actualizarse al mismo tiempo.
  const getStatus = useCallback((id: StationId): AgentStatus => {
    const waiting: AgentStatus = { label: 'Disponible', kind: 'idle', task: STATIONS.find(s => s.id === id)!.role, result: 'Pulsa «Probar un Short» para preparar el episodio de JavaScript.' };
    // Estos servicios aún no están conectados: sus mensajes nunca simulan audio ni estadísticas.
    if (id === 'voz') return { label: 'Pendiente de conexión', kind: 'pending', task: 'Locutar el guion del episodio.', result: 'ElevenLabs pendiente de conexión. El Short se puede previsualizar sin audio.' };
    if (id === 'retencion') return { label: 'Sin datos', kind: 'idle', task: 'Analizar las estadísticas del episodio cuando esté publicado.', result: 'Sin datos. No hay estadísticas reales ni métricas simuladas para este episodio.' };
    // La idea es editorial y está marcada como ejemplo, sin tendencias en directo.
    if (id === 'tendencias') return { label: hasStarted ? 'Idea seleccionada' : 'Explorando ideas', kind: hasStarted ? 'ready' : 'idle', task: 'Proponer preguntas de programación para el canal.', result: 'Idea de ejemplo: coerción de tipos en JavaScript. Selección editorial de demostración, sin datos de tendencias en directo.' };
    // Publicación puede recuperar un borrador aunque la nueva sesión todavía esté en reposo.
    if (id === 'publicacion' && (hasStarted || savedDraft)) return {
      label: !hasStarted ? 'Borrador recuperado' : completed ? 'Borrador listo' : 'Preparando borrador',
      kind: completed || !hasStarted ? 'ready' : 'idle',
      task: 'Conservar el episodio para revisarlo antes de publicar.',
      result: (completed || !hasStarted
        ? draftPersisted ? 'Borrador guardado en este navegador; seguirá disponible al recargar. '
          : 'Borrador disponible en esta sesión; el almacenamiento del navegador no está disponible. '
        : 'Preparando el borrador local del episodio. ')
        + 'YouTube pendiente de conexión; no se ha publicado ningún vídeo.',
    };
    // Los agentes que dependen de la ejecución permanecen disponibles hasta que se pulse iniciar.
    if (!hasStarted) return waiting;
    // Guion muestra primero la pregunta y después la explicación preparada.
    if (id === 'guion') return elapsed < DEMO_TIMING.writing
      ? { label: 'Escribiendo', kind: 'working', task: 'Preparar la pregunta inicial y una explicación breve.', result: EPISODE.title }
      : { label: 'Guion listo', kind: 'ready', task: 'Explicar la diferencia entre concatenar y sumar.', result: EPISODE.explanation };
    // Pruebas distingue tarjeta en camino, ejecución y resultados ya calculados.
    if (id === 'pruebas') {
      if (hasResults) return { label: '3 pruebas verificadas', kind: 'ready', task: 'Ejecutar las tres expresiones fijas en JavaScript.', result: 'Texto "52" · número 3 · número 7. Resultados calculados en este navegador.' };
      if (stage === 'testing') return { label: 'Ejecutando pruebas', kind: 'working', task: 'Comprobar resultados y tipos de las tres expresiones.', result: 'Ejecutando operaciones definidas en código…' };
      return { label: stage === 'walking' || stage === 'pickup' ? 'Tarjeta en camino' : 'Esperando guion', kind: 'idle', task: 'Esperar la tarjeta del mensajero.', result: 'Las pruebas aparecerán aquí al terminar, aunque mantengas abierto este panel.' };
    }
    // Portada y Edición solo ofrecen contenido después de verificar las expresiones.
    if (id === 'portada') return hasResults
      ? { label: 'Portada lista', kind: 'ready', task: 'Presentar el dilema con una portada legible.', result: '¿7 o 52? · JavaScript en un Short. Diseño de demostración generado localmente.' }
      : { ...waiting, label: 'Esperando pruebas', task: 'Preparar la portada después de verificar la respuesta.' };
    if (id === 'edicion') return hasResults
      ? { label: completed ? 'Secuencia lista' : 'Montando secuencia', kind: completed ? 'ready' : 'working', task: 'Ordenar la pregunta, la explicación y la respuesta en formato vertical.', result: 'Previsualización local 9:16 de 12 segundos, sin audio. La pregunta aparece antes que la respuesta.' }
      : { ...waiting, label: 'Esperando resultados', task: 'Montar el Short cuando termine la verificación.' };
    return waiting;
  }, [completed, draftPersisted, elapsed, hasResults, hasStarted, savedDraft, stage]);

  // Contrato compartido con App, OfficeScene y AgentPanel.
  return { stage, running, completed, elapsed, getElapsed, episode: EPISODE, results, start, getStatus, savedDraft, draftPersisted };
}

export type Demo = ReturnType<typeof useDemo>;
