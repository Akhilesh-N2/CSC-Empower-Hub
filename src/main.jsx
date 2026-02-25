import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// OPTIMIZATION: Ensure the root element is prepared for dynamic translation
const rootElement = document.getElementById('root');

// Adding 'notranslate' to specific structural elements if needed, 
// though we usually handle this inside the SmartText component.
createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
)