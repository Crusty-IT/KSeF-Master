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
            <div className="side-nav-content">
                <div className="brand">
                    <div className="logo-dot" aria-hidden="true" />
                    <span className="brand-name">KSeF Master</span>
                </div>

                {/* Status sesji */}
                {isAuthenticated && nip && (
                    <div className="session-status">
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
                            className="nav-item logout-btn"
                            onClick={handleLogout}
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
            </div>

            {/* Footer z logo po lewej i copyright po środku */}
            <footer className="side-nav-footer">
                <a
                    href="https://crusty-it.github.io/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="footer-logo-link"
                    aria-label="Strona wykonana przez Crusty IT"
                >
                    <img
                        src="https://raw.githubusercontent.com/shellupski/Moja-strona/main/images/logo_horizontaly.svg"
                        alt="Crusty IT Logo"
                        className="footer-logo"
                    />
                </a>
                <div className="footer-copyright">
                    © 2025 KSeF Master
                </div>
            </footer>
        </aside>
    );
}