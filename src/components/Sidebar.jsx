// Left-side menu. Per spec it has exactly the buttons listed below;
// behaviors are wired by the parent (App) via the store.

import React, { useState } from 'react';
import { useGraphStore } from '../state/graphStore.js';
import { saveSnapshotToFile, loadSnapshotFromFile } from '../io/saveJson.js';

export default function Sidebar() {
  const setUi = useGraphStore(s => s.setUi);
  const toggleTheme = useGraphStore(s => s.toggleTheme);
  const theme = useGraphStore(s => s.theme);
  const nodes = useGraphStore(s => s.nodes);
  const snapshot = useGraphStore(s => s.snapshot);
  const loadSnapshot = useGraphStore(s => s.loadSnapshot);

  const [query, setQuery] = useState('');

  // Search by name only (case-insensitive substring). On match, set the
  // highlight id; GraphCanvas reacts and centers/outlines the node.
  function onSearch(e) {
    e.preventDefault();
    if (!query.trim()) return;
    const q = query.trim().toLowerCase();
    const hit = nodes.find(n => !n.isSelf && n.name.toLowerCase().includes(q));
    setUi({ highlightNodeId: hit ? hit.id : null });
    if (!hit) alert('No person matches that name.');
  }

  async function onSave() {
    try { await saveSnapshotToFile(snapshot()); }
    catch (err) { if (err?.name !== 'AbortError') alert('Save failed: ' + err.message); }
  }

  async function onLoad() {
    try {
      const data = await loadSnapshotFromFile();
      if (!data) return;
      // Confirm overwrite if there's already user data beyond the self node.
      const hasData = nodes.length > 1;
      if (hasData && !confirm('Replace the current graph with the loaded file?')) return;
      loadSnapshot(data);
    } catch (err) { if (err?.name !== 'AbortError') alert('Load failed: ' + err.message); }
  }

  return (
    <aside className="sidebar">
      <h1>PersonaGraph</h1>
      <p className="subtitle">Your personal sociograph</p>

      <button onClick={() => setUi({ addPersonOpen: true })}>+ Add a Person</button>
      <button onClick={() => setUi({ addConnectionOpen: true, addConnectionSourceId: null })}>+ Add a Connection</button>

      <form onSubmit={onSearch} style={{ display: 'contents' }}>
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search for a person by name..."
        />
        <button type="submit">Find</button>
      </form>

      <button onClick={onSave}>Save JSON…</button>
      <button onClick={onLoad}>Load JSON…</button>
      <button onClick={toggleTheme}>Mode: {theme === 'light' ? 'Light' : 'Dark'}</button>

      <p className="subtitle" style={{ marginTop: 'auto' }}>
        Node <strong>[000-000]</strong> is you. It cannot be moved or deleted.
      </p>
    </aside>
  );
}
