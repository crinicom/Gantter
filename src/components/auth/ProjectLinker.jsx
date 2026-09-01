import React from 'react';
import { FileDown, FilePlus } from 'lucide-react';
import Button from '../common/Button';
import { useProject } from '../../hooks/useProject';
import { useAuth } from '../../hooks/useAuth';

export default function ProjectLinker() {
  const { project, useSampleData, resetToEmpty } = useProject();
  const { user } = useAuth();

  return (
    <div className="mb-6 rounded-lg border border-gray-200 bg-white p-6">
      <h2 className="mb-1 text-lg font-semibold text-gray-800">
        {project?.name || 'Nuevo proyecto'}
      </h2>
      <p className="mb-4 text-sm text-gray-500">
        {project && project.tasks.length > 0
          ? `${project.tasks.length} tareas en ${project.buckets?.length || 0} bucket${
              project.buckets?.length === 1 ? '' : 's'
            }`
          : 'Todavía no hay tareas en este proyecto.'}
      </p>

      {(!project || project.tasks.length === 0) && (
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" onClick={() => useSampleData()}>
            <FileDown size={16} /> Cargar proyecto demo
          </Button>
          <Button variant="ghost" onClick={() => resetToEmpty()}>
            <FilePlus size={16} /> Empezar vacío
          </Button>
        </div>
      )}

      {user && (
        <p className="mt-4 flex items-center gap-2 text-xs text-gray-400">
          <span className="inline-block h-6 w-6 rounded-full bg-violet-100 text-center text-xs leading-6 text-violet-700">
            {user.name?.[0]?.toUpperCase() || 'U'}
          </span>
          Trabajando como <strong>{user.name}</strong>
        </p>
      )}
    </div>
  );
}