import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { AdminAuthProvider } from './state/AdminAuthProvider.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AdminAuthProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </AdminAuthProvider>
  </StrictMode>,
)
