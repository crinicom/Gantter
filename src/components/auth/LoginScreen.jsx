import React from 'react';
import { KanbanSquare, Lock, ArrowRight } from 'lucide-react';
import Button from '../common/Button';
import { useAuth } from '../../hooks/useAuth';
import { APP_CONFIG } from '../../config/appConfig';

export default function LoginScreen() {
  const { login, isLoggingIn } = useAuth();

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 px-4">
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-lg">
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-lg bg-violet-600 p-2.5 text-white">
            <KanbanSquare size={28} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-800">Gantter</h1>
            <p className="text-sm text-gray-500">Tablero y Gantt colaborativo</p>
          </div>
        </div>

        <div className="mb-6 rounded-lg bg-gray-50 p-4 text-sm text-gray-600">
          <p className="mb-2 flex items-center gap-2 font-medium text-gray-700">
            <Lock size={16} /> Acceso a la aplicación
          </p>
          <p>
            {APP_CONFIG.mode === 'drive' && APP_CONFIG.google.clientId
              ? 'Conectarás tu cuenta de Google para vincular el proyecto en Google Drive.'
              : 'Modo offline: la app funciona con datos locales (no requiere credenciales).'}
          </p>
        </div>

        <Button
          variant="primary"
          size="lg"
          className="w-full"
          onClick={() => login()}
          disabled={isLoggingIn}
        >
          {isLoggingIn ? 'Conectando…' : 'Iniciar sesión'}
          {!isLoggingIn && <ArrowRight size={18} />}
        </Button>

        <p className="mt-4 text-center text-xs text-gray-400">
          {APP_CONFIG.mode === 'drive' ? 'Autenticación con Google (OAuth)' : 'Demo sin autenticación externa'}
        </p>
      </div>
    </div>
  );
}