import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { useProject } from '../../hooks/useProject';

export default function AddBucketForm() {
  const { addBucket } = useProject();
  const [name, setName] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    addBucket(name);
    setName('');
  };

  return (
    <form onSubmit={handleSubmit} className="flex w-64 flex-col gap-2">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Nombre del bucket…"
        className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
      />
      <button
        type="submit"
        className="flex items-center justify-center gap-1.5 rounded-md bg-violet-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-violet-700"
      >
        <Plus size={16} /> Añadir bucket
      </button>
    </form>
  );
}