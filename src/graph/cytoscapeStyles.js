// Cytoscape stylesheet builder.
//
// Edge styling combines three independent axes (form, color, lanes), so we
// expose them as separate CSS-style classes on the Cytoscape elements:
//   .form-double-arrow / .form-one-arrow / .form-line / .form-dotted
//   .color-green / .color-grey / .color-red
// Lane count is implemented at the data level by emitting N parallel edges
// with offset control points (see graph/edgeRenderer.js), not as a class.
//
// The self node ("self") gets a distinct shape and color, plus an immovable
// flag (set on the node element itself, not in the stylesheet).

const COLORS = { green: '#16a34a', grey: '#9ca3af', red: '#dc2626' };

export function buildStylesheet({ accent, nodeFill, selfFill, highlight, labelFg }) {
  return [
    {
      selector: 'node',
      style: {
        'background-color': nodeFill,
        'label': 'data(label)',
        'color': labelFg,
        'font-size': 11,
        'text-valign': 'bottom',
        'text-margin-y': 6,
        'width': 28,
        'height': 28,
        'border-width': 1,
        'border-color': '#0006'
      }
    },
    {
      selector: 'node.self',
      style: {
        'background-color': selfFill,
        'shape': 'round-rectangle',
        'width': 40,
        'height': 40,
        'font-weight': 'bold'
      }
    },
    {
      selector: 'node.highlight',
      style: {
        'border-color': highlight,
        'border-width': 4
      }
    },

    // ---- edge defaults ----
    {
      selector: 'edge',
      style: {
        'curve-style': 'unbundled-bezier',
        'control-point-distances': 'data(cpd)',
        'control-point-weights': 0.5,
        'width': 2,
        'line-color': '#888',
        'target-arrow-color': '#888',
        'source-arrow-color': '#888'
      }
    },

    // ---- form classes ----
    {
      selector: 'edge.form-double-arrow',
      style: { 'target-arrow-shape': 'triangle', 'source-arrow-shape': 'triangle' }
    },
    {
      selector: 'edge.form-one-arrow',
      style: { 'target-arrow-shape': 'triangle', 'source-arrow-shape': 'none' }
    },
    {
      selector: 'edge.form-line',
      style: { 'target-arrow-shape': 'none', 'source-arrow-shape': 'none' }
    },
    {
      selector: 'edge.form-dotted',
      style: {
        'target-arrow-shape': 'none',
        'source-arrow-shape': 'none',
        'line-style': 'dashed'
      }
    },

    // ---- color classes ----
    {
      selector: 'edge.color-green',
      style: { 'line-color': COLORS.green, 'target-arrow-color': COLORS.green, 'source-arrow-color': COLORS.green }
    },
    {
      selector: 'edge.color-grey',
      style: { 'line-color': COLORS.grey, 'target-arrow-color': COLORS.grey, 'source-arrow-color': COLORS.grey }
    },
    {
      selector: 'edge.color-red',
      style: { 'line-color': COLORS.red, 'target-arrow-color': COLORS.red, 'source-arrow-color': COLORS.red }
    }
  ];
}

export { COLORS };
