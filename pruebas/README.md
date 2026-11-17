Estas pruebas comprueban los resultados reales de JavaScript, los límites del recorrido del mensajero, el panel actualizado mientras se ejecuta la demo, los clics repetidos, la descarga y recuperación de borradores y la secuencia vertical en escritorio y móvil.

```sh
npm test
```

Para las pruebas de navegador, primero inicia la oficina en otra terminal:

```sh
npm run dev
node pruebas/recorrido.mjs
```

El script usa Chrome local en Linux. `CHROME_PATH` permite indicar otro ejecutable, y `STUDIO_URL` cambia la URL (por defecto, `http://127.0.0.1:5173`). Guarda capturas en `pruebas/capturas/`. La prueba completa tarda aproximadamente un minuto. Para comprobar el build de producción, inicia `npm run preview -- --port 5174` y usa `STUDIO_URL=http://127.0.0.1:5174`.
