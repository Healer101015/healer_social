// frontend/src/context/AuthContext.jsx
import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { api } from '../api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchUser = useCallback(async () => {
        const token = localStorage.getItem("token");
        if (token) {
            try {
                // Adiciona o token ao cabeçalho da API para esta chamada
                api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
                const { data } = await api.get("/users/me");
                setUser(data);
            } catch (error) {
                console.error("Falha na autenticação, limpando token.", error);
                localStorage.removeItem("token");
                setUser(null);
            }
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchUser();
    }, [fetchUser]);

    const login = (userData, token) => {
        localStorage.setItem("token", token);
        // Adiciona o token aos cabeçalhos para futuras requisições
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        setUser(userData);
    };

    const logout = () => {
        localStorage.removeItem("token");
        delete api.defaults.headers.common['Authorization'];
        setUser(null);
    };

    const value = { user, setUser, loading, login, logout, refetchUser: fetchUser };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth deve ser usado dentro de um AuthProvider");
    }
    return context;
};