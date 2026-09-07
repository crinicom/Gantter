import React from 'react';

export default function CommentItem({ comment }) {
  const authorName = comment.author?.name || 'Usuario';

  return (
    <div className="flex gap-2 rounded-lg bg-gray-50 p-3">
      <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-forest-100 text-xs font-semibold text-forest-700">
        {authorName?.[0]?.toUpperCase() || 'U'}
      </span>
      <div className="min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="text-xs font-medium text-gray-700">{authorName}</span>
          <span className="text-[10px] text-gray-400">
            {comment.createdAt ? new Date(comment.createdAt).toLocaleString() : ''}
          </span>
        </div>
        <p className="mt-0.5 text-sm text-gray-600">{comment.text}</p>
      </div>
    </div>
  );
}