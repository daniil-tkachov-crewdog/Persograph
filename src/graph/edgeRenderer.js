// Translate the app's Edge model (form/color/lanes) into Cytoscape elements.
//
// Multi-lane: Cytoscape can render a single edge between two nodes, but to
// show 2 or 3 parallel "lanes" we synthesize that many sub-edges with
// offset control points. The offsets are spread symmetrically around 0
// using LANE_SPACING per lane.
//
// Caveat: these synthetic ids are derived from the parent edge id +
// lane index. They are NOT stable across edits (changing lane count
// recreates them). That's fine because they're only used by Cytoscape;
// app-level state references the original edge id.

const LANE_SPACING = 14; // pixels between adjacent parallel edges

function laneOffsets(count) {
  // Returns control-point distances for N parallel lanes, centered on 0.
  // 1 → [0]; 2 → [-7, +7]; 3 → [-14, 0, +14]
  if (count <= 1) return [0];
  const step = LANE_SPACING;
  const start = -((count - 1) / 2) * step;
  return Array.from({ length: count }, (_, i) => start + i * step);
}

export function edgeToCyElements(edge) {
  const lanes = Math.max(1, Math.min(3, edge.lanes || 1));
  const offsets = laneOffsets(lanes);
  return offsets.map((offset, i) => ({
    group: 'edges',
    data: {
      id: `${edge.id}::${i}`,
      source: edge.source,
      target: edge.target,
      // control-point-distances expects an array; Cytoscape accepts a
      // single number in `data()` and treats it as a one-element array.
      cpd: offset,
      // Carry the original edge id so click handlers can resolve back to
      // app state.
      appEdgeId: edge.id
    },
    classes: `form-${edge.form} color-${edge.color}`
  }));
}

export function nodeToCyElement(node) {
  return {
    group: 'nodes',
    data: { id: node.id, label: `${node.name || '—'}\n[${node.number}]` },
    position: node.position || { x: 0, y: 0 },
    classes: node.isSelf ? 'self' : '',
    grabbable: !node.isSelf
  };
}
