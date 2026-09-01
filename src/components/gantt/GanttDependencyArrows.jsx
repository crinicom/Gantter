import React, { useMemo } from 'react';
import { dateRangePx, GANTT } from './ganttLayout';

export default function GanttDependencyArrows({ tasks, startDate, rowIndexById, totalWidth, totalHeight }) {
  const arrows = useMemo(() => {
    const arrows = [];
    tasks.forEach((task) => {
      (task.precedents || []).forEach((precedentId) => {
        const precedent = tasks.find((t) => t.id === precedentId);
        if (!precedent) return;

        const precRow = rowIndexById[precedentId];
        const taskRow = rowIndexById[task.id];
        if (precRow === undefined || taskRow === undefined) return;

        const precRange = dateRangePx(startDate, precedent);
        const taskRange = dateRangePx(startDate, task);

        const x1 = precRange.left + precRange.width;
        const y1 = precRow * GANTT.ROW_HEIGHT + GANTT.ROW_HEIGHT / 2;
        const x2 = taskRange.left;
        const y2 = taskRow * GANTT.ROW_HEIGHT + GANTT.ROW_HEIGHT / 2;

        const midX = (x1 + x2) / 2;
        arrows.push({
          key: `${precedentId}-${task.id}`,
          path: `M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`,
        });
      });
    });
    return arrows;
  }, [tasks, startDate, rowIndexById]);

  return (
    <svg
      width={totalWidth}
      height={totalHeight}
      className="pointer-events-none absolute inset-0 z-10"
    >
      {arrows.map((arrow) => (
        <path
          key={arrow.key}
          d={arrow.path}
          fill="none"
          stroke="#94a3b8"
          strokeWidth={1.5}
          strokeDasharray="4 3"
          markerEnd="none"
        />
      ))}
    </svg>
  );
}