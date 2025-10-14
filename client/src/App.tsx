// App.tsx
import { useEffect, useState } from 'react';
import StartView from './views/start/StartView';
import Dashboard from './views/dashboard/Dashboard';

function getRoute(): 'start' | 'dashboard' {
  const hash = window.location.hash.replace(/^#/, '');
  if (hash === '/dashboard' || hash === 'dashboard') return 'dashboard';
  return 'start';
}

export default function App() {
  const [route, setRoute] = useState<'start' | 'dashboard'>(getRoute());

  useEffect(() => {
    const onHashChange = () => setRoute(getRoute());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  if (route === 'dashboard') {
    return <Dashboard />;
  }
  return <StartView />;
}
