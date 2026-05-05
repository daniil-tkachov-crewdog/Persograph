// Cytoscape mount + bridge between the React store and the imperative
// Cytoscape instance.
//
// We do NOT recreate the Cytoscape instance on every render. Instead, on
// mount we instantiate it once, and in effects we diff the current store
// state against `cy.elements()` and add/remove/update accordingly.
//
// Caveat: keeping React state and Cytoscape state in sync is the trickiest
// bit of the app. We use the node UUID as Cytoscape's element id so the
// mapping is 1:1. Edge ids in Cytoscape are synthesized by edgeRenderer
// (one per lane) and carry an `appEdgeId` data field.

import React, { useEffect, useRef } from 'react';
import cytoscape from 'cytoscape';
import { useGraphStore } from '../state/graphStore.js';
import { buildStylesheet } from './cytoscapeStyles.js';
import { edgeToCyElements, nodeToCyElement } from './edgeRenderer.js';

export default function GraphCanvas() {
  const containerRef = useRef(null);
  const cyRef = useRef(null);

  const nodes = useGraphStore(s => s.nodes);
  const edges = useGraphStore(s => s.edges);
  const theme = useGraphStore(s => s.theme);
  const highlightId = useGraphStore(s => s.ui.highlightNodeId);
  const setUi = useGraphStore(s => s.setUi);
  const setNodePosition = useGraphStore(s => s.setNodePosition);

  // ---- mount ----
  useEffect(() => {
    const cy = cytoscape({
      container: containerRef.current,
      elements: [],
      wheelSensitivity: 0.2,
      style: buildStylesheet(themeTokens(theme))
    });
    cyRef.current = cy;

    // Open the PersonModal on tap of any non-self node.
    cy.on('tap', 'node', (evt) => {
      const id = evt.target.id();
      const isSelf = evt.target.hasClass('self');
      if (isSelf) return;
      setUi({ personModalNodeId: id });
    });

    // Persist node positions back to the store after a drag ends, so that
    // Save JSON captures where the user arranged people.
    cy.on('dragfree', 'node', (evt) => {
      const id = evt.target.id();
      const pos = evt.target.position();
      setNodePosition(id, { x: pos.x, y: pos.y });
    });

    return () => { cy.destroy(); cyRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- update stylesheet on theme change ----
  useEffect(() => {
    const cy = cyRef.current; if (!cy) return;
    cy.style(buildStylesheet(themeTokens(theme)));
  }, [theme]);

  // ---- sync nodes ----
  useEffect(() => {
    const cy = cyRef.current; if (!cy) return;
    const wantIds = new Set(nodes.map(n => n.id));

    // Remove nodes that no longer exist in state.
    cy.nodes().forEach(el => { if (!wantIds.has(el.id())) el.remove(); });

    // Add or update.
    nodes.forEach(n => {
      const existing = cy.getElementById(n.id);
      if (existing && existing.length) {
        existing.data('label', `${n.name || '—'}\n[${n.number}]`);
        // Don't fight the user's drag: only set position if the stored
        // position differs significantly from the current rendered one.
        const cur = existing.position();
        if (n.position && (Math.abs(cur.x - n.position.x) > 0.5 || Math.abs(cur.y - n.position.y) > 0.5)) {
          // Skip — position from store is authoritative only on first add.
        }
      } else {
        cy.add(nodeToCyElement(n));
      }
    });

    // Keep the self node pinned at center: not grabbable, position 0,0.
    const self = cy.nodes('.self');
    if (self.length) {
      self.position({ x: 0, y: 0 });
      self.lock(); // disables drag
    }
  }, [nodes]);

  // ---- sync edges (full rebuild on change; cheap for personal scale) ----
  useEffect(() => {
    const cy = cyRef.current; if (!cy) return;
    cy.edges().remove();
    const cyEdges = edges.flatMap(edgeToCyElements);
    if (cyEdges.length) cy.add(cyEdges);
  }, [edges]);

  // ---- highlight target node from search ----
  useEffect(() => {
    const cy = cyRef.current; if (!cy) return;
    cy.nodes().removeClass('highlight');
    if (!highlightId) return;
    const el = cy.getElementById(highlightId);
    if (el && el.length) {
      el.addClass('highlight');
      cy.animate({ center: { eles: el }, zoom: 1.2 }, { duration: 400 });
    }
  }, [highlightId]);

  return <div id="cy" ref={containerRef} />;
}

// Color tokens used by the Cytoscape stylesheet. They mirror theme.css but
// must be passed as concrete strings (Cytoscape can't read CSS variables
// from inside its own canvas).
function themeTokens(theme) {
  if (theme === 'dark') {
    return { accent: '#60a5fa', nodeFill: '#60a5fa', selfFill: '#f5f5f5', highlight: '#fbbf24', labelFg: '#e8e8e8' };
  }
  return { accent: '#2563eb', nodeFill: '#2563eb', selfFill: '#111', highlight: '#f59e0b', labelFg: '#1a1a1a' };
}
