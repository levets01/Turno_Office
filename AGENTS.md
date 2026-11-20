# AGENTS.md

- Trabajar en español, TypeScript estricto y React/Vite.
- Leer `docs/PROJECT_BRIEF.md` y `docs/STATUS.md` al iniciar una sesión.
- No sustituir datos reales por simulaciones. Todo dato demo debe tener `demo: true` o un rótulo visible.
- Ejecutar `npm test`, `npm run build` y comprobar la interfaz en móvil antes de transferir cambios.
- Las claves externas pertenecen al backend; no añadirlas a `VITE_*` ni al navegador.
- Los cálculos monetarios son deterministas y exactos; las tareas externas nunca muestran porcentajes inventados.
- Reutilizar `src/commerce.ts` para persistencia y operaciones de tareas.
