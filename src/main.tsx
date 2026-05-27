import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './i18n'
import App from './App.tsx'
import { THEME_STORAGE_KEY, resolveTheme, type ThemeMode } from './contexts/ThemeContext'

// Apply the theme class synchronously before React mounts to avoid a flash of the
// wrong color scheme. Reads localStorage + `prefers-color-scheme` directly.
function applyInitialTheme() {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY) as ThemeMode | null
    const mode: ThemeMode = stored === 'light' || stored === 'dark' ? stored : 'system'
    const resolved = resolveTheme(mode)
    if (resolved === 'dark') document.documentElement.classList.add('dark')
    else document.documentElement.classList.remove('dark')
  } catch {
    /* swallow — default light theme will render */
  }
}
applyInitialTheme()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
