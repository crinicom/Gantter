import React from 'react';
import { AuthProvider } from './context/AuthContext';
import { ProjectProvider } from './context/ProjectContext';
import { MaieProvider } from './context/MaieContext';
import ProtectedLayout from './components/auth/ProtectedLayout';
import AppShell from './components/layout/AppShell';
import ErrorBoundary from './components/common/ErrorBoundary';

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ProjectProvider>
          <MaieProvider>
            <ProtectedLayout>
              <AppShell />
            </ProtectedLayout>
          </MaieProvider>
        </ProjectProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}