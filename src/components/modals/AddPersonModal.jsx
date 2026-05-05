// "Add a Person" modal. Per spec, only `name` is required at creation;
// the user fills in everything else later via the PersonModal.

import React, { useEffect, useRef, useState } from 'react';
import { useGraphStore } from '../../state/graphStore.js';

export default function AddPersonModal() {
  const open = useGraphStore(s => s.ui.addPersonOpen);
  const setUi = useGraphStore(s => s.setUi);
  const addPerson = useGraphStore(s => s.addPerson);

  const dialogRef = useRef(null);
  const [name, setName] = useState('');

  // Sync the open state with the native <dialog>'s show/close behavior.
  useEffect(() => {
    const d = dialogRef.current; if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  function close() { setUi({ addPersonOpen: false }); setName(''); }

  function submit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    addPerson(name.trim());
    close();
  }

  return (
    <dialog ref={dialogRef} className="modal" onClose={close}>
      <form onSubmit={submit}>
        <div className="modal-head">Add a Person</div>
        <div className="modal-body">
          <label>
            Name *
            <input autoFocus value={name} onChange={e => setName(e.target.value)} required />
          </label>
        </div>
        <div className="modal-foot">
          <button type="button" onClick={close}>Cancel</button>
          <button type="submit" className="btn-primary">Add</button>
        </div>
      </form>
    </dialog>
  );
}
