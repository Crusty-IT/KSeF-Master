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
        <HashRouter>
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
            {/* Globalny badge w lewym dolnym rogu widoczny na KAŻDYM widoku */}
            <div className="fixed bottom-4 left-4 z-50">
                <div className="flex justify-center md:justify-start">
                    <a
                        href="https://crusty-it.github.io/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 text-gray-400 hover:text-gray-200 transition-colors"
                        aria-label="Strona wykonana przez Crusty IT"
                    >
                        <span className="text-sm">Stworzone przez</span>

                        <div className="relative h-4 w-24">
                            <img
                                src="https://raw.githubusercontent.com/shellupski/Moja-strona/main/images/logo_horizontaly.svg"
                                alt="Crusty IT Logo"
                                className="absolute top-1/2 left-0 -translate-y-1/2 h-15 w-auto"
                            />
                        </div>
                    </a>
                </div>
            </div>
        </HashRouter>
    );
}