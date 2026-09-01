import React, { useState } from 'react';
import { User, X } from 'lucide-react';

const MEMBER_SUGGESTIONS = [
  { id: 'u_ana', name: 'Ana García', email: 'ana@local' },
  { id: 'u_carlos', name: 'Carlos Pérez', email: 'carlos@local' },
  { id: 'u_lucia', name: 'Lucía Fernández', email: 'lucia@local' },
];

export default function AssigneeSelector({ value, onChange }) {
  const [showPicker, setShowPicker] = useState(false);

  const assign = (member) => {
    onChange(member);
    setShowPicker(false);
  };

  const clear = () => {
    onChange(null);
  };

  return (
    <div className="relative">
      {value ? (
        <div className="flex items-center justify-between rounded-md border border-gray-300 px-3 py-2 text-sm">
          <span className="flex items-center gap-2">
            <User size={14} className="text-gray-400" />
            {value.name}
            <span className="text-xs text-gray-400">{value.email}</span>
          </span>
          <button type="button" onClick={clear} className="text-gray-400 hover:text-gray-600" aria-label="Quitar asignado">
            <X size={14} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowPicker((v) => !v)}
          className="flex w-full items-center gap-2 rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-500 hover:border-violet-400"
        >
          <User size={14} /> Asignar miembro…
        </button>
      )}

      {showPicker && !value && (
        <div className="absolute z-10 mt-1 w-full rounded-md border border-gray-200 bg-white shadow-lg">
          {MEMBER_SUGGESTIONS.map((member) => (
            <button
              key={member.id}
              type="button"
              onClick={() => assign(member)}
              className="block w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-violet-50"
            >
              {member.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}