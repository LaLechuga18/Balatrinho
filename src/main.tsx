import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import Screens from './Screens.tsx'
import { instalarSonidosBotones } from './services/Sounds'

instalarSonidosBotones()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Screens />
  </StrictMode>,
)