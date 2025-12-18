// client/src/App.tsx
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import StartView from './views/start/StartView';
import Dashboard from './views/dashboard/Dashboard';
import ReceivedInvoices from './views/received/ReceivedInvoices';
import IssuedInvoices from './views/issued/IssuedInvoices';
import NewInvoice from './views/new/NewInvoice';
import ClientsView from './views/clients/ClientsView';
import Reports from './views/reports/Reports';
import Settings from './views/settings/Settings';

function InvoiceDetailsPlaceholder() {
    return (
        <div style={{ padding: 24, color: 'white', background: '#0e1116', minHeight: '100vh' }}>
            <h2>Podgląd faktury</h2>
            <p>Widok szczegółów faktury będzie dostępny wkrótce.</p>
        </div>
    );
}

export default function App() {
    return (
        <HashRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <Routes>
                <Route path="/" element={<StartView />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/invoices/received" element={<ReceivedInvoices />} />
                <Route path="/invoices/issued" element={<IssuedInvoices />} />
                <Route path="/invoices/new" element={<NewInvoice />} />
                <Route path="/invoices/:ksefId" element={<InvoiceDetailsPlaceholder />} />
                <Route path="/clients" element={<ClientsView />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </HashRouter>
    );
}