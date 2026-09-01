import React, { useEffect, useMemo, useState } from 'react';
import { Trash2 } from 'lucide-react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import Checkbox from '../common/Checkbox';
import CommentList from './CommentList';
import AssigneeSelector from './AssigneeSelector';
import DependencyPicker from './DependencyPicker';
import { useProject } from '../../hooks/useProject';
import { useAuth } from '../../hooks/useAuth';
import { TASK_STATUS } from '../../constants/project';

export default function TaskModal({ open, task, onClose }) {
  const {
    project,
    updateTask,
    deleteTask,
    toggleTaskCompleted,
    setTaskStatus,
    addComment,
    addDependency,
    removeDependency,
  } = useProject();
  const { user } = useAuth();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState(TASK_STATUS.TODO);

  useEffect(() => {
    if (!task) return;
    setName(task.name || '');
    setDescription(task.description || '');
    setStartDate(task.startDate || '');
    setEndDate(task.endDate || '');
    setStatus(task.status || TASK_STATUS.TODO);
  }, [task]);

  const allTasks = useMemo(() => project?.tasks || [], [project]);

  if (!open || !task) return null;

  const handleSave = () => {
    updateTask(task.id, {
      name,
      description,
      startDate,
      endDate,
      status,
    });
    onClose();
  };

  const handleDelete = () => {
    deleteTask(task.id);
    onClose();
  };

  const handleToggleStatus = () => {
    const next =
      task.status === TASK_STATUS.COMPLETED ? TASK_STATUS.TODO : TASK_STATUS.COMPLETED;
    toggleTaskCompleted(task.id);
    setStatus(next);
  };

  const handleAddComment = (text) => {
    addComment(task.id, text, user);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Detalle de tarea"
      width="max-w-2xl"
      footer={
        <>
          <Button variant="danger" onClick={handleDelete}>
            <Trash2 size={16} /> Eliminar
          </Button>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={handleSave}>
            Guardar
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Checkbox
            checked={task.status === TASK_STATUS.COMPLETED}
            onChange={handleToggleStatus}
          />
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-base font-medium focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
            placeholder="Nombre de la tarea"
          />
        </div>

        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="w-full resize-none rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
          placeholder="Descripción…"
        />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs text-gray-500">Inicio</label>
            <input
              type="date"
              value={startDate || ''}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-500">Fin</label>
            <input
              type="date"
              value={endDate || ''}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-500">Estado</label>
            <select
              value={status}
              onChange={(e) => {
                const next = e.target.value;
                setTaskStatus(task.id, next);
                setStatus(next);
              }}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none"
            >
              <option value={TASK_STATUS.TODO}>En trabajo</option>
              <option value={TASK_STATUS.IN_PROGRESS}>En progreso</option>
              <option value={TASK_STATUS.COMPLETED}>Finalizada</option>
            </select>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs text-gray-500">Asignado</label>
          <AssigneeSelector
            value={task.assignedUser}
            onChange={(member) => updateTask(task.id, { assignedUser: member })}
          />
        </div>

        <DependencyPicker
          tasks={allTasks}
          task={task}
          addDependency={addDependency}
          removeDependency={removeDependency}
        />

        <CommentList comments={task.comments || []} onAddComment={handleAddComment} />
      </div>
    </Modal>
  );
}