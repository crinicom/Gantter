// Vista "Información del proyecto" (§12): documentos markdown por proyecto, al
// estilo OneNote — columna izquierda con la lista de documentos y "Nuevo
// documento", centro con el editor (título, acciones, Ver/Editar y autosave).

import React, { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { Copy, Download, FileText, MoreVertical, Pencil, Plus, Trash2 } from 'lucide-react';
import { useProject } from '../../hooks/useProject';
import { renderMarkdownPreview } from '../../utils/markdownPreview';

const AUTOSAVE_MS = 700;

function slugFor(title) {
  const base = (title || 'documento').trim().replace(/[^\w\d-]+/g, '_').replace(/^_+|_+$/g, '');
  return `${base || 'documento'}.md`;
}

function ActionMenu({ onRename, onDuplicate, onDownload, onDelete }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDocClick = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  const item = (label, Icon, onClick, danger) => (
    <button
      type="button"
      onClick={() => {
        setOpen(false);
        onClick();
      }}
      className={clsx(
        'flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50',
        danger ? 'text-rust' : 'text-ink',
      )}
    >
      <Icon size={15} />
      {label}
    </button>
  );

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        aria-label="Acciones"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="rounded-md border border-gray-200 p-1.5 text-muted hover:bg-gray-50 hover:text-ink"
      >
        <MoreVertical size={15} />
      </button>
      {open && (
        <div className="absolute right-0 top-9 z-20 w-52 overflow-hidden rounded-lg border border-gray-200 bg-surface py-1 shadow-lg">
          {item('Renombrar', Pencil, onRename)}
          {item('Duplicar', Copy, onDuplicate)}
          {item('Descargar .md', Download, onDownload)}
          {item('Eliminar', Trash2, onDelete, true)}
        </div>
      )}
    </div>
  );
}

