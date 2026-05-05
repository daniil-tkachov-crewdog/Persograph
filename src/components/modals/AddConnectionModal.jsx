// "Add a Connection" modal.
//
// Three independent axes (per spec): form (4) × color (3) × lanes (3) = 36
// combinations. The user picks each axis explicitly; we don't infer one
// from another.

import React, { useEffect, useRef, useState } from 'react';
import { useGraphStore } from '../../state/graphStore.js';

const FORMS = [
  { value: 'double-arrow', label: 'Double arrow (co-dependency)' },
  { value: 'one-arrow',    label: 'One-side arrow (one-way)' },
  { value: 'line',         label: 'Straight line (no dependency)' },
  { value: 'dotted',       label: 'Dotted (aware, no direct connection)' }
];
const COLORS = [
  { value: 'green', label: 'Green (good)' },
  { value: 'grey',  label: 'Grey (neutral)' },
  { value: 'red',   label: 'Red (bad)' }
];
const LANES = [
  { value: 1, label: 'Single — rare communication' },
  { value: 2, label: 'Double — often' },
  { value: 3, label: 'Triple — very often' }
];

export default function AddConnectionModal() {
  const open = useGraphStore(s => s.ui.addConnectionOpen);
  const presetSource = useGraphStore(s => s.ui.addConnectionSourceId);
  const setUi = useGraphStore(s => s.setUi);
  const nodes = useGraphStore(s => s.nodes);
  const addEdge = useGraphStore(s => s.addEdge);

  const dialogRef = useRef(null);
  const [source, setSource] = useState('');
  const [target, setTarget] = useState('');
  const [form, setForm] = useState('line');
  const [color, setColor] = useState('grey');
  const [lanes, setLanes] = useState(1);

  useEffect(() => {
    const d = dialogRef.current; if (!d) return;
    if (open && !d.open) {
      // Default the source to whatever was preset (e.g. opened from a node)
      // or to the self node.
      const self = nodes.find(n => n.isSelf);
      setSource(presetSource || self?.id || '');
      setTarget('');
      d.showModal();
    }
    if (!open && d.open) d.close();
  }, [open, presetSource, nodes]);

  function close() { setUi({ addConnectionOpen: false, addConnectionSourceId: null }); }

  function submit(e) {
    e.preventDefault();
    if (!source || !target || source === target) return;
    addEdge({ source, target, form, color, lanes: Number(lanes) });
    close();
  }

  return (
    <dialog ref={dialogRef} className="modal" onClose={close}>
      <form onSubmit={submit}>
        <div className="modal-head">Add a Connection</div>
        <div className="modal-body">
          <label>
            Person A
            <select value={source} onChange={e => setSource(e.target.value)} required>
              <option value="">— pick —</option>
              {nodes.map(n => <option key={n.id} value={n.id}>[{n.number}] {n.name || '—'}</option>)}
            </select>
          </label>
          <label>
            Person B
            <select value={target} onChange={e => setTarget(e.target.value)} required>
              <option value="">— pick —</option>
              {nodes.filter(n => n.id !== source).map(n => (
                <option key={n.id} value={n.id}>[{n.number}] {n.name || '—'}</option>
              ))}
            </select>
          </label>
          <label>
            Form
            <select value={form} onChange={e => setForm(e.target.value)}>
              {FORMS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
          </label>
          <label>
            Color
            <select value={color} onChange={e => setColor(e.target.value)}>
              {COLORS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </label>
          <label>
            Lanes
            <select value={lanes} onChange={e => setLanes(Number(e.target.value))}>
              {LANES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
            </select>
          </label>
        </div>
        <div className="modal-foot">
          <button type="button" onClick={close}>Cancel</button>
          <button type="submit" className="btn-primary">Create</button>
        </div>
      </form>
    </dialog>
  );
}
