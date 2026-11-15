import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import '@fontsource-variable/schibsted-grotesk/wght.css';
import '@fontsource-variable/instrument-sans/wght.css';
import '@fontsource/dm-mono/400.css';
import '../ui/app.css';
import { registerSW } from 'virtual:pwa-register';
import { App } from './App';

// Offline support. A new version installs in the background and takes over on the next launch,
// never in the middle of a session (registerType 'prompt' with no prompt).
registerSW({ immediate: true });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>,
);
