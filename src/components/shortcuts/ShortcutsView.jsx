// Vista "Accesos directos" (§12 Shortcut): grid de iconos tipo Explorer con
// los enlaces externos del proyecto (Figma, Jira, etc.). El primer ítem crea
// un acceso nuevo (URL + nombre opcional); click en un ítem abre el enlace en
// nueva pestaña; hover muestra el lápiz (editar) y el basurero (eliminar, con
// confirmación inline). El modal es el mismo para crear y editar.

import React, { useState } from 'react';
import clsx from 'clsx';
import { Check, FolderClosed, FolderPlus, Pencil, Trash2, X } from 'lucide-react';
import { useProject } from '../../hooks/useProject';
import Modal from '../common/Modal';
import { normalizeUrl, labelForUrl, SHORTCUTS_MAX } from '../../services/shortcutsService';

export default function ShortcutsView() {
  const { project, addShortcut, updateShortcut, removeShortcut } = useProject();
  const shortcuts = project?.shortcuts || [];

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [urlDraft, setUrlDraft] = useState('');
  const [nameDraft, setNameDraft] = useState('');
  const [error, setError] = useState('');
  const [confirmingId, setConfirmingId] = useState(null);

  const atLimit = shortcuts.length >= SHORTCUTS_MAX;
  const editing = editingId ? shortcuts.find((s) => s.id === editingId) || null : null;

  const openModal = () => {
    setEditingId(null);
    setUrlDraft('');
    setNameDraft('');
    setError('');
    setModalOpen(true);
  };

  const openEditModal = (shortcut) => {
    setEditingId(shortcut.id);
    setUrlDraft(shortcut.url);
    setNameDraft(shortcut.label || '');
    setError('');
    setModalOpen(true);
  };

  const onSave = () => {
    const url = normalizeUrl(urlDraft);
    if (!url) {
      setError('Ingresá una URL válida, por ejemplo https://figma.com/archivo');
      return;
    }
    const label = nameDraft.trim() || labelForUrl(url);
    if (editingId) {
      updateShortcut(editingId, { url, label });
    } else {
      addShortcut({ url, label });
    }
    setModalOpen(false);
  };

  const onOpen = (shortcut) => {
    window.open(shortcut.url, '_blank', 'noopener');
  };

  return (
    <div className="p-6">
      <div className="mb-4 flex items-baseline gap-2">
        <h2 className="font-display text-base font-semibold text-ink">Accesos directos</h2>
        <span className="text-xs text-muted">
          {shortcuts.length}/{SHORTCUTS_MAX}
        </span>
      </div>

      {shortcuts.length === 0 && (
        <p className="mb-4 text-sm text-muted">
          Agregá un enlace a un recurso externo y se abre en una pestaña nueva del navegador.
        </p>
      )}

      <div className="grid grid-cols-[repeat(auto-fill,minmax(128px,1fr))] gap-4">
        {!atLimit && (
          <button
            type="button"
            onClick={openModal}
            className="group flex flex-col items-center gap-2 rounded-lg border-2 border-dashed border-gray-300 px-3 py-4 text-sm text-gray-500 hover:border-forest-400 hover:text-forest-700"
          >
            <FolderPlus size={40} className="text-gray-400 group-hover:text-forest-500" />
            <span>nuevo acceso directo</span>
          </button>
        )}

        {shortcuts.map((shortcut) => (
          <div
            key={shortcut.id}
            className="group relative flex flex-col items-center gap-2 rounded-lg border border-gray-200 bg-surface px-3 py-4 hover:border-forest-300 hover:shadow-sm"
          >
            <button
              type="button"
              onClick={() => onOpen(shortcut)}
              aria-label={`Abrir ${shortcut.label}`}
              className="flex flex-col items-center gap-2 focus:outline-none"
            >
              <FolderClosed size={40} className="text-amber-500" />
              <span className="max-w-full truncate text-xs text-gray-700">{shortcut.label}</span>
            </button>

            <button
              type="button"
              onClick={() => openEditModal(shortcut)}
              aria-label="Editar acceso"
              title="Editar acceso"
              className="absolute left-1.5 top-1.5 rounded p-1 text-gray-400 opacity-0 hover:bg-gray-100 hover:text-forest-600 group-hover:opacity-100"
            >
              <Pencil size={14} />
            </button>

            {confirmingId === shortcut.id ? (
              <div className="flex w-full items-center justify-center gap-1 text-[11px] text-gray-500">
                ¿Eliminar?
                <button
                  type="button"
                  onClick={() => removeShortcut(shortcut.id)}
                  className="rounded p-0.5 text-red-600 hover:bg-red-50"
                  aria-label="Confirmar eliminación"
                >
                  <Check size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmingId(null)}
                  className="rounded p-0.5 text-gray-400 hover:bg-gray-100"
                  aria-label="Cancelar eliminación"
                >
                  <X size={13} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmingId(shortcut.id)}
                aria-label="Eliminar acceso"
                title="Eliminar acceso"
                className="absolute right-1.5 top-1.5 rounded p-1 text-gray-400 opacity-0 hover:bg-red-50 hover:text-red-600 group-hover:opacity-100"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        ))}
      </div>

      {atLimit && (
        <p className="mt-4 text-xs text-muted">Máximo {SHORTCUTS_MAX} accesos directos.</p>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Editar acceso directo' : 'Nuevo acceso directo'}
        width="max-w-sm"
        footer={
          <>
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="rounded-md border border-gray-200 px-3 py-1.5 text-sm font-medium text-ink hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={onSave}
              disabled={!urlDraft.trim()}
              className={clsx(
                'rounded-md bg-forest-600 px-3 py-1.5 text-sm font-medium text-paper hover:bg-forest-700',
                !urlDraft.trim() && 'cursor-not-allowed opacity-40',
              )}
            >
              Guardar
            </button>
          </>
        }
      >
        <form className="space-y-3" onSubmit={(e) => e.preventDefault()}>
          <div>
            <label htmlFor="shortcut-name" className="mb-1 block text-xs font-medium text-ink">
              Nombre (opcional)
            </label>
            <input
              id="shortcut-name"
              type="text"
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              placeholder="Nombre del acceso"
              autoFocus
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-ink focus:border-forest-500 focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="shortcut-url" className="mb-1 block text-xs font-medium text-ink">
              URL
            </label>
            <input
              id="shortcut-url"
              type="text"
              value={urlDraft}
              onChange={(e) => setUrlDraft(e.target.value)}
              placeholder="https://..."
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-ink focus:border-forest-500 focus:outline-none"
            />
          </div>
          {error && <p className="text-xs text-red-600" role="alert">{error}</p>}
        </form>
      </Modal>
    </div>
  );
}