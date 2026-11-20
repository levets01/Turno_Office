# Arquitectura

Frontend React + Vite + TypeScript. La persistencia inicial usa `localStorage` en `src/commerce.ts`; está aislada detrás de tipos de dominio y preparada para reemplazo por API.

- `App.tsx`: navegación de oficina, estado global y ejecución agregada.
- `demo.ts`: compatibilidad visual y estado derivado de tareas.
- `commerce.ts`: productos, proveedores, tareas, rentabilidad y persistencia local.
- `components/OfficeScene.tsx`: vista 3D.
- `components/CommercePanel.tsx`: operaciones convencionales y historial de tareas.

La integración real debe usar un backend modular, PostgreSQL y procesos asíncronos. Credenciales y webhooks solo en servidor.
