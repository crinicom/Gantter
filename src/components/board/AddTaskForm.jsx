import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { useProject } from '../../hooks/useProject';

export default function AddTaskForm({ bucketId }) {
  const { addTask } = useProject();
  const [name, setName] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    addTask(bucketId, { name });
    setName('');
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-1.5">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Nueva tarea…"
        className="w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm focus:border-forest-500 focus:outline-none focus:ring-1 focus:ring-forest-500"
      />
      <button
        type="submit"
        aria-label="Añadir tarea"
        className="rounded-md border border-gray-200 p-1.5 text-gray-500 hover:bg-gray-100 hover:text-forest-600"
      >
        <Plus size={16} />
      </button>
    </form>
  );
}