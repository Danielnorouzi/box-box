import { StrictMode, Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/app.css';

const App = lazy(() => import('./App'));
const Preview3D = import.meta.env.DEV ? lazy(() => import('./dev/Preview3D')) : null;
const preview = Preview3D && location.search.includes('preview');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Suspense fallback={<div className="boot" />}>{preview && Preview3D ? <Preview3D /> : <App />}</Suspense>
  </StrictMode>,
);
