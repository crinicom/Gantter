import React from 'react';
import { AuthProvider } from './context/AuthContext';
import { ProjectProvider } from './context/ProjectContext';
import ProtectedLayout from './components/auth/ProtectedLayout';
import AppShell from './components/layout/AppShell';

export default function App() {
  return (
    <AuthProvider>
      <ProjectProvider>
        <ProtectedLayout>
          <AppShell />
        </ProtectedLayout>
      </ProjectProvider>
    </AuthProvider>
  );
}