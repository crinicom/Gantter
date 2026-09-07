import React, { useState } from 'react';
import { KanbanSquare, Plus, Sparkles, LogOut } from 'lucide-react';
import { useProject } from '../../hooks/useProject';
import { useAuth } from '../../hooks/useAuth';
import Button from '../common/Button';
import Modal from '../common/Modal';
import ProjectCard from './ProjectCard';

function CreateProjectModal({ open, onClose, onCreate }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    onCreate({ name: name.trim(), description: description.trim() });
    setName('');
    setDescription('');
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Nuevo proyecto"
      width="max-w-md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button form="form-new-project" type="submit">
            Crear proyecto
          </Button>
        </>
      }
    >
      <form id="form-new-project" onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="mb-1 block text-xs text-gray-500">Nombre</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nombre del proyecto"
            autoFocus
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-forest-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-500">Descripción</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Descripción opcional"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-forest-500 focus:outline-none"
          />
        </div>
      </form>
    </Modal>
  );
}

export default function ProjectsLanding() {
  const { projects, createProject, deleteProject, setProjectImage, openProject, resetDemo, closeProject } =
    useProject();
  const { user, logout } = useAuth();
  const [creating, setCreating] = useState(false);

  const handleLogout = async () => {
    closeProject();
    await logout();
  };

  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <header className="flex items-center justify-between border-b border-gray-200 bg-surface px-6 py-3">
        <div className="flex items-center gap-2.5">
          <div className="rounded-md bg-forest-600 p-1.5 text-white">
            <KanbanSquare size={20} />
          </div>
          <span className="font-display text-lg font-bold text-gray-800">Gantter</span>
          {user && (
            <span className="rounded-full bg-forest-50 px-2.5 py-0.5 text-xs font-medium text-forest-700">
              {user.name}
            </span>
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={handleLogout}>
          <LogOut size={16} /> Salir
        </Button>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-display text-xl font-semibold text-gray-800">Mis proyectos</h1>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => resetDemo()}>
              <Sparkles size={16} /> Restaurar demo
            </Button>
            <Button size="sm" onClick={() => setCreating(true)}>
              <Plus size={16} /> Nuevo proyecto
            </Button>
          </div>
        </div>

        {projects.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center">
            <p className="text-sm text-gray-500">Aún no tienes proyectos.</p>
            <p className="mb-4 text-xs text-gray-400">
              Crea uno nuevo o restaura los proyectos de demostración.
            </p>
            <div className="flex justify-center gap-2">
              <Button variant="secondary" size="sm" onClick={() => resetDemo()}>
                <Sparkles size={16} /> Restaurar demo
              </Button>
              <Button size="sm" onClick={() => setCreating(true)}>
                <Plus size={16} /> Nuevo proyecto
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {projects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                isOwner={Boolean(user && project.ownerId === user.id)}
                onOpen={openProject}
                onDelete={deleteProject}
                onChangeImage={setProjectImage}
              />
            ))}
          </div>
        )}
      </main>

      <CreateProjectModal open={creating} onClose={() => setCreating(false)} onCreate={createProject} />
    </div>
  );
}