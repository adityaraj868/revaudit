import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import iconSvgSrc from '../../design/icon.svg'

// Ensure favicon dynamically points to the latest icon asset
try {
  const links = document.querySelectorAll("link[rel*='icon']");
  links.forEach(link => {
    link.href = iconSvgSrc;
  });
} catch (e) {
  console.warn('Favicon update failed', e);
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
