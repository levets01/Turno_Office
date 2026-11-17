// Entrada de la aplicación: importa React, el componente principal y los estilos globales.
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles.css'

// Monta la interfaz dentro de #root (index.html). StrictMode ayuda a detectar problemas de efectos en desarrollo.
ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>)
