import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles/global.css';
import './styles/theme.css';

// React entry point. Mounts the single <App/> into #root.
// Strict mode is intentionally off — Cytoscape mounts an imperative canvas
// and double-invocation in dev causes the graph to initialize twice and
// leak event handlers on the host element.
createRoot(document.getElementById('root')).render(<App />);
