import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import '@fontsource-variable/newsreader/opsz.css';
import '@fontsource-variable/jetbrains-mono/wght.css';
import '../ui/app.css';
import { registerSW } from 'virtual:pwa-register';
import { App } from './App';
import { StatusProvider } from '../ui/Status';

// Offline support. A new version installs in the background and takes over on the next launch,
// never in the middle of a session (registerType 'prompt' with no prompt).
registerSW({ immediate: true });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <StatusProvider>
        <App />
      </StatusProvider>
    </HashRouter>
  </StrictMode>,
);
