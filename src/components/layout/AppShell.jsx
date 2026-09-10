import React, { useState, useEffect } from 'react';
import { useProject } from '../../hooks/useProject';
import Navbar from './Navbar';
import TabsSwitcher, { VIEWS } from './TabsSwitcher';
import SyncStatusBanner from './SyncStatusBanner';
import BoardView from '../board/BoardView';
import GanttView from '../gantt/GanttView';
import ProjectInfoView from '../projects/ProjectInfoView';
import ProjectsLanding from '../projects/ProjectsLanding';
import MaiaPanel from '../maia/MaiaPanel';
import HuddleSessionBar from '../huddle/HuddleSessionBar';

export default function AppShell() {
  const { project, isLoading } = useProject();
  const [activeView, setActiveView] = useState(VIEWS.BOARD);

  useEffect(() => {
    document.documentElement.dataset.activeView = activeView;
  }, [activeView]);

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
      <HuddleSessionBar />
      <div className="flex min-h-0 flex-1">
        <main className="flex-1 overflow-auto p-4">
          {activeView === VIEWS.BOARD && <BoardView />}
          {activeView === VIEWS.GANTT && <GanttView />}
          {activeView === VIEWS.INFO && <ProjectInfoView />}
        </main>
        <MaiaPanel />
      </div>
    </div>
  );
}