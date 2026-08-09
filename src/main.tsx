import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import Landing from './components/Landing.tsx';
import AdminConsole from './components/AdminConsole.tsx';
import './index.css';

const path = window.location.pathname;

function Root() {
  if (path === '/') return <Landing />;
  if (path === '/admin') return <AdminConsole />;
  return <App />;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
