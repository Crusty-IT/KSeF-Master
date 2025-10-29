import { NavLink } from 'react-router-dom';
import './SideNav.css';

export default function SideNav() {
    return (
        <aside className="side-nav" aria-label="Nawigacja boczna">
            <div className="brand">
                <div className="logo-dot" aria-hidden="true" />
                <span className="brand-name">KSeF Master</span>
            </div>
            <NavLink className="btn-accent new-invoice" to="/invoices/new">+ Wystaw e-Fakturę</NavLink>
            {/* Plik: src/components/layout/SideNav.tsx */}

            <nav className="nav-list">
                <NavLink className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} to="/dashboard">
                    <span className="icon" aria-hidden>🏠</span>
                    <span className="nav-label">Pulpit Główny</span>
                </NavLink>
                <NavLink className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} to="/invoices/received">
                    <span className="icon" aria-hidden>📥</span>
                    <span className="nav-label">Faktury odebrane</span>
                </NavLink>
                <NavLink className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} to="/invoices/issued">
                    <span className="icon" aria-hidden>📤</span>
                    <span className="nav-label">Faktury wystawione</span>
                </NavLink>
                <NavLink className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} to="/clients">
                    <span className="icon" aria-hidden>👥</span>
                    <span className="nav-label">Klienci</span>
                </NavLink>

                <a className="nav-item disabled" href="#" onClick={(e) => e.preventDefault()}>
                    <span className="icon" aria-hidden>📊</span>
                    <span className="nav-label">Raporty</span>
                </a>
                <a className="nav-item disabled" href="#" onClick={(e) => e.preventDefault()}>
                    <span className="icon" aria-hidden>⚙️</span>
                    <span className="nav-label">Ustawienia</span>
                </a>

                <NavLink className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} to="/">
                    <span className="icon" aria-hidden>↩️</span>
                    <span className="nav-label">Start</span>
                </NavLink>
            </nav>
        </aside>
    );
}