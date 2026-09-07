import React, { useState } from 'react';
import { User, X, Plus } from 'lucide-react';

// Multi-select de responsables: value es un array de miembros {id,name,email}.
// Tres o más responsables se muestran colapsados ("+N") por legibilidad.
export default function AssigneeSelector({ value = [], onChange, members = [] }) {
  const [showPicker, setShowPicker] = useState(false);

  const selected = Array.isArray(value) ? value : [];
  const selectedIds = new Set(selected.map((m) => m?.id));
  const available = (members || []).filter((m) => !selectedIds.has(m.id));

  const add = (member) => {
    onChange([...selected, { id: member.id, name: member.name, email: member.email || '' }]);
  };

  const remove = (memberId) => {
    onChange(selected.filter((m) => m?.id !== memberId));
  };

  const togglePicker = () => setShowPicker((v) => !v);

  return (
    <div className="relative">
      <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-gray-300 px-2 py-1.5">
        {selected.slice(0, 2).map((member) => (
          <span
            key={member.id}
            className="flex items-center gap-1 rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-700"
          >
            {member.name}
            <button
              type="button"
              onClick={() => remove(member.id)}
              className="text-gray-400 hover:text-gray-600"
              aria-label={`Quitar a ${member.name}`}
            >
              <X size={12} />
            </button>
          </span>
        ))}
        {selected.length > 2 && (
          <span className="text-xs text-gray-500">+{selected.length - 2} más</span>
        )}
        <button
          type="button"
          onClick={togglePicker}
          className="flex items-center gap-1 rounded-full border border-dashed border-gray-300 px-2 py-1 text-xs text-gray-500 hover:border-violet-400 hover:text-violet-600"
        >
          <Plus size={12} /> Asignar
        </button>
      </div>

      {showPicker && (
        <div className="absolute z-10 mt-1 w-full rounded-md border border-gray-200 bg-white shadow-lg">
          {available.length === 0 && (
            <div className="px-3 py-2 text-sm text-gray-400">
              {members.length === 0 ? 'Sin miembros para asignar' : 'Ya están todos asignados'}
            </div>
          )}
          {available.map((member) => (
            <button
              key={member.id}
              type="button"
              onClick={() => {
                add(member);
                setShowPicker(false);
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-violet-50"
            >
              <User size={14} className="text-gray-400" />
              {member.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}