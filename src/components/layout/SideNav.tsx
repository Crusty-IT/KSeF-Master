// src/components/layout/SideNav.tsx
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './SideNav.css';

export default function SideNav() {
    const { isAuthenticated, nip, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = async () => {
        await logout();
        navigate('/');
    };

    return (
        <aside className="side-nav" aria-label="Nawigacja boczna">
            <div className="brand">
                <div className="logo-dot" aria-hidden="true" />
                <span className="brand-name">KSeF Master</span>
            </div>

            {/* Status sesji */}
            {isAuthenticated && nip && (
                <div style={{
                    padding: '8px 12px',
                    marginBottom: '16px',
                    background: 'rgba(34, 197, 94, 0.1)',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: '#86efac'
                }}>
                    ✓ Zalogowano: {nip}
                </div>
            )}

            <NavLink className="btn-accent new-invoice" to="/invoices/new">
                + Wystaw e-Fakturę
            </NavLink>

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
                <NavLink className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} to="/reports">
                    <span className="icon" aria-hidden>📊</span>
                    <span className="nav-label">Raporty</span>
                </NavLink>
                <NavLink className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} to="/settings">
                    <span className="icon" aria-hidden>⚙️</span>
                    <span className="nav-label">Ustawienia</span>
                </NavLink>

                {isAuthenticated ? (
                    <button
                        className="nav-item"
                        onClick={handleLogout}
                        style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            width: '100%',
                            textAlign: 'left'
                        }}
                    >
                        <span className="icon" aria-hidden>🚪</span>
                        <span className="nav-label">Wyloguj</span>
                    </button>
                ) : (
                    <NavLink className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} to="/">
                        <span className="icon" aria-hidden>🔐</span>
                        <span className="nav-label">Zaloguj się</span>
                    </NavLink>
                )}
            </nav>
        </aside>
    );
}