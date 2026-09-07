// Marca de Maie (§14): monograma "M" geométrico sobre un arco de escucha.
// Bosque sobre fondo claro, sin cara ni emoji.

import React from 'react';

export default function MaieMark({ size = 34 }) {
  return (
    <span
      className="relative inline-flex shrink-0 items-center justify-center rounded-xl bg-forest-600"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        className="absolute inset-0 h-full w-full text-paper/80"
      >
        <path d="M5 17a8 8 0 0 1 14 0" />
        <path d="M8 10V7a4 4 0 0 1 8 0v3" />
      </svg>
      <span className="relative select-none text-paper" style={{ fontSize: size * 0.52 }}>
        M
      </span>
    </span>
  );
}