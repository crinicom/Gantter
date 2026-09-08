import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { AuthService } from '../services/authService';
import { feedbackService } from '../services/feedbackService';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const current = await AuthService.getCurrentUser();
        if (!cancelled) setUser(current);
      } catch {
        /* sin sesión */
      } finally {
        if (!cancelled) setIsInitialized(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async () => {
    setIsLoggingIn(true);
    try {
      const authedUser = await AuthService.login();
      setUser(authedUser);
      void feedbackService.flushPending();
      return authedUser;
    } finally {
      setIsLoggingIn(false);
    }
  }, []);

  const logout = useCallback(async () => {
    await AuthService.logout();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      isInitialized,
      isLoggingIn,
      isAuthenticated: Boolean(user),
      login,
      logout,
    }),
    [user, isInitialized, isLoggingIn, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};