import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
// El plugin transforma React/TSX y permite actualizar componentes durante el desarrollo con Vite.
export default defineConfig({ plugins: [react()] })
