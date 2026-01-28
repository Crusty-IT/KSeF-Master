// src/context/AuthContext.tsx
import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import * as api from '../services/ksefApi';

interface AuthState {
    isAuthenticated: boolean;
    isLoading: boolean;
    nip: string | null;
    error: string | null;
    accessTokenValidUntil: string | null;
}

interface AuthContextType extends AuthState {
    login: (nip: string, ksefToken: string) => Promise<boolean>;
    logout: () => Promise<void>;
    checkSession: () => Promise<void>;
}

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [state, setState] = useState<AuthState>({
        isAuthenticated: false,
        isLoading: true,
        nip: null,
        error: null,
        accessTokenValidUntil: null,
    });

    const checkSession = useCallback(async () => {
        try {
            const status = await api.getStatus();
            setState(prev => ({
                ...prev,
                isLoading: false,
                isAuthenticated: status.session.isAuthenticated,
                nip: status.session.nip,
                accessTokenValidUntil: status.session.accessTokenValidUntil,
                error: null,
            }));
        } catch (error) {
            console.error('Failed to check session:', error);
            setState(prev => ({
                ...prev,
                isLoading: false,
                isAuthenticated: false,
                error: 'Nie można połączyć się z serwerem',
            }));
        }
    }, []);

    useEffect(() => {
        checkSession();
    }, [checkSession]);

    const login = async (nip: string, ksefToken: string): Promise<boolean> => {
        setState(prev => ({ ...prev, isLoading: true, error: null }));

        try {
            const response = await api.login({ nip, ksefToken });

            if (response.success && response.data) {
                setState({
                    isAuthenticated: true,
                    isLoading: false,
                    nip: response.data.nip,
                    accessTokenValidUntil: response.data.accessTokenValidUntil,
                    error: null,
                });
                return true;
            } else {
                setState(prev => ({
                    ...prev,
                    isLoading: false,
                    error: response.error || 'Błąd logowania',
                }));
                return false;
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Błąd połączenia';
            setState(prev => ({
                ...prev,
                isLoading: false,
                error: message,
            }));
            return false;
        }
    };

    const logout = async () => {
        try {
            await api.logout();
        } catch (error) {
            console.error('Logout error:', error);
        }
        setState({
            isAuthenticated: false,
            isLoading: false,
            nip: null,
            accessTokenValidUntil: null,
            error: null,
        });
    };

    return (
        <AuthContext.Provider value={{ ...state, login, logout, checkSession }}>
            {children}
        </AuthContext.Provider>
    );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
}