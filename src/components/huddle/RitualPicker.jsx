// Elección de ritual para abrir el huddle (§10): standup (con guion demo que
// mueve el tablero), refinamiento, planning y despeje de bloqueos.

import React from 'react';
import Modal from '../common/Modal';
import { useMaie } from '../../context/MaieContext';
import { HUDDLE_RITUALS } from '../../constants/maie';

export default function RitualPicker({ open, onClose }) {
  const { startHuddle } = useMaie();

  const pick = (id) => {
    startHuddle({ ritual: id });
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Abrir huddle" width="max-w-md">
      <p className="mb-3 text-sm text-muted">
        Elegí el ritual. Una sola sesión por proyecto: queda guardada en la carta del tablero.
      </p>
      <div className="space-y-2">
        {HUDDLE_RITUALS.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => pick(r.id)}
            className="block w-full rounded-lg border border-gray-200 px-4 py-3 text-left hover:border-forest-400 hover:bg-forest-50"
          >
            <span className="flex items-center justify-between">
              <span className="text-sm font-medium text-ink">{r.label}</span>
              {r.demo && (
                <span className="rounded-full bg-forest-100 px-2 py-0.5 text-[11px] font-medium text-forest-700">
                  Demo que mueve cartas
                </span>
              )}
            </span>
            <span className="mt-1 block text-xs text-muted">{r.description}</span>
          </button>
        ))}
      </div>
    </Modal>
  );
}