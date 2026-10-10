import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { registerAppPageCache } from './services/appPageCache';

window.addEventListener('load', registerAppPageCache, { once: true });

const rootElement = document.getElementById('root');
const root = ReactDOM.createRoot(rootElement);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
