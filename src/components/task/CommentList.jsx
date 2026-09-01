import React from 'react';
import CommentItem from './CommentItem';
import CommentInput from './CommentInput';

export default function CommentList({ comments, onAddComment }) {
  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold text-gray-700">Comentarios</h4>
      {comments && comments.length > 0 ? (
        <div className="space-y-2">
          {comments.map((comment) => (
            <CommentItem key={comment.id} comment={comment} />
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-400">Sin comentarios todavía.</p>
      )}
      <CommentInput onAddComment={onAddComment} />
    </div>
  );
}