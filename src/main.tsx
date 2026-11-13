import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './theme.css'
import './app.css'
import './lib/meetlounge'
import App from './App'
import { initAuth } from './lib/auth'
import { registerSW } from './lib/pwa'
import { loadModelManifest } from './art/models'

void initAuth()
registerSW()
void loadModelManifest()

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>)
