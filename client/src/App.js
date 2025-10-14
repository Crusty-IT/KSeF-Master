import { jsx as _jsx } from "react/jsx-runtime";
// App.tsx
import { useEffect, useState } from 'react';
import StartView from './views/start/StartView';
import Dashboard from './views/dashboard/Dashboard';
function getRoute() {
    const hash = window.location.hash.replace(/^#/, '');
    if (hash === '/dashboard' || hash === 'dashboard')
        return 'dashboard';
    return 'start';
}
export default function App() {
    const [route, setRoute] = useState(getRoute());
    useEffect(() => {
        const onHashChange = () => setRoute(getRoute());
        window.addEventListener('hashchange', onHashChange);
        return () => window.removeEventListener('hashchange', onHashChange);
    }, []);
    if (route === 'dashboard') {
        return _jsx(Dashboard, {});
    }
    return _jsx(StartView, {});
}
