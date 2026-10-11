import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import Screens from './Screens.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Screens />
  </StrictMode>,
)