import React from 'react';
import clsx from 'clsx';

export const VIEWS = {
  BOARD: 'board',
  GANTT: 'gantt',
};

export default function TabsSwitcher({ activeView, onChange }) {
  return (
    <div className="flex gap-1 border-b border-gray-200 bg-white px-4 pt-2">
      {[
        { key: VIEWS.BOARD, label: 'Tablero' },
        { key: VIEWS.GANTT, label: 'Gantt' },
      ].map((tab) => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          className={clsx(
            'rounded-t-md px-4 py-2 text-sm font-medium transition-colors',
            activeView === tab.key
              ? 'border-b-2 border-violet-600 text-violet-700'
              : 'text-gray-500 hover:text-gray-700',
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}