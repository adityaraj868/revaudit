import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import iconPngSrc from '../../design/rev_audit_icon.png'

// Ensure favicon dynamically points to the latest icon asset
try {
  const links = document.querySelectorAll("link[rel*='icon']");
  links.forEach(link => {
    link.href = iconPngSrc;
  });
} catch (e) {
  console.warn('Favicon update failed', e);
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>,
)
