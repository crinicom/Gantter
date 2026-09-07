import React, { useState } from 'react';
import { useProject } from '../../hooks/useProject';
import Navbar from './Navbar';
import TabsSwitcher, { VIEWS } from './TabsSwitcher';
import SyncStatusBanner from './SyncStatusBanner';
import BoardView from '../board/BoardView';
import GanttView from '../gantt/GanttView';
import ProjectsLanding from '../projects/ProjectsLanding';

export default function AppShell() {
  const { project, isLoading } = useProject();
  const [activeView, setActiveView] = useState(VIEWS.BOARD);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-gray-500">
        Cargando…
      </div>
    );
  }

  if (!project) {
    return <ProjectsLanding />;
  }

  return (
    <div className="flex h-screen flex-col bg-paper">
      <Navbar />
      <TabsSwitcher activeView={activeView} onChange={setActiveView} />
      <SyncStatusBanner />
      <main className="flex-1 overflow-auto p-4">
        {activeView === VIEWS.BOARD ? <BoardView /> : <GanttView />}
      </main>
    </div>
  );
}