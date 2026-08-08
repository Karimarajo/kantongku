import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import Landing from './components/Landing.tsx';
import './index.css';

const isLanding = window.location.pathname === '/';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isLanding ? <Landing /> : <App />}
  </StrictMode>,
);
