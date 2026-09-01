import React from 'react';
import { Link2, X } from 'lucide-react';

export default function DependencyPicker({ tasks, task, addDependency, removeDependency }) {
  if (!tasks || tasks.length === 0) return null;

  const precedents = task?.precedents || [];
  const dependents = task?.dependents || [];
  const otherTasks = tasks.filter((t) => t.id !== task?.id);

  const toggleDependency = (otherTask) => {
    if (precedents.includes(otherTask.id)) {
      removeDependency?.(otherTask.id, task.id);
    } else {
      addDependency?.(otherTask.id, task.id);
    }
  };

  const renderChips = (ids, roleLabel) => (
    <div className="flex flex-wrap gap-1.5">
      {ids.length === 0 && <span className="text-xs text-gray-400">Ninguno</span>}
      {ids.map((id) => {
        const related = tasks.find((t) => t.id === id);
        if (!related) return null;
        return (
          <span
            key={id}
            className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700"
            title={roleLabel}
          >
            {related.name || related.id}
            <button
              type="button"
              onClick={() => toggleDependency(related)}
              className="text-gray-400 hover:text-red-500"
              aria-label={`Quitar ${roleLabel}`}
            >
              <X size={12} />
            </button>
          </span>
        );
      })}
    </div>
  );

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold text-gray-700">Dependencias</h4>

      <div className="rounded-md border border-gray-200 p-3">
        <p className="mb-1.5 text-xs font-medium text-gray-500">Antecedentes (deben completarse antes)</p>
        {renderChips(precedents, 'antecedente')}

        <div className="mt-2 flex flex-wrap gap-1">
          {otherTasks.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => toggleDependency(t)}
              className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-colors ${
                precedents.includes(t.id)
                  ? 'border-violet-400 bg-violet-50 text-violet-700'
                  : 'border-gray-200 text-gray-500 hover:border-violet-300'
              }`}
            >
              <Link2 size={12} />
              {t.name || t.id}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-md border border-gray-200 p-3">
        <p className="mb-1.5 text-xs font-medium text-gray-500">Posteriores (dependen de esta tarea)</p>
        {renderChips(dependents, 'posterior')}
      </div>
    </div>
  );
}