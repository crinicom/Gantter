import React, { useState } from 'react';
import Button from '../common/Button';

export default function CommentInput({ onAddComment }) {
  const [text, setText] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    onAddComment(text);
    setText('');
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-start gap-2">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Escribe un comentario…"
        rows={2}
        className="flex-1 resize-none rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-forest-500 focus:outline-none focus:ring-1 focus:ring-forest-500"
      />
      <Button type="submit" variant="primary" size="sm">
        Comentar
      </Button>
    </form>
  );
}