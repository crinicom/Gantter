// Selector del modo de aplicación de Maie (§8): "confirm" pregunta sí/no antes
// de aplicar; "auto" aplica y deja constancia en el registro. Persiste en
// project.settings.applyMode. El comportamiento de aplicar en sí llega en el
// slice 5; por ahora es solo un selector visible y persistente.

import React from 'react';

export const APPLY_MODES = {
  CONFIRM: 'confirm',
  AUTO: 'auto',
};

const LABELS = [
  { value: APPLY_MODES.CONFIRM, label: 'Preguntar sí/no' },
  { value: APPLY_MODES.AUTO, label: 'Aplicar y registrar' },
];

export default function ApplyModeToggle({ value, onChange }) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-medium text-gray-600">Modo de Maie</p>
      <div
        role="group"
        aria-label="Modo de aplicación de Maie"
        className="grid grid-cols-2 gap-1 rounded-lg bg-gray-100 p-1"
      >
        {LABELS.map(({ value: v, label }) => {
          const active = value === v;
          return (
            <button
              key={v}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(v)}
              className={`rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
                active ? 'bg-surface text-forest-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}