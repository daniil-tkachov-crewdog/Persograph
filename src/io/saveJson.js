// Save / Load helpers for the graph snapshot.
//
// SAVE: prefer the File System Access API (`showSaveFilePicker`) so the
// user picks the folder + filename. If the API is unavailable (Firefox,
// Safari, older Chromium), fall back to a Blob + <a download>; the
// browser then saves to its default Downloads folder. We log a warning
// but don't block the save.
//
// LOAD: prefer `showOpenFilePicker`; fallback to a temporary <input type=
// "file"> click.

const SUGGESTED_NAME = 'personagraph.json';

export async function saveSnapshotToFile(snapshot) {
  const json = JSON.stringify(snapshot, null, 2);

  if (typeof window.showSaveFilePicker === 'function') {
    const handle = await window.showSaveFilePicker({
      suggestedName: SUGGESTED_NAME,
      types: [{ description: 'JSON', accept: { 'application/json': ['.json'] } }]
    });
    const writable = await handle.createWritable();
    await writable.write(json);
    await writable.close();
    return;
  }

  // Fallback: anchor download. No folder picker available.
  console.warn('File System Access API unavailable; falling back to download.');
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = SUGGESTED_NAME;
  a.click();
  URL.revokeObjectURL(url);
}

export async function loadSnapshotFromFile() {
  if (typeof window.showOpenFilePicker === 'function') {
    const [handle] = await window.showOpenFilePicker({
      types: [{ description: 'JSON', accept: { 'application/json': ['.json'] } }],
      multiple: false
    });
    const file = await handle.getFile();
    const text = await file.text();
    return JSON.parse(text);
  }

  // Fallback: synthesize an <input type=file> click.
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = async () => {
      const f = input.files?.[0];
      if (!f) return resolve(null);
      try { resolve(JSON.parse(await f.text())); } catch (e) { reject(e); }
    };
    input.click();
  });
}
