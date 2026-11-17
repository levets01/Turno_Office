# Turno

Oficina virtual 3D local para explorar cómo un equipo de robots prepara un Short de programación. React, TypeScript, Vite, Three.js, React Three Fiber y Drei. Sin cuentas, imágenes externas, modelos descargados ni claves.

## Iniciar

Requiere Node.js 22.12 o posterior (probado con Node 24).

```bash
npm install
npm run dev
```

Abre **http://localhost:5173**. El servidor escucha en la red local: para probar desde un celular en la misma Wi-Fi, usa la dirección `Network` que imprime Vite. El firewall del PC debe permitir ese puerto.

```bash
npm run build
npm run preview
```

La compilación queda en `dist/`. La aplicación funciona sin conexiones externas después de instalar sus dependencias.

## Recorrer la oficina

- Toca un robot, su monitor, su escritorio o cualquiera de los ocho botones del equipo para abrir su panel. El panel sigue actualizándose durante la demo; en móvil se abre desde abajo. Escape lo cierra.
- Arrastra para cambiar suavemente el ángulo. Los botones de cámara acercan, alejan, enfocan el agente seleccionado y vuelven a la vista general.
- Pulsa **Probar un Short**. La ejecución dura unos 22 segundos: Guion → recogida → mensajero → Pruebas → Portada y Edición → borrador. El botón se bloquea mientras trabaja y permite repetir al terminar.
- Abre **Pruebas** durante la ejecución para ver aparecer los resultados sin cerrar el panel. Abre **Edición** después de las pruebas para reproducir la secuencia vertical de 12 segundos (pregunta, respuesta y conversión explícita).
- **Publicación** permite descargar el borrador JSON. El borrador terminado se conserva en `localStorage` y se recupera al recargar. Si el navegador bloquea almacenamiento, se conserva en la sesión y se indica en el panel.

## Modificar el modelo y la escena

- `src/components/RobotCodex.tsx`: cabeza, visor, ojos, torso, accesorios y grupos articulados; `useFrame` controla cuello, hombros y caderas. Props `color`, `mode`, `accessory`, `position`, `rotation`, `scale`, `onClick`. Frente local: +Z; pies: Y≈0; altura: 1.70 unidades. Los modos son `idle`, `working`, `walking` y `delivering`.
- `src/components/OfficeScene.tsx`: `STATION_POSITIONS` determina posición y altura de cada escritorio; `Room`, `Station`, `Monitor` y `DeskLamp` modelan muebles y arquitectura. Las pantallas son texturas de canvas generadas en código, sin fuentes remotas. Escritorios y robots pueden moverse con props de React.
- `src/route.ts`: ruta por el pasillo y límites de los muebles. Si mueves mesas, actualiza la ruta y sus límites y ejecuta las pruebas de colisión.
- `src/demo.ts`: agentes, textos, estados, cálculos y tiempos. `DEMO_TIMING` sincroniza el episodio. Cada panel y monitor consume el mismo estado.
- `src/styles.css`: interfaz, controles, rótulos y panel móvil.

## Qué funciona realmente

Las tres expresiones se ejecutan como operaciones fijas de JavaScript, **sin `eval`**:

| Expresión | Valor | Tipo |
| --- | --- | --- |
| `"5" + 2` | `"52"` | `string` |
| `"5" - 2` | `3` | `number` |
| `Number("5") + 2` | `7` | `number` |

También son reales la selección 3D, las animaciones articuladas, el recorrido del mensajero, los controles de cámara, la actualización de paneles, la previsualización vertical, la descarga JSON y el almacenamiento local del borrador.

El guion y el episodio son predefinidos; no se llama a ningún modelo de IA. Las ideas y la gráfica de Tendencias están identificadas como **datos de ejemplo**. La forma de onda es una muestra visual, no audio generado. La portada es un diseño de demostración local y la vista previa es una secuencia HTML, no un archivo MP4 exportado.

**Voz:** “ElevenLabs pendiente de conexión”, sin síntesis de audio. **Publicación:** borrador local, sin subida a YouTube. **Retención:** “Sin datos”, sin estadísticas inventadas.

## Integraciones futuras

`src/integrations/elevenlabs.ts` y `src/integrations/youtube.ts` separan los contratos de integración de la demo. Los adaptadores están pendientes; no hacen solicitudes externas. Deben conectarse a endpoints de un backend propio. Las claves ElevenLabs, credenciales OAuth y tokens de YouTube deben guardarse únicamente en el servidor, **nunca** en `VITE_*`, código frontend o almacenamiento del navegador. El borrador local contiene solo contenido del episodio y resultados.

## Rendimiento

Geometrías y materiales compartidos, modelos de baja complejidad, límite de resolución `dpr` a 1.4, cámara ortográfica, dos luces direccionales y una sola sombra de 1024×1024. Sin efectos de posprocesado ni descargas de modelos o fuentes. La escena se carga en un chunk separado para que la interfaz y los agentes sigan accesibles mientras inicia WebGL.

## Verificación

```bash
npm test
npm run build
```

Pruebas de resultados y tipos JavaScript, límites de la secuencia y 1001 muestras de ruta con radio de colisión del mensajero frente a los ocho escritorios.

Prueba de navegador reproducible con el servidor en marcha y Chrome instalado:

```bash
CHROME_PATH=/usr/bin/google-chrome-stable node pruebas/recorrido.mjs
```

Puedes cambiar la URL con `STUDIO_URL`. Las capturas de escritorio y móvil y el resultado se guardan en `pruebas/capturas/`.
