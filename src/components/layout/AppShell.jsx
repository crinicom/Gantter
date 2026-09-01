import React, { useState } from 'react';
import Navbar from './Navbar';
import TabsSwitcher, { VIEWS } from './TabsSwitcher';
import SyncStatusBanner from './SyncStatusBanner';
import BoardView from '../board/BoardView';
import GanttView from '../gantt/GanttView';

export default function AppShell() {
  const [activeView, setActiveView] = useState(VIEWS.BOARD);

  return (
    <div className="flex h-screen flex-col bg-gray-50">
      <Navbar />
      <TabsSwitcher activeView={activeView} onChange={setActiveView} />
      <SyncStatusBanner />
      <main className="flex-1 overflow-auto p-4">
        {activeView === VIEWS.BOARD ? <BoardView /> : <GanttView />}
      </main>
    </div>
  );
}