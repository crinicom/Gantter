import React, { useMemo, useRef, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import Checkbox from '../common/Checkbox';
import GanttHeader from './GanttHeader';
import GanttBar from './GanttBar';
import GanttDependencyArrows from './GanttDependencyArrows';
import TodayLine from './TodayLine';
import TaskModal from '../task/TaskModal';
import { useProject } from '../../hooks/useProject';
import { calculateCpmMap } from '../../utils/cpm';
import { isTaskCompleted } from '../../models/task';
import { bucketProgress } from '../../utils/progress';
import { projectStartDate, projectEndDate, GANTT } from './ganttLayout';
import {
  findOverlaps,
  tasksWithoutDates,
  milestones,
  NO_DATES_GROUP_ID,
} from '../../utils/ganttSchedule';

const NAME_COLUMN_WIDTH = 192;

export default function GanttView() {
  const { project, toggleBucketCollapse } = useProject();
  const [showCompletedTasks, setShowCompletedTasks] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState(null);

  const timelineRef = useRef(null);
  const bodyRef = useRef(null);

  const tasks = project?.tasks || [];
  const buckets = project?.buckets || [];

  const startDate = useMemo(() => projectStartDate(project), [project]);
  const endDate = useMemo(() => projectEndDate(project, startDate), [project, startDate]);

  const cpmMap = useMemo(() => calculateCpmMap(tasks), [tasks]);
  const overlap = useMemo(() => findOverlaps(tasks), [tasks]);
  const milestoneList = useMemo(() => milestones(tasks), [tasks]);

  const visibleTasks = useMemo(
    () => (showCompletedTasks ? tasks : tasks.filter((t) => !isTaskCompleted(t))),
    [tasks, showCompletedTasks],
  );

  const totalDays = Math.ceil((endDate - startDate) / 86400000);
  const chartWidth = Math.max(400, totalDays * GANTT.DAY_WIDTH);

  // Construir filas visibles por bucket (incluyendo cabeceras de grupo). Las
  // cartas sin fechas viven en su propio canal "Sin fechas" (§6), no se inventa
  // una barra.
  const rows = useMemo(() => {
    const rows = [];
    const rowIndexById = {};
    buckets.forEach((bucket) => {
      const bucketTasks = visibleTasks.filter(
        (t) => t.bucketId === bucket.id && t.startDate && t.endDate,
      );
      if (bucketTasks.length === 0) return;
      rows.push({
        type: 'group',
        bucket,
        taskCount: bucketTasks.length,
        progress: bucketProgress(tasks, bucket.id),
      });
      if (!bucket.collapsed) {
        bucketTasks.forEach((task) => {
          rowIndexById[task.id] = rows.length;
          rows.push({ type: 'task', task });
        });
      }
    });

    const nodate = tasksWithoutDates(visibleTasks);
    if (nodate.length > 0) {
      rows.push({
        type: 'group',
        taskCount: nodate.length,
        progress: 0,
        bucket: { id: NO_DATES_GROUP_ID, name: 'Sin fechas', color: '#9ca3af', collapsed: false },
      });
      nodate.forEach((task) => {
        rowIndexById[task.id] = rows.length;
        rows.push({ type: 'task', task });
      });
    }
    return { rows, rowIndexById };
  }, [buckets, visibleTasks, tasks]);

  const { rows: rowArray, rowIndexById } = rows;

  const totalHeight = rowArray.length * GANTT.ROW_HEIGHT;

  const syncScroll = (fromRef, toRef) => {
    if (!fromRef.current || !toRef.current) return;
    toRef.current.scrollLeft = fromRef.current.scrollLeft;
  };

  const getSelectedTask = () => tasks.find((t) => t.id === selectedTaskId) || null;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-800">Diagrama de Gantt</h1>
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded bg-red-600" /> Crítica
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded bg-violet-600" /> En progreso
          </span>
          <label className="flex cursor-pointer items-center gap-2">
            <Checkbox checked={showCompletedTasks} onChange={() => setShowCompletedTasks((v) => !v)} />
            Mostrar finalizadas
          </label>
        </div>
      </div>

      {/* Encabezado de la línea de tiempo (scroll sincronizado con el cuerpo) */}
      <div
        ref={timelineRef}
        className="overflow-x-auto border border-gray-200 bg-white"
        onScroll={() => syncScroll(timelineRef, bodyRef)}
      >
        <div className="flex">
          <div className="shrink-0 border-r border-gray-200" style={{ width: NAME_COLUMN_WIDTH }} />
          <div style={{ width: chartWidth }}>
            <GanttHeader startDate={startDate} endDate={endDate} milestones={milestoneList} />
          </div>
        </div>
      </div>

      {/* Cuerpo: columna de nombres + región de barras */}
      <div
        ref={bodyRef}
        className="mt-1 overflow-x-auto overflow-y-auto border border-gray-200 bg-white"
        style={{ maxHeight: 480 }}
        onScroll={() => syncScroll(bodyRef, timelineRef)}
      >
        <div className="flex" style={{ minWidth: NAME_COLUMN_WIDTH + chartWidth }}>
          <div className="relative shrink-0" style={{ width: NAME_COLUMN_WIDTH }}>
            {rowArray.map((row) =>
              row.type === 'group' ? (
                <div
                  key={`g-${row.bucket.id}`}
                  className="flex w-full cursor-pointer items-center border-b border-gray-100 bg-gray-50 px-2 text-sm font-semibold text-gray-700 hover:bg-gray-100"
                  style={{ height: GANTT.ROW_HEIGHT }}
                  onClick={() => toggleBucketCollapse(row.bucket.id)}
                >
                  {row.bucket.id !== NO_DATES_GROUP_ID ? (
                    row.bucket.collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />
                  ) : (
                    <span className="inline-block w-[14px]" />
                  )}
                  <span style={{ borderLeft: `3px solid ${row.bucket.color || '#6200ea'}`, paddingLeft: 6 }}>
                    {row.bucket.name}
                  </span>
                  <span className="ml-1 text-xs font-normal text-gray-400">({row.taskCount})</span>
                  <span className="ml-auto flex items-center gap-1.5">
                    <span className="h-1.5 w-14 overflow-hidden rounded bg-gray-200">
                      <span
                        className="block h-full rounded bg-violet-500"
                        style={{ width: `${row.progress}%` }}
                      />
                    </span>
                    <span className="text-[10px] tabular-nums text-gray-500">{row.progress}%</span>
                  </span>
                </div>
              ) : (
                <div
                  key={`t-${row.task.id}`}
                  className="flex w-full cursor-pointer items-center gap-1 border-b border-gray-100 bg-white px-2 text-xs text-gray-700 hover:bg-gray-50"
                  style={{ height: GANTT.ROW_HEIGHT }}
                  onClick={() => setSelectedTaskId(row.task.id)}
                >
                  <span className="truncate">{row.task.name || 'Sin título'}</span>
                  {cpmMap[row.task.id]?.isCritical && (
                    <span className="shrink-0 rounded-full bg-red-100 px-1.5 text-[10px] font-semibold text-red-700">
                      crítica
                    </span>
                  )}
                  {overlap.byAssignee[row.task.id]?.size > 0 && (
                    <span className="shrink-0 rounded-full bg-red-100 px-1.5 text-[10px] font-semibold text-red-700">
                      overlap
                    </span>
                  )}
                  {isTaskCompleted(row.task) && (
                    <span className="shrink-0 text-[10px] text-gray-400">finalizada</span>
                  )}
                </div>
              ),
            )}
          </div>

          <div className="relative shrink-0" style={{ width: chartWidth }}>
            <TodayLine startDate={startDate} totalWidth={chartWidth} height={totalHeight} visible />
            <GanttDependencyArrows
              tasks={rowArray.filter((r) => r.type === 'task').map((r) => r.task)}
              startDate={startDate}
              rowIndexById={rowIndexById}
              totalWidth={chartWidth}
              totalHeight={totalHeight}
            />
            {rowArray.map((row) => {
              if (row.type === 'group') {
                return (
                  <div
                    key={`g-${row.bucket.id}`}
                    className="border-b border-gray-100 bg-gray-50"
                    style={{ height: GANTT.ROW_HEIGHT }}
                  />
                );
              }
              return (
                <div
                  key={`t-${row.task.id}`}
                  className="relative border-b border-gray-100"
                  style={{ height: GANTT.ROW_HEIGHT }}
                >
                  <GanttBar
                    task={row.task}
                    startDate={startDate}
                    isCritical={Boolean(cpmMap[row.task.id]?.isCritical)}
                    overlapped={Boolean(overlap.byTask[row.task.id])}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {selectedTaskId && (
        <TaskModal open task={getSelectedTask()} onClose={() => setSelectedTaskId(null)} />
      )}
    </div>
  );
}