import React from 'react';
import { AuthProvider } from './context/AuthContext';
import { ProjectProvider } from './context/ProjectContext';
import ProtectedLayout from './components/auth/ProtectedLayout';
import AppShell from './components/layout/AppShell';
import ErrorBoundary from './components/common/ErrorBoundary';

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ProjectProvider>
          <ProtectedLayout>
            <AppShell />
          </ProtectedLayout>
        </ProjectProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}