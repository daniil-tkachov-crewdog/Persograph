// Central app state, powered by Zustand.
//
// Holds:
//   - nodes:  array of Node objects (one is the self node, isSelf=true)
//   - edges:  array of Edge objects (form/color/lanes triple)
//   - theme:  'light' | 'dark'
//   - UI selection state for currently-open modals
//
// Caveat: nodes/edges are stored as plain arrays (not maps) for
// straightforward JSON round-tripping. Lookups by id are O(n); fine for
// personal-scale data (hundreds of people).

import { create } from 'zustand';
import { v4 as uuid } from 'uuid';
import { reflowNumbers, SELF_NUMBER } from './numbering.js';
import { DEFAULT_ETHICAL_SYSTEM } from '../data/ethicalSystems.js';

function makeSelf() {
  // The self node is fixed at center, locked from drag/delete.
  return {
    id: uuid(),
    number: SELF_NUMBER,
    isSelf: true,
    name: 'Me',
    dob: null,
    location: '',
    job: '',
    hobbies: '',
    ethicalSystem: DEFAULT_ETHICAL_SYSTEM,
    customFields: [],
    position: { x: 0, y: 0 }
  };
}

function makePerson(name) {
  return {
    id: uuid(),
    number: '', // filled in by reflowNumbers
    isSelf: false,
    name: name || '',
    dob: null,
    location: '',
    job: '',
    hobbies: '',
    ethicalSystem: DEFAULT_ETHICAL_SYSTEM,
    customFields: [],
    // Random scatter near center; layout will refine when physics runs.
    position: { x: (Math.random() - 0.5) * 400, y: (Math.random() - 0.5) * 400 }
  };
}

export const useGraphStore = create((set, get) => ({
  nodes: [makeSelf()],
  edges: [],
  theme: 'light',

  // Modal/UI state. Kept in the store so any component can open/close
  // without prop-drilling.
  ui: {
    personModalNodeId: null,   // open PersonModal for this id
    addPersonOpen: false,
    addConnectionOpen: false,
    addConnectionSourceId: null, // when initiated from a node, prefill source
    highlightNodeId: null
  },

  // ---------- mutations ----------

  setTheme: (theme) => set({ theme }),

  toggleTheme: () => set(s => ({ theme: s.theme === 'light' ? 'dark' : 'light' })),

  // Add a new person. Per spec, name is required at creation time; other
  // fields can be filled later via the PersonModal.
  addPerson: (name) => {
    const person = makePerson(name);
    set(s => ({ nodes: reflowNumbers([...s.nodes, person]) }));
    return person.id;
  },

  // Update a node by id. Any fields in `patch` are merged in.
  updateNode: (id, patch) => set(s => ({
    nodes: s.nodes.map(n => n.id === id ? { ...n, ...patch } : n)
  })),

  // Delete a node. Removes all incident edges and reflows numbers.
  // Refuses to delete the self node.
  deleteNode: (id) => set(s => {
    const target = s.nodes.find(n => n.id === id);
    if (!target || target.isSelf) return s;
    const nodes = reflowNumbers(s.nodes.filter(n => n.id !== id));
    const edges = s.edges.filter(e => e.source !== id && e.target !== id);
    return { nodes, edges };
  }),

  // Persist a node's current canvas position (after a drag).
  setNodePosition: (id, position) => set(s => ({
    nodes: s.nodes.map(n => n.id === id ? { ...n, position } : n)
  })),

  // Add an edge. We do NOT enforce uniqueness of (source,target) — the user
  // may want multiple connections with different forms/colors/lanes.
  addEdge: ({ source, target, form, color, lanes }) => {
    if (source === target) return null; // no self-loops
    const edge = { id: uuid(), source, target, form, color, lanes };
    set(s => ({ edges: [...s.edges, edge] }));
    return edge.id;
  },

  updateEdge: (id, patch) => set(s => ({
    edges: s.edges.map(e => e.id === id ? { ...e, ...patch } : e)
  })),

  removeEdge: (id) => set(s => ({ edges: s.edges.filter(e => e.id !== id) })),

  // ---------- custom fields on a node ----------

  addCustomField: (nodeId, templateId) => set(s => ({
    nodes: s.nodes.map(n => n.id === nodeId
      ? { ...n, customFields: [...n.customFields, { id: crypto.randomUUID(), templateId, value: '' }] }
      : n)
  })),

  updateCustomField: (nodeId, fieldId, value) => set(s => ({
    nodes: s.nodes.map(n => n.id === nodeId
      ? { ...n, customFields: n.customFields.map(f => f.id === fieldId ? { ...f, value } : f) }
      : n)
  })),

  removeCustomField: (nodeId, fieldId) => set(s => ({
    nodes: s.nodes.map(n => n.id === nodeId
      ? { ...n, customFields: n.customFields.filter(f => f.id !== fieldId) }
      : n)
  })),

  // ---------- UI helpers ----------

  setUi: (patch) => set(s => ({ ui: { ...s.ui, ...patch } })),

  // Replace the entire graph with a loaded JSON payload.
  // Caveat: trusts the shape of the input — invalid JSON should be caught
  // at the io/saveJson.js boundary before reaching this method.
  loadSnapshot: (snapshot) => {
    if (!snapshot || !Array.isArray(snapshot.nodes)) return;
    // Ensure exactly one self node exists; if the loaded data lacks one,
    // create one rather than leave the graph headless.
    let nodes = snapshot.nodes.slice();
    const hasSelf = nodes.some(n => n.isSelf);
    if (!hasSelf) nodes = [makeSelf(), ...nodes];
    nodes = reflowNumbers(nodes);
    set({
      nodes,
      edges: Array.isArray(snapshot.edges) ? snapshot.edges.slice() : []
    });
  },

  // Return a serializable plain object for Save JSON.
  snapshot: () => {
    const { nodes, edges } = get();
    return { version: 1, nodes, edges };
  }
}));
