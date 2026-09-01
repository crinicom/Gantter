import React from 'react';
import LoginScreen from './LoginScreen';
import { useAuth } from '../../hooks/useAuth';

export default function ProtectedLayout({ children }) {
  const { isInitialized, isAuthenticated } = useAuth();

  if (!isInitialized) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-gray-500">
        Cargando…
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  return <>{children}</>;
}