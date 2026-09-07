import React, { useRef, useState } from 'react';
import { Camera, Trash2, Check, X } from 'lucide-react';
import { format } from 'date-fns';
import { projectProgress } from '../../utils/progress';
import { coverImageUrl, localFallback, downscaleImageFile } from '../../utils/projectImage';

function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : format(d, 'dd/MM/yyyy');
}

export default function ProjectCard({ project, isOwner = false, onOpen, onDelete, onChangeImage }) {
  const [useFallback, setUseFallback] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef(null);

  const progress = projectProgress(project?.tasks || []);
  const src = useFallback ? localFallback(project.coverSeed || project.id) : coverImageUrl(project);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError('');
    try {
      const dataUrl = await downscaleImageFile(file);
      onChangeImage(project.id, dataUrl);
    } catch (err) {
      setError(err.message || 'No se pudo procesar la imagen.');
    }
  };

  return (
    <div className="group overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition hover:shadow-md">
      <div className="relative h-36 cursor-pointer overflow-hidden bg-gray-100">
        <img
          src={src}
          alt=""
          onError={() => setUseFallback(true)}
          onClick={() => onOpen(project.id)}
          className="h-full w-full object-cover transition duration-200 hover:scale-105"
        />
        {isOwner && (
          <span
            role="button"
            tabIndex={0}
            onClick={() => fileRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === 'Enter') fileRef.current?.click();
            }}
            className="absolute bottom-2 right-2 inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-black/40 text-white opacity-0 transition hover:bg-forest-600 group-hover:opacity-100"
            title="Subir imagen de portada"
          >
            <Camera size={15} />
          </span>
        )}
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      </div>

      {error && <p className="px-3 pt-1.5 text-[11px] text-red-600">{error}</p>}

      <div className="p-3">
        <h3
          onClick={() => onOpen(project.id)}
          className="cursor-pointer truncate font-display text-sm font-semibold text-gray-800 hover:text-forest-700"
          title={project.name}
        >
          {project.name}
        </h3>
        <p className="mt-1 text-[11px] text-gray-400">
          Creado {formatDate(project.createdAt)} · Modificado {formatDate(project.updatedAt)}
        </p>
        <div className="mt-2 flex items-center gap-1.5">
          <div className="h-1.5 flex-1 overflow-hidden rounded bg-gray-200">
            <div className="h-full rounded bg-forest-500 transition-all" style={{ width: `${progress}%` }} />
          </div>
          <span className="text-[11px] tabular-nums text-gray-500">{progress}%</span>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-gray-100 px-3 py-1.5">
        <button
          type="button"
          onClick={() => onOpen(project.id)}
          className="text-xs font-medium text-forest-600 hover:text-forest-800"
        >
          Abrir proyecto
        </button>
        {isOwner &&
          (confirming ? (
            <span className="flex items-center gap-1 text-[11px] text-gray-500">
              ¿Eliminar?
              <button type="button" onClick={() => onDelete(project.id)} className="rounded p-0.5 text-red-600 hover:bg-red-50" aria-label="Confirmar eliminación">
                <Check size={14} />
              </button>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="rounded p-0.5 text-gray-400 hover:bg-gray-100"
                aria-label="Cancelar eliminación"
              >
                <X size={14} />
              </button>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
              aria-label="Eliminar proyecto"
              title="Eliminar proyecto"
            >
              <Trash2 size={14} />
            </button>
          ))}
      </div>
    </div>
  );
}