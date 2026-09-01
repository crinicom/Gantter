import { useContext } from 'react';
import { ProjectContext } from '../context/ProjectContext';

export function useProject() {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProject debe usarse dentro de un <ProjectProvider>');
  }
  return context;
}

export default useProject;