// App shell: wires the sidebar, the graph canvas, and the modals together.
// Theme is applied as a `data-theme` attribute on <html> so CSS variables
// in theme.css can switch in one place.

import React, { useEffect } from 'react';
import { useGraphStore } from './state/graphStore.js';
import Sidebar from './components/Sidebar.jsx';
import GraphCanvas from './graph/GraphCanvas.jsx';
import AddPersonModal from './components/modals/AddPersonModal.jsx';
import AddConnectionModal from './components/modals/AddConnectionModal.jsx';
import PersonModal from './components/modals/PersonModal.jsx';

export default function App() {
  const theme = useGraphStore(s => s.theme);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return (
    <div className="app">
      <Sidebar />
      <main className="graph-area">
        <GraphCanvas />
      </main>
      <AddPersonModal />
      <AddConnectionModal />
      <PersonModal />
    </div>
  );
}