export default function ProjectInfoView() {
  const { project, createDocument, updateDocument, deleteDocument } = useProject();
  const documents = project?.documents || [];

  const [selectedId, setSelectedId] = useState(null);
  const [contentDraft, setContentDraft] = useState('');
  const [titleDraft, setTitleDraft] = useState('');
  const [renaming, setRenaming] = useState(false);
  const [preview, setPreview] = useState(false);
  const [saved, setSaved] = useState(true);
  const saveTimer = useRef(null);
  const latestRef = useRef({ id: null, content: '', title: '' });

  const selected = documents.find((d) => d.id === selectedId) || null;

  useEffect(() => {
    if (saved) return undefined;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      if (latestRef.current.id) {
        updateDocument(latestRef.current.id, {
          content: latestRef.current.content,
          title: latestRef.current.title,
        });
      }
      setSaved(true);
    }, AUTOSAVE_MS);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [saved, updateDocument]);

  useEffect(
    () => () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      if (latestRef.current.id) {
        updateDocument(latestRef.current.id, {
          content: latestRef.current.content,
          title: latestRef.current.title,
        });
      }
    },
    [updateDocument],
  );

  const openDoc = (id, fallback = { content: '', title: '' }) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    const doc = documents.find((d) => d.id === id) || fallback;
    setSelectedId(id);
    setContentDraft(doc.content || '');
    setTitleDraft(doc.title || '');
    latestRef.current = { id: null, content: doc.content || '', title: doc.title || '' };
    setRenaming(false);
    setPreview(false);
    setSaved(true);
  };

  const onNewDocument = () => {
    createDocument({ title: 'Nuevo documento', content: '' });
    openDoc('__pending__', { title: 'Nuevo documento', content: '' });
  };

  const onChangeContent = (value) => {
    setContentDraft(value);
    latestRef.current = { id: selectedId, content: value, title: titleDraft.trim() };
    setSaved(false);
  };

  const onChangeTitle = (value) => {
    setTitleDraft(value);
    latestRef.current = { id: selectedId, content: contentDraft, title: value };
    setSaved(false);
  };

  const onRename = () => {
    setRenaming(true);
  };

  const onTitleCommit = () => {
    setRenaming(false);
    if (!selectedId) return;
    updateDocument(selectedId, { title: titleDraft.trim() || 'Sin título' });
  };

  const onDuplicate = () => {
    if (!selectedId) return;
    createDocument({
      title: `${titleDraft || 'Documento'} (Copia)`,
      content: contentDraft,
    });
    openDoc('__pending__', { title: `${titleDraft || 'Documento'} (Copia)`, content: contentDraft });
  };

  const onDownload = () => {
    if (!selectedId) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    updateDocument(selectedId, { content: contentDraft, title: titleDraft.trim() });
    const blob = new Blob([contentDraft], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = slugFor(titleDraft);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const onDelete = () => {
    if (!selectedId) return;
    if (!window.confirm(`¿Eliminar el documento «${titleDraft || 'Sin título'}»?`)) return;
    deleteDocument(selectedId);
    setSelectedId(null);
    latestRef.current = { id: null, content: '', title: '' };
    setSaved(true);
  };

  if (documents.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
        <FileText size={32} className="text-gray-300" />
        <p className="text-sm text-muted">Todavía no hay documentos.</p>
        <button
          type="button"
          onClick={onNewDocument}
          className="inline-flex items-center gap-1.5 rounded-md bg-forest-600 px-3 py-2 text-sm font-medium text-paper hover:bg-forest-700"
        >
          <Plus size={16} />
          Nuevo documento
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full gap-4">
      <aside className="flex w-64 shrink-0 flex-col overflow-hidden rounded-lg border border-gray-200 bg-surface">
        <div className="border-b border-gray-100 px-3 py-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">Documentos</p>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto py-1">
          {documents.map((doc) => (
            <button
              key={doc.id}
              type="button"
              onClick={() => openDoc(doc.id)}
              className={clsx(
                'flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50',
                doc.id === selectedId ? 'bg-forest-50 font-medium text-forest-800' : 'text-ink',
              )}
            >
              <FileText size={14} className="shrink-0 text-muted" />
              <span className="min-w-0 truncate">{doc.title}</span>
            </button>
          ))}
        </div>
        <div className="border-t border-gray-100 p-2">
          <button
            type="button"
            onClick={onNewDocument}
            className="flex w-full items-center gap-1.5 rounded-md border border-gray-200 px-3 py-2 text-sm font-medium text-ink hover:border-forest-400 hover:bg-forest-50"
          >
            <Plus size={15} />
            Nuevo documento
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-lg border border-gray-200 bg-surface">
        {selectedId ? (
          <>
            <div className="flex items-center gap-2 border-b border-gray-100 px-4 py-2">
              {renaming ? (
                <input
                  type="text"
                  value={titleDraft}
                  onChange={(e) => {
                    setTitleDraft(e.target.value);
                    latestRef.current = { id: selectedId, content: contentDraft, title: e.target.value };
                    setSaved(false);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') onTitleCommit();
                    if (e.key === 'Escape') setRenaming(false);
                  }}
                  aria-label="Renombrar documento"
                  autoFocus
                  className="min-w-0 flex-1 rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-forest-500 focus:outline-none"
                />
              ) : (
                <h2 className="min-w-0 flex-1 truncate text-sm font-medium text-ink">
                  {titleDraft || selected?.title || 'Sin título'}
                </h2>
              )}
              <button
                type="button"
                onClick={() => setPreview((v) => !v)}
                className="rounded-md border border-gray-200 px-2.5 py-1 text-xs font-medium text-ink hover:bg-gray-50"
              >
                {preview ? 'Editar' : 'Ver'}
              </button>
              <span className="text-[11px] text-muted">{saved ? 'Guardado' : 'Guardando…'}</span>
              <ActionMenu
                onRename={onRename}
                onDuplicate={onDuplicate}
                onDownload={onDownload}
                onDelete={onDelete}
              />
            </div>
            {preview ? (
              <div
                className="min-h-0 flex-1 overflow-y-auto px-5 py-4 text-sm text-ink [&_h1]:mb-2 [&_h1]:font-display [&_h1]:text-xl [&_h1]:font-bold [&_h2]:mb-1 [&_h2]:mt-4 [&_h2]:font-semibold [&_h3]:font-semibold [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_a]:text-forest-700 [&_a]:underline [&_code]:rounded [&_code]:bg-gray-100 [&_code]:px-1 [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:bg-gray-100 [&_pre]:p-3 [&_table]:border-collapse [&_table]:text-sm [&_th]:border [&_th]:px-2 [&_th]:py-1 [&_th]:text-left [&_td]:border [&_td]:px-2 [&_td]:py-1"
                dangerouslySetInnerHTML={{ __html: renderMarkdownPreview(contentDraft) }}
              />
            ) : (
              <textarea
                value={contentDraft}
                onChange={(e) => onChangeContent(e.target.value)}
                spellCheck="false"
                aria-label="Contenido del documento"
                className="min-h-0 flex-1 resize-none bg-surface px-5 py-4 font-mono text-sm text-ink focus:outline-none"
              />
            )}
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center text-sm text-muted">
            Elegí un documento o creá uno nuevo.
          </div>
        )}
      </div>
    </div>
  );
}