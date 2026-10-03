import React from 'react'
import ReactDOM from 'react-dom/client'
import { DirectionProvider } from '@radix-ui/react-direction'
import '@fontsource-variable/cairo'
import App from './App'
import './styles.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><DirectionProvider dir="rtl"><App /></DirectionProvider></React.StrictMode>,
)
