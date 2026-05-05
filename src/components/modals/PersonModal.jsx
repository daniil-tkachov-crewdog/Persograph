// PersonModal — opened by tapping a non-self node.
//
// Three blocks per spec:
//   1. Personal Info — name/dob/age/location/job/hobbies/ethical-system
//      + "Add new field" picker for global custom-field templates.
//   2. Connections — list of edges incident to this node.
//   3. Actions — Add connection / Delete person.

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useGraphStore } from '../../state/graphStore.js';
import { ETHICAL_SYSTEMS } from '../../data/ethicalSystems.js';
import { FIELD_TEMPLATES, findTemplate } from '../../data/fieldTemplates.js';

function calcAge(dob) {
  // Whole-year age from ISO date string. Returns null if dob is unset.
  if (!dob) return null;
  const d = new Date(dob); if (isNaN(d)) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age;
}

export default function PersonModal() {
  const id = useGraphStore(s => s.ui.personModalNodeId);
  const setUi = useGraphStore(s => s.setUi);
  const nodes = useGraphStore(s => s.nodes);
  const edges = useGraphStore(s => s.edges);
  const updateNode = useGraphStore(s => s.updateNode);
  const deleteNode = useGraphStore(s => s.deleteNode);
  const removeEdge = useGraphStore(s => s.removeEdge);
  const addCustomField = useGraphStore(s => s.addCustomField);
  const updateCustomField = useGraphStore(s => s.updateCustomField);
  const removeCustomField = useGraphStore(s => s.removeCustomField);

  const dialogRef = useRef(null);
  const node = useMemo(() => nodes.find(n => n.id === id), [nodes, id]);
  const incident = useMemo(
    () => edges.filter(e => e.source === id || e.target === id),
    [edges, id]
  );

  const [pickerTemplate, setPickerTemplate] = useState(FIELD_TEMPLATES[0]?.id || '');

  useEffect(() => {
    const d = dialogRef.current; if (!d) return;
    if (id && !d.open) d.showModal();
    if (!id && d.open) d.close();
  }, [id]);

  if (!node) return <dialog ref={dialogRef} className="modal" />;

  function close() { setUi({ personModalNodeId: null }); }

  function patch(field) {
    return (e) => updateNode(node.id, { [field]: e.target.value });
  }

  function onDelete() {
    if (!confirm(`Delete ${node.name || 'this person'}? This also removes all their connections.`)) return;
    deleteNode(node.id);
    close();
  }

  function onAddConnection() {
    setUi({ addConnectionOpen: true, addConnectionSourceId: node.id, personModalNodeId: null });
  }

  function onAddField() {
    if (!pickerTemplate) return;
    addCustomField(node.id, pickerTemplate);
  }

  const age = calcAge(node.dob);
  const otherName = (otherId) => {
    const o = nodes.find(n => n.id === otherId);
    return o ? `[${o.number}] ${o.name || '—'}` : otherId;
  };

  return (
    <dialog ref={dialogRef} className="modal" onClose={close}>
      <div className="modal-head">[{node.number}] {node.name || 'Unnamed'}</div>
      <div className="modal-body">

        {/* ---- Personal Info ---- */}
        <div className="block">
          <h3>Personal Info</h3>
          <label>Name<input value={node.name} onChange={patch('name')} /></label>
          <label>
            Date of birth
            <input type="date" value={node.dob || ''} onChange={patch('dob')} />
          </label>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>
            {age != null ? `Age: ${age}` : 'Age: —'}
          </div>
          <label>Location<input value={node.location} onChange={patch('location')} /></label>
          <label>Job<input value={node.job} onChange={patch('job')} /></label>
          <label>Hobbies<input value={node.hobbies} onChange={patch('hobbies')} /></label>
          <label>
            Ethical System
            <select value={node.ethicalSystem} onChange={patch('ethicalSystem')}>
              {ETHICAL_SYSTEMS.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
            </select>
          </label>

          {/* Custom field instances */}
          {node.customFields.map(f => {
            const tpl = findTemplate(f.templateId);
            return (
              <label key={f.id}>
                {tpl?.label || f.templateId}
                <div style={{ display: 'flex', gap: 6 }}>
                  <input
                    style={{ flex: 1 }}
                    value={f.value}
                    onChange={e => updateCustomField(node.id, f.id, e.target.value)}
                  />
                  <button type="button" onClick={() => removeCustomField(node.id, f.id)}>×</button>
                </div>
              </label>
            );
          })}

          {/* Add-field picker */}
          <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
            <select value={pickerTemplate} onChange={e => setPickerTemplate(e.target.value)} style={{ flex: 1 }}>
              {FIELD_TEMPLATES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
            <button type="button" onClick={onAddField}>+ Add field</button>
          </div>
        </div>

        {/* ---- Connections ---- */}
        <div className="block">
          <h3>Connections</h3>
          {incident.length === 0 && <div style={{ color: 'var(--muted)', fontSize: 12 }}>No connections yet.</div>}
          {incident.map(e => {
            const otherId = e.source === node.id ? e.target : e.source;
            return (
              <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0' }}>
                <span style={{ fontSize: 12 }}>
                  {otherName(otherId)} — <em>{e.form}</em> · <em>{e.color}</em> · {e.lanes} lane(s)
                </span>
                <button type="button" onClick={() => removeEdge(e.id)}>Remove</button>
              </div>
            );
          })}
        </div>

        {/* ---- Actions ---- */}
        <div className="block">
          <h3>Actions</h3>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button type="button" onClick={onAddConnection}>+ Add connection</button>
            <button type="button" className="btn-danger" onClick={onDelete}>Delete this Person</button>
          </div>
        </div>
      </div>
      <div className="modal-foot">
        <button type="button" onClick={close}>Close</button>
      </div>
    </dialog>
  );
}
