// src/components/layout/TopBar.tsx
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import './TopBar.css';

export default function TopBar() {
    const { isAuthenticated, nip, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = async () => {
        await logout();
        navigate('/');
    };

    const handleLogin = () => {
        navigate('/');
    };

    return (
        <div className="top-bar">
            <div className="top-bar-spacer" />
            <div className="top-bar-status">
                {isAuthenticated ? (
                    <>
                        <span className="status-indicator online" />
                        <span className="status-text">
                            Zalogowano: <strong>{nip}</strong>
                        </span>
                        <button className="top-bar-btn logout" onClick={handleLogout}>
                            Wyloguj
                        </button>
                    </>
                ) : (
                    <>
                        <span className="status-indicator offline" />
                        <span className="status-text">Niezalogowany</span>
                        <button className="top-bar-btn login" onClick={handleLogin}>
                            Zaloguj się
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}